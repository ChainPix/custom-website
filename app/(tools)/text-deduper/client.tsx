"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import { dedupeText } from "./dedupe";

import type { EmailNormalization, KeepMode, MatchingMode, Options } from "./dedupe";
type OutputFormat = "plain" | "csv" | "json" | "quoted" | "numbered";
type WorkerResult = {
  output: string;
  outputLines: string[];
  removedLines: string[];
  stats: {
    totalLines: number;
    nonBlankLines: number;
    uniqueLines: number;
    duplicatesRemoved: number;
    blankLinesRemoved: number;
  };
  frequencies: Array<{ line: string; count: number }>;
};

const defaultText = "Apple\nbanana\napple \nOrange\nBANANA\norange\norange";
const sampleSets: Record<string, string> = {
  names: "Alice\nBob\nalice\nEve\nbob\nMallory\nTrent",
  emails: "user@example.com\nADMIN@example.com\nsupport@example.com\nuser@example.com\nsales@example.com",
  urls: "https://example.com\nhttp://example.com/\nHTTPS://example.com/home\nhttps://example.com",
};

export default function TextDeduperClient() {
  const [input, setInput] = useState(defaultText);
  const [debouncedInput, setDebouncedInput] = useState(defaultText);
  const [options, setOptions] = useState<Options>({
    caseInsensitive: true,
    trimLines: true,
    keepBlank: false,
    sort: false,
    normalizeWhitespace: false,
  });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedRemoved, setCopiedRemoved] = useState(false);
  const [frequencyView, setFrequencyView] = useState<"duplicates" | "uniques" | "all">("duplicates");
  const [matchingMode, setMatchingMode] = useState<MatchingMode>("exact");
  const [emailNormalization, setEmailNormalization] = useState<EmailNormalization>("domain");
  const [keepMode, setKeepMode] = useState<KeepMode>("first");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("plain");
  const [useWorkerMode, setUseWorkerMode] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [workerBusy, setWorkerBusy] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [workerResult, setWorkerResult] = useState<WorkerResult>({
    output: "",
    outputLines: [],
    removedLines: [],
    stats: {
      totalLines: 0,
      nonBlankLines: 0,
      uniqueLines: 0,
      duplicatesRemoved: 0,
      blankLinesRemoved: 0,
    },
    frequencies: [],
  });
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [fileSource, setFileSource] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const MAX_LEN = 50000;
  const maxLenMessage = "Input too large, try file upload / enable worker mode / chunk mode.";
  const workerRef = useRef<Worker | null>(null);
  const workerRequestIdRef = useRef(0);
  const streamAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyInput = (nextInput: string) => {
    if (!useWorkerMode && nextInput.length > MAX_LEN) {
      setError(maxLenMessage);
    } else {
      setError("");
    }
    if (fileInfo) {
      setFileInfo(null);
    }
    if (fileSource) {
      setFileSource(null);
    }
    setInput(nextInput);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, 200);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (useWorkerMode && error === maxLenMessage) {
      setError("");
    }
  }, [error, maxLenMessage, useWorkerMode]);

  useEffect(() => {
    if (!useWorkerMode && input.length > MAX_LEN) {
      setError(maxLenMessage);
    }
  }, [input, maxLenMessage, useWorkerMode]);

  const emptyResult = useMemo<WorkerResult>(
    () => ({
      output: "",
      outputLines: [],
      removedLines: [],
      stats: {
        totalLines: 0,
        nonBlankLines: 0,
        uniqueLines: 0,
        duplicatesRemoved: 0,
        blankLinesRemoved: 0,
      },
      frequencies: [],
    }),
    []
  );

  const workerConfig = useMemo(
    () => ({ options, matchingMode, emailNormalization, keepMode }),
    [emailNormalization, keepMode, matchingMode, options]
  );

  const computed = useMemo(() => {
    if (useWorkerMode || error || debouncedInput.length > MAX_LEN) {
      return emptyResult;
    }
    const result = dedupeText(debouncedInput, workerConfig);
    return {
      output: result.output,
      stats: result.stats,
      frequencies: result.frequencies,
      outputLines: result.outputLines,
      removedLines: result.removedLines,
    };
  }, [debouncedInput, error, workerConfig, useWorkerMode]);

  const activeResult = useWorkerMode ? workerResult : computed;
  const output = activeResult.output;
  const outputLines = activeResult.outputLines;
  const removedLines = activeResult.removedLines;
  const stats = activeResult.stats;
  const frequencies = activeResult.frequencies;

  useEffect(() => {
    if (!useWorkerMode) {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
      setWorkerBusy(false);
      setWorkerError("");
      setWorkerResult(emptyResult);
      if (fileSource) {
        setFileSource(null);
      }
      return;
    }
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL("./dedupe-worker.ts", import.meta.url), { type: "module" });
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [emptyResult, fileSource, useWorkerMode]);

  useEffect(() => {
    if (!useWorkerMode) return;
    if (error) return;
    const worker = workerRef.current;
    if (!worker) return;

    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    const requestId = workerRequestIdRef.current + 1;
    workerRequestIdRef.current = requestId;
    setWorkerBusy(true);
    setWorkerError("");
    setWorkerResult(emptyResult);

    worker.onmessage = (event) => {
      const data = event.data as { requestId: number; type: string; payload?: WorkerResult; error?: string };
      if (data.requestId !== workerRequestIdRef.current) return;
      if (data.type === "error") {
        setWorkerError(data.error || "Worker failed.");
        setWorkerBusy(false);
        return;
      }
      if (data.type === "result" && data.payload) {
        setWorkerResult(data.payload);
        setWorkerBusy(false);
      }
    };

    worker.onerror = () => {
      if (requestId !== workerRequestIdRef.current) return;
      setWorkerError("Worker failed.");
      setWorkerBusy(false);
    };

    const runWorker = async () => {
      if (fileSource) {
        worker.postMessage({ type: "init", requestId, config: workerConfig });
        const controller = new AbortController();
        streamAbortRef.current = controller;
        try {
          const reader = fileSource.stream().getReader();
          const decoder = new TextDecoder();
          let lastChar = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (controller.signal.aborted) return;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) {
              lastChar = chunk.slice(-1);
              worker.postMessage({ type: "chunk", requestId, chunk });
            }
          }
          if (controller.signal.aborted) return;
          const finalChunk = decoder.decode();
          if (finalChunk) {
            lastChar = finalChunk.slice(-1);
            worker.postMessage({ type: "chunk", requestId, chunk: finalChunk });
          }
          worker.postMessage({
            type: "end",
            requestId,
            endedWithNewline: lastChar === "\n" || lastChar === "\r",
          });
        } catch (readError) {
          if (controller.signal.aborted) return;
          console.error("File stream error", readError);
          setWorkerError("Unable to read the file for processing.");
          setWorkerBusy(false);
        }
        return;
      }
      worker.postMessage({ type: "process", requestId, text: debouncedInput, config: workerConfig });
    };

    void runWorker();
  }, [debouncedInput, emptyResult, error, fileSource, useWorkerMode, workerConfig]);

  const statusError = error || workerError;
  const isProcessing = useWorkerMode && workerBusy;

  const formattedOutput = useMemo(() => {
    switch (outputFormat) {
      case "csv":
        return outputLines.join(", ");
      case "json":
        return JSON.stringify(outputLines, null, 2);
      case "quoted":
        return outputLines.map((line) => JSON.stringify(line)).join(",");
      case "numbered":
        return outputLines.map((line, index) => `${index + 1}. ${line}`).join("\n");
      default:
        return outputLines.join("\n");
    }
  }, [outputFormat, outputLines]);

  const outputDisplay = isProcessing
    ? "Processing in worker..."
    : formattedOutput || "Result will appear here.";

  const linesCount = stats.totalLines;
  const nonBlankCount = stats.nonBlankLines;
  const uniqueCount = stats.uniqueLines;
  const duplicatesRemovedCount = stats.duplicatesRemoved;
  const blankRemovedCount = stats.blankLinesRemoved;

  const filteredFrequencies = useMemo(() => {
    if (frequencyView === "duplicates") {
      return frequencies.filter((row) => row.count > 1);
    }
    if (frequencyView === "uniques") {
      return frequencies.filter((row) => row.count === 1);
    }
    return frequencies;
  }, [frequencies, frequencyView]);

  const duplicatesReport = useMemo(() => frequencies.filter((row) => row.count > 1), [frequencies]);
  const removedLinesText = removedLines.join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyRemoved = async () => {
    if (!removedLinesText) return;
    try {
      await navigator.clipboard.writeText(removedLinesText);
      setCopiedRemoved(true);
      setTimeout(() => setCopiedRemoved(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const downloadDuplicatesReport = (format: "csv" | "json") => {
    if (!duplicatesReport.length) return;
    if (format === "json") {
      const blob = new Blob([JSON.stringify(duplicatesReport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "text-deduper-duplicates.json";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const header = "line,count";
    const rows = duplicatesReport.map((row) => {
      const safeLine = `"${row.line.replace(/"/g, '""')}"`;
      return `${safeLine},${row.count}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "text-deduper-duplicates.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRemovedLines = () => {
    if (!removedLinesText) return;
    const blob = new Blob([removedLinesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "text-deduper-removed.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".csv")) {
      setError("Only .txt or .csv files are supported.");
      return;
    }
    setFileInfo({ name: file.name, size: file.size });
    setCopied(false);
    setCopiedInput(false);
    setWorkerError("");
    if (useWorkerMode) {
      setError("");
      setFileSource(file);
      setInput("");
      return;
    }
    if (file.size > MAX_LEN) {
      setError(maxLenMessage);
      return;
    }
    setFileSource(null);
    try {
      const text = await file.text();
      applyInput(text);
    } catch (readError) {
      console.error("File read error", readError);
      setError("Unable to read that file.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("text-deduper:preferences");
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<{
        options: Options;
        matchingMode: MatchingMode;
        emailNormalization: "domain" | "full";
        keepMode: KeepMode;
        outputFormat: OutputFormat;
        frequencyView: "duplicates" | "uniques" | "all";
        useWorkerMode: boolean;
        isSwapped: boolean;
      }>;
      if (data.options) {
        setOptions((prev) => ({
          caseInsensitive:
            typeof data.options.caseInsensitive === "boolean"
              ? data.options.caseInsensitive
              : prev.caseInsensitive,
          trimLines: typeof data.options.trimLines === "boolean" ? data.options.trimLines : prev.trimLines,
          keepBlank: typeof data.options.keepBlank === "boolean" ? data.options.keepBlank : prev.keepBlank,
          sort: typeof data.options.sort === "boolean" ? data.options.sort : prev.sort,
          normalizeWhitespace:
            typeof data.options.normalizeWhitespace === "boolean"
              ? data.options.normalizeWhitespace
              : prev.normalizeWhitespace,
        }));
      }
      if (data.matchingMode) {
        const modes: MatchingMode[] = [
          "exact",
          "trim-collapse",
          "nfkc",
          "ignore-punctuation",
          "ignore-diacritics",
          "url",
          "email",
        ];
        if (modes.includes(data.matchingMode)) {
          setMatchingMode(data.matchingMode);
        }
      }
      if (data.emailNormalization === "domain" || data.emailNormalization === "full") {
        setEmailNormalization(data.emailNormalization as EmailNormalization);
      }
      if (data.keepMode) {
        const modes: KeepMode[] = ["first", "last", "shortest", "longest", "prefer-non-empty"];
        if (modes.includes(data.keepMode)) {
          setKeepMode(data.keepMode);
        }
      }
      if (data.outputFormat) {
        const formats: OutputFormat[] = ["plain", "csv", "json", "quoted", "numbered"];
        if (formats.includes(data.outputFormat)) {
          setOutputFormat(data.outputFormat);
        }
      }
      if (data.frequencyView) {
        const views = ["duplicates", "uniques", "all"] as const;
        if (views.includes(data.frequencyView)) {
          setFrequencyView(data.frequencyView);
        }
      }
      if (typeof data.useWorkerMode === "boolean") {
        setUseWorkerMode(data.useWorkerMode);
      }
      if (typeof data.isSwapped === "boolean") {
        setIsSwapped(data.isSwapped);
      }
    } catch (err) {
      console.warn("Failed to load text deduper preferences", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      options,
      matchingMode,
      emailNormalization,
      keepMode,
      outputFormat,
      frequencyView,
      useWorkerMode,
      isSwapped,
    };
    window.localStorage.setItem("text-deduper:preferences", JSON.stringify(payload));
  }, [
    emailNormalization,
    frequencyView,
    isSwapped,
    keepMode,
    matchingMode,
    options,
    outputFormat,
    useWorkerMode,
  ]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {statusError || (output ? "Deduped text ready" : isProcessing ? "Processing input" : "Awaiting input")}
        {copied ? "Copied output" : ""}
        {copiedInput ? "Copied input" : ""}
        {copiedRemoved ? "Copied removed lines" : ""}
      </div>
            {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-slate-600" itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/" itemProp="item" className="underline underline-offset-4 transition hover:text-slate-900">
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name" className="font-medium text-slate-900">
              Text Deduper
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Text Deduper</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Remove duplicate lines with case-insensitive and trim options. Keep order and copy the cleaned result.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div
          className={`space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 ${
            isSwapped ? "lg:order-2" : "lg:order-1"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              Matching mode
              <select
                value={matchingMode}
                onChange={(event) => setMatchingMode(event.target.value as MatchingMode)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Select matching mode"
              >
                <option value="exact">Exact</option>
                <option value="trim-collapse">Trim + collapse whitespace</option>
                <option value="nfkc">Unicode normalize (NFKC)</option>
                <option value="ignore-punctuation">Ignore punctuation</option>
                <option value="ignore-diacritics">Ignore diacritics</option>
                <option value="url">URL normalization</option>
                <option value="email">Email normalization</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Keep
              <select
                value={keepMode}
                onChange={(event) => setKeepMode(event.target.value as KeepMode)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Select keep mode"
              >
                <option value="first">First</option>
                <option value="last">Last (most recent)</option>
                <option value="shortest">Shortest</option>
                <option value="longest">Longest</option>
                <option value="prefer-non-empty">Prefer non-empty</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Output format
              <select
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Select output format"
              >
                <option value="plain">Plain lines</option>
                <option value="csv">Comma-separated</option>
                <option value="json">JSON array</option>
                <option value="quoted">Quoted list</option>
                <option value="numbered">Numbered lines</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={useWorkerMode}
                onChange={() => setUseWorkerMode((prev) => !prev)}
                aria-label="Toggle huge input mode"
              />
              Huge input mode
            </label>
            {matchingMode === "email" ? (
              <label className="flex items-center gap-2 text-xs text-slate-600">
                Email match
                <select
                  value={emailNormalization}
                onChange={(event) => setEmailNormalization(event.target.value as EmailNormalization)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Select email normalization"
                >
                  <option value="domain">Lowercase domain only</option>
                  <option value="full">Lowercase full address</option>
                </select>
              </label>
            ) : null}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.caseInsensitive}
                onChange={() =>
                  setOptions((prev) => ({ ...prev, caseInsensitive: !prev.caseInsensitive }))
                }
                aria-label="Toggle case insensitive"
              />
              Case insensitive
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.trimLines}
                onChange={() => setOptions((prev) => ({ ...prev, trimLines: !prev.trimLines }))}
                aria-label="Toggle trim lines"
              />
              Trim lines
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.keepBlank}
                onChange={() => setOptions((prev) => ({ ...prev, keepBlank: !prev.keepBlank }))}
                aria-label="Toggle keep blank lines"
              />
              Keep blank lines
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.sort}
                onChange={() => setOptions((prev) => ({ ...prev, sort: !prev.sort }))}
                aria-label="Toggle sort output"
              />
              Sort output
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.normalizeWhitespace}
                onChange={() => setOptions((prev) => ({ ...prev, normalizeWhitespace: !prev.normalizeWhitespace }))}
                aria-label="Toggle normalize whitespace"
              />
              <span
                className="cursor-help"
                title="Turns multiple spaces/tabs into a single space and trims ends."
              >
                Normalize whitespace
              </span>
            </label>
            <button
              onClick={() => setIsSwapped((prev) => !prev)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Swap input and output panels"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Swap panels
            </button>
            <button
              onClick={() => {
                applyInput(defaultText);
                setOptions({
                  caseInsensitive: true,
                  trimLines: true,
                  keepBlank: false,
                  sort: false,
                  normalizeWhitespace: false,
                });
                setMatchingMode("exact");
                setEmailNormalization("domain");
                setKeepMode("first");
                setOutputFormat("plain");
                setFileInfo(null);
                setFileSource(null);
                setWorkerError("");
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset to default sample"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          <div
            className={`rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-inner shadow-slate-200 transition ${
              dragActive ? "ring-2 ring-slate-300" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              const droppedFile = event.dataTransfer.files?.[0];
              if (droppedFile) {
                void handleFile(droppedFile);
              }
            }}
          >
            <textarea
              className="h-[220px] w-full resize-none bg-white text-sm text-slate-800 focus:outline-none"
              value={input}
              onChange={(event) => applyInput(event.target.value)}
              placeholder="Paste text with duplicate lines"
              aria-label="Text input"
              disabled={useWorkerMode && Boolean(fileSource)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0];
                  if (selectedFile) {
                    void handleFile(selectedFile);
                  }
                  event.currentTarget.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Upload text or CSV file"
              >
                Upload .txt/.csv
              </button>
              <span>{dragActive ? "Drop to load file" : "Drag & drop a .txt or .csv file"}</span>
              {fileInfo ? (
                <span className="text-slate-500">
                  Loaded: {fileInfo.name} · {(fileInfo.size / 1024).toFixed(1)} KB
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            {Object.entries(sampleSets).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  applyInput(value);
                  setCopied(false);
                }}
                className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label={`Load ${key} sample`}
              >
                Sample: {key}
              </button>
            ))}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(input);
                  setCopiedInput(true);
                  setTimeout(() => setCopiedInput(false), 1200);
                } catch (err) {
                  console.error("Copy failed", err);
                }
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy input text"
            >
              {copiedInput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedInput ? "Copied input" : "Copy input"}
            </button>
          </div>
          {statusError ? (
            <p className="text-sm font-medium text-amber-600">{statusError}</p>
          ) : isProcessing ? (
            <p className="text-sm text-slate-600">Processing input in worker...</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>Total: {linesCount.toLocaleString()}</span>
              <span>Non-blank: {nonBlankCount.toLocaleString()}</span>
              <span>Unique: {uniqueCount.toLocaleString()}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Duplicates removed: {duplicatesRemovedCount.toLocaleString()}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                Blank removed: {blankRemovedCount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div
          className={`flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800 ${
            isSwapped ? "lg:order-1" : "lg:order-2"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="deduped-heading">
              Deduped text
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!formattedOutput || isProcessing}
              aria-label="Copy deduped text"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => {
                if (!formattedOutput) return;
                const blob = new Blob([formattedOutput], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "deduped.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!formattedOutput || isProcessing}
              aria-label="Download deduped text"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
            <span>Removed lines: {removedLines.length.toLocaleString()}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyRemoved}
                className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold transition hover:bg-white/20 disabled:opacity-50"
                disabled={!removedLinesText || isProcessing}
                aria-label="Copy removed lines"
              >
                <Clipboard className="h-3.5 w-3.5" />
                Copy removed
              </button>
              <button
                onClick={downloadRemovedLines}
                className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold transition hover:bg-white/20 disabled:opacity-50"
                disabled={!removedLinesText || isProcessing}
                aria-label="Download removed lines"
              >
                <Download className="h-3.5 w-3.5" />
                Download removed
              </button>
            </div>
          </div>
          <pre
            className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-labelledby="deduped-heading"
          >
            {outputDisplay}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Duplicate analytics</h2>
            <p className="text-sm text-slate-600">Frequency table with counts based on your current options.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFrequencyView("duplicates")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                frequencyView === "duplicates"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5"
              }`}
              aria-pressed={frequencyView === "duplicates"}
            >
              Duplicates only
            </button>
            <button
              onClick={() => setFrequencyView("uniques")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                frequencyView === "uniques"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5"
              }`}
              aria-pressed={frequencyView === "uniques"}
            >
              Uniques
            </button>
            <button
              onClick={() => setFrequencyView("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                frequencyView === "all"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5"
              }`}
              aria-pressed={frequencyView === "all"}
            >
              All with counts
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <button
            onClick={() => downloadDuplicatesReport("csv")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={!duplicatesReport.length || isProcessing}
          >
            <Download className="h-4 w-4" /> Download duplicates CSV
          </button>
          <button
            onClick={() => downloadDuplicatesReport("json")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={!duplicatesReport.length || isProcessing}
          >
            <Download className="h-4 w-4" /> Download duplicates JSON
          </button>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[minmax(0,1fr)_120px] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span>Line</span>
            <span className="text-right">Count</span>
          </div>
          <div className="max-h-64 divide-y divide-slate-200 overflow-auto text-sm">
            {filteredFrequencies.length ? (
              filteredFrequencies.map((row, index) => (
                <div
                  key={`${row.line}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_120px] items-start px-3 py-2 text-slate-700"
                >
                  <span className="break-words">
                    {row.line === "" ? <em className="text-slate-400">(blank)</em> : row.line}
                  </span>
                  <span className="text-right font-medium text-slate-900">{row.count.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                {isProcessing
                  ? "Processing input in worker..."
                  : statusError
                    ? "Resolve the input error to view analytics."
                    : "No rows match this filter yet."}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste your text and choose options (case-insensitive, trim, keep blanks, sort, normalize).</li>
          <li>Use samples to test patterns; review counts for total vs unique lines.</li>
          <li>Copy or download the deduped output; leave sort off to preserve original order.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Processing happens in your browser.</p>
          <p><strong>How are duplicates handled?</strong> The first occurrence is kept; duplicates are removed based on your options.</p>
          <p><strong>Can I keep blank lines?</strong> Yes. Toggle “Keep blank lines” to preserve empty lines.</p>
        </div>
      </div>
    </main>
  );
}
