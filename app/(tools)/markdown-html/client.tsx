"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import DOMPurify from "dompurify";
import { Check, Clipboard, Download, RefreshCcw, Sparkles, Eye, ArrowLeftRight } from "lucide-react";
import { defaultFormatOptions, formatCode } from "../../../lib/formatters/code-minifier";
import hljs from "highlight.js/lib/common";
import { diffLines } from "diff";

type Mode = "md-to-html" | "html-to-md";
type PreviewMode = "sanitized" | "raw" | "off";
type DomPurifyLike = {
  sanitize: (raw: string, config?: { USE_PROFILES?: { html: boolean } }) => string;
};
type WorkerRequest = {
  id: number;
  input: string;
  mode: Mode;
  formatHtml: boolean;
  formatMarkdown: boolean;
  minifyOutput: boolean;
  markdownOptions: MarkdownOptions;
  htmlOptions: HtmlOptions;
};
type WorkerResponse = {
  id: number;
  output?: string;
  error?: string;
};
type MarkdownOptions = {
  gfmTables: boolean;
  lineBreaks: boolean;
  headingIds: boolean;
  openLinksInNewTab: boolean;
  highlightCode: boolean;
};
type HtmlOptions = {
  preserveLinks: boolean;
  preserveImages: boolean;
  keepInlineStyles: boolean;
  brHandling: "single" | "double";
  gfmTables: boolean;
};
type HistoryEntry = {
  id: string;
  input: string;
  output: string;
  mode: Mode;
  createdAt: number;
};

const LARGE_CHARS = 50000;
const VERY_LARGE_CHARS = 200000;
const HISTORY_KEY = "markdown-html-history";
const MAX_HISTORY = 10;

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
  const [debouncedInput, setDebouncedInput] = useState(input);
  const deferredInput = useDeferredValue(debouncedInput);
  const [, startTransition] = useTransition();
  const workerRef = useRef<Worker | null>(null);
  const workerRequestId = useRef(0);
  const progressTimerRef = useRef<number | null>(null);
  const lastWorkerPayload = useRef<{
    input: string;
    mode: Mode;
    formatHtml: boolean;
    formatMarkdown: boolean;
    minifyOutput: boolean;
    markdownOptions: MarkdownOptions;
    htmlOptions: HtmlOptions;
  } | null>(null);
  const [formatHtml, setFormatHtml] = useState(true);
  const [formatMarkdown, setFormatMarkdown] = useState(true);
  const [minifyOutput, setMinifyOutput] = useState(false);
  const [toast, setToast] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const markedModuleRef = useRef<typeof import("marked") | null>(null);
  const turndownFactoryRef = useRef<typeof import("turndown") | null>(null);
  const turndownGfmRef = useRef<typeof import("turndown-plugin-gfm").gfm | null>(null);
  const [markdownOptions, setMarkdownOptions] = useState<MarkdownOptions>({
    gfmTables: true,
    lineBreaks: false,
    headingIds: true,
    openLinksInNewTab: false,
    highlightCode: false,
  });
  const [htmlOptions, setHtmlOptions] = useState<HtmlOptions>({
    preserveLinks: true,
    preserveImages: true,
    keepInlineStyles: false,
    brHandling: "single",
    gfmTables: true,
  });
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

  const preloadConverters = async () => {
    if (!markedModuleRef.current) {
      markedModuleRef.current = await import("marked");
    }
    if (!turndownFactoryRef.current) {
      const mod = (await import("turndown")) as unknown;
      turndownFactoryRef.current =
        (mod as { default?: typeof import("turndown") }).default ?? (mod as typeof import("turndown"));
    }
    if (!turndownGfmRef.current) {
      const mod = await import("turndown-plugin-gfm");
      turndownGfmRef.current = mod.gfm;
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored) as HistoryEntry[]);
      }
    } catch (err) {
      console.warn("Failed to load history", err);
    }
  }, []);

  useEffect(() => {
    void preloadConverters();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.warn("Failed to save history", err);
    }
  }, [history]);

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

  const formatMarkdownOutput = async (value: string) => {
    const prettier = await import("prettier/standalone");
    const markdown = await import("prettier/plugins/markdown");
    const formatted = await prettier.format(value, {
      parser: "markdown",
      plugins: [markdown],
      printWidth: 100,
    });
    return formatted.trim();
  };

  const pushHistory = (nextInput: string, nextOutput: string, nextMode: Mode) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      input: nextInput,
      output: nextOutput,
      mode: nextMode,
      createdAt: Date.now(),
    };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  };

  const buildMarkedRenderer = (options: MarkdownOptions, markedModule: typeof import("marked")) => {
    const renderer = new markedModule.Renderer();
    if (options.openLinksInNewTab) {
      renderer.link = (token) => {
        const href = typeof token.href === "string" ? token.href : "";
        const title = token.title ? ` title="${token.title}"` : "";
        const text = token.text ?? "";
        return `<a href="${href}"${title} target="_blank" rel="noopener noreferrer">${text}</a>`;
      };
    }
    if (options.highlightCode) {
      renderer.code = (token) => {
        const lang = token.lang ?? "";
        const code = token.text ?? "";
        const highlighted =
          lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
        const className = lang ? ` class="language-${lang}"` : "";
        return `<pre><code${className}>${highlighted}</code></pre>`;
      };
    }
    return renderer;
  };

  const stripInlineStyles = (value: string) => value.replace(/\sstyle=(\"[^\"]*\"|'[^']*')/gi, "");

  const buildTurndownService = (options: HtmlOptions, TurndownService: typeof import("turndown")) => {
    const service = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
    if (options.gfmTables && turndownGfmRef.current) {
      service.use(turndownGfmRef.current);
    }
    if (!options.preserveLinks) {
      service.addRule("stripLinks", {
        filter: "a",
        replacement: (content) => content,
      });
    }
    if (!options.preserveImages) {
      service.addRule("stripImages", {
        filter: "img",
        replacement: () => "",
      });
    }
    service.addRule("brHandling", {
      filter: "br",
      replacement: () => (options.brHandling === "double" ? "\n\n" : "\n"),
    });
    return service;
  };

  const applyOutputFormatting = async (value: string, activeMode: Mode) => {
    if (activeMode === "md-to-html") {
      if (minifyOutput) {
        const result = await formatCode({
          code: value,
          lang: "html",
          mode: "minify",
          options: defaultFormatOptions,
          safeMode: false,
        });
        return result.output;
      }
      if (formatHtml) {
        const result = await formatCode({
          code: value,
          lang: "html",
          mode: "pretty",
          options: defaultFormatOptions,
          safeMode: false,
        });
        return result.output;
      }
      return value;
    }
    if (formatMarkdown) {
      return formatMarkdownOutput(value);
    }
    return value;
  };

  const clearProgressTracking = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgressTracking = () => {
    clearProgressTracking();
    let progress = 0;
    setStatus("Converting… 0%");
    progressTimerRef.current = window.setInterval(() => {
      progress = Math.min(progress + 6, 90);
      setStatus(`Converting… ${progress}%`);
    }, 350);
  };

  const convertOnMainThread = async (value: string, activeMode = mode) => {
    try {
      await preloadConverters();
      const markedModule = markedModuleRef.current;
      const TurndownService = turndownFactoryRef.current;
      if (!markedModule || !TurndownService) {
        throw new Error("Converters not ready");
      }
      const rawOutput =
        activeMode === "md-to-html"
          ? (() => {
              const options = {
                gfm: true,
                breaks: markdownOptions.lineBreaks,
                tables: markdownOptions.gfmTables,
                renderer: buildMarkedRenderer(markdownOptions, markedModule),
              } as Parameters<typeof markedModule.marked.parse>[1] & { headerIds?: boolean };
              if (markdownOptions.headingIds) {
                options.headerIds = true;
              }
              return markedModule.marked.parse(value, options) as string;
            })()
          : buildTurndownService(htmlOptions, TurndownService).turndown(
              htmlOptions.keepInlineStyles ? value : stripInlineStyles(value)
            );
      const nextOutput = await applyOutputFormatting(rawOutput, activeMode);
      startTransition(() => {
        setOutput(nextOutput);
        setError("");
        setStatus("Converted");
      });
      pushHistory(value, nextOutput, activeMode);
    } catch (err) {
      console.error("Conversion error", err);
      startTransition(() => {
        setOutput("");
        setError("Unable to convert this input. Check for malformed markup.");
        setStatus("Error");
      });
    }
  };

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./markdown-html.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, output: nextOutput, error: workerError } = event.data;
      if (id !== workerRequestId.current) return;
      if (workerError) {
        clearProgressTracking();
        setError(workerError);
        setStatus("Error");
        return;
      }
      const payload = lastWorkerPayload.current;
      startTransition(() => {
        clearProgressTracking();
        setOutput(nextOutput ?? "");
        setError("");
        setStatus("Converted");
      });
      if (payload) {
        pushHistory(payload.input, nextOutput ?? "", payload.mode);
      }
    };
    worker.onerror = (event) => {
      console.error("Worker error", event);
      clearProgressTracking();
      setError("Worker failed. Falling back to main thread conversion.");
      setStatus("Worker error");
      const payload = lastWorkerPayload.current;
      if (payload) {
        void convertOnMainThread(payload.input, payload.mode);
      }
    };
    workerRef.current = worker;
    return worker;
  };

  const runConvert = (value: string) => {
    if (!value.trim()) {
      setError("Please paste Markdown or HTML before converting.");
      setOutput("");
      setStatus("Awaiting input");
      return;
    }

    const isLarge = value.length > LARGE_CHARS;
    const isVeryLarge = value.length > VERY_LARGE_CHARS;
    const shouldUseWorker = isLarge && typeof window !== "undefined";
    if (isLarge) {
      setWarning(
        `Large input detected (${value.length.toLocaleString()} characters). ${
          shouldUseWorker ? "Processing in worker." : "Conversion may take a moment."
        }`
      );
    } else {
      setWarning("");
    }

    if (shouldUseWorker) {
      const worker = ensureWorker();
      if (worker) {
        const id = (workerRequestId.current += 1);
        lastWorkerPayload.current = {
          input: value,
          mode,
          formatHtml,
          formatMarkdown,
          minifyOutput,
          markdownOptions,
          htmlOptions,
        };
        if (isVeryLarge) {
          startProgressTracking();
        } else {
          setStatus("Converting in worker");
        }
        setError("");
        worker.postMessage({
          id,
          input: value,
          mode,
          formatHtml,
          formatMarkdown,
          minifyOutput,
          markdownOptions,
          htmlOptions,
        } satisfies WorkerRequest);
        return;
      }
    }

    void convertOnMainThread(value);
  };

  const handleSwap = () => {
    setInput(output);
    setOutput(input);
    setMode((prev) => (prev === "md-to-html" ? "html-to-md" : "md-to-html"));
    setStatus("Swapped");
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const handleConvert = () => {
    runConvert(input);
  };

  const handleDownload = () => {
    if (!output) {
      setStatus("Nothing to download");
      return;
    }
    const ext = mode === "md-to-html" ? "html" : "md";
    const mimeType = mode === "md-to-html" ? "text/html" : "text/markdown";
    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `converted.${ext}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    const handle = window.setTimeout(() => {
      setDebouncedInput(input);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    if (autoConvert && deferredInput.trim()) {
      runConvert(deferredInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    deferredInput,
    mode,
    autoConvert,
    formatHtml,
    formatMarkdown,
    minifyOutput,
    markdownOptions,
    htmlOptions,
  ]);

  useEffect(() => {
    if (mode === "html-to-md" && minifyOutput) {
      setMinifyOutput(false);
    }
  }, [mode, minifyOutput]);

  const diffBlocks = useMemo(() => {
    if (!input || !output) return [];
    return diffLines(input, output);
  }, [input, output]);

  useEffect(() => {
    return () => {
      clearProgressTracking();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

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
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Privacy mode: local-only</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Sanitized preview on</span>
        </div>
        <p className="max-w-3xl text-base text-slate-700">
          Convert Markdown to HTML or HTML back to Markdown. Runs in your browser for fast previews
          and copy-ready markup.
        </p>
        <p className="text-sm text-slate-600">
          Privacy mode means your content never leaves this device. Conversion and preview happen locally, and preview
          is sanitized by default.
        </p>
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
              checked={formatHtml}
              onChange={(e) => setFormatHtml(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              disabled={mode !== "md-to-html" || minifyOutput}
            />
            Format HTML output
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formatMarkdown}
              onChange={(e) => setFormatMarkdown(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              disabled={mode !== "html-to-md"}
            />
            Format Markdown output
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={minifyOutput}
              onChange={(e) => setMinifyOutput(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              disabled={mode !== "md-to-html"}
            />
            Minify output
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
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Developer-grade controls</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-900">Markdown → HTML</p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markdownOptions.gfmTables}
                  onChange={(e) =>
                    setMarkdownOptions((prev) => ({
                      ...prev,
                      gfmTables: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                GFM tables
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markdownOptions.lineBreaks}
                  onChange={(e) =>
                    setMarkdownOptions((prev) => ({
                      ...prev,
                      lineBreaks: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Line breaks → &lt;br&gt;
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markdownOptions.headingIds}
                  onChange={(e) =>
                    setMarkdownOptions((prev) => ({
                      ...prev,
                      headingIds: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Heading IDs
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markdownOptions.openLinksInNewTab}
                  onChange={(e) =>
                    setMarkdownOptions((prev) => ({
                      ...prev,
                      openLinksInNewTab: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Open links in new tab
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={markdownOptions.highlightCode}
                  onChange={(e) =>
                    setMarkdownOptions((prev) => ({
                      ...prev,
                      highlightCode: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Highlight code blocks
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-900">HTML → Markdown</p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={htmlOptions.preserveLinks}
                  onChange={(e) =>
                    setHtmlOptions((prev) => ({
                      ...prev,
                      preserveLinks: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Preserve links
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={htmlOptions.preserveImages}
                  onChange={(e) =>
                    setHtmlOptions((prev) => ({
                      ...prev,
                      preserveImages: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Preserve images
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={htmlOptions.keepInlineStyles}
                  onChange={(e) =>
                    setHtmlOptions((prev) => ({
                      ...prev,
                      keepInlineStyles: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Keep inline styles
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={htmlOptions.gfmTables}
                  onChange={(e) =>
                    setHtmlOptions((prev) => ({
                      ...prev,
                      gfmTables: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                GFM table conversion
              </label>
              <label className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">BR handling</span>
                <select
                  value={htmlOptions.brHandling}
                  onChange={(event) =>
                    setHtmlOptions((prev) => ({
                      ...prev,
                      brHandling: event.target.value as HtmlOptions["brHandling"],
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="single">Single newline</option>
                  <option value="double">Blank line</option>
                </select>
              </label>
            </div>
          </div>
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
            onClick={handleSwap}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            disabled={!input && !output}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Swap
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setCopied(false);
              setError("");
              setWarning("");
              setToast("");
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
          onChange={(event) => {
            const nextValue = event.target.value;
            if (mode === "md-to-html" && /^\s*</.test(nextValue)) {
              setMode("html-to-md");
              showToast("Detected HTML. Switched to HTML → Markdown.");
            }
            setInput(nextValue);
          }}
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="output-label">Output</p>
          <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex items-center justify-between text-xs text-slate-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showDiff}
            onChange={(e) => setShowDiff(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
          />
          Diff view
        </label>
        {toast ? <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">{toast}</span> : null}
      </div>

      {showDiff && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Input</p>
            <pre className="whitespace-pre-wrap break-words text-xs text-slate-800">
              {diffBlocks.length
                ? diffBlocks
                    .filter((part) => !part.added)
                    .map((part, index) => (
                      <span
                        key={`left-${index}`}
                        className={part.removed ? "rounded bg-rose-100 text-rose-700" : ""}
                      >
                        {part.value}
                      </span>
                    ))
                : input || "Nothing to compare yet."}
            </pre>
          </div>
          <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Output</p>
            <pre className="whitespace-pre-wrap break-words text-xs text-slate-800">
              {diffBlocks.length
                ? diffBlocks
                    .filter((part) => !part.removed)
                    .map((part, index) => (
                      <span
                        key={`right-${index}`}
                        className={part.added ? "rounded bg-emerald-100 text-emerald-700" : ""}
                      >
                        {part.value}
                      </span>
                    ))
                : output || "Nothing to compare yet."}
            </pre>
          </div>
        </div>
      )}

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
          <li>Use Swap, Diff view, and History to compare and reuse conversions.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">History</h2>
          <button
            onClick={() => setHistory([])}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            disabled={!history.length}
          >
            Clear history
          </button>
        </div>
        {history.length ? (
          <div className="space-y-2 text-sm text-slate-700">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {entry.mode === "md-to-html" ? "Markdown → HTML" : "HTML → Markdown"}
                    </p>
                    <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => {
                      setInput(entry.input);
                      setOutput(entry.output);
                      setMode(entry.mode);
                      setStatus("History restored");
                    }}
                    className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
                  >
                    Restore
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Input</p>
                    <p className="line-clamp-2 text-xs text-slate-700">{entry.input || "Empty"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Output</p>
                    <p className="line-clamp-2 text-xs text-slate-700">{entry.output || "Empty"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No conversions yet. Run a conversion to save it here.</p>
        )}
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
