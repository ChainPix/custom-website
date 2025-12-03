"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

type Mode = "plain" | "regex";

type SearchOptions = {
  mode: Mode;
  caseSensitive: boolean;
  wholeWord: boolean;
};

type MatchResult = {
  match: string;
  index: number;
  context: string;
};

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(query: string, opts: SearchOptions) {
  if (opts.mode === "regex") {
    try {
      return new RegExp(query, opts.caseSensitive ? "g" : "gi");
    } catch (err) {
      console.error("Invalid regex", err);
      return null;
    }
  }
  const escaped = escapeRegExp(query);
  const pattern = opts.wholeWord ? `\\b${escaped}\\b` : escaped;
  return new RegExp(pattern, opts.caseSensitive ? "g" : "gi");
}

function findMatches(text: string, query: string, opts: SearchOptions): MatchResult[] {
  if (!query) return [];
  const regex = buildRegex(query, opts);
  if (!regex) return [];
  const results: MatchResult[] = [];
  for (const m of text.matchAll(regex)) {
    const idx = m.index ?? 0;
    const snippetStart = Math.max(0, idx - 20);
    const snippetEnd = Math.min(text.length, idx + (m[0]?.length ?? 0) + 20);
    const context = text.slice(snippetStart, snippetEnd);
    results.push({
      match: m[0] ?? "",
      index: idx,
      context,
    });
  }
  return results;
}

export default function TextSearchClient() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchOptions>({
    mode: "plain",
    caseSensitive: false,
    wholeWord: false,
  });

  const matches = useMemo(() => findMatches(text, query, options), [text, query, options]);

  const error =
    options.mode === "regex" && query && !buildRegex(query, options)
      ? "Invalid regex pattern."
      : "";

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Text Search & Count</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Search text with regex or plain matching. Toggle case sensitivity and whole-word matching,
          and view match snippets.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Search query or regex"
          />
          <select
            value={options.mode}
            onChange={(event) =>
              setOptions((prev) => ({ ...prev, mode: event.target.value as Mode }))
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="plain">Plain</option>
            <option value="regex">Regex</option>
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-900"
              checked={options.caseSensitive}
              onChange={() => setOptions((prev) => ({ ...prev, caseSensitive: !prev.caseSensitive }))}
            />
            <span className="text-sm text-slate-700">Case sensitive</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-900"
              checked={options.wholeWord}
              onChange={() => setOptions((prev) => ({ ...prev, wholeWord: !prev.wholeWord }))}
            />
            <span className="text-sm text-slate-700">Whole word</span>
          </label>
          <button
            onClick={() => {
              setText("");
              setQuery("");
              setOptions({ mode: "plain", caseSensitive: false, wholeWord: false });
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste text to search"
        />
        {error ? (
          <p className="text-sm font-medium text-amber-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">Matches: {matches.length}</p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Snippets</div>
        <div className="max-h-[300px] overflow-auto divide-y divide-slate-800">
          {matches.length ? (
            matches.map((m, idx) => (
              <div key={`${m.index}-${idx}`} className="px-4 py-3 text-sm leading-relaxed">
                <p className="font-semibold text-emerald-300">{m.match}</p>
                <p className="text-xs text-slate-400">Index: {m.index}</p>
                <p className="mt-1 text-slate-100">{m.context}</p>
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-300">No matches yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}
