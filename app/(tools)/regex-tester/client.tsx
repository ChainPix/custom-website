"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const flagOptions = [
  { key: "i", label: "Ignore case (i)" },
  { key: "g", label: "Global (g)" },
  { key: "m", label: "Multiline (m)" },
  { key: "s", label: "Dotall (s)" },
] as const;

export default function RegexTesterClient() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  const regex = useMemo(() => {
    if (!pattern) return null;
    try {
      return new RegExp(pattern, flags.join(""));
    } catch (err) {
      console.error("Invalid regex", err);
      return null;
    }
  }, [pattern, flags]);

  const matches = useMemo(() => {
    if (!regex) return [];
    if (!text) return [];
    const all = [...text.matchAll(regex)];
    return all.map((m) => ({
      match: m[0] ?? "",
      index: m.index ?? 0,
    }));
  }, [regex, text]);

  const toggleFlag = (flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(matches.map((m) => m.match).join("\n"));
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
        <h1 className="text-3xl font-semibold text-slate-900">Regex Tester</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Test regular expressions with flags and see matches instantly. Runs in your browser.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={pattern}
            onChange={(event) => {
              setPattern(event.target.value);
            }}
            className="flex-1 min-w-[240px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Enter regex pattern e.g. \\w+"
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
              setPattern("");
              setFlags(["g"]);
              setText("");
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
          placeholder="Paste test text here"
        />
        {regex === null && pattern ? (
          <p className="text-sm font-medium text-amber-600">Invalid regex pattern.</p>
        ) : (
          <p className="text-sm text-slate-600">
            Matches: {matches.length} {matches.length === 0 ? "(none)" : ""}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Matches</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!matches.length}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
        </div>
        <div className="max-h-[260px] overflow-auto divide-y divide-slate-800">
          {matches.length ? (
            matches.map((m, idx) => (
              <div key={`${m.index}-${idx}`} className="px-4 py-3 text-sm leading-relaxed">
                <p className="font-semibold text-emerald-300">{m.match}</p>
                <p className="text-xs text-slate-400">Index: {m.index}</p>
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
