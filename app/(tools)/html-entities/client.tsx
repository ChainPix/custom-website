"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const NAMED_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
  "\u00A0": "&nbsp;",
};

const UNSAFE_CHARS = new Set(["&", "<", ">", '"', "'"]);
const ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g;

type EncodeMode = "named" | "numeric" | "hex";

type DiffLine = {
  type: "same" | "add" | "remove";
  leftText: string;
  rightText: string;
  leftLine?: number;
  rightLine?: number;
};

type TransformStats = {
  inputLength: number;
  outputLength: number;
  entityCount: number;
  durationMs: number;
  deltaChars: number;
  deltaPercent: number;
  mode: "encode" | "decode";
};

type HistoryEntry = {
  id: string;
  mode: "encode" | "decode";
  input: string;
  output: string;
  stats: TransformStats;
  encodeMode: EncodeMode;
  encodeUnsafeOnly: boolean;
  encodeIncludeSlash: boolean;
  createdAt: number;
};

type WorkerResponse = {
  id: number;
  type: "progress" | "done" | "error";
  output?: string;
  progress?: number;
  entityCount?: number;
  error?: string;
};

type WorkerRequest = {
  id: number;
  text: string;
};

const DECODE_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
};

const encodeEntities = (
  text: string,
  options: { mode: EncodeMode; unsafeOnly: boolean; includeSlash: boolean }
) => {
  let count = 0;
  let result = "";
  for (const char of text) {
    const isUnsafe = UNSAFE_CHARS.has(char) || (options.includeSlash && char === "/");
    if (options.unsafeOnly && !isUnsafe) {
      result += char;
      continue;
    }
    if (options.mode === "named") {
      const named = NAMED_ENTITIES[char];
      if (named) {
        result += named;
        count += 1;
        continue;
      }
    }
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      result += char;
      continue;
    }
    if (options.mode === "hex") {
      result += `&#x${codePoint.toString(16)};`;
    } else {
      result += `&#${codePoint};`;
    }
    count += 1;
  }
  return { output: result, count };
};

const decodeEntities = (text: string) => {
  let count = 0;
  const output = text.replace(ENTITY_PATTERN, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1]?.toLowerCase() === "x";
      const numberText = isHex ? body.slice(2) : body.slice(1);
      const codePoint = isHex ? parseInt(numberText, 16) : parseInt(numberText, 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        count += 1;
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    if (DECODE_ENTITIES[body]) {
      count += 1;
    }
    return DECODE_ENTITIES[body] ?? match;
  });
  return { output, count };
};

const buildLineDiff = (leftText: string, rightText: string): DiffLine[] => {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const table = Array.from({ length: leftLines.length + 1 }, () => new Array(rightLines.length + 1).fill(0));

  for (let i = 1; i <= leftLines.length; i += 1) {
    for (let j = 1; j <= rightLines.length; j += 1) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = leftLines.length;
  let j = rightLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      diff.push({ type: "same", leftText: leftLines[i - 1], rightText: rightLines[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      diff.push({ type: "add", leftText: "", rightText: rightLines[j - 1] });
      j -= 1;
    } else {
      diff.push({ type: "remove", leftText: leftLines[i - 1], rightText: "" });
      i -= 1;
    }
  }

  diff.reverse();
  let leftLine = 1;
  let rightLine = 1;
  return diff.map((line) => {
    const next = { ...line };
    if (line.type === "same" || line.type === "remove") {
      next.leftLine = leftLine;
      leftLine += 1;
    }
    if (line.type === "same" || line.type === "add") {
      next.rightLine = rightLine;
      rightLine += 1;
    }
    return next;
  });
};

export default function HtmlEntitiesClient() {
  const [input, setInput] = useState("<p>Hello & welcome!</p>");
  const [output, setOutput] = useState("");
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [autoRun, setAutoRun] = useState(true);
  const [trimInput, setTrimInput] = useState(true);
  const [encodeMode, setEncodeMode] = useState<EncodeMode>("named");
  const [encodeUnsafeOnly, setEncodeUnsafeOnly] = useState(true);
  const [encodeIncludeSlash, setEncodeIncludeSlash] = useState(false);
  const [warning, setWarning] = useState("");
  const [processing, setProcessing] = useState(false);
  const [decodeProgress, setDecodeProgress] = useState(0);
  const [outputView, setOutputView] = useState<"output" | "diff">("output");
  const [lastStats, setLastStats] = useState<TransformStats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [compareEntry, setCompareEntry] = useState<HistoryEntry | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerRequestId = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const lastRunSourceRef = useRef<"manual" | "auto">("manual");
  const pendingInputRef = useRef("");
  const encodeOptionsRef = useRef({
    encodeMode,
    encodeUnsafeOnly,
    encodeIncludeSlash,
  });

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./html-entities.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, type, output: nextOutput, progress, error: workerError, entityCount } = event.data;
      if (id !== workerRequestId.current) return;
      if (type === "progress") {
        if (typeof progress === "number") {
          setDecodeProgress(progress);
          setStatus(`Decoding... ${Math.round(progress * 100)}%`);
        }
        return;
      }
      setProcessing(false);
      setDecodeProgress(0);
      if (type === "done") {
        const finalOutput = nextOutput ?? "";
        setOutput(finalOutput);
        setError("");
        setStatus("Decoded");
        setCompareEntry(null);
        const durationMs = Math.max(0, Math.round((startTimeRef.current ?? 0) ? nowMs() - (startTimeRef.current ?? 0) : 0));
        const stats = recordStats(
          pendingInputRef.current,
          finalOutput,
          typeof entityCount === "number" ? entityCount : 0,
          durationMs,
          "decode"
        );
        if (lastRunSourceRef.current === "manual") {
          const encodeOptions = encodeOptionsRef.current;
          pushHistory({
            id: buildHistoryId(),
            mode: "decode",
            input: pendingInputRef.current,
            output: finalOutput,
            stats,
            encodeMode: encodeOptions.encodeMode,
            encodeUnsafeOnly: encodeOptions.encodeUnsafeOnly,
            encodeIncludeSlash: encodeOptions.encodeIncludeSlash,
            createdAt: Date.now(),
          });
        }
      } else {
        setError(workerError || "Unable to decode entities in this input. Check for malformed entity strings.");
        setOutput("");
        setStatus("Decode failed");
      }
    };
    worker.onerror = () => {
      setProcessing(false);
      setDecodeProgress(0);
      setError("Worker error while decoding. Try smaller input.");
      setOutput("");
      setStatus("Decode failed");
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    encodeOptionsRef.current = { encodeMode, encodeUnsafeOnly, encodeIncludeSlash };
  }, [encodeMode, encodeUnsafeOnly, encodeIncludeSlash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("html-entities-history");
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryEntry[];
        if (Array.isArray(parsed)) {
          setHistory(parsed);
          setHistoryIndex(parsed.length - 1);
        }
      }
    } catch (err) {
      console.error("Failed to load html entities history", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("html-entities-history", JSON.stringify(history));
    } catch (err) {
      console.error("Failed to save html entities history", err);
    }
  }, [history]);

  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  const buildHistoryId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const recordStats = (
    inputText: string,
    outputText: string,
    entityCount: number,
    durationMs: number,
    actionMode: "encode" | "decode"
  ) => {
    const inputLength = inputText.length;
    const outputLength = outputText.length;
    const deltaChars = outputLength - inputLength;
    const deltaPercent = inputLength ? Math.round((deltaChars / inputLength) * 100) : 0;
    const stats = { inputLength, outputLength, entityCount, durationMs, deltaChars, deltaPercent, mode: actionMode };
    setLastStats(stats);
    return stats;
  };

  const pushHistory = (entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = [...prev, entry].slice(-10);
      setHistoryIndex(next.length - 1);
      return next;
    });
  };

  const loadHistoryEntry = (entry: HistoryEntry) => {
    setInput(entry.input);
    setOutput(entry.output);
    setMode(entry.mode);
    setEncodeMode(entry.encodeMode);
    setEncodeUnsafeOnly(entry.encodeUnsafeOnly);
    setEncodeIncludeSlash(entry.encodeIncludeSlash);
    setError("");
    setWarning("");
    setProcessing(false);
    setDecodeProgress(0);
    setOutputView("output");
    setCompareEntry(null);
    setStatus("History loaded");
    setLastStats(entry.stats);
  };

  const suggestion = useMemo(() => {
    if (!input) return null;
    const entityMatches = input.match(ENTITY_PATTERN) ?? [];
    const entityCount = entityMatches.length;
    const hasMarkup = /<[^>]+>/.test(input);
    const hasRawAmpersand = /&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;|nbsp;)/.test(input);
    if (entityCount >= 3 || entityCount >= Math.max(2, Math.round(input.length / 15))) {
      return { mode: "decode" as const, reason: `${entityCount} entity patterns detected` };
    }
    if (hasMarkup && hasRawAmpersand) {
      return { mode: "encode" as const, reason: "Raw HTML with unescaped & detected" };
    }
    return null;
  }, [input]);

  const diffSource = useMemo(() => {
    if (compareEntry) {
      return {
        left: compareEntry.output,
        right: output,
        leftLabel: "History output",
        rightLabel: "Current output",
      };
    }
    return { left: input, right: output, leftLabel: "Input", rightLabel: "Output" };
  }, [compareEntry, input, output]);

  const diffLines = useMemo(() => {
    if (!diffSource.left && !diffSource.right) return [];
    return buildLineDiff(diffSource.left, diffSource.right);
  }, [diffSource]);

  const statsSummary = useMemo(() => {
    if (!lastStats) return null;
    const deltaSign = lastStats.deltaChars > 0 ? "+" : "";
    const percentSign = lastStats.deltaPercent > 0 ? "+" : "";
    return {
      deltaText: `${deltaSign}${lastStats.deltaChars.toLocaleString()} chars`,
      percentText: `${percentSign}${lastStats.deltaPercent}%`,
    };
  }, [lastStats]);

  const normalizeInput = (value: string) => (trimInput ? value.trim() : value);

  const encodeValue = (text: string) => {
    workerRequestId.current += 1;
    setProcessing(false);
    setDecodeProgress(0);
    const { output: encoded, count } = encodeEntities(text, {
      mode: encodeMode,
      unsafeOnly: encodeUnsafeOnly,
      includeSlash: encodeIncludeSlash,
    });
    setOutput(encoded);
    setError("");
    setStatus("Encoded");
    setCompareEntry(null);
    const durationMs = Math.max(0, Math.round((startTimeRef.current ?? 0) ? nowMs() - (startTimeRef.current ?? 0) : 0));
    const stats = recordStats(text, encoded, count, durationMs, "encode");
    if (lastRunSourceRef.current === "manual") {
      pushHistory({
        id: buildHistoryId(),
        mode: "encode",
        input: text,
        output: encoded,
        stats,
        encodeMode,
        encodeUnsafeOnly,
        encodeIncludeSlash,
        createdAt: Date.now(),
      });
    }
  };

  const decodeValue = (text: string) => {
    const { output: decoded, count } = decodeEntities(text);
    setOutput(decoded);
    setError("");
    setStatus("Decoded");
    setCompareEntry(null);
    const durationMs = Math.max(0, Math.round((startTimeRef.current ?? 0) ? nowMs() - (startTimeRef.current ?? 0) : 0));
    const stats = recordStats(text, decoded, count, durationMs, "decode");
    if (lastRunSourceRef.current === "manual") {
      pushHistory({
        id: buildHistoryId(),
        mode: "decode",
        input: text,
        output: decoded,
        stats,
        encodeMode,
        encodeUnsafeOnly,
        encodeIncludeSlash,
        createdAt: Date.now(),
      });
    }
  };

  const runTransform = (direction: "encode" | "decode", source: "manual" | "auto" = "manual") => {
    lastRunSourceRef.current = source;
    const text = normalizeInput(input);
    if (!text) {
      workerRequestId.current += 1;
      setProcessing(false);
      setDecodeProgress(0);
      setError("Enter text to process.");
      setOutput("");
      setStatus("No input");
      return;
    }
    startTimeRef.current = nowMs();
    pendingInputRef.current = text;
    if (text.length > 50_000) {
      setWarning(`Large input detected (${text.length.toLocaleString()} chars). Processing may be slow.`);
    } else {
      setWarning("");
    }

    if (direction === "encode") encodeValue(text);
    else handleDecode(text);
  };

  const handleDecode = (value?: string) => {
    try {
      const normalized = value ?? normalizeInput(input);
      if (workerRef.current && normalized.length > 50_000) {
        const id = (workerRequestId.current += 1);
        setProcessing(true);
        setDecodeProgress(0);
        setError("");
        setStatus("Decoding large input...");
        startTimeRef.current = nowMs();
        pendingInputRef.current = normalized;
        workerRef.current.postMessage({ id, text: normalized } satisfies WorkerRequest);
        return;
      }
      workerRequestId.current += 1;
      setProcessing(false);
      setDecodeProgress(0);
      decodeValue(normalized);
    } catch (err) {
      console.error("Decode error", err);
      setError("Unable to decode entities in this input. Check for malformed entity strings.");
      setOutput("");
      setStatus("Decode failed");
    }
  };

  const handleCopyInput = async () => {
    try {
      await navigator.clipboard.writeText(input);
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 1200);
      setStatus("Copied input");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 1200);
      setStatus("Copied output");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    const content = output || input;
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `html-entities-${mode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const handleSwap = () => {
    if (!input && !output) return;
    const nextInput = output;
    const nextOutput = input;
    setInput(nextInput);
    setOutput(nextOutput);
    setCompareEntry(null);
    setError("");
    setStatus("Swapped");
    if (autoRun && nextInput) {
      lastRunSourceRef.current = "manual";
      startTimeRef.current = nowMs();
      pendingInputRef.current = nextInput;
      pendingModeRef.current = mode;
      if (nextInput.length > 50_000) {
        setWarning(`Large input detected (${nextInput.length.toLocaleString()} chars). Processing may be slow.`);
      } else {
        setWarning("");
      }
      if (mode === "encode") encodeValue(nextInput);
      else handleDecode(nextInput);
    }
  };

  const handleHistoryBack = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    setHistoryIndex(nextIndex);
    const entry = history[nextIndex];
    if (entry) loadHistoryEntry(entry);
  };

  const handleHistoryForward = () => {
    if (historyIndex < 0 || historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    const entry = history[nextIndex];
    if (entry) loadHistoryEntry(entry);
  };

  const applyAuto = (next: string) => {
    setInput(next);
    if (autoRun) {
      runTransform(mode, "auto");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error} {warning}
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
              HTML Entities
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">HTML Entity Encoder/Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Escape or unescape HTML entities to keep content safe or readable. Runs entirely in your browser.
        </p>
        <p className="text-sm font-medium text-emerald-700">All processing runs locally in your browser.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="mode-select">
              Mode
            </label>
            <select
              id="mode-select"
              value={mode}
              onChange={(event) => {
                const nextMode = event.target.value === "decode" ? "decode" : "encode";
                setMode(nextMode);
                if (autoRun) runTransform(nextMode, "auto");
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Select encode or decode mode"
            >
              <option value="encode">Encode</option>
              <option value="decode">Decode</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(event) => setAutoRun(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Toggle auto run on change"
              />
              Auto-run
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={trimInput}
                onChange={(event) => setTrimInput(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Toggle trim whitespace before processing"
              />
              Trim input
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700" htmlFor="encoding-select">
              Encoding
            </label>
            <select
              id="encoding-select"
              value={encodeMode}
              onChange={(event) => {
                const nextMode = event.target.value as EncodeMode;
                setEncodeMode(nextMode);
                if (autoRun && mode === "encode") runTransform("encode", "auto");
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-70"
              aria-label="Select encoding output style"
              disabled={mode === "decode"}
            >
              <option value="named">Named + numeric fallback</option>
              <option value="numeric">Numeric (decimal)</option>
              <option value="hex">Numeric (hex)</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={encodeUnsafeOnly}
                onChange={(event) => {
                  setEncodeUnsafeOnly(event.target.checked);
                  if (autoRun && mode === "encode") runTransform("encode", "auto");
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Encode only unsafe HTML characters"
                disabled={mode === "decode"}
              />
              Unsafe-only
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={encodeIncludeSlash}
                onChange={(event) => {
                  setEncodeIncludeSlash(event.target.checked);
                  if (autoRun && mode === "encode") runTransform("encode", "auto");
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Include forward slash when encoding unsafe characters"
                disabled={mode === "decode"}
              />
              Include slash
            </label>
          </div>
          {suggestion && suggestion.mode !== mode ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Suggestion: switch to <strong className="font-semibold">{suggestion.mode}</strong> ({suggestion.reason}).
                </span>
                <button
                  onClick={() => {
                    setMode(suggestion.mode);
                    if (autoRun) runTransform(suggestion.mode, "manual");
                  }}
                  className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-950 transition hover:bg-amber-300"
                  aria-label={`Switch to ${suggestion.mode} mode`}
                >
                  Switch to {suggestion.mode}
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => runTransform("encode", "manual")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Encode HTML entities"
              disabled={processing}
            >
              Encode
            </button>
            <button
              onClick={() => runTransform("decode", "manual")}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Decode HTML entities"
              disabled={processing}
            >
              Decode
            </button>
            <button
              onClick={() => {
                workerRequestId.current += 1;
                setInput("");
                setOutput("");
                setError("");
                setStatus("Cleared");
                setWarning("");
                setProcessing(false);
                setDecodeProgress(0);
                setLastStats(null);
                setCompareEntry(null);
                setCopiedInput(false);
                setCopiedOutput(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Clear input and output"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={handleSwap}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Swap input and output"
              disabled={!input && !output}
            >
              Swap
            </button>
            <button
              onClick={handleCopyInput}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Copy input"
              disabled={!input}
            >
              {copiedInput ? "Copied input" : "Copy input"}
            </button>
            <button
              onClick={handleDownload}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Download output"
              disabled={!output && !input}
            >
              Download
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                applyAuto('<div class="card">Tom &amp; Jerry\'s "best" episode</div>')
              }
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load sample HTML snippet"
            >
              Sample HTML
            </button>
            <button
              onClick={() => applyAuto('Quotes: "double" & \'single\' & ampersand &')}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load sample text"
            >
              Sample text
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => applyAuto(event.target.value)}
            placeholder="Paste text or HTML to encode/decode"
            aria-label="Input text to encode or decode"
          />
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: encode before embedding user input; decode to review stored entities.
            </p>
          )}
          {warning ? <p className="text-sm font-medium text-amber-600">{warning}</p> : null}
          {processing && mode === "decode" ? (
            <p className="text-sm text-slate-600">
              Decoding{decodeProgress ? `... ${Math.round(decodeProgress * 100)}%` : "..."}
            </p>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stats</p>
            <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Input length</p>
                <p className="font-semibold text-slate-900">
                  {lastStats ? lastStats.inputLength.toLocaleString() : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Output length</p>
                <p className="font-semibold text-slate-900">
                  {lastStats ? lastStats.outputLength.toLocaleString() : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Entities</p>
                <p className="font-semibold text-slate-900">
                  {lastStats
                    ? `${lastStats.entityCount.toLocaleString()} ${lastStats.mode === "decode" ? "decoded" : "encoded"}`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Time</p>
                <p className="font-semibold text-slate-900">
                  {lastStats ? `${lastStats.durationMs.toLocaleString()} ms` : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Change</p>
                <p className="font-semibold text-slate-900">
                  {statsSummary ? `${statsSummary.deltaText} (${statsSummary.percentText})` : "--"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHistoryBack}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={historyIndex <= 0}
                  aria-label="Previous history item"
                >
                  Back
                </button>
                <button
                  onClick={handleHistoryForward}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={historyIndex < 0 || historyIndex >= history.length - 1}
                  aria-label="Next history item"
                >
                  Forward
                </button>
              </div>
            </div>
            {history.length ? (
              <div className="mt-3 space-y-2">
                {history
                  .slice()
                  .reverse()
                  .map((entry, idx) => {
                    const actualIndex = history.length - 1 - idx;
                    return (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {entry.mode.toUpperCase()} · {new Date(entry.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-slate-600">
                          {entry.input.slice(0, 48) || "Empty input"}
                          {entry.input.length > 48 ? "..." : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setHistoryIndex(actualIndex);
                            loadHistoryEntry(entry);
                          }}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                          aria-label="Load history entry"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            setCompareEntry(entry);
                            setOutputView("diff");
                            setStatus("Comparing output with history");
                          }}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                          aria-label="Compare output with history"
                          disabled={!output}
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  );
                  })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Run a transform to build history.</p>
            )}
          </div>
        </div>

        <div
          className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-labelledby="html-entities-output"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <p id="html-entities-output" className="text-sm font-semibold">
                Output
              </p>
              {compareEntry ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
                  Comparing history
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOutputView("output")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  outputView === "output" ? "bg-white text-slate-900" : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                aria-label="View output"
              >
                Output
              </button>
              <button
                onClick={() => setOutputView("diff")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  outputView === "diff" ? "bg-white text-slate-900" : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                aria-label="View diff"
              >
                Diff
              </button>
              {compareEntry ? (
                <button
                  onClick={() => setCompareEntry(null)}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/20"
                  aria-label="Clear history comparison"
                >
                  Clear compare
                </button>
              ) : null}
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!output}
                aria-label="Copy output"
              >
                {copiedOutput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedOutput ? "Copied output" : "Copy output"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {outputView === "output" ? (
              <pre className="text-sm leading-relaxed text-slate-100">
                {output || "Result will appear here."}
              </pre>
            ) : null}
            {outputView === "diff" ? (
              output || diffSource.left ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{diffSource.leftLabel}</p>
                      <div className="mt-2 grid min-w-0 grid-cols-[auto_1fr] gap-x-3 overflow-x-auto font-mono text-xs leading-5">
                        {diffLines.map((line, idx) => (
                          <div key={`left-${idx}`} className="contents">
                            <div
                              className={`text-right text-slate-500 ${line.type === "remove" ? "text-rose-300" : ""}`}
                            >
                              {line.leftLine ?? ""}
                            </div>
                            <div
                              className={`${
                                line.type === "remove" ? "bg-rose-500/15 text-rose-100" : "text-slate-100"
                              } whitespace-pre-wrap break-words`}
                            >
                              {line.leftText || " "}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{diffSource.rightLabel}</p>
                      <div className="mt-2 grid min-w-0 grid-cols-[auto_1fr] gap-x-3 overflow-x-auto font-mono text-xs leading-5">
                        {diffLines.map((line, idx) => (
                          <div key={`right-${idx}`} className="contents">
                            <div
                              className={`text-right text-slate-500 ${line.type === "add" ? "text-emerald-300" : ""}`}
                            >
                              {line.rightLine ?? ""}
                            </div>
                            <div
                              className={`${
                                line.type === "add" ? "bg-emerald-500/15 text-emerald-100" : "text-slate-100"
                              } whitespace-pre-wrap break-words`}
                            >
                              {line.rightText || " "}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Diff will appear here.</p>
              )
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Choose encode or decode, paste your text, and run (auto-run is on by default).</li>
          <li>Use Trim input to remove leading/trailing whitespace before processing.</li>
          <li>Copy or download the result; large inputs show a warning.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes, all processing happens in your browser.</p>
          <p><strong>Why encode?</strong> Encoding prevents browsers from treating user input as markup (avoids XSS/layout issues).</p>
          <p><strong>Big inputs?</strong> Very large inputs may be slower; you’ll see a warning so you can decide.</p>
        </div>
      </div>
    </main>
  );
}
