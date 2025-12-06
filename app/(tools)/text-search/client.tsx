"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";

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
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [autoRun, setAutoRun] = useState(true);
  const [debounce, setDebounce] = useState(true);
  const [runVersion, setRunVersion] = useState(0);
  const [replaceEnabled, setReplaceEnabled] = useState(false);
  const [replaceWith, setReplaceWith] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [options, setOptions] = useState<SearchOptions>({
    mode: "plain",
    caseSensitive: false,
    wholeWord: false,
  });

  useEffect(() => {
    if (!text && !query) {
      setWarning("Enter text and a search query to begin.");
      return;
    }
    const chars = text.length;
    if (chars > 120000) {
      setWarning(`Large input (${chars.toLocaleString()} chars). Searching may be slower.`);
    } else {
      setWarning("");
    }
  }, [text, query]);

  useEffect(() => {
    if (autoRun) {
      if (debounce) {
        const id = setTimeout(() => setRunVersion((v) => v + 1), 180);
        return () => clearTimeout(id);
      }
      setRunVersion((v) => v + 1);
    }
  }, [text, query, options, autoRun, debounce]);

  const matches = useMemo(() => findMatches(text, query, options), [text, query, options, runVersion]);

  useEffect(() => {
    setActiveIndex(0);
  }, [runVersion]);

  const error =
    options.mode === "regex" && query && !buildRegex(query, options)
      ? "Invalid regex pattern."
      : "";

  const highlightedSegments = useMemo(() => {
    if (!query || !matches.length) return [{ key: "all", content: text, highlight: false }];
    const segs: Array<{ key: string; content: string; highlight: boolean }> = [];
    let cursor = 0;
    matches.forEach((m, idx) => {
      const start = m.index;
      const end = m.index + m.match.length;
      if (start > cursor) segs.push({ key: `plain-${idx}`, content: text.slice(cursor, start), highlight: false });
      segs.push({ key: `hit-${idx}`, content: text.slice(start, end), highlight: true });
      cursor = end;
    });
    if (cursor < text.length) {
      segs.push({ key: "tail", content: text.slice(cursor), highlight: false });
    }
    return segs;
  }, [text, matches, query]);

  const handleReplaceAll = () => {
    if (!replaceEnabled || !query) return;
    const regex = buildRegex(query, options);
    if (!regex) return;
    const newText = text.replace(regex, replaceWith);
    setText(newText);
    setStatus("Replaced all");
  };

  const copyMatches = async () => {
    try {
      await navigator.clipboard.writeText(matches.map((m) => m.match).join("\n"));
      setStatus("Copied matches");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const downloadMatches = () => {
    const payload = matches.map((m) => ({ match: m.match, index: m.index, context: m.context }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "text-search-matches.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded matches");
  };

  const loadSample = () => {
    setText(
      "ToolStack makes fast browser tools.\nJSON formatter, text search, and regex tester help developers.\nSearch this paragraph for the word 'tool' or 'text'.",
    );
    setQuery("tool");
    setOptions({ ...options, mode: "plain", caseSensitive: false, wholeWord: true });
    setStatus("Loaded sample");
  };

  const counts = useMemo(
    () => ({
      total: matches.length,
    }),
    [matches],
  );

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

      <div className="sr-only" aria-live="polite">
        {status} {warning} {error}
      </div>

      <div
        className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
        role="region"
        aria-label="Search controls"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={query}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Search query or regex"
            aria-label="Search query"
            onChange={(event) => {
              setQuery(event.target.value);
              if (!autoRun) setStatus("Query updated (auto-run off)");
            }}
          />
          <select
            value={options.mode}
            onChange={(event) =>
              setOptions((prev) => ({ ...prev, mode: event.target.value as Mode }))
            }
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Search mode"
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
              setStatus("Cleared");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Clear text and query"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (!autoRun) setStatus("Text updated (auto-run off)");
          }}
          placeholder="Paste text to search"
          aria-label="Text to search"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={autoRun}
              onChange={(e) => {
                setAutoRun(e.target.checked);
                setStatus(e.target.checked ? "Auto-run on" : "Auto-run off");
              }}
            />
            Auto-run
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={debounce}
              onChange={(e) => {
                setDebounce(e.target.checked);
                setStatus(e.target.checked ? "Debounce on" : "Debounce off");
              }}
              disabled={!autoRun}
            />
            Debounce auto-run
          </label>
          <button
            type="button"
            onClick={() => {
              setRunVersion((v) => v + 1);
              setStatus("Manual run");
            }}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={autoRun}
            aria-label="Run search manually"
          >
            Run
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample text and query"
          >
            Sample
          </button>
          {warning ? (
            <span className="font-medium text-amber-700" role="alert">
              {warning}
            </span>
          ) : null}
        </div>
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-sm text-slate-600">Matches: {counts.total}</p>
        )}
      </div>

      <div
        className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
        role="region"
        aria-label="Search preview"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
          <span className="text-xs text-slate-600">
            {matches.length ? `Match ${activeIndex + 1} of ${matches.length}` : "No matches yet"}
          </span>
        </div>
        <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm leading-relaxed text-slate-900">
          {highlightedSegments.map((seg) => (
            <span
              key={seg.key}
              className={
                seg.highlight
                  ? "rounded bg-emerald-200/80 px-0.5 text-slate-900"
                  : ""
              }
            >
              {seg.content}
            </span>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-label="Search results snippets"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <span>Snippets</span>
          <div className="flex items-center gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setActiveIndex((prev) => (matches.length ? (prev - 1 + matches.length) % matches.length : 0));
                setStatus("Moved to previous match");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!matches.length}
              aria-label="Previous match"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveIndex((prev) => (matches.length ? (prev + 1) % matches.length : 0));
                setStatus("Moved to next match");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!matches.length}
              aria-label="Next match"
            >
              Next
            </button>
            <button
              type="button"
              onClick={copyMatches}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!matches.length}
              aria-label="Copy matches"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={downloadMatches}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!matches.length}
              aria-label="Download matches as JSON"
            >
              <Download className="h-4 w-4" />
              JSON
            </button>
          </div>
        </div>
        <div className="max-h-[300px] overflow-auto divide-y divide-slate-800">
          {matches.length ? (
            matches.map((m, idx) => (
              <div
                key={`${m.index}-${idx}`}
                className={`px-4 py-3 text-sm leading-relaxed ${idx === activeIndex ? "bg-slate-800" : ""}`}
              >
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

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste your text and enter a query (plain or regex).</li>
          <li>Toggle case sensitivity, whole-word, and regex as needed; run manually if auto-run is off.</li>
          <li>Use navigation to jump between matches; copy or download results for later.</li>
          <li>Enable replace to swap all matches with your replacement text.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser; text is not uploaded.</p>
          <p><strong>Large files?</strong> Inputs over ~120k chars show a warning; consider trimming or turning off auto-run.</p>
          <p><strong>Invalid regex?</strong> Invalid patterns are caught and won’t crash the page.</p>
        </div>
      </div>
    </main>
  );
}
