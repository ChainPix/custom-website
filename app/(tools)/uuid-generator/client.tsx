"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";
import { formatUuid, generateUuids, normalizeCount, type FormatOption, type UuidVersion } from "../../../lib/uuid-generator";

type SeparatorOption = "newline" | "comma" | "json" | "csv" | "sql";
type HistoryItem = {
  id: string;
  createdAt: string;
  version: UuidVersion;
  count: number;
  namespace: string;
  name: string;
  bulkNames: string;
  format: FormatOption;
  separator: SeparatorOption;
  uuids: string[];
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function UuidClient() {
  const searchParams = useSearchParams();
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState(5);
  const [countInput, setCountInput] = useState("5");
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [format, setFormat] = useState<FormatOption>("lower-dash");
  const [separator, setSeparator] = useState<SeparatorOption>("newline");
  const [namespace, setNamespace] = useState("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
  const [name, setName] = useState("example.com");
  const [bulkNames, setBulkNames] = useState("");
  const [copiedSingle, setCopiedSingle] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const outputPreviewRef = useRef<HTMLPreElement | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clipboardSupported = typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;

  const selectOutputPreview = () => {
    if (!outputPreviewRef.current || typeof window === "undefined") {
      return false;
    }
    const selection = window.getSelection();
    if (!selection) {
      return false;
    }
    const range = document.createRange();
    range.selectNodeContents(outputPreviewRef.current);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const copyWithFallback = async (text: string, options?: { selectOutput?: boolean }) => {
    try {
      if (clipboardSupported) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
    if (options?.selectOutput) {
      const selectionMade = selectOutputPreview();
      if (selectionMade) {
        try {
          const success = document.execCommand("copy");
          if (success) {
            return true;
          }
        } catch (err) {
          console.error("execCommand copy failed", err);
        }
      }
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        return true;
      }
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
    return false;
  };

  const formattedUuids = useMemo(() => uuids.map((value) => formatUuid(value, { format })), [uuids, format]);
  const bulkNameList = useMemo(
    () =>
      bulkNames
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 50),
    [bulkNames]
  );
  const namespaceValid = version !== "v5" || UUID_REGEX.test(namespace);

  const outputText = useMemo(() => {
    if (!formattedUuids.length) {
      return "";
    }
    if (separator === "comma") {
      return formattedUuids.join(", ");
    }
    if (separator === "json") {
      return JSON.stringify(formattedUuids, null, 2);
    }
    if (separator === "csv") {
      return ["uuid", ...formattedUuids].join("\n");
    }
    if (separator === "sql") {
      const values = formattedUuids.map((value) => `('${value}')`).join(",\n  ");
      return `INSERT INTO your_table (uuid) VALUES\n  ${values};`;
    }
    return formattedUuids.join("\n");
  }, [formattedUuids, separator]);

  const downloadMeta = useMemo(() => {
    if (separator === "json") {
      return { extension: "json", mime: "application/json" };
    }
    if (separator === "csv") {
      return { extension: "csv", mime: "text/csv" };
    }
    if (separator === "sql") {
      return { extension: "sql", mime: "text/plain" };
    }
    return { extension: "txt", mime: "text/plain" };
  }, [separator]);

  const shareLink = useMemo(() => {
    const params = new URLSearchParams();
    params.set("count", String(count));
    params.set("format", format.replace(/-/g, "_"));
    params.set("version", version);
    params.set("separator", separator);
    return `/uuid-generator?${params.toString()}`;
  }, [count, format, separator, version]);

  const pushToast = (message: string, tone: "success" | "error") => {
    setToast({ message, tone });
    setAnnouncement(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 1400);
  };

  const pushHistory = (list: string[], total: number) => {
    const entry: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      version,
      count: total,
      namespace,
      name,
      bulkNames,
      format,
      separator,
      uuids: list,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 5));
  };

  const generate = (nextCount?: number) => {
    const safeCount = Number.isFinite(nextCount) ? (nextCount as number) : count;
    const requestedTotal = normalizeCount(safeCount);
    try {
      if (version === "v5" && !namespaceValid) {
        setError("Enter a valid namespace UUID for v5.");
        setUuids([]);
        pushToast("Invalid namespace UUID", "error");
        return;
      }
      let list: string[] = [];
      if (version === "v5") {
        if (bulkNameList.length) {
          list = generateUuids(bulkNameList.length, { version, namespace, name, names: bulkNameList });
          setCount(list.length);
          setCountInput(String(list.length));
        } else {
          list = generateUuids(1, { version, namespace, name });
          setCount(1);
          setCountInput("1");
        }
      } else {
        list = generateUuids(requestedTotal, { version });
      }
      const total = list.length;
      const duplicateCount = list.length - new Set(list).size;
      setDuplicates(duplicateCount);
      setUuids(list);
      setError("");
      setCopiedSingle(null);
      pushHistory(list, total);
      setAnnouncement(`Generated ${total} UUID${total === 1 ? "" : "s"}.`);
      if (duplicateCount > 0) {
        pushToast(`Detected ${duplicateCount} duplicate UUID${duplicateCount === 1 ? "" : "s"}`, "error");
      } else {
        pushToast(`Generated ${total} UUID${total === 1 ? "" : "s"}`, "success");
      }
    } catch (err) {
      console.error("UUID generation error", err);
      setError("Unable to generate UUIDs. Check inputs and try again.");
      setUuids([]);
      setDuplicates(0);
      setAnnouncement("Generation failed.");
      pushToast("Generation failed", "error");
    }
  };

  const handleCopy = async () => {
    const text = outputText || formattedUuids.join("\n");
    const success = await copyWithFallback(text, { selectOutput: true });
    if (success) {
      setAnnouncement("Copied all UUIDs.");
      pushToast("Copied all UUIDs", "success");
    } else {
      setAnnouncement("Copy failed. Press Ctrl+C or Cmd+C.");
      pushToast("Press Ctrl+C / Cmd+C to copy", "error");
    }
  };

  const handleCopySingle = async (value: string) => {
    const success = await copyWithFallback(value);
    if (success) {
      setCopiedSingle(value);
      setAnnouncement("Copied UUID.");
      pushToast("Copied UUID", "success");
    } else {
      setAnnouncement("Copy failed. Press Ctrl+C or Cmd+C.");
      pushToast("Press Ctrl+C / Cmd+C to copy", "error");
    }
  };

  const handleDownload = () => {
    if (!formattedUuids.length) return;
    const content = outputText || formattedUuids.join("\n");
    const blob = new Blob([content], { type: downloadMeta.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uuids.${downloadMeta.extension}`;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 800);
    setAnnouncement("Download started.");
  };

  const handleSample = () => {
    setVersion("v4");
    setCount(5);
    setCountInput("5");
    const samples = generateUuids(5, { version: "v4" });
    setUuids(samples);
    setError("");
    setCopiedSingle(null);
    setDuplicates(samples.length - new Set(samples).size);
    setAnnouncement("Sample loaded.");
    pushToast("Sample loaded", "success");
  };

  const restoreHistory = (entry: HistoryItem) => {
    setVersion(entry.version);
    setCount(entry.count);
    setCountInput(String(entry.count));
    setNamespace(entry.namespace);
    setName(entry.name);
    setBulkNames(entry.bulkNames);
    setFormat(entry.format);
    setSeparator(entry.separator);
    setUuids(entry.uuids);
    setDuplicates(entry.uuids.length - new Set(entry.uuids).size);
    setError("");
    setCopiedSingle(null);
    setAnnouncement("History restored.");
  };

  useEffect(() => {
    if (!autoGenerate || uuids.length) {
      return;
    }
    const timer = setTimeout(() => {
      generate();
    }, 200);
    return () => clearTimeout(timer);
  }, [autoGenerate, uuids.length]);

  useEffect(() => {
    if (!searchParams) {
      return;
    }
    const countParam = Number(searchParams.get("count"));
    if (Number.isFinite(countParam)) {
      const nextCount = normalizeCount(countParam);
      setCount(nextCount);
      setCountInput(String(nextCount));
    }
    const formatParam = searchParams.get("format");
    if (formatParam) {
      const normalized = formatParam.replace(/_/g, "-");
      if (
        normalized === "lower-dash" ||
        normalized === "upper-dash" ||
        normalized === "lower-nodash" ||
        normalized === "upper-nodash"
      ) {
        setFormat(normalized);
      }
    }
    const versionParam = searchParams.get("version");
    if (versionParam === "v1" || versionParam === "v4" || versionParam === "v5" || versionParam === "v7") {
      setVersion(versionParam);
    }
    const separatorParam = searchParams.get("separator");
    if (
      separatorParam === "newline" ||
      separatorParam === "comma" ||
      separatorParam === "json" ||
      separatorParam === "csv" ||
      separatorParam === "sql"
    ) {
      setSeparator(separatorParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (!isEditable && event.key === "Enter") {
        event.preventDefault();
        generate();
        return;
      }
      if (!isEditable && event.key === "Escape") {
        setUuids([]);
        setCopiedSingle(null);
        setToast(null);
        setDuplicates(0);
        setError("");
        setAnnouncement("Cleared output.");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [generate, handleDownload]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {announcement} {error}
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
              UUID Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">UUID Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate v1, v4, v5, or v7 UUIDs for APIs, testing, or database keys. Copy or download multiple IDs instantly.
        </p>
        <p className="text-sm text-slate-600">Runs fully in your browser; nothing is uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Version</span>
            <select
              value={version}
              onChange={(event) => setVersion(event.target.value as UuidVersion)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="v4">UUID v4 (random)</option>
              <option value="v7">UUID v7 (time-ordered)</option>
              <option value="v1">UUID v1 (time + node)</option>
              <option value="v5">UUID v5 (namespace + name)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">How many?</span>
            <input
              type="number"
              min={1}
              max={50}
              value={countInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setCountInput(nextValue);
                if (nextValue.trim() === "") {
                  setError("Please enter a number between 1 and 50.");
                  return;
                }
                const val = Number(nextValue);
                if (!Number.isFinite(val)) {
                  setError("Please enter a number between 1 and 50.");
                  return;
                }
                if (val < 1 || val > 50) {
                  setError("Enter a count between 1 and 50.");
                  return;
                }
                setError("");
                setCount(val);
              }}
              disabled={version === "v5" && bulkNameList.length > 0}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <button
            onClick={generate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Generate
          </button>
          <button
            onClick={() => {
              setCount(1);
              setCountInput("1");
              generate(1);
            }}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Generate 1
          </button>
          <button
            onClick={() => {
              setCount(50);
              setCountInput("50");
              generate(50);
            }}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Generate max (50)
          </button>
          <button
            onClick={handleSample}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Sample
          </button>
          <button
            onClick={() => {
              setUuids([]);
              setCopiedSingle(null);
              setToast(null);
              setDuplicates(0);
              setError("");
              setAnnouncement("Cleared output.");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-medium text-slate-900">Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as typeof format)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="lower-dash">Lowercase with dashes</option>
              <option value="upper-dash">Uppercase with dashes</option>
              <option value="lower-nodash">Lowercase no dashes</option>
              <option value="upper-nodash">Uppercase no dashes</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-medium text-slate-900">Output</span>
            <select
              value={separator}
              onChange={(event) => setSeparator(event.target.value as typeof separator)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="newline">Newline</option>
              <option value="comma">Comma + space</option>
              <option value="json">JSON array</option>
              <option value="csv">CSV column</option>
              <option value="sql">SQL INSERT snippet</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(event) => setAutoGenerate(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Auto-generate on load
          </label>
        </div>
        {version === "v1" ? (
          <p className="text-xs text-amber-700">
            v1 UUIDs embed timestamp and node info. Avoid them if you need privacy.
          </p>
        ) : null}
        {version === "v5" ? (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Namespace UUID
              <input
                type="text"
                value={namespace}
                onChange={(event) => setNamespace(event.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm text-slate-800 shadow-inner focus:outline-none focus:ring-2 ${
                  namespaceValid
                    ? "border-slate-200 focus:border-slate-400 focus:ring-slate-200"
                    : "border-rose-400 focus:border-rose-400 focus:ring-rose-200"
                }`}
                placeholder="e.g., 6ba7b810-9dad-11d1-80b4-00c04fd430c8"
              />
              {!namespaceValid ? <span className="text-xs font-medium text-rose-600">Invalid namespace UUID</span> : null}
            </label>
            <label className="flex flex-col gap-1">
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="example.com"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              Bulk names (one per line)
              <textarea
                rows={4}
                value={bulkNames}
                onChange={(event) => setBulkNames(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder={"api.example.com\nusers/123\norders/456"}
              />
              <span className="text-xs text-slate-500">Paste up to 50 names. Each line maps to a deterministic v5 UUID.</span>
            </label>
            <p className="text-xs text-slate-500 sm:col-span-2">Tip: v5 generates one UUID per name. Use bulk names for multiple.</p>
          </div>
        ) : null}
        {error && (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="uuids-label">
            UUIDs
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!formattedUuids.length}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!formattedUuids.length}
            >
              <Clipboard className="h-4 w-4" />
              Copy all
            </button>
            {toast ? (
              <span
                className={`text-xs font-medium ${
                  toast.tone === "success" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {toast.message}
              </span>
            ) : null}
          </div>
        </div>
        <div className="max-h-[360px] overflow-auto p-4 text-sm leading-relaxed text-slate-100" role="region" aria-labelledby="uuids-label">
          {formattedUuids.length ? (
            <ul className="space-y-2">
              {formattedUuids.map((value, index) => (
                <li key={`${value}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(value)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-left transition hover:bg-slate-950"
                  >
                    <span className="break-all font-mono text-xs text-slate-100">{value}</span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                      {copiedSingle === value ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                      Copy
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            "Generated UUIDs will appear here."
          )}
          {formattedUuids.length ? (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Output preview</span>
                <span className={duplicates > 0 ? "text-rose-300" : "text-emerald-300"}>
                  {duplicates > 0 ? `${duplicates} duplicate${duplicates === 1 ? "" : "s"} found` : "No duplicates"}
                </span>
              </div>
              <pre
                ref={outputPreviewRef}
                tabIndex={0}
                onClick={() => {
                  const selected = selectOutputPreview();
                  if (selected) {
                    setAnnouncement("Output selected. Press Ctrl+C or Cmd+C to copy.");
                  }
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
                    event.preventDefault();
                    handleCopy();
                  }
                }}
                className="whitespace-pre-wrap break-words font-mono text-xs text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
              >
                {outputText}
              </pre>
              <p className="mt-2 text-[11px] text-slate-400">Click to select all.</p>
            </div>
          ) : null}
        </div>
        </div>
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">History</p>
            <span className="text-xs text-slate-500">{history.length}/5</span>
          </div>
          {history.length ? (
            <div className="space-y-2">
          {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{entry.createdAt}</span>
                    <span>{entry.version}</span>
                  </div>
                  <div className="mt-1 font-medium text-slate-900">{entry.uuids.length} UUIDs</div>
                  {entry.version === "v5" ? (
                    <div className="text-[11px] text-slate-500">Name: {entry.bulkNames ? "Bulk list" : entry.name}</div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => restoreHistory(entry)}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const list = entry.uuids.map((value) => {
                            return formatUuid(value, { format: entry.format });
                          });
                          let text = "";
                          if (entry.separator === "comma") {
                            text = list.join(", ");
                          } else if (entry.separator === "json") {
                            text = JSON.stringify(list, null, 2);
                          } else if (entry.separator === "csv") {
                            text = ["uuid", ...list].join("\n");
                          } else if (entry.separator === "sql") {
                            const values = list.map((value) => `('${value}')`).join(",\n  ");
                            text = `INSERT INTO your_table (uuid) VALUES\n  ${values};`;
                          } else {
                            text = list.join("\n");
                          }
                          const success = await copyWithFallback(text);
                          if (success) {
                            pushToast("Copied history batch", "success");
                          } else {
                            pushToast("Press Ctrl+C / Cmd+C to copy", "error");
                          }
                        } catch (err) {
                          console.error("Copy failed", err);
                          pushToast("Copy failed. Try Ctrl+C.", "error");
                        }
                      }}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Generate UUIDs to build history.</p>
          )}
        </aside>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Share & API Mode</h2>
            <p className="text-sm text-slate-600">Save and share exact settings, or script UUIDs later with the API.</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const success = await copyWithFallback(`${window.location.origin}${shareLink}`);
              if (success) {
                setAnnouncement("Share link copied.");
                pushToast("Share link copied", "success");
              } else {
                setAnnouncement("Copy failed. Press Ctrl+C or Cmd+C.");
                pushToast("Press Ctrl+C / Cmd+C to copy", "error");
              }
            }}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            Copy share link
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-800">Share link</div>
          <p className="mt-1 break-all font-mono text-[11px] text-slate-700">{shareLink}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-800">
          <div className="font-semibold text-emerald-900">API mode (coming soon)</div>
          <p className="mt-1 text-emerald-800">Planned endpoint: <span className="font-mono">/api/uuid?n=10&amp;format=upper_no_dash</span></p>
          <p className="mt-1 text-emerald-800">Ideal for CI scripts, seed data, and quick CLI tooling.</p>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-6 text-slate-700 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-semibold text-slate-900">Why v7?</h2>
        <p className="text-sm text-slate-600">
          UUID v7 keeps the uniqueness of v4 but preserves time ordering, which makes database indexes happier and improves query locality.
          If you care about sortable IDs at scale, v7 is a premium upgrade.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-6 text-slate-700 shadow-[var(--shadow-soft)]">
        <h2 className="text-lg font-semibold text-slate-900">Related tools</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/uuid-advanced" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300">
            UUID Advanced
          </Link>
          <Link href="/nanoid-generator" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300">
            NanoID Generator
          </Link>
          <Link href="/hash-generator" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300">
            Hash Generator
          </Link>
          <Link href="/password-generator" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-700 transition hover:border-slate-300">
            Password Generator
          </Link>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Are these UUIDs generated locally?</summary>
            <p className="mt-2 text-slate-700">Yes. Generation happens in your browser using the built-in crypto API; nothing is sent to a server.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I generate uppercase or compact UUIDs?</summary>
            <p className="mt-2 text-slate-700">Use the toggles for uppercase and removing dashes to match your required format.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is there a limit?</summary>
            <p className="mt-2 text-slate-700">You can generate up to 50 at once for quick copying or download.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
