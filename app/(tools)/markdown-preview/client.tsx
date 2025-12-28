"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const ALLOWED_TAGS = [
  "a",
  "p",
  "br",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "del",
  "img",
];
const ALLOWED_ATTR = ["href", "title", "target", "rel", "src", "alt", "colspan", "rowspan"];
const BLOCKED_URI_SCHEMES = /^(?:\s*)(?:javascript|data|vbscript):/i;
let sanitizerHookReady = false;

export default function MarkdownPreviewClient() {
  const [input, setInput] = useState("# Hello Markdown\n\n- Item 1\n- Item 2\n\n`code`");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [sanitize, setSanitize] = useState(true);
  const [strictAllowlist, setStrictAllowlist] = useState(true);
  const [panel, setPanel] = useState<"preview" | "html" | "markdown">("preview");
  const MAX_LEN = 20000;

  const sanitizeHtml = (raw: string) => {
    if (!sanitize) return raw;
    if (typeof window === "undefined") {
      // DOMParser not available during SSR; return raw and let client sanitize post-hydration.
      return raw;
    }
    if (!sanitizerHookReady) {
      DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
        if (data.attrName === "href" || data.attrName === "src" || data.attrName === "xlink:href") {
          const value = (data.attrValue || "").trim();
          if (BLOCKED_URI_SCHEMES.test(value)) {
            data.keepAttr = false;
          }
        }
      });
      sanitizerHookReady = true;
    }
    const config = strictAllowlist
      ? {
          ALLOWED_TAGS,
          ALLOWED_ATTR,
          ALLOW_DATA_ATTR: false,
        }
      : {
          ALLOW_DATA_ATTR: false,
        };
    return DOMPurify.sanitize(raw, config);
  };

  const warning = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return "Enter Markdown to preview and copy.";
    }
    if (input.length > MAX_LEN) {
      return "Large input; preview truncated for performance.";
    }
    return "";
  }, [input, MAX_LEN]);

  const html = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return "";
    }
    const rendered = marked.parse(input.slice(0, MAX_LEN)) as string;
    return sanitizeHtml(rendered);
  }, [input, sanitize, strictAllowlist]);

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

  const handleCopyHtmlSource = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setStatus("Copied HTML source");
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
              Markdown Preview
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
            {sanitize ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={strictAllowlist}
                  onChange={(e) => setStrictAllowlist(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Strict allowlist
              </label>
            ) : (
              <>
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-red-700 ring-1 ring-red-200">
                  Sanitize off
                </span>
                <span className="font-semibold text-red-600">
                  Unsafe mode: raw HTML can run scripts. Only use with trusted content.
                </span>
              </>
            )}
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-full bg-white/10 p-1 text-xs font-medium">
                <button
                  onClick={() => setPanel("preview")}
                  className={`rounded-full px-3 py-1 transition ${
                    panel === "preview" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"
                  }`}
                  type="button"
                >
                  Preview
                </button>
                <button
                  onClick={() => setPanel("html")}
                  className={`rounded-full px-3 py-1 transition ${
                    panel === "html" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"
                  }`}
                  type="button"
                >
                  HTML
                </button>
                <button
                  onClick={() => setPanel("markdown")}
                  className={`rounded-full px-3 py-1 transition ${
                    panel === "markdown" ? "bg-white text-slate-900" : "text-white/80 hover:text-white"
                  }`}
                  type="button"
                >
                  Markdown
                </button>
              </div>
              {panel === "html" ? (
                <button
                  onClick={handleCopyHtmlSource}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!html}
                  aria-label="Copy HTML source"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy HTML"}
                </button>
              ) : (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!html}
                  aria-label="Copy rendered HTML"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy HTML"}
                </button>
              )}
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
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm leading-relaxed prose prose-invert max-w-none">
            {panel === "preview" && <div dangerouslySetInnerHTML={{ __html: html }} />}
            {panel === "html" && (
              <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-slate-100">
                <code>{escapeHtml(html)}</code>
              </pre>
            )}
            {panel === "markdown" && (
              <pre className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-slate-100">
                {input.split("\n").map((line, index) => (
                  <div key={`${index}-${line}`} className="grid grid-cols-[auto,1fr] gap-3">
                    <span className="text-white/50">{String(index + 1).padStart(2, "0")}</span>
                    <code className="whitespace-pre-wrap">{line || " "}</code>
                  </div>
                ))}
              </pre>
            )}
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
          <p><strong>Is output sanitized?</strong> Yes by default using DOMPurify with a strict allowlist and blocked script URL schemes. Toggle sanitize to allow raw HTML.</p>
          <p><strong>Exports?</strong> Copy HTML/markdown or download the rendered HTML.</p>
        </div>
      </div>
    </main>
  );
}
  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
