"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCcw } from "lucide-react";

type Mode = "plain" | "regex";

type SearchOptions = {
  mode: Mode;
  caseSensitive: boolean;
  wholeWord: boolean;
  regexFlags: string;
};

type MatchResult = {
  match: string;
  index: number;
  context: string;
  contextMatchOffset: number;
  matchLength: number;
};

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFlags(flags: string) {
  const cleaned = Array.from(new Set(flags.replace(/[^gimsuy]/g, "").split(""))).join("");
  return cleaned.includes("g") ? cleaned : `g${cleaned}`;
}

function buildRegex(query: string, opts: SearchOptions): { regex: RegExp | null; error: string } {
  if (opts.mode === "regex") {
    try {
      return { regex: new RegExp(query, normalizeFlags(opts.regexFlags)), error: "" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid regular expression.";
      return { regex: null, error: message };
    }
  }
  const escaped = escapeRegExp(query);
  const pattern = opts.wholeWord ? `\\b${escaped}\\b` : escaped;
  return { regex: new RegExp(pattern, opts.caseSensitive ? "g" : "gi"), error: "" };
}

function findMatches(text: string, regex: RegExp | null): MatchResult[] {
  if (!regex) return [];
  regex.lastIndex = 0;
  const results: MatchResult[] = [];
  for (const m of text.matchAll(regex)) {
    const idx = m.index ?? 0;
    const snippetStart = Math.max(0, idx - 20);
    const snippetEnd = Math.min(text.length, idx + (m[0]?.length ?? 0) + 20);
    const context = text.slice(snippetStart, snippetEnd);
    const matchLength = m[0]?.length ?? 0;
    results.push({
      match: m[0] ?? "",
      index: idx,
      context,
      contextMatchOffset: idx - snippetStart,
      matchLength,
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
  const lastRunVersion = useRef(runVersion);
  const activeMatchRef = useRef<HTMLDivElement | null>(null);
  const [runInputs, setRunInputs] = useState<{ text: string; regex: RegExp | null }>({
    text: "",
    regex: null,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [options, setOptions] = useState<SearchOptions>({
    mode: "plain",
    caseSensitive: false,
    wholeWord: false,
    regexFlags: "g",
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

  const regexState = useMemo(() => {
    if (!query) return null;
    return buildRegex(query, options);
  }, [query, options]);

  useEffect(() => {
    if (runVersion === lastRunVersion.current) return;
    lastRunVersion.current = runVersion;
    setRunInputs({ text, regex: regexState?.regex ?? null });
  }, [runVersion, text, regexState]);

  const matches = useMemo(() => findMatches(runInputs.text, runInputs.regex), [runInputs]);

  useEffect(() => {
    setActiveIndex(0);
  }, [runVersion]);

  useEffect(() => {
    if (!matches.length) return;
    activeMatchRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, matches.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget && !(event.ctrlKey && event.key === "Enter")) return;

      if (event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => (matches.length ? (prev + 1) % matches.length : 0));
        setStatus("Moved to next match");
      } else if (event.altKey && event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => (matches.length ? (prev - 1 + matches.length) % matches.length : 0));
        setStatus("Moved to previous match");
      } else if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        if (!autoRun) {
          setRunVersion((v) => v + 1);
          setStatus("Manual run");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [autoRun, matches.length]);

  const error = options.mode === "regex" && query ? regexState?.error ?? "" : "";

  const previewSegments = useMemo(() => {
    if (!matches.length) {
      return [{ key: "all", content: text, highlight: false }];
    }
    const active = matches[Math.max(0, Math.min(activeIndex, matches.length - 1))];
    if (!active) {
      return [{ key: "all", content: text, highlight: false }];
    }
    const windowSize = 140;
    const matchStart = active.index;
    const matchEnd = active.index + active.match.length;
    const start = Math.max(0, matchStart - windowSize);
    const end = Math.min(text.length, matchEnd + windowSize);
    const segs: Array<{ key: string; content: string; highlight: boolean }> = [];
    const prefix = text.slice(start, matchStart);
    const match = text.slice(matchStart, matchEnd);
    const suffix = text.slice(matchEnd, end);
    if (start > 0) segs.push({ key: "lead-ellipsis", content: "...", highlight: false });
    if (prefix) segs.push({ key: "prefix", content: prefix, highlight: false });
    if (match) segs.push({ key: "match", content: match, highlight: true });
    if (suffix) segs.push({ key: "suffix", content: suffix, highlight: false });
    if (end < text.length) segs.push({ key: "tail-ellipsis", content: "...", highlight: false });
    return segs;
  }, [text, matches, activeIndex]);

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
              Text Search
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
              disabled={options.mode === "regex"}
            />
            <span className={`text-sm ${options.mode === "regex" ? "text-slate-400" : "text-slate-700"}`}>
              Case sensitive
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-900"
              checked={options.wholeWord}
              onChange={() => setOptions((prev) => ({ ...prev, wholeWord: !prev.wholeWord }))}
              disabled={options.mode === "regex"}
            />
            <span className={`text-sm ${options.mode === "regex" ? "text-slate-400" : "text-slate-700"}`}>
              Whole word
            </span>
          </label>
          {options.mode === "regex" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Flags:</span>
              {(["i", "m", "s", "u", "y"] as const).map((flag) => (
                <label key={flag} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-slate-900"
                    checked={options.regexFlags.includes(flag)}
                    onChange={(event) => {
                      setOptions((prev) => {
                        const next = event.target.checked
                          ? `${prev.regexFlags}${flag}`
                          : prev.regexFlags.replaceAll(flag, "");
                        return { ...prev, regexFlags: next };
                      });
                    }}
                  />
                  <span className="uppercase">{flag}</span>
                </label>
              ))}
              <span className="text-slate-500">Global (g) is always on; use i for case-insensitive.</span>
            </div>
          ) : null}
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
            title="Shortcut: Ctrl+Enter"
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
        <p className="sr-only">
          {matches.length
            ? `Active match ${activeIndex + 1} of ${matches.length}: ${matches[activeIndex]?.context ?? ""}`
            : "No matches to preview yet."}
        </p>
        <div
          className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm leading-relaxed text-slate-900"
          aria-hidden="true"
        >
          {previewSegments.map((seg) => (
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
          <div className="flex items-center gap-2 text-xs font-medium" aria-label="Snippet actions">
            <button
              type="button"
              onClick={() => {
                setActiveIndex((prev) => (matches.length ? (prev - 1 + matches.length) % matches.length : 0));
                setStatus("Moved to previous match");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!matches.length}
              aria-label="Previous match"
              title="Shortcut: Alt+ArrowUp"
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
              title="Shortcut: Alt+ArrowDown"
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
                ref={idx === activeIndex ? activeMatchRef : null}
                className={`px-4 py-3 text-sm leading-relaxed ${idx === activeIndex ? "bg-slate-800" : ""}`}
              >
                <p className="font-semibold text-emerald-300">{m.match}</p>
                <p className="text-xs text-slate-400">Index: {m.index}</p>
                <p className="mt-1 text-slate-100">
                  {m.context.slice(0, m.contextMatchOffset)}
                  <span className="rounded bg-emerald-300/20 px-1 text-emerald-200">
                    {m.context.slice(m.contextMatchOffset, m.contextMatchOffset + m.matchLength)}
                  </span>
                  {m.context.slice(m.contextMatchOffset + m.matchLength)}
                </p>
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
