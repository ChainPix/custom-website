"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, Loader2, RefreshCcw } from "lucide-react";

type Language = "html" | "css" | "js";
type Mode = "minify" | "pretty";
type IndentStyle = "spaces-2" | "spaces-4" | "tabs";

type Options = {
  stripComments: boolean;
  normalizeWhitespace: boolean;
  indentStyle: IndentStyle;
};

type WorkerResponse = {
  id: number;
  output?: string;
  duration?: number;
  error?: string;
};

type DiffLine = {
  type: "same" | "add" | "remove";
  leftText: string;
  rightText: string;
  leftLine?: number;
  rightLine?: number;
};

type HistoryEntry = {
  input: string;
  output: string;
  lang: Language;
  mode: Mode;
  safeMode: boolean;
  options: Options;
  filename: string;
};

const detectLanguage = (code: string): Language | null => {
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("<")) return "html";
  if (/[{;]\s*[\w-]+\s*:/.test(trimmed)) return "css";
  if (/\b(function|const|let|=>)\b/.test(trimmed)) return "js";
  return null;
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

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const estimateGzipBytes = async (text: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  if (typeof CompressionStream === "undefined") {
    return Math.max(1, Math.round(data.length * 0.35));
  }
  const stream = new CompressionStream("gzip");
  const compressedStream = new Blob([data]).stream().pipeThrough(stream);
  const blob = await new Response(compressedStream).blob();
  return blob.size;
};

const STORAGE_KEY = "code-minifier-state-v1";

export default function CodeMinifierClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [lang, setLang] = useState<Language>("html");
  const [mode, setMode] = useState<Mode>("minify");
  const [autoDetect, setAutoDetect] = useState(true);
  const [safeMode, setSafeMode] = useState(true);
  const [filename, setFilename] = useState("");
  const [outputView, setOutputView] = useState<"output" | "diff">("output");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreSession, setRestoreSession] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [options, setOptions] = useState<Options>({
    stripComments: true,
    normalizeWhitespace: true,
    indentStyle: "spaces-2",
  });
  const [stats, setStats] = useState<{
    beforeChars: number;
    afterChars: number;
    beforeLines: number;
    afterLines: number;
    gzipBytes?: number;
  }>({ beforeChars: 0, afterChars: 0, beforeLines: 0, afterLines: 0 });
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const requestInputRef = useRef("");

  const pushHistory = (next: HistoryEntry) => {
    setHistory((prev) => [next, ...prev].slice(0, 10));
  };

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./code-minifier.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (message.id !== requestIdRef.current) return;
      setIsProcessing(false);
      if (message.error) {
        setError("Unable to convert this code. Check syntax or try Safe Mode.");
        setStatus("Conversion failed");
        return;
      }
      const outputText = message.output ?? "";
      const inputText = requestInputRef.current;
      setOutput(outputText);
      setStats({
        beforeChars: inputText.length,
        afterChars: outputText.length,
        beforeLines: inputText.split("\n").length,
        afterLines: outputText.split("\n").length,
        gzipBytes: undefined,
      });
      setError("");
      setStatus(message.duration ? `Conversion complete in ${message.duration}ms` : "Conversion complete");
      void estimateGzipBytes(outputText).then((gzipBytes) => {
        if (message.id !== requestIdRef.current) return;
        setStats((prev) => ({ ...prev, gzipBytes }));
      });
    };
    workerRef.current = worker;
    return worker;
  };

  const handleConvert = () => {
    if (isProcessing) return;
    if (!input.trim()) {
      setOutput("");
      setError("Enter code to convert.");
      setStatus("No input provided");
      return;
    }
    const total = input.length;
    if (total > 200_000) {
      setWarning(`Large input (${total.toLocaleString()} chars). Processing may be slow; output may differ.`);
    } else {
      setWarning("");
    }
    setError("");
    pushHistory({ input, output, lang, mode, safeMode, options, filename });
    setStatus("Processing...");
    setIsProcessing(true);
    requestInputRef.current = input;
    const worker = ensureWorker();
    const nextId = requestIdRef.current + 1;
    requestIdRef.current = nextId;
    worker.postMessage({ id: nextId, code: input, lang, mode, options, safeMode });
  };

  const handleCancel = () => {
    if (!isProcessing) return;
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsProcessing(false);
    setStatus("Cancelled");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied output");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const ext = lang === "css" ? "css" : lang === "js" ? "js" : "html";
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ? `${filename}.${ext}` : `code-${mode}-${lang}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded output");
  };

  const handleUndo = () => {
    const [latest, ...rest] = history;
    if (!latest) return;
    setInput(latest.input);
    setOutput(latest.output);
    setLang(latest.lang);
    setMode(latest.mode);
    setSafeMode(latest.safeMode);
    setOptions(latest.options);
    setFilename(latest.filename);
    setHistory(rest);
    setStatus("Reverted last conversion");
    setStats({
      beforeChars: latest.input.length,
      afterChars: latest.output.length,
      beforeLines: latest.input.split("\n").length,
      afterLines: latest.output.split("\n").length,
      gzipBytes: undefined,
    });
    void estimateGzipBytes(latest.output).then((gzipBytes) => {
      setStats((prev) => ({ ...prev, gzipBytes }));
    });
  };

  const loadSample = (kind: Language) => {
    const samples: Record<Language, string> = {
      html: "<div class='card'>\n  <h1>Title</h1>\n  <p>Content here</p>\n</div>",
      css: "body {\n  margin: 0;\n  padding: 0;\n  color: #111;\n}\n.card { border: 1px solid #eee; }",
      js: "function greet(name) {\n  console.log('Hello, ' + name);\n}\ngreet('World');",
    };
    setLang(kind);
    setInput(samples[kind]);
    setStatus(`Loaded ${kind.toUpperCase()} sample`);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setHasSavedSession(Boolean(saved));
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (restoreSession) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as Partial<{
          input: string;
          output: string;
          lang: Language;
          mode: Mode;
          safeMode: boolean;
          options: Options;
          filename: string;
          autoDetect: boolean;
        }>;
        if (typeof parsed.input === "string") setInput(parsed.input);
        if (typeof parsed.output === "string") setOutput(parsed.output);
        if (parsed.lang) setLang(parsed.lang);
        if (parsed.mode) setMode(parsed.mode);
        if (typeof parsed.safeMode === "boolean") setSafeMode(parsed.safeMode);
        if (parsed.options) setOptions(parsed.options);
        if (typeof parsed.filename === "string") setFilename(parsed.filename);
        if (typeof parsed.autoDetect === "boolean") setAutoDetect(parsed.autoDetect);
        setStatus("Restored previous session");
      } catch (err) {
        console.error("Failed to restore session", err);
      }
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedSession(false);
  }, [restoreSession]);

  useEffect(() => {
    if (!restoreSession) return;
    const payload = {
      input,
      output,
      lang,
      mode,
      safeMode,
      options,
      filename,
      autoDetect,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setHasSavedSession(true);
  }, [restoreSession, input, output, lang, mode, safeMode, options, filename, autoDetect]);

  useEffect(() => {
    if (!autoDetect) return;
    const detected = detectLanguage(input);
    if (detected) setLang(detected);
  }, [autoDetect, input]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleConvert();
      }
      if ((event.key === "C" || event.key === "c") && event.shiftKey) {
        if (!output) return;
        event.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleConvert, handleCopy, output]);

  const savings = useMemo(() => {
    if (!stats.beforeChars) return null;
    const diff = stats.beforeChars - stats.afterChars;
    const percent = stats.beforeChars ? Math.round((diff / stats.beforeChars) * 100) : 0;
    return { diff, percent };
  }, [stats]);

  const diffLines = useMemo(() => {
    if (!input || !output) return [];
    return buildLineDiff(input, output);
  }, [input, output]);

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
              Code Minifier
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Code Minifier & Pretty Printer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Minify or pretty-print HTML, CSS, or JS. Lightweight formatting that runs in your browser.
        </p>
      </header>

      <div
        className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
        role="region"
        aria-label="Code input and options"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <select
            value={lang}
            onChange={(event) => {
              setLang(event.target.value as Language);
              setAutoDetect(false);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Language"
          >
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="js">JS</option>
          </select>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as Mode)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Mode"
          >
            <option value="minify">Minify</option>
            <option value="pretty">Pretty-print</option>
          </select>
          <button
            onClick={handleConvert}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Convert code"
            disabled={isProcessing}
          >
            Convert
          </button>
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
              aria-label="Cancel processing"
            >
              Cancel
            </button>
          ) : null}
          {isProcessing ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          ) : null}
          <button
            onClick={handleUndo}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            aria-label="Undo last conversion"
            disabled={!history.length}
          >
            Undo ({history.length})
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setStats({ beforeChars: 0, afterChars: 0, beforeLines: 0, afterLines: 0 });
              setStatus("Cleared");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Clear input and output"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadSample("html")}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load HTML sample"
            >
              HTML sample
            </button>
            <button
              type="button"
              onClick={() => loadSample("css")}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load CSS sample"
            >
              CSS sample
            </button>
            <button
              type="button"
              onClick={() => loadSample("js")}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load JavaScript sample"
            >
              JS sample
            </button>
          </div>
        </div>
        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste HTML, CSS, or JS depending on selection"
          aria-label="Code input"
        />
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : (
          <div className="text-sm text-slate-600 space-y-1">
            <p>Note: Lightweight formatter; may alter complex code. Consider full minifiers for production assets.</p>
            {warning ? (
              <p className="font-medium text-amber-700" role="alert">
                {warning}
              </p>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
            />
            Auto-detect language
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={restoreSession}
              onChange={(e) => setRestoreSession(e.target.checked)}
            />
            Restore previous session
          </label>
          {restoreSession && !hasSavedSession ? <span className="text-xs text-slate-500">No saved session yet.</span> : null}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
            />
            Safe Mode
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={options.stripComments}
              onChange={(e) => setOptions((prev) => ({ ...prev, stripComments: e.target.checked }))}
            />
            Strip comments
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={options.normalizeWhitespace}
              onChange={(e) => setOptions((prev) => ({ ...prev, normalizeWhitespace: e.target.checked }))}
            />
            Normalize whitespace
          </label>
          {mode === "pretty" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">Indent</span>
              <select
                value={options.indentStyle}
                onChange={(e) => setOptions((prev) => ({ ...prev, indentStyle: e.target.value as IndentStyle }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Indent style"
              >
                <option value="spaces-2">2 spaces</option>
                <option value="spaces-4">4 spaces</option>
                <option value="tabs">Tabs</option>
              </select>
            </div>
          ) : null}
        </div>
        {!safeMode ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            May break code. Disable Safe Mode only if you understand the risks.
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Filename
          <input
            type="text"
            value={filename}
            onChange={(event) => setFilename(event.target.value)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="optional-file-name"
            aria-label="Output filename"
          />
        </label>

        {stats.beforeChars ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
            <span>Before: {stats.beforeChars.toLocaleString()} chars / {stats.beforeLines} lines</span>
            <span>After: {stats.afterChars.toLocaleString()} chars / {stats.afterLines} lines</span>
            {savings ? <span>Savings: {savings.diff.toLocaleString()} chars ({savings.percent}% reduction)</span> : null}
            {typeof stats.gzipBytes === "number" ? <span>Gzip est: {formatBytes(stats.gzipBytes)}</span> : null}
          </div>
        ) : null}
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-label="Converted output"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Output</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOutputView("output")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                outputView === "output" ? "bg-white/20 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
              }`}
              aria-label="View output"
            >
              Output
            </button>
            <button
              onClick={() => setOutputView("diff")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                outputView === "diff" ? "bg-white/20 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label="View diff"
              disabled={!output}
            >
              Diff
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
              aria-label="Copy output"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
              aria-label="Download output"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
        {outputView === "output" ? (
          <pre className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
            {output || "Converted output will appear here."}
          </pre>
        ) : null}
        {outputView === "diff" ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Before</p>
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                {diffLines.map((line, idx) => (
                  <div key={`left-${idx}`} className="contents">
                    <div className={`text-right text-slate-500 ${line.type === "remove" ? "text-rose-300" : ""}`}>
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
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">After</p>
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                {diffLines.map((line, idx) => (
                  <div key={`right-${idx}`} className="contents">
                    <div className={`text-right text-slate-500 ${line.type === "add" ? "text-emerald-300" : ""}`}>
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
        ) : null}
      </div>
      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Choose language (HTML/CSS/JS) and mode (Minify or Pretty).</li>
          <li>Paste code or load a sample, adjust options (strip comments, normalize whitespace, indent style).</li>
          <li>Convert, then copy or download the output; review the before/after stats.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser; code is not uploaded.</p>
          <p><strong>Production use?</strong> This is a lightweight formatter; for production bundles, prefer full minifiers (terser/clean-css).</p>
          <p><strong>Large files?</strong> Inputs over ~200k chars show a warning; results may differ on complex code.</p>
        </div>
      </div>
    </main>
  );
}
