"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

type DiffEntry = {
  path: string;
  type: "added" | "removed" | "changed" | "same";
  before?: unknown;
  after?: unknown;
};

const walkDiff = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  basePath = "",
): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const keys = new Set<string>([
    ...Object.keys(a || {}),
    ...Object.keys(b || {}),
  ]);

  for (const key of keys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const valA = a?.[key];
    const valB = b?.[key];

    if (valA === undefined && valB !== undefined) {
      entries.push({ path, type: "added", after: valB });
      continue;
    }
    if (valA !== undefined && valB === undefined) {
      entries.push({ path, type: "removed", before: valA });
      continue;
    }
    if (
      typeof valA === "object" &&
      typeof valB === "object" &&
      valA &&
      valB &&
      !Array.isArray(valA) &&
      !Array.isArray(valB)
    ) {
      entries.push(...walkDiff(valA as Record<string, unknown>, valB as Record<string, unknown>, path));
    } else if (valA !== valB) {
      entries.push({ path, type: "changed", before: valA, after: valB });
    } else {
      entries.push({ path, type: "same", before: valA, after: valB });
    }
  }

  return entries;
};

export default function JsonDiffClient() {
  const [left, setLeft] = useState('{\n  "name": "Alice",\n  "age": 25\n}');
  const [right, setRight] = useState('{\n  "name": "Alice",\n  "age": 26,\n  "city": "Paris"\n}');
  const parsed = useMemo(() => {
    try {
      const a = JSON.parse(left) as Record<string, unknown>;
      const b = JSON.parse(right) as Record<string, unknown>;
      if (Array.isArray(a) || Array.isArray(b)) {
        return { a: null, b: null, error: "Please provide JSON objects (not arrays)." };
      }
      return { a, b, error: "" };
    } catch {
      return { a: null, b: null, error: "Invalid JSON in one of the inputs." };
    }
  }, [left, right]);

  const diff = useMemo(() => {
    if (!parsed.a || !parsed.b) return [];
    return walkDiff(parsed.a, parsed.b);
  }, [parsed]);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">JSON Diff</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Compare two JSON objects and highlight added, removed, and changed values.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Left (original)</p>
            <button
              onClick={() => setLeft("")}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Right (new)</p>
            <button
              onClick={() => setRight("")}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {parsed.error ? (
        <p className="text-sm font-medium text-amber-600">{parsed.error}</p>
      ) : (
        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Differences</div>
          <div className="max-h-[320px] overflow-auto divide-y divide-slate-800">
            {diff.length ? (
              diff.map((d, idx) => (
                <div
                  key={`${d.path}-${idx}`}
                  className={`px-4 py-3 text-sm leading-relaxed ${
                    d.type === "same"
                      ? "text-slate-200"
                      : d.type === "added"
                        ? "bg-emerald-900/40 text-emerald-100"
                        : d.type === "removed"
                          ? "bg-rose-900/40 text-rose-100"
                          : "bg-amber-900/40 text-amber-100"
                  }`}
                >
                  <p className="font-semibold">{d.path}</p>
                  {d.type === "same" ? null : (
                    <div className="mt-1 grid gap-1 text-xs text-slate-100">
                      {d.before !== undefined ? <p>Before: {JSON.stringify(d.before)}</p> : null}
                      {d.after !== undefined ? <p>After: {JSON.stringify(d.after)}</p> : null}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-300">Diff will appear here.</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
