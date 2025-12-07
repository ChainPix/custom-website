"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { marked } from "marked";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

export default function MarkdownPreviewClient() {
  const [input, setInput] = useState("# Hello Markdown\n\n- Item 1\n- Item 2\n\n`code`");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [sanitize, setSanitize] = useState(true);
  const MAX_LEN = 20000;

  const sanitizeHtml = (raw: string) => {
    if (!sanitize) return raw;
    const doc = new DOMParser().parseFromString(raw, "text/html");
    doc.querySelectorAll("script, style").forEach((el) => el.remove());
    doc.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
      });
    });
    return doc.body.innerHTML;
  };

  const html = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setWarning("Enter Markdown to preview and copy.");
      return "";
    }
    if (input.length > MAX_LEN) {
      setWarning("Large input; preview truncated for performance.");
    } else {
      setWarning("");
    }
    const rendered = marked.parse(input.slice(0, MAX_LEN)) as string;
    return sanitizeHtml(rendered);
  }, [input, sanitize]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied HTML");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(input);
      setStatus("Copied markdown");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "markdown.html";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded HTML");
  };

  const loadSample = (variant: "basic" | "code" | "table") => {
    const samples = {
      basic: "# Welcome\n\n- Item 1\n- Item 2\n\n**Bold** and _italic_.",
      code: "## Code Sample\n\n```js\nfunction greet(name) {\n  return `Hello ${name}`;\n}\n```\n\n`inline code` too.",
      table: "# Table Example\n\n| Name | Role |\n| --- | --- |\n| Alice | Engineer |\n| Bob | Designer |\n\n> Blockquote",
    };
    setInput(samples[variant]);
    setStatus("Loaded sample");
    setCopied(false);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Markdown Previewer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Type Markdown and see rendered output instantly. Copy HTML for docs or embeds.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Markdown</p>
            <button
              onClick={() => {
                setInput("# Hello Markdown\n\n- Item 1\n- Item 2\n\n`code`");
                setCopied(false);
                setStatus("Reset");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
              <button
                onClick={() => loadSample("basic")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sample: basic
              </button>
              <button
                onClick={() => loadSample("code")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sample: code
              </button>
              <button
                onClick={() => loadSample("table")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sample: table
              </button>
            </div>
          </div>
          <textarea
            className="h-[260px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            aria-label="Markdown input"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sanitize}
                onChange={(e) => setSanitize(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              Sanitize HTML (recommended)
            </label>
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Clipboard className="h-4 w-4" /> Copy markdown
            </button>
            {warning ? <span className="text-amber-600 font-medium">{warning}</span> : <span>Rendered output updates as you type.</span>}
          </div>
        </div>

        <div
          className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-labelledby="md-preview-heading"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p id="md-preview-heading" className="text-sm font-semibold">
              Preview / HTML
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!html}
              aria-label="Copy rendered HTML"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy HTML"}
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!html}
              aria-label="Download HTML"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm leading-relaxed prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Type or paste markdown, or load a sample. Sanitization is on by default for safety.</li>
          <li>Preview updates as you type; copy markdown or rendered HTML, or download the HTML file.</li>
          <li>Very large inputs may be truncated for performance; disable sanitize only if you trust the content.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Rendering happens in your browser.</p>
          <p><strong>Is output sanitized?</strong> Yes by default; scripts/styles and on* attributes are stripped. Toggle sanitize to allow raw HTML.</p>
          <p><strong>Exports?</strong> Copy HTML/markdown or download the rendered HTML.</p>
        </div>
      </div>
    </main>
  );
}
