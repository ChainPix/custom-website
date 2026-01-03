"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

type WorkerResponse = {
  id: number;
  type: "progress" | "done" | "error";
  output?: string;
  progress?: number;
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
  }
  return result;
};

const decodeEntities = (text: string) =>
  text.replace(ENTITY_PATTERN, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1]?.toLowerCase() === "x";
      const numberText = isHex ? body.slice(2) : body.slice(1);
      const codePoint = isHex ? parseInt(numberText, 16) : parseInt(numberText, 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return DECODE_ENTITIES[body] ?? match;
  });

export default function HtmlEntitiesClient() {
  const [input, setInput] = useState("<p>Hello & welcome!</p>");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
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
  const workerRef = useRef<Worker | null>(null);
  const workerRequestId = useRef(0);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./html-entities.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, type, output: nextOutput, progress, error: workerError } = event.data;
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
        setOutput(nextOutput ?? "");
        setError("");
        setStatus("Decoded");
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

  const normalizeInput = (value: string) => (trimInput ? value.trim() : value);

  const encodeValue = (text: string) => {
    workerRequestId.current += 1;
    setProcessing(false);
    setDecodeProgress(0);
    setOutput(
      encodeEntities(text, {
        mode: encodeMode,
        unsafeOnly: encodeUnsafeOnly,
        includeSlash: encodeIncludeSlash,
      })
    );
    setError("");
    setStatus("Encoded");
  };

  const decodeValue = (text: string) => {
    setOutput(decodeEntities(text));
    setError("");
    setStatus("Decoded");
  };

  const runTransform = (direction: "encode" | "decode") => {
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
    if (text.length > 50_000) {
      setWarning(`Large input detected (${text.length.toLocaleString()} chars). Processing may be slow.`);
    } else {
      setWarning("");
    }

    if (direction === "encode") encodeValue(text);
    else handleDecode(text);
  };

  const handleEncode = (value?: string) => {
    try {
      encodeValue(value ?? normalizeInput(input));
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to encode this input.");
      setOutput("");
      setStatus("Encode failed");
    }
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output || input);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
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

  const applyAuto = (next: string) => {
    setInput(next);
    if (autoRun) {
      runTransform(mode);
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
                if (autoRun) runTransform(nextMode);
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
                if (autoRun && mode === "encode") runTransform("encode");
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
                  if (autoRun && mode === "encode") runTransform("encode");
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
                  if (autoRun && mode === "encode") runTransform("encode");
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Include forward slash when encoding unsafe characters"
                disabled={mode === "decode"}
              />
              Include slash
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => runTransform("encode")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Encode HTML entities"
              disabled={processing}
            >
              Encode
            </button>
            <button
              onClick={() => runTransform("decode")}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Decode HTML entities"
              disabled={processing}
            >
              Decode
            </button>
            <button
              onClick={() => {
                setInput("");
                setOutput("");
                setError("");
                setStatus("Cleared");
                setWarning("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Clear input and output"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
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
        </div>

        <div
          className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-labelledby="html-entities-output"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p id="html-entities-output" className="text-sm font-semibold">
              Output
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output && !input}
              aria-label="Copy output"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {output || "Result will appear here."}
          </pre>
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
