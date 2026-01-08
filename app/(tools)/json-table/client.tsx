"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Shuffle, Sliders } from "lucide-react";

type Row = Record<string, unknown>;

export default function JsonTableClient() {
  const [input, setInput] = useState('[{"name":"Alice","age":25},{"name":"Bob","age":28}]');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rowLimit, setRowLimit] = useState(200);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const MAX_CHARS = 40000;
  const [pretty, setPretty] = useState(true);

  const parsed = useMemo(() => {
    try {
      const data = JSON.parse(input);
      if (!Array.isArray(data)) {
        return { rows: [], headers: [], error: "JSON should be an array of objects." };
      }
      const headers = Array.from(
        data.reduce((set: Set<string>, item: Row) => {
          Object.keys(item || {}).forEach((k) => set.add(k));
          return set;
        }, new Set<string>()),
      );
      return { rows: data as Row[], headers, error: "" };
    } catch {
      return { rows: [], headers: [], error: "Invalid JSON input." };
    }
  }, [input]);

  const filteredRows = useMemo(() => {
    if (parsed.error) return [];
    const rows = parsed.rows.slice(0, rowLimit);
    const term = filter.trim().toLowerCase();
    let result = rows;
    if (term) {
      result = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term));
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        if (va === vb) return 0;
        if (va === undefined) return -1;
        if (vb === undefined) return 1;
        if (va === null) return -1;
        if (vb === null) return 1;
        const vaStr = typeof va === "string" ? va : JSON.stringify(va);
        const vbStr = typeof vb === "string" ? vb : JSON.stringify(vb);
        if (vaStr > vbStr) return sortDir === "asc" ? 1 : -1;
        if (vaStr < vbStr) return sortDir === "asc" ? -1 : 1;
        return 0;
      });
    }
    return result;
  }, [parsed, filter, sortKey, sortDir, rowLimit]);

  const truncated = useMemo(() => {
    const total = parsed.rows.length;
    return total > filteredRows.length;
  }, [parsed.rows.length, filteredRows.length]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.error ? "" : JSON.stringify(parsed.rows, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied JSON");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const copyCsv = async () => {
    if (parsed.error || !parsed.rows.length) return;
    const cols = parsed.headers.filter((h) => !hiddenCols.has(String(h)));
    const lines = parsed.rows.map((row) =>
      cols.map((c) => `"${String((row as Row)[String(c)] ?? "").replace(/"/g, '""')}"`).join(","),
    );
    const csv = [cols.join(","), ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(csv);
      setStatus("Copied CSV");
    } catch {
      setStatus("Copy failed");
    }
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const sampleFlat = '[{"name":"Alice","age":25},{"name":"Bob","age":28,"city":"Paris"}]';
  const sampleNested =
    '[{"user":{"id":1,"name":"Alice"},"tags":["admin","editor"]},{"user":{"id":2,"name":"Bob"},"tags":["viewer"]}]';

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleCol = (col: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {parsed.error}
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
              JSON to Table
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JSON Table Viewer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Paste a JSON array to see it as a table. Validate input and copy clean JSON.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setInput('[{"name":"Alice","age":25},{"name":"Bob","age":28}]');
              setCopied(false);
              setStatus("Reset");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={() => {
              setInput(sampleFlat);
              setStatus("Loaded flat sample");
            }}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Flat sample
          </button>
          <button
            onClick={() => {
              setInput(sampleNested);
              setStatus("Loaded nested sample");
            }}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Nested sample
          </button>
          <button
            onClick={() => {
              setInput(input.split("").reverse().join(""));
              setStatus("Swapped via reverse (demo)");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Shuffle className="h-4 w-4" />
            Swap text
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button
            onClick={copyCsv}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
          >
            Copy CSV
          </button>
          <button
            onClick={() => download(JSON.stringify(parsed.rows, null, 2), "json-table.json")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
            aria-label="Download JSON"
          >
            <Download className="h-4 w-4" />
            Save JSON
          </button>
          <button
            onClick={() => {
              const cols = parsed.headers.filter((h) => !hiddenCols.has(String(h)));
              const lines = parsed.rows.map((row) =>
                cols.map((c) => `"${String((row as Row)[String(c)] ?? "").replace(/"/g, '""')}"`).join(","),
              );
              const csv = [cols.join(","), ...lines].join("\n");
              download(csv, "json-table.csv");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
            aria-label="Download CSV"
          >
            <Download className="h-4 w-4" />
            Save CSV
          </button>
        </div>
        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
        />
        {parsed.error ? (
          <p className="text-sm font-medium text-amber-600">{parsed.error}</p>
        ) : (
          <p className="text-sm text-slate-600">
            Rows detected: {parsed.rows.length} {input.length > MAX_CHARS ? " · Large input (truncated view)" : ""}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <button
            onClick={() => {
              try {
                const indent = pretty ? 0 : 2;
                setInput(JSON.stringify(JSON.parse(input), null, indent));
                setStatus(pretty ? "Minified input" : "Pretty-printed input");
              } catch {
                setStatus("Invalid JSON; cannot format");
              }
            }}
            className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            {pretty ? "Minify" : "Pretty print"}
          </button>
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={pretty}
              onChange={(e) => setPretty(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Pretty mode
          </label>
          {input.length > MAX_CHARS ? (
            <span className="text-amber-600 font-medium">Input exceeds {MAX_CHARS.toLocaleString()} chars; consider trimming.</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <Sliders className="h-4 w-4" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter rows (text search)"
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              aria-label="Filter rows"
            />
          </div>
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            Row limit
            <input
              type="number"
              value={rowLimit}
              onChange={(e) => setRowLimit(Math.max(10, Number(e.target.value) || 10))}
              className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
              aria-label="Row limit"
            />
          </label>
          {truncated ? <span className="text-amber-600 font-medium">Showing first {filteredRows.length} rows.</span> : null}
        </div>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="json-table-preview"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <span id="json-table-preview">Table preview</span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <span>
              Rows: {filteredRows.length} / {parsed.rows.length} · Columns: {parsed.headers.length}
            </span>
            <span className="text-slate-400">Toggle columns:</span>
            {parsed.headers.map((h) => (
              <label key={String(h)} className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                <input
                  type="checkbox"
                  checked={!hiddenCols.has(String(h))}
                  onChange={() => toggleCol(String(h))}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  aria-label={`Toggle column ${String(h)}`}
                />
                {String(h)}
              </label>
            ))}
          </div>
        </div>
        <div className="max-h-[360px] overflow-auto">
          {!filteredRows.length || parsed.error ? (
            <div className="px-4 py-3 text-sm text-slate-300">Valid table preview will appear here.</div>
          ) : (
            <table className="min-w-full text-left text-sm text-slate-100">
              <thead className="sticky top-0 bg-slate-800">
                <tr>
                  {parsed.headers
                    .filter((h) => !hiddenCols.has(String(h)))
                    .map((h) => (
                      <th
                        key={String(h)}
                        className="cursor-pointer px-4 py-2 font-semibold uppercase tracking-[0.1em] text-xs"
                        onClick={() => handleSort(String(h))}
                      >
                        {String(h)} {sortKey === String(h) ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-800/60">
                    {parsed.headers
                      .filter((h) => !hiddenCols.has(String(h)))
                      .map((h) => {
                        const key = String(h);
                        const value = (row as Record<string, unknown>)[key];
                        const display =
                          value && typeof value === "object" ? JSON.stringify(value) : JSON.stringify(value ?? "");
                        return (
                          <td key={key} className="px-4 py-2 align-top text-slate-200">
                            {display}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste a JSON array or load a sample; optional pretty/minify and filters.</li>
          <li>Toggle columns, sort headers, and adjust row limit; warnings show on large inputs.</li>
          <li>Copy/download JSON or CSV; table respects visible columns.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Parsing/rendering happen in your browser.</p>
          <p><strong>Large inputs?</strong> Inputs over ~40k chars show a warning; row limit/truncation keep UI responsive.</p>
          <p><strong>Exports?</strong> Copy or download JSON/CSV; you can also copy CSV to clipboard.</p>
        </div>
      </div>
    </main>
  );
}
