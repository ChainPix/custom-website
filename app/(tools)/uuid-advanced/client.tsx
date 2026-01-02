"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { v1 as uuidv1, v4 as uuidv4, v5 as uuidv5 } from "uuid";
import { Check, Clipboard, Download, RefreshCcw, Search } from "lucide-react";

type Version = "v1" | "v4" | "v5";
type DownloadFormat = "txt" | "csv" | "json";
type HistoryItem = {
  id: string;
  createdAt: string;
  version: Version;
  namespace: string;
  name: string;
  count: number;
  uppercase: boolean;
  includeHyphens: boolean;
  urnPrefix: boolean;
  uniqueMode: boolean;
  uuids: string[];
};

export default function UuidAdvancedClient() {
  const [version, setVersion] = useState<Version>("v4");
  const [namespace, setNamespace] = useState("6ba7b810-9dad-11d1-80b4-00c04fd430c8"); // DNS namespace
  const [name, setName] = useState("example.com");
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [filter, setFilter] = useState("");
  const [uppercase, setUppercase] = useState(false);
  const [includeHyphens, setIncludeHyphens] = useState(true);
  const [urnPrefix, setUrnPrefix] = useState(false);
  const [uniqueMode, setUniqueMode] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("txt");
  const [error, setError] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatUuid = (value: string) => {
    const raw = includeHyphens ? value : value.replace(/-/g, "");
    const cased = uppercase ? raw.toUpperCase() : raw.toLowerCase();
    return urnPrefix ? `urn:uuid:${cased}` : cased;
  };

  const pushHistory = (list: string[], total: number) => {
    const entry: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      version,
      namespace,
      name,
      count: total,
      uppercase,
      includeHyphens,
      urnPrefix,
      uniqueMode,
      uuids: list,
    };
    setHistory((prev) => [entry, ...prev].slice(0, 10));
  };

  const generate = (options?: { pushHistory?: boolean }) => {
    try {
      const total = Math.min(Math.max(count, 1), 50);
      let errorMessage = "";
      let list: string[] = [];
      if (version === "v1") {
        list = Array.from({ length: total }, () => uuidv1());
      } else if (version === "v4") {
        if (uniqueMode) {
          const unique = new Set<string>();
          let attempts = 0;
          const maxAttempts = total * 25;
          while (unique.size < total && attempts < maxAttempts) {
            unique.add(uuidv4());
            attempts += 1;
          }
          list = Array.from(unique);
          if (list.length < total) {
            errorMessage = "Unable to guarantee uniqueness at this size. Try again.";
          }
        } else {
          list = Array.from({ length: total }, () => uuidv4());
        }
      } else {
        list = Array.from({ length: total }, () => uuidv5(name || "example", namespace));
      }
      setUuids(list);
      setCopied(false);
      setCopiedSingle(null);
      setError(errorMessage);
      if (options?.pushHistory ?? true) {
        pushHistory(list, total);
      }
    } catch (err) {
      console.error("UUID generation error", err);
      setError("Invalid namespace or name for v5 generation.");
      setUuids([]);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filteredUuids.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopySingle = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSingle(value);
      setToast("Copied UUID");
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setToast("");
        setCopiedSingle(null);
      }, 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!filteredUuids.length) {
      return;
    }
    let content = "";
    let mime = "text/plain";
    let extension = "txt";
    if (downloadFormat === "csv") {
      content = ["uuid", ...filteredUuids].join("\n");
      mime = "text/csv";
      extension = "csv";
    } else if (downloadFormat === "json") {
      content = JSON.stringify(filteredUuids, null, 2);
      mime = "application/json";
      extension = "json";
    } else {
      content = filteredUuids.join("\n");
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `uuids.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const restoreHistory = (entry: HistoryItem) => {
    setVersion(entry.version);
    setNamespace(entry.namespace);
    setName(entry.name);
    setCount(entry.count);
    setUppercase(entry.uppercase);
    setIncludeHyphens(entry.includeHyphens);
    setUrnPrefix(entry.urnPrefix);
    setUniqueMode(entry.uniqueMode);
    setUuids(entry.uuids);
    setCopied(false);
    setCopiedSingle(null);
    setError("");
  };

  const formattedUuids = useMemo(() => uuids.map((value) => formatUuid(value)), [uuids, uppercase, includeHyphens, urnPrefix]);
  const filteredUuids = useMemo(() => {
    if (!filter.trim()) {
      return formattedUuids;
    }
    const needle = filter.trim().toLowerCase();
    return formattedUuids.filter((value) => value.toLowerCase().includes(needle));
  }, [filter, formattedUuids]);
  const uniqueBadge = uniqueMode && version === "v4" && uuids.length > 0;

  useEffect(() => {
    if (!autoGenerate) {
      return;
    }
    const timer = setTimeout(() => {
      generate({ pushHistory: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [autoGenerate, version, namespace, name, count, uppercase, includeHyphens, urnPrefix, uniqueMode]);

  return (
    <main className="space-y-8">
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
              UUID Advanced
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">UUID v1/v5 Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Create UUID v1 (time-based), v4 (random), or v5 (namespace + name). Generate in bulk and copy instantly.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          generate({ pushHistory: true });
        }}
        className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <select
            value={version}
            onChange={(event) => setVersion(event.target.value as Version)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="v1">UUID v1 (time-based)</option>
            <option value="v4">UUID v4 (random)</option>
            <option value="v5">UUID v5 (namespace/name)</option>
          </select>
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Count</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(event) => setAutoGenerate(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Auto-generate
          </label>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={() => {
              setVersion("v4");
              setNamespace("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
              setName("example.com");
              setCount(5);
              setUppercase(false);
              setIncludeHyphens(true);
              setUrnPrefix(false);
              setUniqueMode(false);
              setFilter("");
              setUuids([]);
              setCopied(false);
              setCopiedSingle(null);
              setError("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(event) => setUppercase(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Uppercase
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium">
            <input
              type="checkbox"
              checked={!includeHyphens}
              onChange={(event) => setIncludeHyphens(!event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            No hyphens
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium">
            <input
              type="checkbox"
              checked={urnPrefix}
              onChange={(event) => setUrnPrefix(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            urn:uuid prefix
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium">
            <input
              type="checkbox"
              checked={uniqueMode}
              onChange={(event) => setUniqueMode(event.target.checked)}
              disabled={version !== "v4"}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 disabled:opacity-60"
            />
            Unique mode (v4 only)
          </label>
          {uniqueBadge ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Check className="h-3 w-3" />
              Unique
            </span>
          ) : null}
        </div>

        {version === "v5" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Namespace UUID
              <input
                type="text"
                value={namespace}
                onChange={(event) => setNamespace(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Namespace UUID (e.g., DNS namespace)"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="example.com"
              />
            </label>
          </div>
        ) : null}
        {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : null}
      </form>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              UUIDs
              <span className="text-xs font-medium text-slate-400">{filteredUuids.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter UUIDs"
                  className="w-40 rounded-full border border-slate-800 bg-slate-950 py-1 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-slate-600 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!filteredUuids.length}
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy all"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs text-slate-300">
            <select
              value={downloadFormat}
              onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)}
              className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-100 focus:border-slate-600 focus:outline-none"
            >
              <option value="txt">.txt</option>
              <option value="csv">.csv</option>
              <option value="json">.json</option>
            </select>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!filteredUuids.length}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            {toast ? <span className="text-xs font-medium text-emerald-300">{toast}</span> : null}
          </div>
          <div className="max-h-[320px] overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {filteredUuids.length ? (
              <ul className="space-y-2">
                {filteredUuids.map((value, index) => (
                  <li
                    key={`${value}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
                  >
                    <span className="break-all font-mono text-xs text-slate-100">{value}</span>
                    <button
                      type="button"
                      onClick={() => handleCopySingle(value)}
                      className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium transition hover:bg-white/20"
                    >
                      {copiedSingle === value ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              "UUIDs will appear here after generation."
            )}
          </div>
        </div>

        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">History</p>
            <span className="text-xs text-slate-500">{history.length}/10</span>
          </div>
          {history.length ? (
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => restoreHistory(entry)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-sm transition hover:border-slate-300"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{entry.createdAt}</span>
                    <span>{entry.version}</span>
                  </div>
                  <div className="mt-1 font-medium text-slate-900">{entry.uuids.length} UUIDs</div>
                  {entry.version === "v5" ? (
                    <div className="text-[11px] text-slate-500">Name: {entry.name}</div>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Generate UUIDs to build history.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
