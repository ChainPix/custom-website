"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Row = Record<string, unknown>;

export default function JsonTableClient() {
  const [input, setInput] = useState('[{"name":"Alice","age":25},{"name":"Bob","age":28}]');
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.error ? "" : JSON.stringify(parsed.rows, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
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
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy JSON"}
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
          <p className="text-sm text-slate-600">Rows detected: {parsed.rows.length}</p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Table preview</div>
        <div className="max-h-[360px] overflow-auto">
          {!parsed.rows.length || parsed.error ? (
            <div className="px-4 py-3 text-sm text-slate-300">Valid table preview will appear here.</div>
          ) : (
            <table className="min-w-full text-left text-sm text-slate-100">
              <thead className="sticky top-0 bg-slate-800">
                <tr>
                  {parsed.headers.map((h) => (
                    <th key={String(h)} className="px-4 py-2 font-semibold uppercase tracking-[0.1em] text-xs">
                      {String(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-800/60">
                    {parsed.headers.map((h) => {
                      const key = String(h);
                      return (
                        <td key={key} className="px-4 py-2 align-top text-slate-200">
                          {JSON.stringify((row as Record<string, unknown>)[key] ?? "")}
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
    </main>
  );
}
