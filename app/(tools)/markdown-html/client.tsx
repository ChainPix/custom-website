"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import TurndownService from "turndown";
import { Check, Clipboard, Download, RefreshCcw, Sparkles, Eye } from "lucide-react";

type Mode = "md-to-html" | "html-to-md";
type PreviewMode = "sanitized" | "raw" | "off";
type DomPurifyLike = {
  sanitize: (raw: string, config?: { USE_PROFILES?: { html: boolean } }) => string;
};

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
  const [previewMode, setPreviewMode] = useState<PreviewMode>("sanitized");
  const domPurifyInstance = useMemo<DomPurifyLike>(() => {
    const candidate = DOMPurify as unknown;
    if (typeof window === "undefined") {
      return candidate as DomPurifyLike;
    }
    if (typeof candidate === "function" && !("sanitize" in candidate)) {
      return (candidate as (win: Window) => DomPurifyLike)(window);
    }
    return candidate as DomPurifyLike;
  }, []);

  const previewHtml = useMemo(() => {
    if (!output) {
      return "<p>Converted HTML will render here.</p>";
    }
    if (previewMode === "raw") {
      return output;
    }
    if (previewMode === "sanitized") {
      if (typeof window === "undefined") {
        return output;
      }
      return domPurifyInstance.sanitize(output, { USE_PROFILES: { html: true } });
    }
    return "";
  }, [output, previewMode, domPurifyInstance]);

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
              Markdown to HTML
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Markdown ⇄ HTML Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert Markdown to HTML or HTML back to Markdown. Runs in your browser for fast previews
          and copy-ready markup.
        </p>
        <p className="text-sm text-slate-600">Runs locally; sanitized preview is on by default.</p>
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
              checked={previewMode === "sanitized"}
              onChange={(e) => {
                const enabled = e.target.checked;
                if (enabled) {
                  setPreviewMode("sanitized");
                } else if (previewMode === "sanitized") {
                  setPreviewMode("off");
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              disabled={mode !== "md-to-html"}
            />
            Sanitized preview
          </label>
          <label className="flex items-center gap-2 text-rose-600">
            <input
              type="checkbox"
              checked={previewMode === "raw"}
              onChange={(e) => {
                const enabled = e.target.checked;
                if (!enabled) {
                  if (previewMode === "raw") {
                    setPreviewMode("sanitized");
                  }
                  return;
                }
                if (mode !== "md-to-html") {
                  return;
                }
                const ok = window.confirm(
                  "Raw preview can execute unsafe HTML. Only enable if you trust the input. Continue?"
                );
                if (ok) {
                  setPreviewMode("raw");
                  setStatus("Raw preview enabled");
                }
              }}
              className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-2 focus:ring-rose-200"
              disabled={mode !== "md-to-html"}
            />
            Raw preview (unsafe)
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

      {previewMode !== "off" && mode === "md-to-html" && (
        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-700">
            <Eye className="h-4 w-4" />
            <span className="font-semibold text-slate-900">
              {previewMode === "raw" ? "HTML Preview (raw, unsafe)" : "HTML Preview (sanitized)"}
            </span>
          </div>
          {previewMode === "raw" && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rose-600">
              Raw preview can execute unsafe HTML. Use trusted input only.
            </p>
          )}
          <div
            className="prose max-w-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick the direction (Markdown → HTML or HTML → Markdown) and paste your content.</li>
          <li>Use sample buttons for a quick demo; enable auto-convert for instant updates.</li>
          <li>Copy or download the output. Sanitized preview is on by default for Markdown → HTML.</li>
          <li>For HTML → Markdown, clean pasted HTML into readable Markdown quickly.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is this private?</summary>
            <p className="mt-2 text-slate-700">Yes. Conversion runs locally in your browser; no data is uploaded.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is the HTML preview safe?</summary>
            <p className="mt-2 text-slate-700">
              Sanitized preview is enabled by default using DOMPurify. Raw preview is available behind a confirmation for
              trusted input only.
            </p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I download the result?</summary>
            <p className="mt-2 text-slate-700">Yes. Use the Download button to save the converted output.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
