"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ini from "ini";
import toml from "toml";
import { Check, Clipboard, Download, RefreshCcw, Shuffle } from "lucide-react";

type Mode = "toml" | "ini";
type ParseResult = {
  output: string;
  error: string;
  warning: string;
  status: string;
};

export default function TomlIniClient() {
  const [input, setInput] = useState('[db]\nhost="localhost"\nport=5432');
  const [mode, setMode] = useState<Mode>("toml");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [pretty, setPretty] = useState(true);
  const [warning, setWarning] = useState("");
  const [nestIniDots, setNestIniDots] = useState(true);
  const MAX_CHARS = 40000;
  const DEBOUNCE_DELAY_MS = 300;
  const DEBOUNCE_THRESHOLD = 2000;
  const WORKER_THRESHOLD = 20000;
  const [debouncedInput, setDebouncedInput] = useState(input);
  const [workerResult, setWorkerResult] = useState<ParseResult | null>(null);
  const [isWorkerParsing, setIsWorkerParsing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  const findIniLineError = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) {
        continue;
      }
      if (trimmed.startsWith("[") && !/^\[[^\]]+\]\s*$/.test(trimmed)) {
        return { line: index + 1, message: `Invalid INI section header at line ${index + 1}.` };
      }
    }
    return null;
  };

  const samples = {
    tomlSimple: '[db]\nhost="localhost"\nport=5432\n',
    tomlNested: '[server]\nports = [8000, 8001]\n[client]\nname = "app"\n[client.auth]\nuser="alice"\n',
    iniSimple: "[db]\nhost=localhost\nport=5432\n",
    iniDotted: "[server]\nports=8000,8001\n[client]\nname=app\n[client.auth]\nuser=alice\n",
  };

  const warningMessage =
    input.length > MAX_CHARS ? "Large input; parsing may be slow. Consider trimming." : "";
  const shouldUseWorker = debouncedInput.length >= WORKER_THRESHOLD;

  useEffect(() => {
    if (input.length < DEBOUNCE_THRESHOLD) {
      setDebouncedInput(input);
      return;
    }
    const handle = window.setTimeout(() => setDebouncedInput(input), DEBOUNCE_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [input, DEBOUNCE_DELAY_MS, DEBOUNCE_THRESHOLD]);

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./toml-ini.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ParseResult & { requestId: number; type?: string }>) => {
      const message = event.data;
      if (!message || message.type !== "result" || typeof message.requestId !== "number") return;
      if (message.requestId !== requestIdRef.current) return;
      setIsWorkerParsing(false);
      setWorkerResult({
        output: message.output,
        error: message.error,
        warning: "",
        status: message.status,
      });
    };
    workerRef.current = worker;
    return worker;
  };

  useEffect(() => {
    if (!shouldUseWorker) {
      setIsWorkerParsing(false);
      setWorkerResult(null);
      return;
    }
    const worker = ensureWorker();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsWorkerParsing(true);
    setWorkerResult(null);
    worker.postMessage({
      type: "parse",
      requestId,
      input: debouncedInput,
      mode,
      pretty,
      nestIniDots,
    });
  }, [debouncedInput, mode, nestIniDots, pretty, shouldUseWorker]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const localResult = useMemo<ParseResult>(() => {
    if (shouldUseWorker) {
      return {
        output: "",
        error: "",
        warning: warningMessage,
        status: isWorkerParsing ? "Parsing in worker..." : "Waiting for input",
      };
    }
    try {
      if (mode === "ini") {
        const iniLineError = findIniLineError(debouncedInput);
        if (iniLineError) {
          return {
            output: "",
            error: iniLineError.message,
            warning: warningMessage,
            status: iniLineError.message,
          };
        }
      }
      const escapedIniInput = debouncedInput.replace(/^(\s*)\[([^\]]+)\](\s*)$/gm, (_match, lead, name, tail) => {
        let backslashes = 0;
        let escaped = "";
        for (const char of name) {
          if (char === "\\") {
            backslashes += 1;
            escaped += char;
            continue;
          }
          if (char === ".") {
            escaped += backslashes % 2 === 1 ? "." : "\\.";
            backslashes = 0;
            continue;
          }
          backslashes = 0;
          escaped += char;
        }
        return `${lead}[${escaped}]${tail}`;
      });
      const parsed =
        mode === "toml"
          ? toml.parse(debouncedInput)
          : ini.parse(nestIniDots ? debouncedInput : escapedIniInput);
      const output = pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
      return { output, error: "", warning: warningMessage, status: `Parsed ${mode.toUpperCase()} input` };
    } catch (err) {
      console.error("Parse error", err);
      if (mode === "toml") {
        const line = typeof (err as { line?: unknown }).line === "number" ? (err as { line: number }).line : null;
        const column =
          typeof (err as { column?: unknown }).column === "number" ? (err as { column: number }).column : null;
        if (line !== null && column !== null) {
          const error = `Invalid TOML at line ${line}, column ${column}.`;
          return { output: "", error, warning: warningMessage, status: error };
        }
        if (err instanceof Error && err.message) {
          const error = `Invalid TOML: ${err.message}`;
          return { output: "", error, warning: warningMessage, status: error };
        }
      }
      const error = `Invalid ${mode.toUpperCase()} input.`;
      return { output: "", error, warning: warningMessage, status: error };
    }
  }, [debouncedInput, isWorkerParsing, mode, nestIniDots, pretty, shouldUseWorker, warningMessage]);

  const result = useMemo<ParseResult>(() => {
    const base = shouldUseWorker && workerResult ? workerResult : localResult;
    return { ...base, warning: warningMessage };
  }, [localResult, shouldUseWorker, warningMessage, workerResult]);

  useEffect(() => {
    setStatus(result.status);
    setWarning(result.warning);
  }, [result.status, result.warning]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!result.output) return;
    const blob = new Blob([result.output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const copyInput = async () => {
    try {
      await navigator.clipboard.writeText(input);
      setStatus("Copied original");
    } catch {
      setStatus("Copy failed");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning}
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
              TOML/INI Parser
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">TOML/INI → JSON Parser</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Parse TOML or INI configuration text into JSON. Validate and copy formatted output.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Select input format"
            >
              <option value="toml">TOML</option>
              <option value="ini">INI</option>
            </select>
            <button
              onClick={() => {
                setMode("toml");
                setInput('[db]\nhost="localhost"\nport=5432');
                setCopied(false);
                setStatus("Reset");
                setWarning("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Reset to default sample"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={() => {
                setMode("toml");
                setInput(samples.tomlSimple);
                setStatus("Loaded TOML sample");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              TOML sample
            </button>
            <button
              onClick={() => {
                setMode("ini");
                setInput(samples.iniSimple);
                setStatus("Loaded INI sample");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              INI sample
            </button>
            <button
              onClick={() => {
                setMode("toml");
                setInput(samples.tomlNested);
                setStatus("Loaded nested TOML sample");
              }}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Nested TOML
            </button>
            <button
              onClick={() => {
                setMode("ini");
                setInput(samples.iniDotted);
                setStatus("Loaded dotted INI sample");
              }}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Dotted INI
            </button>
            <button
              onClick={() => {
                const nextMode = mode === "toml" ? "ini" : "toml";
                setMode(nextMode);
                setStatus(`Switched to ${nextMode.toUpperCase()} parser`);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Switch TOML/INI parser"
            >
              <Shuffle className="h-4 w-4" />
              Switch parser
            </button>
            <button
              onClick={copyInput}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Copy original input"
            >
              <Clipboard className="h-4 w-4" />
              Copy original
            </button>
          </div>
          <textarea
            className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            placeholder="Paste TOML or INI content"
            aria-label="Input TOML or INI"
          />
          {result.error ? (
            <p className="text-sm font-medium text-amber-600">{result.error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: Runs locally—great for quick config conversions. {input.length > MAX_CHARS ? "Large input detected." : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pretty}
                onChange={(e) => setPretty(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              Pretty JSON output
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nestIniDots}
                onChange={(e) => setNestIniDots(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                disabled={mode !== "ini"}
              />
              Dot-separated section names (parser-dependent nesting)
            </label>
            <span className="text-slate-500">Lines: {input.split("\n").length}</span>
          </div>
        </div>

        <div
          className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-labelledby="toml-ini-output"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p id="toml-ini-output" className="text-sm font-semibold">
              JSON Output
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!result.output}
              aria-label="Copy JSON output"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!result.output}
              aria-label="Download JSON output"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {result.output || "Parsed JSON will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Select TOML or INI, paste your config, or load a sample.</li>
          <li>Optionally pretty the JSON output; copy or download the JSON output.</li>
          <li>Large inputs show a warning; errors indicate invalid format (line/column for TOML when available).</li>
          <li>INI dot-nesting is parser-specific; toggle the dotted-section option to keep names literal.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Conversion happens in your browser; config text is not uploaded.</p>
          <p><strong>What formats?</strong> TOML and INI; samples provided. Output is JSON.</p>
          <p><strong>Can I export?</strong> Yes. Copy or download the JSON output directly.</p>
        </div>
      </div>
    </main>
  );
}
