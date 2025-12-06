"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { marked } from "marked";
import TurndownService from "turndown";
import { Check, Clipboard, Download, RefreshCcw, Sparkles, Eye } from "lucide-react";

type Mode = "md-to-html" | "html-to-md";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

const LARGE_CHARS = 50000;

export default function MarkdownHtmlClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("md-to-html");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [autoConvert, setAutoConvert] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const runConvert = () => {
    if (!input.trim()) {
      setError("Please paste Markdown or HTML before converting.");
      setOutput("");
      setStatus("Awaiting input");
      return;
    }

    if (input.length > LARGE_CHARS) {
      setWarning(`Large input detected (${input.length.toLocaleString()} characters). Conversion may take a moment.`);
    } else {
      setWarning("");
    }

    try {
      if (mode === "md-to-html") {
        setOutput(marked.parse(input) as string);
      } else {
        setOutput(turndown.turndown(input));
      }
      setError("");
      setStatus("Converted");
    } catch (err) {
      console.error("Conversion error", err);
      setOutput("");
      setError("Unable to convert this input. Check for malformed markup.");
      setStatus("Error");
    }
  };

  const handleConvert = () => {
    runConvert();
  };

  const handleDownload = () => {
    if (!output) {
      setStatus("Nothing to download");
      return;
    }
    const ext = mode === "md-to-html" ? "html" : "md";
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `converted.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const handleCopy = async () => {
    if (!output) {
      setStatus("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const loadSample = (sample: "md" | "html") => {
    const mdSample = `# Sample Heading

This is **bold**, *italic*, and a [link](https://example.com).

- Item one
- Item two
- Item three

\`\`\`js
console.log("hello");
\`\`\``;

    const htmlSample = `<h1>Sample Heading</h1>
<p>This is <strong>bold</strong>, <em>italic</em>, and a <a href="https://example.com">link</a>.</p>
<ul>
  <li>Item one</li>
  <li>Item two</li>
  <li>Item three</li>
</ul>
<pre><code class="language-js">console.log("hello");</code></pre>`;

    const text = sample === "md" ? mdSample : htmlSample;
    setInput(text);
    setStatus(sample === "md" ? "Sample Markdown loaded" : "Sample HTML loaded");
    if (autoConvert) {
      setTimeout(() => handleConvert(), 0);
    }
  };

  useEffect(() => {
    if (autoConvert && input.trim()) {
      runConvert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode, autoConvert]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error} {warning}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Markdown ⇄ HTML Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert Markdown to HTML or HTML back to Markdown. Runs in your browser for fast previews
          and copy-ready markup.
        </p>
        <p className="text-sm text-slate-600">Runs locally; preview is not sanitized—use trusted input.</p>
      </header>
      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
          <button
            onClick={() => loadSample("md")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Sample Markdown
          </button>
          <button
            onClick={() => loadSample("html")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Sample HTML
          </button>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoConvert}
              onChange={(e) => setAutoConvert(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Auto-convert
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              disabled={mode !== "md-to-html"}
            />
            Show HTML preview (unsafe input not sanitized)
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Direction</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Conversion direction"
            >
              <option value="md-to-html">Markdown → HTML</option>
              <option value="html-to-md">HTML → Markdown</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Convert
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setStatus("Cleared");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste Markdown or HTML depending on direction"
          aria-label={`Input ${mode === "md-to-html" ? "Markdown" : "HTML"}`}
          />
        {error ? (
          <p className="text-sm font-medium text-amber-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: use Markdown → HTML for previews and HTML → Markdown to clean pasted content.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="output-label">Output</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!output}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!output}
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
        <pre
          className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
          role="region"
          aria-labelledby="output-label"
          tabIndex={0}
        >
          {output || "Converted output will appear here."}
        </pre>
      </div>

      {showPreview && mode === "md-to-html" && (
        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-700">
            <Eye className="h-4 w-4" />
            <span className="font-semibold text-slate-900">HTML Preview (not sanitized)</span>
          </div>
          <div
            className="prose max-w-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900"
            dangerouslySetInnerHTML={{ __html: output || "<p>Converted HTML will render here.</p>" }}
          />
        </div>
      )}
    </main>
  );
}
