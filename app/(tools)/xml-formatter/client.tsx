"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  indent: number;
  inlineMixedContent: boolean;
};

type XmlParseLocation = {
  line: number;
  column: number;
};

type WorkerFormatRequest = {
  type: "format";
  requestId: number;
  payload: {
    input: string;
    indent: number;
    inlineMixedContent: boolean;
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
  const [options, setOptions] = useState<Options>({ indent: 2, inlineMixedContent: true });
  const [error, setError] = useState("");
  const [errorLocation, setErrorLocation] = useState<XmlParseLocation | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

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

  const handleFormat = () => {
    if (isFormatting) return;
    setError("");
    setErrorLocation(null);
    setCopied(false);
    try {
      const rawInput = input;
      const trimmed = rawInput.trim();
      if (!trimmed) throw new Error("Enter XML to format.");
      if (rawInput.length > 200000) throw new Error("Input too large. Please limit to ~200KB.");
      setIsFormatting(true);
      setOutput("");
      const worker = ensureWorker();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const message: WorkerFormatRequest = {
        type: "format",
        requestId,
        payload: {
          input: rawInput,
          indent: options.indent,
          inlineMixedContent: options.inlineMixedContent,
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
                value={options.indent}
                onChange={(e) => setOptions((prev) => ({ ...prev, indent: Number(e.target.value) }))}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </label>
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
            <button
              onClick={() => {
                setInput(sampleXml);
                setOutput("");
                setError("");
                setOptions({ indent: 2, inlineMixedContent: true });
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset to sample"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            placeholder="Paste XML here..."
            aria-label="XML input"
            ref={inputRef}
          />

          <button
            onClick={handleFormat}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Format XML"
            disabled={isFormatting}
          >
            {isFormatting ? "Formatting..." : "Format XML"}
          </button>
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
              Formatted XML
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy formatted XML"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download formatted XML"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <pre
            className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-labelledby="output-heading"
          >
            {isFormatting
              ? "Formatting..."
              : output || "Your formatted XML will appear here after validation."}
          </pre>
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
