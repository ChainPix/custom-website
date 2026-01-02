"use client";

import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, Link2, Loader2, Plus, RefreshCcw, X } from "lucide-react";

type Language = "html" | "css" | "js";
type Mode = "minify" | "pretty";
type IndentStyle = "spaces-2" | "spaces-4" | "tabs";

type Options = {
  stripComments: boolean;
  normalizeWhitespace: boolean;
  indentStyle: IndentStyle;
};

type WorkerResponse = {
  id: number;
  output?: string;
  duration?: number;
  error?: string;
};

type WorkerRequest = {
  id: number;
  code: string;
  lang: Language;
  mode: Mode;
  options: Options;
  safeMode: boolean;
};

type DiffLine = {
  type: "same" | "add" | "remove";
  leftText: string;
  rightText: string;
  leftLine?: number;
  rightLine?: number;
};

type HistoryEntry = {
  input: string;
  output: string;
  lang: Language;
  mode: Mode;
  safeMode: boolean;
  options: Options;
  filename: string;
};

type TabState = {
  id: string;
  name: string;
  input: string;
  output: string;
  lang: Language;
  mode: Mode;
  safeMode: boolean;
  options: Options;
  filename: string;
  stats: {
    beforeChars: number;
    afterChars: number;
    beforeLines: number;
    afterLines: number;
    gzipBytes?: number;
  };
};

type Snippet = {
  id: string;
  name: string;
  content: string;
  lang: Language;
};

const detectLanguage = (code: string): Language | null => {
  const trimmed = code.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("<")) return "html";
  if (/[{;]\s*[\w-]+\s*:/.test(trimmed)) return "css";
  if (/\b(function|const|let|=>)\b/.test(trimmed)) return "js";
  return null;
};

const buildLineDiff = (leftText: string, rightText: string): DiffLine[] => {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const table = Array.from({ length: leftLines.length + 1 }, () => new Array(rightLines.length + 1).fill(0));

  for (let i = 1; i <= leftLines.length; i += 1) {
    for (let j = 1; j <= rightLines.length; j += 1) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = leftLines.length;
  let j = rightLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      diff.push({ type: "same", leftText: leftLines[i - 1], rightText: rightLines[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      diff.push({ type: "add", leftText: "", rightText: rightLines[j - 1] });
      j -= 1;
    } else {
      diff.push({ type: "remove", leftText: leftLines[i - 1], rightText: "" });
      i -= 1;
    }
  }

  diff.reverse();
  let leftLine = 1;
  let rightLine = 1;
  return diff.map((line) => {
    const next = { ...line };
    if (line.type === "same" || line.type === "remove") {
      next.leftLine = leftLine;
      leftLine += 1;
    }
    if (line.type === "same" || line.type === "add") {
      next.rightLine = rightLine;
      rightLine += 1;
    }
    return next;
  });
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const estimateGzipBytes = async (text: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  if (typeof CompressionStream === "undefined") {
    return Math.max(1, Math.round(data.length * 0.35));
  }
  const stream = new CompressionStream("gzip");
  const compressedStream = new Blob([data]).stream().pipeThrough(stream);
  const blob = await new Response(compressedStream).blob();
  return blob.size;
};

const STORAGE_KEY = "code-minifier-state-v1";
const SNIPPET_KEY = "code-minifier-snippets-v1";
const SHARE_KEY = "cm";
const MAX_SHARE_LENGTH = 4000;

const createTab = (index: number): TabState => ({
  id: crypto.randomUUID(),
  name: `File ${index}`,
  input: "",
  output: "",
  lang: "html",
  mode: "minify",
  safeMode: true,
  options: {
    stripComments: true,
    normalizeWhitespace: true,
    indentStyle: "spaces-2",
  },
  filename: "",
  stats: {
    beforeChars: 0,
    afterChars: 0,
    beforeLines: 0,
    afterLines: 0,
  },
});

const getExtension = (lang: Language) => {
  if (lang === "css") return "css";
  if (lang === "js") return "js";
  return "html";
};

export default function CodeMinifierClient() {
  const initialTabRef = useRef<TabState | null>(null);
  if (!initialTabRef.current) {
    initialTabRef.current = createTab(1);
  }
  const [tabs, setTabs] = useState<TabState[]>(() => [initialTabRef.current!]);
  const [activeTabId, setActiveTabId] = useState<string>(() => initialTabRef.current!.id);
  const [batchMode, setBatchMode] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [outputView, setOutputView] = useState<"output" | "diff">("output");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreSession, setRestoreSession] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [formatOnPaste, setFormatOnPaste] = useState(false);
  const [promptPaste, setPromptPaste] = useState(true);
  const [shareStatus, setShareStatus] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [snippetName, setSnippetName] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef(new Map<number, { resolve: (value: { output: string; duration?: number }) => void; reject: (err: Error) => void }>());
  const cancelRef = useRef(false);
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const formatOnPasteRef = useRef(false);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0], [tabs, activeTabId]);
  const input = activeTab?.input ?? "";
  const output = activeTab?.output ?? "";
  const lang = activeTab?.lang ?? "html";
  const mode = activeTab?.mode ?? "minify";
  const safeMode = activeTab?.safeMode ?? true;
  const options = activeTab?.options ?? {
    stripComments: true,
    normalizeWhitespace: true,
    indentStyle: "spaces-2",
  };
  const filename = activeTab?.filename ?? "";
  const stats = activeTab?.stats ?? { beforeChars: 0, afterChars: 0, beforeLines: 0, afterLines: 0 };

  const updateActiveTab = useCallback(
    (patch: Partial<TabState>) => {
      setTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...patch } : tab))
      );
    },
    [activeTabId]
  );

  const updateActiveOptions = useCallback(
    (patch: Partial<Options>) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, options: { ...tab.options, ...patch } } : tab
        )
      );
    },
    [activeTabId]
  );

  const pushHistory = (next: HistoryEntry) => {
    setHistory((prev) => [next, ...prev].slice(0, 10));
  };

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./code-minifier.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const pending = pendingRef.current.get(message.id);
      if (!pending) return;
      pendingRef.current.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error));
        return;
      }
      pending.resolve({ output: message.output ?? "", duration: message.duration });
    };
    workerRef.current = worker;
    return worker;
  };

  const requestJob = (payload: Omit<WorkerRequest, "id">) => {
    const worker = ensureWorker();
    const id = requestIdRef.current + 1;
    requestIdRef.current = id;
    return new Promise<{ output: string; duration?: number }>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      worker.postMessage({ id, ...payload });
    });
  };

  const handleConvert = (overrideInput?: string) => {
    if (isProcessing) return;
    const workingInput = overrideInput ?? input;
    if (!workingInput.trim()) {
      updateActiveTab({ output: "" });
      setError("Enter code to convert.");
      setStatus("No input provided");
      return;
    }
    const total = workingInput.length;
    if (total > 200_000) {
      setWarning(`Large input (${total.toLocaleString()} chars). Processing may be slow; output may differ.`);
    } else {
      setWarning("");
    }
    setError("");
    pushHistory({ input: workingInput, output, lang, mode, safeMode, options, filename });
    setStatus("Processing...");
    setIsProcessing(true);
    cancelRef.current = false;
    void requestJob({ code: workingInput, lang, mode, options, safeMode })
      .then(({ output: nextOutput, duration }) => {
        if (cancelRef.current) return;
        updateActiveTab({
          output: nextOutput,
          stats: {
            beforeChars: workingInput.length,
            afterChars: nextOutput.length,
            beforeLines: workingInput.split("\n").length,
            afterLines: nextOutput.split("\n").length,
          },
        });
        setError("");
        setStatus(duration ? `Conversion complete in ${duration}ms` : "Conversion complete");
        void estimateGzipBytes(nextOutput).then((gzipBytes) => {
          if (cancelRef.current) return;
          updateActiveTab({
            stats: {
              beforeChars: workingInput.length,
              afterChars: nextOutput.length,
              beforeLines: workingInput.split("\n").length,
              afterLines: nextOutput.split("\n").length,
              gzipBytes,
            },
          });
        });
      })
      .catch((err) => {
        if (cancelRef.current) return;
        console.error("Convert failed", err);
        setError("Unable to convert this code. Check syntax or try Safe Mode.");
        setStatus("Conversion failed");
      })
      .finally(() => {
        if (cancelRef.current) return;
        setIsProcessing(false);
      });
  };

  const handleCancel = () => {
    if (!isProcessing) return;
    workerRef.current?.terminate();
    workerRef.current = null;
    pendingRef.current.forEach((pending) => pending.reject(new Error("Cancelled")));
    pendingRef.current.clear();
    cancelRef.current = true;
    setIsProcessing(false);
    setStatus("Cancelled");
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
    const ext = getExtension(lang);
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ? `${filename}.${ext}` : `code-${mode}-${lang}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded output");
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    let count = 0;
    tabs.forEach((tab, index) => {
      if (!tab.output) return;
      const ext = getExtension(tab.lang);
      const base = tab.filename || tab.name || `file-${index + 1}`;
      zip.file(`${base}.${ext}`, tab.output);
      count += 1;
    });
    if (!count) return;
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "minified-batch.zip";
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${count} files`);
  };

  const handlePasteFromClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      setStatus("Clipboard access not available");
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      updateActiveTab({ input: text });
      setStatus("Pasted from clipboard");
      if (formatOnPaste) {
        handleConvert(text);
      }
    } catch (err) {
      console.error("Clipboard read failed", err);
      setStatus("Clipboard access denied");
    }
  };

  const handleShareLink = async () => {
    const payload = {
      input,
      output,
      lang,
      mode,
      safeMode,
      options,
      filename,
      formatOnPaste,
      autoDetect,
    };
    const encoded = compressToEncodedURIComponent(JSON.stringify(payload));
    if (encoded.length > MAX_SHARE_LENGTH) {
      setShareStatus("Share link too large. Try removing output or shortening input.");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set(SHARE_KEY, encoded);
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Shareable link copied.");
      setTimeout(() => setShareStatus(""), 1600);
    } catch (err) {
      console.error("Share copy failed", err);
      setShareStatus("Unable to copy share link.");
    }
  };

  const handleAddTab = () => {
    const nextIndex = tabs.length + 1;
    const nextTab = createTab(nextIndex);
    setTabs((prev) => [...prev, nextTab]);
    setActiveTabId(nextTab.id);
  };

  const handleRemoveTab = (id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((tab) => tab.id !== id);
      return next.length ? next : prev;
    });
  };

  const handleSaveSnippet = () => {
    if (!snippetName.trim() || !input.trim()) return;
    const next: Snippet = {
      id: crypto.randomUUID(),
      name: snippetName.trim(),
      content: input,
      lang,
    };
    setSnippets((prev) => [next, ...prev].slice(0, 20));
    setSnippetName("");
    setStatus("Saved snippet");
  };

  const handleLoadSnippet = (snippet: Snippet) => {
    updateActiveTab({ input: snippet.content, lang: snippet.lang });
    setStatus(`Loaded snippet: ${snippet.name}`);
  };

  const handleDeleteSnippet = (id: string) => {
    setSnippets((prev) => prev.filter((snippet) => snippet.id !== id));
  };

  const handleApplyPreset = (preset: string) => {
    if (preset === "prettier") {
      updateActiveTab({
        mode: "pretty",
        safeMode: true,
        options: { stripComments: false, normalizeWhitespace: true, indentStyle: "spaces-2" },
      });
      return;
    }
    if (preset === "compact") {
      updateActiveTab({
        mode: "pretty",
        safeMode: true,
        options: { stripComments: false, normalizeWhitespace: true, indentStyle: "spaces-2" },
      });
      return;
    }
    if (preset === "minify-safe") {
      updateActiveTab({
        mode: "minify",
        safeMode: true,
        options: { stripComments: false, normalizeWhitespace: false, indentStyle: "spaces-2" },
      });
      return;
    }
    if (preset === "minify-aggressive") {
      updateActiveTab({
        mode: "minify",
        safeMode: false,
        options: { stripComments: true, normalizeWhitespace: true, indentStyle: "spaces-2" },
      });
    }
  };

  const handleConvertAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setStatus(`Processing 1/${tabs.length}...`);
    cancelRef.current = false;
    for (let index = 0; index < tabs.length; index += 1) {
      if (cancelRef.current) break;
      const tab = tabs[index];
      if (!tab.input.trim()) continue;
      setStatus(`Processing ${index + 1}/${tabs.length}...`);
      try {
        const result = await requestJob({
          code: tab.input,
          lang: tab.lang,
          mode: tab.mode,
          options: tab.options,
          safeMode: tab.safeMode,
        });
        const gzipBytes = await estimateGzipBytes(result.output);
        setTabs((prev) =>
          prev.map((item) =>
            item.id === tab.id
              ? {
                  ...item,
                  output: result.output,
                  stats: {
                    beforeChars: tab.input.length,
                    afterChars: result.output.length,
                    beforeLines: tab.input.split("\n").length,
                    afterLines: result.output.split("\n").length,
                    gzipBytes,
                  },
                }
              : item
          )
        );
      } catch (err) {
        console.error("Batch convert failed", err);
      }
    }
    if (!cancelRef.current) {
      setStatus("Batch conversion complete");
    }
    setIsProcessing(false);
  };

  const handleEditorMount = (editor: import("monaco-editor").editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    editor.onDidPaste(() => {
      if (formatOnPasteRef.current) handleConvert(editor.getValue());
    });
  };
  const handleUndo = () => {
    const [latest, ...rest] = history;
    if (!latest) return;
    updateActiveTab({
      input: latest.input,
      output: latest.output,
      lang: latest.lang,
      mode: latest.mode,
      safeMode: latest.safeMode,
      options: latest.options,
      filename: latest.filename,
      stats: {
        beforeChars: latest.input.length,
        afterChars: latest.output.length,
        beforeLines: latest.input.split("\n").length,
        afterLines: latest.output.split("\n").length,
      },
    });
    setHistory(rest);
    setStatus("Reverted last conversion");
    void estimateGzipBytes(latest.output).then((gzipBytes) => {
      updateActiveTab({
        stats: {
          beforeChars: latest.input.length,
          afterChars: latest.output.length,
          beforeLines: latest.input.split("\n").length,
          afterLines: latest.output.split("\n").length,
          gzipBytes,
        },
      });
    });
  };

  const loadSample = (kind: Language) => {
    const samples: Record<Language, string> = {
      html: "<div class='card'>\n  <h1>Title</h1>\n  <p>Content here</p>\n</div>",
      css: "body {\n  margin: 0;\n  padding: 0;\n  color: #111;\n}\n.card { border: 1px solid #eee; }",
      js: "function greet(name) {\n  console.log('Hello, ' + name);\n}\ngreet('World');",
    };
    updateActiveTab({ lang: kind, input: samples[kind] });
    setStatus(`Loaded ${kind.toUpperCase()} sample`);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setHasSavedSession(Boolean(saved));
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(SNIPPET_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Snippet[];
      if (Array.isArray(parsed)) setSnippets(parsed);
    } catch (err) {
      console.error("Failed to load snippets", err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SNIPPET_KEY, JSON.stringify(snippets));
  }, [snippets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(SHARE_KEY);
    if (!encoded) return;
    try {
      const decoded = decompressFromEncodedURIComponent(encoded);
      if (!decoded) return;
      const payload = JSON.parse(decoded) as Partial<{
        input: string;
        output: string;
        lang: Language;
        mode: Mode;
        safeMode: boolean;
        options: Options;
        filename: string;
        formatOnPaste: boolean;
        autoDetect: boolean;
      }>;
      updateActiveTab({
        input: payload.input ?? "",
        output: payload.output ?? "",
        lang: payload.lang ?? lang,
        mode: payload.mode ?? mode,
        safeMode: payload.safeMode ?? safeMode,
        options: payload.options ?? options,
        filename: payload.filename ?? "",
      });
      if (typeof payload.formatOnPaste === "boolean") setFormatOnPaste(payload.formatOnPaste);
      if (typeof payload.autoDetect === "boolean") setAutoDetect(payload.autoDetect);
      setStatus("Loaded from share link");
    } catch (err) {
      console.error("Failed to parse share link", err);
    }
  }, []);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((tab) => tab.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    if (restoreSession) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as Partial<{
          tabs: TabState[];
          activeTabId: string;
          batchMode: boolean;
          autoDetect: boolean;
          formatOnPaste: boolean;
          promptPaste: boolean;
        }>;
        if (parsed.tabs?.length) {
          setTabs(parsed.tabs);
          const nextActive = parsed.activeTabId ?? parsed.tabs[0].id;
          setActiveTabId(nextActive);
        }
        if (typeof parsed.batchMode === "boolean") setBatchMode(parsed.batchMode);
        if (typeof parsed.autoDetect === "boolean") setAutoDetect(parsed.autoDetect);
        if (typeof parsed.formatOnPaste === "boolean") setFormatOnPaste(parsed.formatOnPaste);
        if (typeof parsed.promptPaste === "boolean") setPromptPaste(parsed.promptPaste);
        setStatus("Restored previous session");
      } catch (err) {
        console.error("Failed to restore session", err);
      }
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedSession(false);
  }, [restoreSession]);

  useEffect(() => {
    if (!restoreSession) return;
    const payload = {
      tabs,
      activeTabId,
      batchMode,
      autoDetect,
      formatOnPaste,
      promptPaste,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setHasSavedSession(true);
  }, [restoreSession, tabs, activeTabId, batchMode, autoDetect, formatOnPaste, promptPaste]);

  useEffect(() => {
    if (!autoDetect) return;
    const detected = detectLanguage(input);
    if (detected) updateActiveTab({ lang: detected });
  }, [autoDetect, input, updateActiveTab]);

  useEffect(() => {
    formatOnPasteRef.current = formatOnPaste;
  }, [formatOnPaste]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleConvert();
      }
      if ((event.key === "C" || event.key === "c") && event.shiftKey) {
        if (!output) return;
        event.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleConvert, handleCopy, output]);

  const savings = useMemo(() => {
    if (!stats.beforeChars) return null;
    const diff = stats.beforeChars - stats.afterChars;
    const percent = stats.beforeChars ? Math.round((diff / stats.beforeChars) * 100) : 0;
    return { diff, percent };
  }, [stats]);

  const diffLines = useMemo(() => {
    if (!input || !output) return [];
    return buildLineDiff(input, output);
  }, [input, output]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error} {warning} {shareStatus}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
              />
              Batch mode
            </label>
            {batchMode ? (
              <button
                onClick={handleConvertAll}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
                disabled={isProcessing}
                aria-label="Convert all tabs"
              >
                Convert all
              </button>
            ) : null}
            {batchMode ? (
              <button
                onClick={handleDownloadZip}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
                disabled={!tabs.some((tab) => tab.output)}
                aria-label="Download zip"
              >
                Download ZIP
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Presets</span>
            <select
              onChange={(event) => handleApplyPreset(event.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Preset"
              defaultValue=""
            >
              <option value="" disabled>
                Select preset
              </option>
              <option value="prettier">Prettier default</option>
              <option value="compact">2-space compact</option>
              <option value="minify-safe">Minify safe</option>
              <option value="minify-aggressive">Minify aggressive</option>
            </select>
          </div>
        </div>
        {batchMode ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            {tabs.map((tab) => (
              <div key={tab.id} className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTabId(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    tab.id === activeTabId ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                  aria-label={`Select ${tab.name}`}
                >
                  {tab.filename || tab.name}
                </button>
                {tabs.length > 1 ? (
                  <button
                    onClick={() => handleRemoveTab(tab.id)}
                    className="text-slate-400 transition hover:text-slate-700"
                    aria-label={`Remove ${tab.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            <button
              onClick={handleAddTab}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Add tab"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <select
            value={lang}
            onChange={(event) => {
              updateActiveTab({ lang: event.target.value as Language });
              setAutoDetect(false);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Language"
          >
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="js">JS</option>
          </select>
          <select
            value={mode}
            onChange={(event) => updateActiveTab({ mode: event.target.value as Mode })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Mode"
          >
            <option value="minify">Minify</option>
            <option value="pretty">Pretty-print</option>
          </select>
          <button
            onClick={handleConvert}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Convert code"
            disabled={isProcessing}
          >
            Convert
          </button>
          {isProcessing ? (
            <button
              onClick={handleCancel}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
              aria-label="Cancel processing"
            >
              Cancel
            </button>
          ) : null}
          {isProcessing ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          ) : null}
          <button
            onClick={handleUndo}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            aria-label="Undo last conversion"
            disabled={!history.length}
          >
            Undo ({history.length})
          </button>
          <button
            onClick={() => {
              updateActiveTab({
                input: "",
                output: "",
                stats: { beforeChars: 0, afterChars: 0, beforeLines: 0, afterLines: 0 },
              });
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
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-inner shadow-slate-200">
          <Editor
            height="260px"
            language={lang === "js" ? "javascript" : lang}
            value={input}
            onChange={(value) => updateActiveTab({ input: value ?? "" })}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              wordWrap: "on",
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        {promptPaste ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <button
              onClick={handlePasteFromClipboard}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Paste from clipboard"
            >
              Paste from clipboard
            </button>
            <span>Tip: This reads your clipboard only when you click.</span>
          </div>
        ) : null}
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
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
            />
            Auto-detect language
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={formatOnPaste}
              onChange={(e) => setFormatOnPaste(e.target.checked)}
            />
            Format on paste
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={promptPaste}
              onChange={(e) => setPromptPaste(e.target.checked)}
            />
            Paste prompt
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={restoreSession}
              onChange={(e) => setRestoreSession(e.target.checked)}
            />
            Restore previous session
          </label>
          {restoreSession && !hasSavedSession ? <span className="text-xs text-slate-500">No saved session yet.</span> : null}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={safeMode}
              onChange={(e) => updateActiveTab({ safeMode: e.target.checked })}
            />
            Safe Mode
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={options.stripComments}
              onChange={(e) => updateActiveOptions({ stripComments: e.target.checked })}
            />
            Strip comments
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={options.normalizeWhitespace}
              onChange={(e) => updateActiveOptions({ normalizeWhitespace: e.target.checked })}
            />
            Normalize whitespace
          </label>
          {mode === "pretty" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.12em] text-slate-500">Indent</span>
              <select
                value={options.indentStyle}
                onChange={(e) => updateActiveOptions({ indentStyle: e.target.value as IndentStyle })}
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
        {!safeMode ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            May break code. Disable Safe Mode only if you understand the risks.
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Filename
          <input
            type="text"
            value={filename}
            onChange={(event) => updateActiveTab({ filename: event.target.value })}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="optional-file-name"
            aria-label="Output filename"
          />
        </label>

        {stats.beforeChars ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
            <span>Before: {stats.beforeChars.toLocaleString()} chars / {stats.beforeLines} lines</span>
            <span>After: {stats.afterChars.toLocaleString()} chars / {stats.afterLines} lines</span>
            {savings ? <span>Savings: {savings.diff.toLocaleString()} chars ({savings.percent}% reduction)</span> : null}
            {typeof stats.gzipBytes === "number" ? <span>Gzip est: {formatBytes(stats.gzipBytes)}</span> : null}
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
              onClick={() => setOutputView("output")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                outputView === "output" ? "bg-white/20 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
              }`}
              aria-label="View output"
            >
              Output
            </button>
            <button
              onClick={() => setOutputView("diff")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                outputView === "diff" ? "bg-white/20 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label="View diff"
              disabled={!output}
            >
              Diff
            </button>
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
              onClick={handleShareLink}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!input}
              aria-label="Copy share link"
            >
              <Link2 className="h-4 w-4" />
              Share
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
        {shareStatus ? <p className="px-4 py-2 text-xs text-slate-300">{shareStatus}</p> : null}
        {outputView === "output" ? (
          <div className="min-h-[180px] p-4">
            {!output ? (
              <p className="text-sm text-slate-300">Converted output will appear here.</p>
            ) : null}
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <Editor
                height="220px"
                language={lang === "js" ? "javascript" : lang}
                value={output}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>
        ) : null}
        {outputView === "diff" ? (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Before</p>
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                {diffLines.map((line, idx) => (
                  <div key={`left-${idx}`} className="contents">
                    <div className={`text-right text-slate-500 ${line.type === "remove" ? "text-rose-300" : ""}`}>
                      {line.leftLine ?? ""}
                    </div>
                    <div
                      className={`${
                        line.type === "remove" ? "bg-rose-500/15 text-rose-100" : "text-slate-100"
                      } whitespace-pre-wrap break-words`}
                    >
                      {line.leftText || " "}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">After</p>
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                {diffLines.map((line, idx) => (
                  <div key={`right-${idx}`} className="contents">
                    <div className={`text-right text-slate-500 ${line.type === "add" ? "text-emerald-300" : ""}`}>
                      {line.rightLine ?? ""}
                    </div>
                    <div
                      className={`${
                        line.type === "add" ? "bg-emerald-500/15 text-emerald-100" : "text-slate-100"
                      } whitespace-pre-wrap break-words`}
                    >
                      {line.rightText || " "}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Snippet library</h2>
          <span className="text-xs text-slate-500">Saved locally in your browser</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={snippetName}
            onChange={(event) => setSnippetName(event.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Snippet name"
            aria-label="Snippet name"
          />
          <button
            onClick={handleSaveSnippet}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!snippetName.trim() || !input.trim()}
            aria-label="Save snippet"
          >
            Save snippet
          </button>
        </div>
        {snippets.length ? (
          <div className="mt-4 grid gap-2">
            {snippets.map((snippet) => (
              <div key={snippet.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{snippet.name}</p>
                  <p className="text-xs text-slate-500">{snippet.lang.toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadSnippet(snippet)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    aria-label={`Load ${snippet.name}`}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteSnippet(snippet.id)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-[var(--shadow-soft)] ring-1 ring-rose-200 transition hover:-translate-y-0.5"
                    aria-label={`Delete ${snippet.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No snippets saved yet.</p>
        )}
      </div>
      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Choose language (HTML/CSS/JS) and mode (Minify or Pretty), or pick a preset.</li>
          <li>Paste code or load a sample, adjust options (strip comments, normalize whitespace, indent style).</li>
          <li>Convert, then copy, share, or download the output; review the before/after + gzip stats.</li>
          <li>Enable batch mode for multiple files and download a ZIP.</li>
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
