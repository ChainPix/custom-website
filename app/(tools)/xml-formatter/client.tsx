"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  indentSize: number;
  indentStyle: "spaces" | "tabs";
  inlineMixedContent: boolean;
  formatMode: "prettify" | "minify";
  formatOnPaste: boolean;
  autoFormat: boolean;
  sortAttributes: boolean;
  removeEmptyTextNodes: boolean;
  whitespaceMode: "preserve" | "trim";
  keepSingleLine: boolean;
  keepSingleLineLimit: number;
};

type XmlParseLocation = {
  line: number;
  column: number;
};

type DiffRow = {
  left: string;
  right: string;
  leftNumber: number | null;
  rightNumber: number | null;
  type: "equal" | "change" | "add" | "remove";
};

type WorkerFormatRequest = {
  type: "format";
  requestId: number;
  payload: {
    input: string;
    indentSize: number;
    indentStyle: "spaces" | "tabs";
    inlineMixedContent: boolean;
    formatMode: "prettify" | "minify";
    sortAttributes: boolean;
    removeEmptyTextNodes: boolean;
    whitespaceMode: "preserve" | "trim";
    keepSingleLineLimit: number;
  };
};

type WorkerFormatResult = {
  type: "result";
  requestId: number;
  output: string;
  error?: string;
  location?: XmlParseLocation | null;
  durationMs?: number;
};

const sampleXml = `<note>
  <to>Tove</to>
  <from>Jani</from>
  <heading>Reminder</heading>
  <body>Don't forget me this weekend!</body>
  <p>Hello, <b>world</b>!</p>
</note>`;

export default function XmlFormatterClient() {
  const [input, setInput] = useState(sampleXml);
  const [output, setOutput] = useState("");
  const [options, setOptions] = useState<Options>({
    indentSize: 2,
    indentStyle: "spaces",
    inlineMixedContent: true,
    formatMode: "prettify",
    formatOnPaste: false,
    autoFormat: false,
    sortAttributes: false,
    removeEmptyTextNodes: true,
    whitespaceMode: "preserve",
    keepSingleLine: true,
    keepSingleLineLimit: 80,
  });
  const [error, setError] = useState("");
  const [errorLocation, setErrorLocation] = useState<XmlParseLocation | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [outputView, setOutputView] = useState<"formatted" | "diff">("formatted");
  const [lastFormattedInput, setLastFormattedInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pasteRunRef = useRef(0);
  const autoFormatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = useMemo(() => {
    if (isFormatting) return "Formatting...";
    if (error) return error;
    if (output) return "Formatted successfully";
    return "Awaiting input";
  }, [error, isFormatting, output]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./xml-formatter.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<WorkerFormatResult>) => {
      const message = event.data;
      if (!message || message.type !== "result") return;
      if (message.requestId !== requestIdRef.current) return;
      setIsFormatting(false);
      if (message.error) {
        setError(message.error);
        const location = message.location || null;
        setErrorLocation(location);
        setOutput("");
        if (location) highlightError(location);
        return;
      }
      setError("");
      setErrorLocation(null);
      setOutput(message.output);
    };
    workerRef.current = worker;
    return worker;
  };

  const requestFormat = (inputOverride?: string) => {
    setError("");
    setErrorLocation(null);
    setCopied(false);
    setCopiedInput(false);
    try {
      const rawInput = inputOverride ?? input;
      const trimmed = rawInput.trim();
      if (!trimmed) throw new Error("Enter XML to format.");
      if (rawInput.length > 200000) throw new Error("Input too large. Please limit to ~200KB.");
      setIsFormatting(true);
      setOutput("");
      setLastFormattedInput(rawInput);
      const worker = ensureWorker();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const message: WorkerFormatRequest = {
        type: "format",
        requestId,
        payload: {
          input: rawInput,
          indentSize: options.indentSize,
          indentStyle: options.indentStyle,
          inlineMixedContent: options.inlineMixedContent,
          formatMode: options.formatMode,
          sortAttributes: options.sortAttributes,
          removeEmptyTextNodes: options.removeEmptyTextNodes,
          whitespaceMode: options.whitespaceMode,
          keepSingleLineLimit: options.keepSingleLine ? options.keepSingleLineLimit : 0,
        },
      };
      worker.postMessage(message);
    } catch (err: any) {
      setIsFormatting(false);
      setError(err?.message || "Unable to format XML.");
      const location = err?.location || null;
      setErrorLocation(location);
      setOutput("");
      if (location) highlightError(location);
    }
  };

  const handleFormat = () => {
    requestFormat();
  };

  const highlightError = (location: XmlParseLocation) => {
    const target = inputRef.current;
    if (!target) return;
    const lines = input.split(/\r?\n/);
    const lineIndex = Math.max(location.line - 1, 0);
    if (lineIndex >= lines.length) return;
    const columnIndex = Math.max(location.column - 1, 0);
    const offset =
      lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length, 0) + lineIndex;
    const start = Math.min(offset + columnIndex, input.length);
    const lineLength = lines[lineIndex]?.length ?? 0;
    const highlightLength = Math.max(1, Math.min(20, lineLength - columnIndex));
    const end = Math.min(start + highlightLength, input.length);
    target.focus();
    target.setSelectionRange(start, end);
  };

  const handleFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xml", "xsd", "wsdl"].includes(extension)) {
      setError("Unsupported file type. Upload .xml, .xsd, or .wsdl files.");
      return;
    }
    if (file.size > 200000) {
      setError("File too large. Please limit to ~200KB.");
      return;
    }
    try {
      const text = await file.text();
      setInput(text);
      setFileInfo({ name: file.name, size: file.size });
      setError("");
      setErrorLocation(null);
      setOutput("");
      setLastFormattedInput("");
      if (options.autoFormat) {
        requestFormat(text);
      }
    } catch (err) {
      setError("Unable to read the file.");
    }
  };

  useEffect(() => {
    if (!options.autoFormat) return;
    if (!input.trim()) return;
    if (input.length > 200000) return;
    if (autoFormatTimerRef.current) clearTimeout(autoFormatTimerRef.current);
    autoFormatTimerRef.current = setTimeout(() => {
      requestFormat();
    }, 650);
    return () => {
      if (autoFormatTimerRef.current) clearTimeout(autoFormatTimerRef.current);
    };
  }, [
    input,
    options.autoFormat,
    options.indentSize,
    options.indentStyle,
    options.inlineMixedContent,
    options.formatMode,
    options.sortAttributes,
    options.removeEmptyTextNodes,
    options.whitespaceMode,
    options.keepSingleLine,
    options.keepSingleLineLimit,
  ]);

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyInput = async () => {
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input);
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const diffRows = useMemo(() => {
    if (!output || !lastFormattedInput) return [];
    const leftLines = lastFormattedInput.split(/\r?\n/);
    const rightLines = output.split(/\r?\n/);
    const maxLines = Math.max(leftLines.length, rightLines.length);
    const rows: DiffRow[] = [];
    for (let i = 0; i < maxLines; i += 1) {
      const leftLine = leftLines[i];
      const rightLine = rightLines[i];
      if (leftLine === undefined) {
        rows.push({
          left: "",
          right: rightLine ?? "",
          leftNumber: null,
          rightNumber: i + 1,
          type: "add",
        });
      } else if (rightLine === undefined) {
        rows.push({
          left: leftLine,
          right: "",
          leftNumber: i + 1,
          rightNumber: null,
          type: "remove",
        });
      } else {
        rows.push({
          left: leftLine,
          right: rightLine,
          leftNumber: i + 1,
          rightNumber: i + 1,
          type: leftLine === rightLine ? "equal" : "change",
        });
      }
    }
    return rows;
  }, [lastFormattedInput, output]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
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
              XML Formatter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">XML Formatter & Validator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Beautify and validate XML with indentation options. Runs entirely in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              Indent:
              <select
                value={
                  options.indentStyle === "tabs"
                    ? "tabs"
                    : options.indentSize === 2
                    ? "2"
                    : options.indentSize === 4
                    ? "4"
                    : "custom"
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "tabs") {
                    setOptions((prev) => ({ ...prev, indentStyle: "tabs" }));
                    return;
                  }
                  if (value === "2" || value === "4") {
                    setOptions((prev) => ({
                      ...prev,
                      indentStyle: "spaces",
                      indentSize: Number(value),
                    }));
                    return;
                  }
                  setOptions((prev) => ({
                    ...prev,
                    indentStyle: "spaces",
                    indentSize: [2, 4].includes(prev.indentSize) ? 3 : prev.indentSize,
                  }));
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="tabs">Tabs</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {options.indentStyle === "spaces" && ![2, 4].includes(options.indentSize) ? (
              <label className="flex items-center gap-2">
                Custom:
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={options.indentSize}
                  onChange={(e) => {
                    const nextValue = Math.max(1, Math.min(8, Number(e.target.value) || 1));
                    setOptions((prev) => ({ ...prev, indentSize: nextValue, indentStyle: "spaces" }));
                  }}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            ) : null}
            <div className="flex items-center rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => setOptions((prev) => ({ ...prev, formatMode: "prettify" }))}
                className={`rounded-full px-3 py-1 transition ${
                  options.formatMode === "prettify"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
                aria-pressed={options.formatMode === "prettify"}
              >
                Format
              </button>
              <button
                type="button"
                onClick={() => setOptions((prev) => ({ ...prev, formatMode: "minify" }))}
                className={`rounded-full px-3 py-1 transition ${
                  options.formatMode === "minify"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
                aria-pressed={options.formatMode === "minify"}
              >
                Minify
              </button>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.inlineMixedContent}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, inlineMixedContent: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Inline text nodes (mixed content safe)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.sortAttributes}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, sortAttributes: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Sort attributes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.removeEmptyTextNodes}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, removeEmptyTextNodes: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Remove empty text nodes
            </label>
            <label className="flex items-center gap-2">
              Whitespace:
              <select
                value={options.whitespaceMode}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    whitespaceMode: e.target.value as "preserve" | "trim",
                  }))
                }
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="preserve">Preserve</option>
                <option value="trim">Trim text nodes</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.keepSingleLine}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, keepSingleLine: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Keep small elements on one line
            </label>
            {options.keepSingleLine ? (
              <label className="flex items-center gap-2">
                Max chars:
                <input
                  type="number"
                  min={20}
                  max={200}
                  value={options.keepSingleLineLimit}
                  onChange={(e) => {
                    const nextValue = Math.max(20, Math.min(200, Number(e.target.value) || 80));
                    setOptions((prev) => ({ ...prev, keepSingleLineLimit: nextValue }));
                  }}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            ) : null}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.formatOnPaste}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, formatOnPaste: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Format on paste
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.autoFormat}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, autoFormat: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Auto-format (debounced)
            </label>
            <button
              onClick={() => {
                setInput(sampleXml);
                setOutput("");
                setError("");
                setOptions({
                  indentSize: 2,
                  indentStyle: "spaces",
                  inlineMixedContent: true,
                  formatMode: "prettify",
                  formatOnPaste: false,
                  autoFormat: false,
                  sortAttributes: false,
                  removeEmptyTextNodes: true,
                  whitespaceMode: "preserve",
                  keepSingleLine: true,
                  keepSingleLineLimit: 80,
                });
                setCopied(false);
                setCopiedInput(false);
                setFileInfo(null);
                setOutputView("formatted");
                setLastFormattedInput("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset to sample"
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
              className="h-[200px] w-full resize-none bg-white text-sm text-slate-800 focus:outline-none"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPaste={() => {
                if (!options.formatOnPaste) return;
                const runId = pasteRunRef.current + 1;
                pasteRunRef.current = runId;
                setTimeout(() => {
                  if (pasteRunRef.current !== runId) return;
                  requestFormat(inputRef.current?.value);
                }, 0);
              }}
              spellCheck={false}
              placeholder="Paste XML here..."
              aria-label="XML input"
              ref={inputRef}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,.xsd,.wsdl,application/xml,text/xml"
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
                aria-label="Upload XML file"
                type="button"
              >
                Upload .xml/.xsd/.wsdl
              </button>
              <span>{dragActive ? "Drop to load file" : "Drag & drop a XML file"}</span>
              {fileInfo ? (
                <span className="text-slate-500">
                  Loaded: {fileInfo.name} · {(fileInfo.size / 1024).toFixed(1)} KB
                </span>
              ) : null}
            </div>
          </div>

          <button
            onClick={handleFormat}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Format XML"
            disabled={isFormatting}
          >
            {isFormatting
              ? "Formatting..."
              : options.formatMode === "minify"
              ? "Minify XML"
              : "Format XML"}
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <button
              onClick={handleCopyInput}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy input XML"
              type="button"
            >
              {copiedInput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedInput ? "Copied input" : "Copy input"}
            </button>
            {options.formatOnPaste ? <span>Paste will format automatically.</span> : null}
          </div>
          {error ? (
            <div className="space-y-2 text-sm text-amber-600">
              <p className="font-medium">{error}</p>
              {errorLocation ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-700">
                  <span>
                    Line {errorLocation.line}, Column {errorLocation.column}
                  </span>
                  <button
                    onClick={() => highlightError(errorLocation)}
                    className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                    type="button"
                  >
                    Jump to error
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-600">{status}</p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="output-heading">
              {outputView === "diff" ? "XML Diff" : "Formatted XML"}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full bg-white/10 p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setOutputView("formatted")}
                  className={`rounded-full px-3 py-1 transition ${
                    outputView === "formatted" ? "bg-white text-slate-900" : "text-white/70"
                  }`}
                  aria-pressed={outputView === "formatted"}
                >
                  Output
                </button>
                <button
                  type="button"
                  onClick={() => setOutputView("diff")}
                  className={`rounded-full px-3 py-1 transition ${
                    outputView === "diff" ? "bg-white text-slate-900" : "text-white/70"
                  }`}
                  aria-pressed={outputView === "diff"}
                >
                  Diff
                </button>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output || isFormatting}
                aria-label="Copy formatted XML"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output || isFormatting}
                aria-label="Download formatted XML"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          {outputView === "diff" ? (
            output ? (
              <div
                className="flex-1 overflow-auto p-4 text-xs text-slate-100"
                role="region"
                aria-labelledby="output-heading"
              >
                <div className="grid min-w-[520px] grid-cols-2 text-slate-300">
                  <div className="border-b border-slate-800 pb-2 text-xs font-semibold uppercase tracking-wide">
                    Original
                  </div>
                  <div className="border-b border-slate-800 pb-2 text-xs font-semibold uppercase tracking-wide">
                    {options.formatMode === "minify" ? "Minified" : "Formatted"}
                  </div>
                </div>
                <div className="divide-y divide-slate-800 font-mono">
                  {diffRows.map((row, index) => {
                    const leftBg =
                      row.type === "remove"
                        ? "bg-rose-900/30"
                        : row.type === "change"
                        ? "bg-amber-900/30"
                        : "";
                    const rightBg =
                      row.type === "add"
                        ? "bg-emerald-900/30"
                        : row.type === "change"
                        ? "bg-amber-900/30"
                        : "";
                    const leftText = row.left === "" ? " " : row.left;
                    const rightText = row.right === "" ? " " : row.right;
                    return (
                      <div className="grid grid-cols-2" key={`${row.type}-${index}`}>
                        <div className={`flex gap-3 px-2 py-1 ${leftBg}`}>
                          <span className="w-8 text-right text-slate-500">
                            {row.leftNumber ?? ""}
                          </span>
                          <span className="whitespace-pre">{leftText}</span>
                        </div>
                        <div className={`flex gap-3 px-2 py-1 ${rightBg}`}>
                          <span className="w-8 text-right text-slate-500">
                            {row.rightNumber ?? ""}
                          </span>
                          <span className="whitespace-pre">{rightText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 px-4 py-4 text-sm text-slate-300">
                Diff view appears after formatting XML.
              </div>
            )
          ) : (
            <pre
              className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="output-heading"
            >
              {isFormatting
                ? "Formatting..."
                : output || "Your formatted XML will appear here after validation."}
            </pre>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste your XML and choose indent size (2 or 4 spaces).</li>
          <li>Click Format to validate and beautify the XML.</li>
          <li>Copy or download the formatted XML.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>Parsing runs locally in your browser; XML is not uploaded.</p>
          <p>Very large documents are capped (~200KB) to keep the UI responsive.</p>
        </div>
      </div>
    </main>
  );
}
