"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Language = "html" | "css" | "js";
type Mode = "minify" | "pretty";
type IndentStyle = "spaces-2" | "spaces-4" | "tabs";

type Options = {
  stripComments: boolean;
  normalizeWhitespace: boolean;
  indentStyle: IndentStyle;
};

const compress = (code: string, lang: Language, opts: Options) => {
  let result = code;
  if (lang === "html") {
    if (opts.stripComments) result = result.replace(/<!--[\s\S]*?-->/g, "");
    result = result.replace(/>\s+</g, "><");
    if (opts.normalizeWhitespace) {
      result = result.replace(/\s{2,}/g, " ");
    }
    result = result.trim();
  } else if (lang === "css") {
    if (opts.stripComments) result = result.replace(/\/\*[\s\S]*?\*\//g, "");
    result = result.replace(/\s*([{};:,])\s*/g, "$1");
    if (opts.normalizeWhitespace) result = result.replace(/\s{2,}/g, " ");
    result = result.replace(/;}/g, "}");
    result = result.trim();
  } else if (lang === "js") {
    if (opts.stripComments) {
      result = result.replace(/\/\*[\s\S]*?\*\//g, "");
      result = result.replace(/\/\/[^\n\r]*/g, "");
    }
    if (opts.normalizeWhitespace) result = result.replace(/\s{2,}/g, " ");
    result = result.replace(/\s*([{};:,()=+\-/*<>])\s*/g, "$1");
    result = result.trim();
  }
  return result;
};

const getIndent = (style: IndentStyle) => {
  if (style === "tabs") return "\t";
  if (style === "spaces-4") return "    ";
  return "  ";
};

const pretty = (code: string, lang: Language, opts: Options) => {
  const indentUnit = getIndent(opts.indentStyle);
  let result = code;
  if (lang === "html") {
    const lines = code.replace(/></g, ">\n<").split("\n");
    let level = 0;
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^<\/.+>/.test(trimmed)) level = Math.max(level - 1, 0);
      const indented = `${indentUnit.repeat(level)}${trimmed}`;
      if (/^<[^/!][^>]*[^/]?>$/.test(trimmed) && !trimmed.includes("</")) {
        level += 1;
      }
      return indented;
    });
    result = formatted.join("\n");
  } else if (lang === "css" || lang === "js") {
    const raw = code.replace(/;/g, ";\n").replace(/{/g, "{\n").replace(/}/g, "}\n");
    const lines = raw.split("\n");
    let level = 0;
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("}")) level = Math.max(level - 1, 0);
      const indented = `${indentUnit.repeat(level)}${trimmed}`;
      if (trimmed.endsWith("{")) level += 1;
      return indented;
    });
    result = formatted.join("\n");
  }
  return result.trim();
};

export default function CodeMinifierClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [lang, setLang] = useState<Language>("html");
  const [mode, setMode] = useState<Mode>("minify");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [status, setStatus] = useState("Ready");
  const [options, setOptions] = useState<Options>({
    stripComments: true,
    normalizeWhitespace: true,
    indentStyle: "spaces-2",
  });
  const [stats, setStats] = useState<{ beforeChars: number; afterChars: number; beforeLines: number; afterLines: number }>({
    beforeChars: 0,
    afterChars: 0,
    beforeLines: 0,
    afterLines: 0,
  });

  const handleConvert = () => {
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
    const result = mode === "minify" ? compress(input, lang, options) : pretty(input, lang, options);
    setOutput(result);
    setStats({
      beforeChars: input.length,
      afterChars: result.length,
      beforeLines: input.split("\n").length,
      afterLines: result.split("\n").length,
    });
    setError("");
    setStatus("Conversion complete");
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
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `code-${mode}-${lang}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded output");
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

  const savings = useMemo(() => {
    if (!stats.beforeChars) return null;
    const diff = stats.beforeChars - stats.afterChars;
    const percent = stats.beforeChars ? Math.round((diff / stats.beforeChars) * 100) : 0;
    return { diff, percent };
  }, [stats]);

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
            onChange={(event) => setLang(event.target.value as Language)}
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
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            aria-label="Convert code"
          >
            Convert
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

        {stats.beforeChars ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
            <span>Before: {stats.beforeChars.toLocaleString()} chars / {stats.beforeLines} lines</span>
            <span>After: {stats.afterChars.toLocaleString()} chars / {stats.afterLines} lines</span>
            {savings ? <span>Savings: {savings.diff.toLocaleString()} chars ({savings.percent}% reduction)</span> : null}
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
        <pre className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
          {output || "Converted output will appear here."}
        </pre>
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
