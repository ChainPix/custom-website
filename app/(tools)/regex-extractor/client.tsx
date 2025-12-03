"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

type Row = {
  match: string;
  index: number;
  groups: string[];
};

const flagOptions = [
  { key: "i", label: "Ignore case (i)" },
  { key: "m", label: "Multiline (m)" },
  { key: "s", label: "Dotall (s)" },
] as const;

export default function RegexExtractorClient() {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+)");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [text, setText] = useState("email me at hello@fastformat.com and info@tools.dev");

  const results = useMemo(() => {
    if (!pattern) return [];
    try {
      const regex = new RegExp(pattern, flags.join(""));
      const matches: Row[] = [];
      for (const m of text.matchAll(regex)) {
        matches.push({
          match: m[0] ?? "",
          index: m.index ?? 0,
          groups: (m as RegExpExecArray).slice(1) as string[],
        });
      }
      return matches;
    } catch (err) {
      console.error("Regex error", err);
      return [];
    }
  }, [pattern, flags, text]);

  const isPatternValid = useMemo(() => {
    try {
      if (!pattern) return false;
      new RegExp(pattern, flags.join(""));
      return true;
    } catch {
      return false;
    }
  }, [pattern, flags]);

  const toggleFlag = (flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Regex Extractor</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Extract regex matches and capture groups. View results in a structured table.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Regex pattern"
          />
          <div className="flex flex-wrap gap-2">
            {flagOptions.map((flag) => (
              <label
                key={flag.key}
                className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-slate-900"
                  checked={flags.includes(flag.key)}
                  onChange={() => toggleFlag(flag.key)}
                />
                {flag.label}
              </label>
            ))}
          </div>
          <button
            onClick={() => {
              setPattern("(\\w+)@(\\w+)");
              setFlags(["g"]);
              setText("email me at hello@fastformat.com and info@tools.dev");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste text to extract matches"
        />
        {!isPatternValid ? (
          <p className="text-sm font-medium text-amber-600">Invalid regex pattern.</p>
        ) : (
          <p className="text-sm text-slate-600">Matches found: {results.length}</p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Results</div>
        <div className="max-h-[320px] overflow-auto divide-y divide-slate-800">
          {results.length ? (
            results.map((row, idx) => (
              <div key={`${row.index}-${idx}`} className="px-4 py-3 text-sm leading-relaxed">
                <p className="font-semibold text-emerald-300">
                  {row.match} <span className="text-xs text-slate-400">@ {row.index}</span>
                </p>
                {row.groups.length ? (
                  <div className="mt-2 grid gap-1 text-xs text-slate-200 sm:grid-cols-2">
                    {row.groups.map((g, gi) => (
                      <p key={gi}>
                        <span className="text-slate-400">Group {gi + 1}:</span> {g || "(empty)"}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No capture groups.</p>
                )}
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
