"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

type DiffLine = {
  type: "same" | "add" | "remove";
  text: string;
};

function simpleDiff(a: string, b: string): DiffLine[] {
  const left = a.split(/\r?\n/);
  const right = b.split(/\r?\n/);
  const max = Math.max(left.length, right.length);
  const result: DiffLine[] = [];

  for (let i = 0; i < max; i += 1) {
    const l = left[i] ?? "";
    const r = right[i] ?? "";
    if (l === r) {
      result.push({ type: "same", text: l });
    } else {
      if (l) result.push({ type: "remove", text: l });
      if (r) result.push({ type: "add", text: r });
    }
  }
  return result;
}

export default function DiffViewerClient() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const diff = useMemo(() => simpleDiff(left, right), [left, right]);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Diff Viewer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Compare two text snippets and see what changed. Additions and removals are highlighted.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Original</p>
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
            placeholder="Paste original text"
          />
        </div>

        <div className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Changed</p>
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
            placeholder="Paste changed text"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Diff</div>
        <div className="max-h-[320px] overflow-auto divide-y divide-slate-800">
          {diff.map((line, idx) => (
            <div
              key={`${line.type}-${idx}`}
              className={`px-4 py-2 text-sm leading-relaxed ${
                line.type === "same"
                  ? "bg-transparent text-slate-100"
                  : line.type === "add"
                    ? "bg-emerald-900/40 text-emerald-100"
                    : "bg-rose-900/40 text-rose-100"
              }`}
            >
              <span className="mr-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                {line.type === "same" ? " " : line.type === "add" ? "+" : "-"}
              </span>
              {line.text || " "}
            </div>
          ))}
          {!diff.length ? (
            <div className="px-4 py-3 text-sm text-slate-300">Diff will appear here.</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
