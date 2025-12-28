"use client";

import Link from "next/link";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import markedFootnote from "marked-footnote";
import hljs from "highlight.js/lib/common";
import mermaid from "mermaid";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import {
  MAX_PREVIEW_LENGTH,
  SAMPLE_MARKDOWN,
  type DomPurifyLike,
  getWarningMessage,
  sanitizeHtml as sanitizeHtmlContent,
  truncateInput,
} from "./utils";

type MarkdownDoc = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createDoc = (content: string, title = "Untitled"): MarkdownDoc => ({
  id: createId(),
  title,
  content,
  updatedAt: Date.now(),
});

const escapeCode = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const HIGHLIGHT_STYLES = `
.md-preview .hljs {
  background: #0b1120;
  color: #e2e8f0;
}
.md-preview[data-theme="light"] .hljs,
.md-preview[data-theme="github"] .hljs {
  background: #f1f5f9;
  color: #0f172a;
}
.md-preview .hljs-comment,
.md-preview .hljs-quote {
  color: #94a3b8;
}
.md-preview[data-theme="light"] .hljs-comment,
.md-preview[data-theme="light"] .hljs-quote,
.md-preview[data-theme="github"] .hljs-comment,
.md-preview[data-theme="github"] .hljs-quote {
  color: #64748b;
}
.md-preview .hljs-keyword,
.md-preview .hljs-selector-tag,
.md-preview .hljs-subst {
  color: #f472b6;
}
.md-preview[data-theme="light"] .hljs-keyword,
.md-preview[data-theme="light"] .hljs-selector-tag,
.md-preview[data-theme="light"] .hljs-subst,
.md-preview[data-theme="github"] .hljs-keyword,
.md-preview[data-theme="github"] .hljs-selector-tag,
.md-preview[data-theme="github"] .hljs-subst {
  color: #7c3aed;
}
.md-preview .hljs-string,
.md-preview .hljs-doctag {
  color: #34d399;
}
.md-preview[data-theme="light"] .hljs-string,
.md-preview[data-theme="light"] .hljs-doctag,
.md-preview[data-theme="github"] .hljs-string,
.md-preview[data-theme="github"] .hljs-doctag {
  color: #0f766e;
}
.md-preview .hljs-title,
.md-preview .hljs-section,
.md-preview .hljs-selector-id {
  color: #38bdf8;
}
.md-preview[data-theme="light"] .hljs-title,
.md-preview[data-theme="light"] .hljs-section,
.md-preview[data-theme="light"] .hljs-selector-id,
.md-preview[data-theme="github"] .hljs-title,
.md-preview[data-theme="github"] .hljs-section,
.md-preview[data-theme="github"] .hljs-selector-id {
  color: #0369a1;
}
.md-preview .hljs-number,
.md-preview .hljs-literal,
.md-preview .hljs-symbol {
  color: #fbbf24;
}
.md-preview[data-theme="light"] .hljs-number,
.md-preview[data-theme="light"] .hljs-literal,
.md-preview[data-theme="light"] .hljs-symbol,
.md-preview[data-theme="github"] .hljs-number,
.md-preview[data-theme="github"] .hljs-literal,
.md-preview[data-theme="github"] .hljs-symbol {
  color: #b45309;
}
.md-preview .md-heading-anchor {
  color: inherit;
  text-decoration: none;
}
.md-preview .md-heading-anchor:hover {
  text-decoration: underline;
}
.md-preview .task-list-item {
  list-style: none;
}
.md-preview .task-list-item input {
  margin-right: 0.5rem;
}
.md-preview .footnotes {
  margin-top: 2rem;
  border-top: 1px solid rgba(148, 163, 184, 0.4);
  padding-top: 1rem;
  font-size: 0.9em;
}
`;

marked.use(
  { gfm: true, breaks: false, mangle: false },
  markedFootnote(),
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang === "mermaid") return escapeCode(code);
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);

export default function MarkdownPreviewClient() {
  const [documents, setDocuments] = useState<MarkdownDoc[]>(() => [
    createDoc("# Hello Markdown\n\n- Item 1\n- Item 2\n\n`code`", "Draft 1"),
  ]);
  const [activeId, setActiveId] = useState<string>(documents[0]?.id ?? "");
  const [input, setInput] = useState(documents[0]?.content ?? "");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [sanitize, setSanitize] = useState(true);
  const [strictAllowlist, setStrictAllowlist] = useState(true);
  const [mermaidEnabled, setMermaidEnabled] = useState(false);
  const [panel, setPanel] = useState<"preview" | "html" | "markdown">("preview");
  const [layout, setLayout] = useState<"split" | "stack">("split");
  const [theme, setTheme] = useState<"light" | "dark" | "github">("dark");
  const [scrollSync, setScrollSync] = useState(true);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [debouncedInput, setDebouncedInput] = useState(input);
  const [splitRatio, setSplitRatio] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const MAX_LEN = MAX_PREVIEW_LENGTH;
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumberRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);
  const domPurifyInstance = useMemo<DomPurifyLike>(() => {
    const candidate = DOMPurify as unknown;
    if (typeof window === "undefined") {
      return candidate as DomPurifyLike;
    }
    if (typeof candidate === "function" && !("addHook" in candidate)) {
      return (candidate as (win: Window) => DomPurifyLike)(window);
    }
    return candidate as DomPurifyLike;
  }, []);
  const activeDoc = documents.find((doc) => doc.id === activeId);
  const debounceThreshold = 5000;
  const debounceDelayMs = 150;

  const sanitizeHtml = (raw: string) => {
    if (!sanitize) return raw;
    if (typeof window === "undefined") return raw;
    return sanitizeHtmlContent(raw, domPurifyInstance, strictAllowlist);
  };

  const warning = useMemo(() => {
    return getWarningMessage(input, MAX_LEN, isEditing);
  }, [input, MAX_LEN, isEditing]);

  const stats = useMemo(() => {
    const trimmed = input.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    const charCount = input.length;
    const minutes = wordCount ? Math.max(1, Math.ceil(wordCount / 200)) : 0;
    return { wordCount, charCount, minutes };
  }, [input]);

  const lineCount = useMemo(() => input.split("\n").length, [input]);
  const isDarkTheme = theme === "dark";
  const isGithubTheme = theme === "github";
  const previewShellClass = `flex h-full flex-1 flex-col rounded-2xl shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ${
    isDarkTheme
      ? "bg-slate-900 text-white ring-slate-800"
      : isGithubTheme
        ? "bg-[#f6f8fa] text-[#24292f] ring-slate-200"
        : "bg-white text-slate-900 ring-slate-200"
  }`;
  const previewHeaderClass = `flex items-center justify-between border-b px-4 py-3 ${
    isDarkTheme ? "border-slate-800" : "border-slate-200"
  }`;
  const previewPillWrapClass = isDarkTheme ? "bg-white/10" : "bg-slate-100";
  const previewPillActiveClass = isDarkTheme ? "bg-white text-slate-900" : "bg-slate-900 text-white";
  const previewPillInactiveClass = isDarkTheme ? "text-white/80 hover:text-white" : "text-slate-600 hover:text-slate-900";
  const previewActionClass = isDarkTheme
    ? "bg-white/10 text-white hover:bg-white/20"
    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5";
  const previewProseClass = `md-preview flex-1 overflow-auto p-4 text-sm leading-relaxed max-w-none ${
    isDarkTheme ? "prose prose-invert" : "prose"
  }`;
  const previewCodeBlockClass = isDarkTheme
    ? "border-white/10 bg-black/30 text-slate-100"
    : "border-slate-200 bg-slate-100 text-slate-800";
  const previewLineNumberClass = isDarkTheme ? "text-white/50" : "text-slate-400";

  const html = useMemo(() => {
    const source = input.length < debounceThreshold ? input : debouncedInput;
    const trimmed = source.trim();
    if (!trimmed) {
      return "";
    }
    const renderer = new marked.Renderer();
    const slugCounts = new Map<string, number>();
    const slugify = (value?: string) => {
      const base = (value ?? "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      const count = slugCounts.get(base) ?? 0;
      slugCounts.set(base, count + 1);
      return count ? `${base}-${count}` : base || "section";
    };
    renderer.heading = (token) => {
      const rawText = typeof token.text === "string" ? token.text : "";
      const slug = slugify(rawText);
      const inlineTokens = token.tokens ?? [];
      const inner = renderer.parser ? renderer.parser.parseInline(inlineTokens) : marked.parseInline(rawText);
      return `<h${token.depth} id="${slug}"><a class="md-heading-anchor" href="#${slug}">${inner}</a></h${token.depth}>`;
    };
    return sanitizeHtml(marked.parse(truncateInput(source, MAX_LEN), { renderer }) as string);
  }, [input, debouncedInput, sanitize, strictAllowlist, debounceThreshold]);

  const updateActiveDoc = (nextContent: string, nextTitle?: string) => {
    setInput(nextContent);
    setDocuments((docs) =>
      docs.map((doc) =>
        doc.id === activeId
          ? {
              ...doc,
              content: nextContent,
              title: nextTitle ?? doc.title,
              updatedAt: Date.now(),
            }
          : doc
      )
    );
  };

  const syncLineNumbers = () => {
    if (!lineNumberRef.current || !editorRef.current) return;
    lineNumberRef.current.scrollTop = editorRef.current.scrollTop;
  };

  const syncScroll = (source: HTMLElement | null, target: HTMLElement | null) => {
    if (!scrollSync || !source || !target) return;
    if (syncingScrollRef.current) return;
    const maxSource = source.scrollHeight - source.clientHeight;
    const maxTarget = target.scrollHeight - target.clientHeight;
    if (maxSource <= 0 || maxTarget <= 0) return;
    syncingScrollRef.current = true;
    const ratio = source.scrollTop / maxSource;
    target.scrollTop = ratio * maxTarget;
    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  };

  const updateSelection = (start: number, end: number) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    editorRef.current.setSelectionRange(start, end);
  };

  const applyWrap = (before: string, after: string, placeholder: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = input.slice(start, end) || placeholder;
    const nextValue = `${input.slice(0, start)}${before}${selected}${after}${input.slice(end)}`;
    updateActiveDoc(nextValue);
    const cursorStart = start + before.length;
    const cursorEnd = cursorStart + selected.length;
    updateSelection(cursorStart, cursorEnd);
  };

  const insertAtCursor = (value: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const nextValue = `${input.slice(0, start)}${value}${input.slice(end)}`;
    updateActiveDoc(nextValue);
    const cursor = start + value.length;
    updateSelection(cursor, cursor);
  };

  useEffect(() => {
    if (!activeDoc) return;
    if (activeDoc.content !== input) {
      setInput(activeDoc.content);
    }
  }, [activeDoc, input]);

  useEffect(() => {
    if (input.length < debounceThreshold) {
      setDebouncedInput(input);
      return;
    }
    const handle = window.setTimeout(() => setDebouncedInput(input), debounceDelayMs);
    return () => window.clearTimeout(handle);
  }, [input, debounceThreshold, debounceDelayMs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("md");
    if (encoded) {
      const decoded = decompressFromEncodedURIComponent(encoded);
      if (decoded) {
        const sharedDoc = createDoc(decoded, "Shared");
        setDocuments([sharedDoc]);
        setActiveId(sharedDoc.id);
        setInput(sharedDoc.content);
        setStatus("Loaded from share link");
        return;
      }
    }
    const stored = window.localStorage.getItem("markdownPreviewDrafts");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { documents?: MarkdownDoc[]; activeId?: string };
      if (!parsed.documents?.length) return;
      setDocuments(parsed.documents);
      const nextActiveId = parsed.activeId && parsed.documents.some((doc) => doc.id === parsed.activeId)
        ? parsed.activeId
        : parsed.documents[0].id;
      setActiveId(nextActiveId);
      const nextDoc = parsed.documents.find((doc) => doc.id === nextActiveId);
      setInput(nextDoc?.content ?? "");
    } catch (err) {
      console.error("Failed to load drafts", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "markdownPreviewDrafts",
      JSON.stringify({ documents, activeId })
    );
  }, [documents, activeId]);

  useEffect(() => {
    if (!mermaidEnabled || panel !== "preview") return;
    const container = previewRef.current;
    if (!container) return;
    const blocks = Array.from(container.querySelectorAll("pre code.language-mermaid"));
    if (!blocks.length) return;
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
    let cancelled = false;
    blocks.forEach(async (block, index) => {
      const code = block.textContent ?? "";
      try {
        const { svg } = await mermaid.render(`md-mermaid-${Date.now()}-${index}`, code);
        if (cancelled) return;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = svg;
        const pre = block.closest("pre");
        if (pre && pre.parentElement) {
          pre.parentElement.replaceChild(wrapper, pre);
        }
      } catch (err) {
        console.error("Mermaid render failed", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [html, mermaidEnabled, panel]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (event: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(30, percent));
      setSplitRatio(clamped);
    };
    const handleUp = () => {
      setIsResizing(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  const handleCopy = async () => {
    try {
      if (!html) return;
      await navigator.clipboard.writeText(getDocumentHtml());
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
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied HTML source");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const getDocumentHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Markdown Preview</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        padding: 32px 20px;
        font-family: "Georgia", "Times New Roman", serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .prose {
        max-width: 720px;
        margin: 0 auto;
        line-height: 1.7;
        font-size: 16px;
      }
      .prose h1 {
        font-size: 2rem;
        margin: 0 0 0.75rem;
      }
      .prose h2 {
        font-size: 1.5rem;
        margin: 1.5rem 0 0.75rem;
      }
      .prose h3 {
        font-size: 1.25rem;
        margin: 1.25rem 0 0.5rem;
      }
      .prose p,
      .prose ul,
      .prose ol,
      .prose blockquote,
      .prose pre,
      .prose table {
        margin: 0 0 1rem;
      }
      .prose a {
        color: #2563eb;
        text-decoration: underline;
      }
      .prose code {
        font-family: "SFMono-Regular", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        background: #e2e8f0;
        padding: 0.15rem 0.35rem;
        border-radius: 6px;
      }
      .prose pre {
        background: #0f172a;
        color: #e2e8f0;
        padding: 16px;
        border-radius: 12px;
        overflow: auto;
      }
      .prose pre code {
        background: transparent;
        padding: 0;
        color: inherit;
      }
      .prose .hljs {
        background: #0b1120;
        color: #e2e8f0;
      }
      .prose .hljs-comment,
      .prose .hljs-quote {
        color: #94a3b8;
      }
      .prose .hljs-keyword,
      .prose .hljs-selector-tag,
      .prose .hljs-subst {
        color: #f472b6;
      }
      .prose .hljs-string,
      .prose .hljs-doctag {
        color: #34d399;
      }
      .prose .hljs-title,
      .prose .hljs-section,
      .prose .hljs-selector-id {
        color: #38bdf8;
      }
      .prose .hljs-number,
      .prose .hljs-literal,
      .prose .hljs-symbol {
        color: #fbbf24;
      }
      .prose .md-heading-anchor {
        color: inherit;
        text-decoration: none;
      }
      .prose .md-heading-anchor:hover {
        text-decoration: underline;
      }
      .prose .task-list-item {
        list-style: none;
      }
      .prose .task-list-item input {
        margin-right: 0.5rem;
      }
      .prose .footnotes {
        margin-top: 2rem;
        border-top: 1px solid #e2e8f0;
        padding-top: 1rem;
        font-size: 0.9em;
      }
      .prose blockquote {
        border-left: 4px solid #cbd5f5;
        padding-left: 12px;
        color: #475569;
      }
      .prose table {
        width: 100%;
        border-collapse: collapse;
      }
      .prose th,
      .prose td {
        border: 1px solid #e2e8f0;
        padding: 0.5rem;
        text-align: left;
      }
      .prose img {
        max-width: 100%;
        height: auto;
      }
      .prose hr {
        border: 0;
        border-top: 1px solid #e2e8f0;
        margin: 1.5rem 0;
      }
      @media print {
        body {
          background: #ffffff;
          color: #0f172a;
          padding: 0;
        }
        .prose {
          max-width: none;
          padding: 24px;
        }
        a {
          color: inherit;
        }
      }
    </style>
  </head>
  <body>
    <main class="prose">
${html}
    </main>
  </body>
</html>`;

  const handleDownloadHtml = () => {
    if (!html) return;
    const blob = new Blob([getDocumentHtml()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "markdown.html";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded HTML");
  };

  const handleDownloadMarkdown = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const blob = new Blob([input], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "markdown.md";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded markdown");
  };

  const handleDownloadPdf = () => {
    if (!html) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setStatus("Popup blocked");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(getDocumentHtml());
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setStatus("Opened print dialog");
    };
  };

  const handleCopyRichText = async () => {
    try {
      if (typeof ClipboardItem === "undefined") {
        await navigator.clipboard.writeText(html);
        setStatus("Copied HTML source");
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([html], { type: "text/plain" }),
        }),
      ]);
      setStatus("Copied rich text");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleFileLoad = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".md")) {
      setStatus("Unsupported file type");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const title = file.name.replace(/\.md$/i, "");
      updateActiveDoc(result, title || "Imported");
      setStatus("Loaded markdown file");
    };
    reader.onerror = () => {
      setStatus("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const indent = "  ";
    const nextValue = `${input.slice(0, start)}${indent}${input.slice(end)}`;
    updateActiveDoc(nextValue);
    const cursor = start + indent.length;
    updateSelection(cursor, cursor);
  };

  const handleEditorScroll = () => {
    syncLineNumbers();
    syncScroll(editorRef.current, previewRef.current);
  };

  const handlePreviewScroll = () => {
    syncScroll(previewRef.current, editorRef.current);
    syncLineNumbers();
  };

  const handleFindNext = () => {
    if (!findQuery) return;
    const textarea = editorRef.current;
    const startFrom = textarea ? textarea.selectionEnd ?? 0 : 0;
    const nextIndex = input.indexOf(findQuery, startFrom);
    const matchIndex = nextIndex === -1 ? input.indexOf(findQuery, 0) : nextIndex;
    if (matchIndex === -1) {
      setStatus("No matches found");
      return;
    }
    updateSelection(matchIndex, matchIndex + findQuery.length);
    setStatus("Match selected");
  };

  const handleFindPrev = () => {
    if (!findQuery) return;
    const textarea = editorRef.current;
    const startFrom = textarea ? Math.max(0, (textarea.selectionStart ?? 0) - 1) : input.length;
    const prevIndex = input.lastIndexOf(findQuery, startFrom);
    const matchIndex = prevIndex === -1 ? input.lastIndexOf(findQuery) : prevIndex;
    if (matchIndex === -1) {
      setStatus("No matches found");
      return;
    }
    updateSelection(matchIndex, matchIndex + findQuery.length);
    setStatus("Match selected");
  };

  const handleReplace = () => {
    if (!findQuery) return;
    const textarea = editorRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const selected = input.slice(start, end);
    if (selected !== findQuery) {
      handleFindNext();
      return;
    }
    const nextValue = `${input.slice(0, start)}${replaceQuery}${input.slice(end)}`;
    updateActiveDoc(nextValue);
    const cursor = start + replaceQuery.length;
    updateSelection(cursor, cursor);
    setStatus("Replaced match");
  };

  const handleReplaceAll = () => {
    if (!findQuery) return;
    const matches = input.split(findQuery);
    if (matches.length === 1) {
      setStatus("No matches found");
      return;
    }
    const nextValue = matches.join(replaceQuery);
    updateActiveDoc(nextValue);
    setStatus(`Replaced ${matches.length - 1} matches`);
  };

  const handleShareLink = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setStatus("Nothing to share");
      return;
    }
    const encoded = compressToEncodedURIComponent(input);
    const url = `${window.location.origin}${window.location.pathname}?md=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Share link copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleNewDoc = () => {
    const nextIndex = documents.length + 1;
    const nextDoc = createDoc("", `Draft ${nextIndex}`);
    setDocuments((docs) => [...docs, nextDoc]);
    setActiveId(nextDoc.id);
    setInput("");
    setStatus("New draft created");
  };

  const handleSelectDoc = (docId: string) => {
    const nextDoc = documents.find((doc) => doc.id === docId);
    if (!nextDoc) return;
    setActiveId(docId);
    setInput(nextDoc.content);
    setStatus("Draft selected");
  };

  const handleCloseDoc = (docId: string) => {
    if (documents.length === 1) {
      const fallback = createDoc("# Hello Markdown\n\n- Item 1\n- Item 2\n\n`code`", "Draft 1");
      setDocuments([fallback]);
      setActiveId(fallback.id);
      setInput(fallback.content);
      setStatus("Reset to default");
      return;
    }
    const nextDocs = documents.filter((doc) => doc.id !== docId);
    setDocuments(nextDocs);
    if (docId === activeId) {
      const nextDoc = nextDocs[0];
      if (nextDoc) {
        setActiveId(nextDoc.id);
        setInput(nextDoc.content);
      }
    }
    setStatus("Draft closed");
  };

  const loadSample = (variant: "basic" | "code" | "table") => {
    updateActiveDoc(SAMPLE_MARKDOWN[variant]);
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

      {layout === "split" ? (
        <div ref={splitContainerRef} className="flex items-stretch gap-4">
          <div
            className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
            style={{ width: `${splitRatio}%` }}
          >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Markdown</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
              onClick={() => {
                fileInputRef.current?.click();
              }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                type="button"
              >
                Upload .md
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <button
                onClick={() => {
                  if (input.length > MAX_LEN) {
                    const confirmed = window.confirm("Resetting will discard a large draft. Continue?");
                    if (!confirmed) return;
                  }
                  updateActiveDoc("# Hello Markdown\n\n- Item 1\n- Item 2\n\n`code`");
                  setCopied(false);
                  setStatus("Reset");
                }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
              <button
                onClick={() => loadSample("basic")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load sample: basic"
              >
                Sample: basic
              </button>
              <button
                onClick={() => loadSample("code")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load sample: code"
              >
                Sample: code
              </button>
              <button
                onClick={() => loadSample("table")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load sample: table"
              >
                Sample: table
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-1">
                  <button
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`rounded-full px-3 py-1 transition ${
                      doc.id === activeId
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5"
                    }`}
                    type="button"
                  >
                    {doc.title}
                  </button>
                  <button
                    onClick={() => handleCloseDoc(doc.id)}
                    className="rounded-full px-2 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700"
                    aria-label={`Close ${doc.title}`}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleNewDoc}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              type="button"
            >
              New draft
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-inner shadow-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => applyWrap("**", "**", "bold text")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                type="button"
              >
                Bold
              </button>
              <button
                onClick={() => applyWrap("`", "`", "code")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                type="button"
              >
                Code
              </button>
              <button
                onClick={() => applyWrap("[", "](https://example.com)", "Link text")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                type="button"
              >
                Link
              </button>
              <button
                onClick={() =>
                  insertAtCursor("\n| Column | Column |\n| --- | --- |\n| Value | Value |\n")
                }
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                type="button"
              >
                Table
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Preview layout</span>
              <div className="flex overflow-hidden rounded-full bg-slate-100 p-1">
                <button
                  onClick={() => setLayout("split")}
                  className={`rounded-full px-2 py-1 transition ${
                    layout === "split" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                  type="button"
                >
                  Split
                </button>
                <button
                  onClick={() => setLayout("stack")}
                  className={`rounded-full px-2 py-1 transition ${
                    layout === "stack" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                  type="button"
                >
                  Stack
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Theme</span>
              <div className="flex overflow-hidden rounded-full bg-slate-100 p-1">
                <button
                  onClick={() => setTheme("light")}
                  className={`rounded-full px-2 py-1 transition ${
                    theme === "light" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                  type="button"
                >
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`rounded-full px-2 py-1 transition ${
                    theme === "dark" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                  type="button"
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme("github")}
                  className={`rounded-full px-2 py-1 transition ${
                    theme === "github" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                  type="button"
                >
                  GitHub
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-inner shadow-slate-200">
            <label className="text-[11px] font-semibold uppercase text-slate-500">Find</label>
            <input
              value={findQuery}
              onChange={(event) => setFindQuery(event.target.value)}
              className="h-8 w-40 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
              placeholder="Find"
            />
            <label className="text-[11px] font-semibold uppercase text-slate-500">Replace</label>
            <input
              value={replaceQuery}
              onChange={(event) => setReplaceQuery(event.target.value)}
              className="h-8 w-40 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
              placeholder="Replace"
            />
            <button
              onClick={handleFindPrev}
              className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              type="button"
            >
              Prev
            </button>
            <button
              onClick={handleFindNext}
              className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              type="button"
            >
              Next
            </button>
            <button
              onClick={handleReplace}
              className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              type="button"
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              type="button"
            >
              Replace all
            </button>
          </div>
          <div className="flex h-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner shadow-slate-200">
            <div
              ref={lineNumberRef}
              className="w-10 overflow-hidden border-r border-slate-200 bg-slate-50 px-2 py-3 text-right text-xs text-slate-400"
            >
              {Array.from({ length: lineCount }).map((_, index) => (
                <div key={index} className="leading-5">
                  {index + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={editorRef}
              className="h-full w-full flex-1 resize-none bg-white px-3 py-3 text-sm leading-5 text-slate-800 focus:outline-none focus:ring-0 font-mono"
              value={input}
              onChange={(event) => updateActiveDoc(event.target.value)}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onKeyDown={handleEditorKeyDown}
              onScroll={handleEditorScroll}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              spellCheck={false}
              aria-label="Markdown input"
            />
          </div>
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={mermaidEnabled}
                onChange={(e) => setMermaidEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              Render Mermaid (preview only)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scrollSync}
                onChange={(e) => setScrollSync(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              Scroll sync
            </label>
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Clipboard className="h-4 w-4" /> Copy markdown
            </button>
            {warning ? <span className="text-amber-600 font-medium">{warning}</span> : <span>Rendered output updates as you type.</span>}
            <span className="ml-auto text-slate-500">
              {stats.wordCount} words • {stats.charCount} chars • {stats.minutes} min read
            </span>
          </div>
        </div>
          <div className="flex items-stretch">
            <button
              onMouseDown={() => setIsResizing(true)}
              className="h-full w-2 rounded-full bg-slate-200 transition hover:bg-slate-300"
              aria-label="Resize editor and preview"
              type="button"
            />
          </div>
          <div className={previewShellClass} role="region" aria-labelledby="md-preview-heading">
            <div className={previewHeaderClass}>
              <p id="md-preview-heading" className="text-sm font-semibold">
                Preview / Source
              </p>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className={`flex overflow-hidden rounded-full p-1 text-xs font-medium ${previewPillWrapClass}`}>
                  <button
                    onClick={() => setPanel("preview")}
                    className={`rounded-full px-3 py-1 transition ${
                      panel === "preview" ? previewPillActiveClass : previewPillInactiveClass
                    }`}
                    type="button"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setPanel("html")}
                    className={`rounded-full px-3 py-1 transition ${
                      panel === "html" ? previewPillActiveClass : previewPillInactiveClass
                    }`}
                    type="button"
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setPanel("markdown")}
                    className={`rounded-full px-3 py-1 transition ${
                      panel === "markdown" ? previewPillActiveClass : previewPillInactiveClass
                    }`}
                    type="button"
                  >
                    Markdown
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {panel === "html" ? (
                    <>
                      <button
                        onClick={handleCopyHtmlSource}
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                        disabled={!html}
                        aria-label="Copy HTML source"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy HTML"}
                      </button>
                      <button
                        onClick={handleCopyRichText}
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                        disabled={!html}
                        aria-label="Copy rich text"
                      >
                        <Clipboard className="h-4 w-4" />
                        Copy rich text
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                      disabled={!html}
                      aria-label="Copy rendered HTML"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy HTML"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleShareLink}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!input.trim()}
                    aria-label="Copy share link"
                  >
                    <Clipboard className="h-4 w-4" />
                    Share link
                  </button>
                  <button
                    onClick={handleDownloadHtml}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!html}
                    aria-label="Download HTML"
                  >
                    <Download className="h-4 w-4" />
                    HTML
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!input.trim()}
                    aria-label="Download Markdown"
                  >
                    <Download className="h-4 w-4" />
                    Markdown
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!html}
                    aria-label="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
            <div
              ref={previewRef}
              data-theme={theme}
              onScroll={handlePreviewScroll}
              className={previewProseClass}
            >
              <style>{HIGHLIGHT_STYLES}</style>
              {panel === "preview" && <div dangerouslySetInnerHTML={{ __html: html }} />}
              {panel === "html" && (
                <pre className={`whitespace-pre-wrap rounded-xl border p-4 text-xs ${previewCodeBlockClass}`}>
                  <code>{html}</code>
                </pre>
              )}
              {panel === "markdown" && (
                <pre className={`rounded-xl border p-4 text-xs ${previewCodeBlockClass}`}>
                  {input.split("\n").map((line, index) => (
                    <div key={`${index}-${line}`} className="grid grid-cols-[auto,1fr] gap-3">
                      <span className={previewLineNumberClass}>{String(index + 1).padStart(2, "0")}</span>
                      <code className="whitespace-pre-wrap">{line || " "}</code>
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Markdown</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  type="button"
                >
                  Upload .md
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  onClick={() => {
                    if (input.length > MAX_LEN) {
                      const confirmed = window.confirm("Resetting will discard a large draft. Continue?");
                      if (!confirmed) return;
                    }
                    updateActiveDoc("# Hello Markdown\n\n- Item 1\n- Item 2\n\n`code`");
                    setCopied(false);
                    setStatus("Reset");
                  }}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  type="button"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
              <button
                onClick={() => loadSample("basic")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load sample: basic"
              >
                Sample: basic
              </button>
              <button
                onClick={() => loadSample("code")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load sample: code"
              >
                Sample: code
              </button>
              <button
                onClick={() => loadSample("table")}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load sample: table"
              >
                Sample: table
              </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <div className="flex flex-wrap items-center gap-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-1">
                    <button
                      onClick={() => handleSelectDoc(doc.id)}
                      className={`rounded-full px-3 py-1 transition ${
                        doc.id === activeId
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5"
                      }`}
                      type="button"
                    >
                      {doc.title}
                    </button>
                    <button
                      onClick={() => handleCloseDoc(doc.id)}
                      className="rounded-full px-2 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700"
                      aria-label={`Close ${doc.title}`}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleNewDoc}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                type="button"
              >
                New draft
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-inner shadow-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => applyWrap("**", "**", "bold text")}
                  className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  type="button"
                >
                  Bold
                </button>
                <button
                  onClick={() => applyWrap("`", "`", "code")}
                  className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  type="button"
                >
                  Code
                </button>
                <button
                  onClick={() => applyWrap("[", "](https://example.com)", "Link text")}
                  className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  type="button"
                >
                  Link
                </button>
                <button
                  onClick={() =>
                    insertAtCursor("\n| Column | Column |\n| --- | --- |\n| Value | Value |\n")
                  }
                  className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  type="button"
                >
                  Table
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Preview layout</span>
                <div className="flex overflow-hidden rounded-full bg-slate-100 p-1">
                  <button
                    onClick={() => setLayout("split")}
                    className={`rounded-full px-2 py-1 transition ${
                      layout === "split" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                    type="button"
                  >
                    Split
                  </button>
                  <button
                    onClick={() => setLayout("stack")}
                    className={`rounded-full px-2 py-1 transition ${
                      layout === "stack" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                    type="button"
                  >
                    Stack
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Theme</span>
                <div className="flex overflow-hidden rounded-full bg-slate-100 p-1">
                  <button
                    onClick={() => setTheme("light")}
                    className={`rounded-full px-2 py-1 transition ${
                      theme === "light" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                    type="button"
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`rounded-full px-2 py-1 transition ${
                      theme === "dark" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                    type="button"
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme("github")}
                    className={`rounded-full px-2 py-1 transition ${
                      theme === "github" ? "bg-slate-900 text-white" : "text-slate-600"
                    }`}
                    type="button"
                  >
                    GitHub
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-inner shadow-slate-200">
              <label className="text-[11px] font-semibold uppercase text-slate-500">Find</label>
              <input
                value={findQuery}
                onChange={(event) => setFindQuery(event.target.value)}
                className="h-8 w-40 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                placeholder="Find"
              />
              <label className="text-[11px] font-semibold uppercase text-slate-500">Replace</label>
              <input
                value={replaceQuery}
                onChange={(event) => setReplaceQuery(event.target.value)}
                className="h-8 w-40 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                placeholder="Replace"
              />
              <button
                onClick={handleFindPrev}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                type="button"
              >
                Prev
              </button>
              <button
                onClick={handleFindNext}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                type="button"
              >
                Next
              </button>
              <button
                onClick={handleReplace}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                type="button"
              >
                Replace
              </button>
              <button
                onClick={handleReplaceAll}
                className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                type="button"
              >
                Replace all
              </button>
            </div>
            <div className="flex h-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner shadow-slate-200">
              <div
                ref={lineNumberRef}
                className="w-10 overflow-hidden border-r border-slate-200 bg-slate-50 px-2 py-3 text-right text-xs text-slate-400"
              >
                {Array.from({ length: lineCount }).map((_, index) => (
                  <div key={index} className="leading-5">
                    {index + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={editorRef}
                className="h-full w-full flex-1 resize-none bg-white px-3 py-3 text-sm leading-5 text-slate-800 focus:outline-none focus:ring-0 font-mono"
                value={input}
                onChange={(event) => updateActiveDoc(event.target.value)}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onKeyDown={handleEditorKeyDown}
                onScroll={handleEditorScroll}
                onFocus={() => setIsEditing(true)}
                onBlur={() => setIsEditing(false)}
                spellCheck={false}
                aria-label="Markdown input"
              />
            </div>
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mermaidEnabled}
                  onChange={(e) => setMermaidEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Render Mermaid (preview only)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scrollSync}
                  onChange={(e) => setScrollSync(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Scroll sync
              </label>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                <Clipboard className="h-4 w-4" /> Copy markdown
              </button>
              {warning ? <span className="text-amber-600 font-medium">{warning}</span> : <span>Rendered output updates as you type.</span>}
              <span className="ml-auto text-slate-500">
                {stats.wordCount} words • {stats.charCount} chars • {stats.minutes} min read
              </span>
            </div>
          </div>

          <div className={previewShellClass} role="region" aria-labelledby="md-preview-heading">
            <div className={previewHeaderClass}>
              <p id="md-preview-heading" className="text-sm font-semibold">
                Preview / Source
              </p>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className={`flex overflow-hidden rounded-full p-1 text-xs font-medium ${previewPillWrapClass}`}>
                  <button
                    onClick={() => setPanel("preview")}
                    className={`rounded-full px-3 py-1 transition ${
                      panel === "preview" ? previewPillActiveClass : previewPillInactiveClass
                    }`}
                    type="button"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setPanel("html")}
                    className={`rounded-full px-3 py-1 transition ${
                      panel === "html" ? previewPillActiveClass : previewPillInactiveClass
                    }`}
                    type="button"
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setPanel("markdown")}
                    className={`rounded-full px-3 py-1 transition ${
                      panel === "markdown" ? previewPillActiveClass : previewPillInactiveClass
                    }`}
                    type="button"
                  >
                    Markdown
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {panel === "html" ? (
                    <>
                      <button
                        onClick={handleCopyHtmlSource}
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                        disabled={!html}
                        aria-label="Copy HTML source"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy HTML"}
                      </button>
                      <button
                        onClick={handleCopyRichText}
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                        disabled={!html}
                        aria-label="Copy rich text"
                      >
                        <Clipboard className="h-4 w-4" />
                        Copy rich text
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                      disabled={!html}
                      aria-label="Copy rendered HTML"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy HTML"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleShareLink}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!input.trim()}
                    aria-label="Copy share link"
                  >
                    <Clipboard className="h-4 w-4" />
                    Share link
                  </button>
                  <button
                    onClick={handleDownloadHtml}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!html}
                    aria-label="Download HTML"
                  >
                    <Download className="h-4 w-4" />
                    HTML
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!input.trim()}
                    aria-label="Download Markdown"
                  >
                    <Download className="h-4 w-4" />
                    Markdown
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${previewActionClass}`}
                    disabled={!html}
                    aria-label="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
            <div
              ref={previewRef}
              data-theme={theme}
              onScroll={handlePreviewScroll}
              className={previewProseClass}
            >
              <style>{HIGHLIGHT_STYLES}</style>
              {panel === "preview" && <div dangerouslySetInnerHTML={{ __html: html }} />}
              {panel === "html" && (
                <pre className={`whitespace-pre-wrap rounded-xl border p-4 text-xs ${previewCodeBlockClass}`}>
                  <code>{html}</code>
                </pre>
              )}
              {panel === "markdown" && (
                <pre className={`rounded-xl border p-4 text-xs ${previewCodeBlockClass}`}>
                  {input.split("\n").map((line, index) => (
                    <div key={`${index}-${line}`} className="grid grid-cols-[auto,1fr] gap-3">
                      <span className={previewLineNumberClass}>{String(index + 1).padStart(2, "0")}</span>
                      <code className="whitespace-pre-wrap">{line || " "}</code>
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

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
          <p><strong>Are drafts saved?</strong> Yes. Drafts are stored in your browser's local storage.</p>
          <p><strong>Exports?</strong> Copy HTML/markdown, share a link, or download HTML/Markdown/PDF.</p>
        </div>
      </div>
    </main>
  );
}
