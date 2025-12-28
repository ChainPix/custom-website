"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
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
  line: number;
  column: number;
  context: string;
  contextMatchOffset: number;
  matchLength: number;
  groups: Array<{ name: string; value: string }>;
  groupHighlights: Array<{ start: number; end: number; name: string }>;
};

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFlags(flags: string) {
  return Array.from(new Set(flags.replace(/[^gimsuy]/g, "").split(""))).join("");
}

function ensureGlobal(flags: string) {
  return flags.includes("g") ? flags : `g${flags}`;
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

function getGroupHighlights(
  matchText: string,
  groups: Array<{ name: string; value: string }>,
) {
  const highlights: Array<{ start: number; end: number; name: string }> = [];
  let cursor = 0;
  for (const group of groups) {
    if (!group.value) continue;
    const start = matchText.indexOf(group.value, cursor);
    if (start === -1) continue;
    const end = start + group.value.length;
    if (!highlights.some((range) => range.start === start && range.end === end)) {
      highlights.push({ start, end, name: group.name });
    }
    cursor = end;
  }
  return highlights.sort((a, b) => a.start - b.start);
}

function explainRegex(pattern: string, flags: string) {
  const notes: string[] = [];
  if (/(^|[^\\])\^/.test(pattern) || /(^|[^\\])\$/.test(pattern)) {
    notes.push("Anchors (^, $) lock to line boundaries (use m for multiline).");
  }
  if (/\\b/.test(pattern)) notes.push("Word boundary (\\b) targets word edges.");
  if (/\\d/.test(pattern)) notes.push("Digit class (\\d) matches 0-9.");
  if (/\\w/.test(pattern)) notes.push("Word class (\\w) matches letters, digits, underscore.");
  if (/\\s/.test(pattern)) notes.push("Whitespace class (\\s) matches spaces, tabs, newlines.");
  if (/(^|[^\\])\./.test(pattern)) {
    notes.push(`Dot (.) matches any char${flags.includes("s") ? " including newlines (s)" : ""}.`);
  }
  if (/\[[^\]]+\]/.test(pattern)) notes.push("Character classes [...] match one of the listed chars.");
  if (/(\(\?<)/.test(pattern)) notes.push("Named capture groups (?<name>...) are present.");
  const captureCount = (pattern.match(/(^|[^\\])\((?!\?)/g) || []).length;
  if (captureCount) notes.push(`${captureCount} capturing group${captureCount === 1 ? "" : "s"} detected.`);
  if (/(^|[^\\])\|/.test(pattern)) notes.push("Alternation (|) picks between subpatterns.");
  if (/(^|[^\\])(\*|\+|\?|\{)/.test(pattern)) {
    notes.push("Quantifiers (* + ? {m,n}) control repetition.");
  }
  if (/\(\?=|\(\?!|\(\?<=|\(\?<!/.test(pattern)) {
    notes.push("Lookarounds (?=, ?!, ?<=, ?<!) are used for assertions.");
  }
  const normalizedFlags = normalizeFlags(flags);
  if (normalizedFlags) notes.push(`Flags: ${normalizedFlags.split("").join(" ")}.`);
  return notes;
}

function findMatches(text: string, regex: RegExp | null, contextSize: number): MatchResult[] {
  if (!regex) return [];
  regex.lastIndex = 0;
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }
  const results: MatchResult[] = [];
  for (const m of text.matchAll(regex)) {
    const idx = m.index ?? 0;
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid] <= idx) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const line = Math.max(0, low - 1);
    const column = idx - lineStarts[line];
    const snippetStart = Math.max(0, idx - contextSize);
    const snippetEnd = Math.min(text.length, idx + (m[0]?.length ?? 0) + contextSize);
    const context = text.slice(snippetStart, snippetEnd);
    const matchLength = m[0]?.length ?? 0;
    const namedGroups = m.groups
      ? Object.entries(m.groups)
          .filter(([, value]) => value != null)
          .map(([name, value]) => ({ name, value: String(value) }))
      : [];
    const numberedGroups = m
      .slice(1)
      .map((value, index) => ({ name: `$${index + 1}`, value }))
      .filter((entry) => entry.value != null)
      .map((entry) => ({ name: entry.name, value: String(entry.value) }));
    const groups = [...numberedGroups, ...namedGroups];
    const groupHighlights = getGroupHighlights(m[0] ?? "", numberedGroups);
    results.push({
      match: m[0] ?? "",
      index: idx,
      line: line + 1,
      column: column + 1,
      context,
      contextMatchOffset: idx - snippetStart,
      matchLength,
      groups,
      groupHighlights,
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
  const activeMatchRef = useRef<HTMLDivElement | null>(null);
  const [runInputs, setRunInputs] = useState<{
    text: string;
    query: string;
    options: SearchOptions;
    contextSize: number;
  }>({
    text: "",
    query: "",
    options: {
      mode: "plain",
      caseSensitive: false,
      wholeWord: false,
      regexFlags: "g",
    },
    contextSize: 20,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [contextSize, setContextSize] = useState(20);
  const [replaceWith, setReplaceWith] = useState("");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
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

  const deferredText = useDeferredValue(text);
  const deferredQuery = useDeferredValue(query);
  const deferredOptions = useDeferredValue(options);
  const deferredContextSize = useDeferredValue(contextSize);

  useEffect(() => {
    if (!autoRun) return;
    if (debounce) {
      const id = setTimeout(() => {
        setRunInputs({
          text: deferredText,
          query: deferredQuery,
          options: deferredOptions,
          contextSize: deferredContextSize,
        });
      }, 180);
      return () => clearTimeout(id);
    }
    setRunInputs({
      text: deferredText,
      query: deferredQuery,
      options: deferredOptions,
      contextSize: deferredContextSize,
    });
  }, [autoRun, debounce, deferredText, deferredQuery, deferredOptions, deferredContextSize]);

  const compiled = useMemo(() => {
    if (!runInputs.query) return null;
    return buildRegex(runInputs.query, runInputs.options);
  }, [runInputs.query, runInputs.options]);

  const matchRegex = useMemo(() => {
    if (!compiled?.regex) return null;
    return new RegExp(compiled.regex.source, ensureGlobal(compiled.regex.flags));
  }, [compiled]);

  const matches = useMemo(
    () => findMatches(runInputs.text, matchRegex, runInputs.contextSize),
    [runInputs.text, matchRegex, runInputs.contextSize],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [runInputs]);

  useEffect(() => {
    if (!matches.length) return;
    activeMatchRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, matches.length]);

  const inputsInSync =
    text === runInputs.text &&
    query === runInputs.query &&
    options.mode === runInputs.options.mode &&
    options.caseSensitive === runInputs.options.caseSensitive &&
    options.wholeWord === runInputs.options.wholeWord &&
    options.regexFlags === runInputs.options.regexFlags &&
    contextSize === runInputs.contextSize;

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
          setRunInputs({ text, query, options, contextSize });
          setStatus("Manual run");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [autoRun, matches.length, text, query, options, contextSize]);

  const error = runInputs.options.mode === "regex" && runInputs.query ? compiled?.error ?? "" : "";
  const regexExplanation = useMemo(() => {
    if (options.mode !== "regex" || !query) return [];
    return explainRegex(query, options.regexFlags);
  }, [options.mode, options.regexFlags, query]);

  const previewSegments = useMemo(() => {
    if (!matches.length) {
      return [{ key: "all", content: runInputs.text, highlight: false }];
    }
    const active = matches[Math.max(0, Math.min(activeIndex, matches.length - 1))];
    if (!active) {
      return [{ key: "all", content: runInputs.text, highlight: false }];
    }
    const windowSize = 140;
    const matchStart = active.index;
    const matchEnd = active.index + active.match.length;
    const start = Math.max(0, matchStart - windowSize);
    const end = Math.min(runInputs.text.length, matchEnd + windowSize);
    const segs: Array<{ key: string; content: string; highlight: boolean }> = [];
    const prefix = runInputs.text.slice(start, matchStart);
    const match = runInputs.text.slice(matchStart, matchEnd);
    const suffix = runInputs.text.slice(matchEnd, end);
    if (start > 0) segs.push({ key: "lead-ellipsis", content: "...", highlight: false });
    if (prefix) segs.push({ key: "prefix", content: prefix, highlight: false });
    if (match) segs.push({ key: "match", content: match, highlight: true });
    if (suffix) segs.push({ key: "suffix", content: suffix, highlight: false });
    if (end < runInputs.text.length) segs.push({ key: "tail-ellipsis", content: "...", highlight: false });
    return segs;
  }, [runInputs.text, matches, activeIndex]);

  const renderMatchSegments = (matchText: string, highlights: MatchResult["groupHighlights"]) => {
    if (!highlights.length) {
      return (
        <span className="rounded bg-emerald-200/80 px-0.5 text-slate-900">
          {matchText}
        </span>
      );
    }
    const nodes: JSX.Element[] = [];
    let cursor = 0;
    highlights.forEach((range, index) => {
      if (range.start > cursor) {
        nodes.push(
          <span key={`plain-${index}-${cursor}`} className="rounded bg-emerald-200/80 px-0.5 text-slate-900">
            {matchText.slice(cursor, range.start)}
          </span>,
        );
      }
      nodes.push(
        <span
          key={`group-${range.name}-${index}`}
          className="rounded bg-amber-200/80 px-0.5 text-slate-900"
          title={`Group ${range.name}`}
        >
          {matchText.slice(range.start, range.end)}
        </span>,
      );
      cursor = range.end;
    });
    if (cursor < matchText.length) {
      nodes.push(
        <span key={`tail-${cursor}`} className="rounded bg-emerald-200/80 px-0.5 text-slate-900">
          {matchText.slice(cursor)}
        </span>,
      );
    }
    return nodes;
  };

  const renderContextWithGroups = (match: MatchResult) => {
    const prefix = match.context.slice(0, match.contextMatchOffset);
    const matchText = match.context.slice(match.contextMatchOffset, match.contextMatchOffset + match.matchLength);
    const suffix = match.context.slice(match.contextMatchOffset + match.matchLength);
    return (
      <>
        {prefix}
        {renderMatchSegments(matchText, match.groupHighlights)}
        {suffix}
      </>
    );
  };

  const selectionLength = Math.max(0, selection.end - selection.start);
  const activeMatch = matches[Math.max(0, Math.min(activeIndex, matches.length - 1))];

  const getSingleReplaceRegex = () => {
    if (!compiled?.regex) return null;
    const flags = compiled.regex.flags.replace("g", "");
    return new RegExp(compiled.regex.source, flags);
  };

  const getGlobalReplaceRegex = () => {
    if (!compiled?.regex) return null;
    return new RegExp(compiled.regex.source, ensureGlobal(compiled.regex.flags));
  };

  const getReplacementForMatch = (matchText: string) => {
    if (!compiled?.regex) return matchText;
    const singleRegex = getSingleReplaceRegex();
    if (!singleRegex) return matchText;
    return matchText.replace(singleRegex, replaceWith);
  };

  const truncate = (value: string, limit = 180) => {
    if (value.length <= limit) return value;
    return `${value.slice(0, limit)}…`;
  };

  const replacePreview = useMemo(() => {
    if (!compiled?.regex) return null;
    if (activeMatch) {
      const before = activeMatch.context;
      const replacement = getReplacementForMatch(activeMatch.match);
      const after =
        before.slice(0, activeMatch.contextMatchOffset) +
        replacement +
        before.slice(activeMatch.contextMatchOffset + activeMatch.matchLength);
      return {
        title: "Preview (current match)",
        before: truncate(before),
        after: truncate(after),
      };
    }
    if (selectionLength > 0) {
      const selectionText = text.slice(selection.start, selection.end);
      const globalRegex = getGlobalReplaceRegex();
      if (!globalRegex) return null;
      globalRegex.lastIndex = 0;
      const after = selectionText.replace(globalRegex, replaceWith);
      return {
        title: "Preview (selection)",
        before: truncate(selectionText),
        after: truncate(after),
      };
    }
    return null;
  }, [compiled, replaceWith, activeMatch, selectionLength, text, selection.start, selection.end]);

  const updateSelection = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    setSelection({
      start: target.selectionStart ?? 0,
      end: target.selectionEnd ?? 0,
    });
  };

  const pushUndo = (prevText: string) => {
    setUndoStack((stack) => {
      const next = [...stack, prevText];
      return next.slice(Math.max(0, next.length - 10));
    });
  };

  const handleReplaceCurrent = () => {
    if (!compiled?.regex || !activeMatch) return;
    if (!inputsInSync) {
      setStatus("Sync inputs before replacing");
      return;
    }
    const replacement = getReplacementForMatch(activeMatch.match);
    const before = text.slice(0, activeMatch.index);
    const after = text.slice(activeMatch.index + activeMatch.matchLength);
    const nextText = `${before}${replacement}${after}`;
    if (nextText === text) return;
    pushUndo(text);
    setText(nextText);
    setStatus("Replaced current match");
  };

  const handleReplaceAll = () => {
    if (!compiled?.regex) return;
    if (!inputsInSync) {
      setStatus("Sync inputs before replacing");
      return;
    }
    const globalRegex = getGlobalReplaceRegex();
    if (!globalRegex) return;
    globalRegex.lastIndex = 0;
    const nextText = text.replace(globalRegex, replaceWith);
    if (nextText === text) return;
    pushUndo(text);
    setText(nextText);
    setStatus("Replaced all matches");
  };

  const handleReplaceSelection = () => {
    if (!compiled?.regex) return;
    if (selectionLength === 0) return;
    if (!inputsInSync) {
      setStatus("Sync inputs before replacing");
      return;
    }
    const selectionText = text.slice(selection.start, selection.end);
    const globalRegex = getGlobalReplaceRegex();
    if (!globalRegex) return;
    globalRegex.lastIndex = 0;
    const replaced = selectionText.replace(globalRegex, replaceWith);
    const nextText = text.slice(0, selection.start) + replaced + text.slice(selection.end);
    if (nextText === text) return;
    pushUndo(text);
    setText(nextText);
    setStatus("Replaced in selection");
  };

  const handleUndo = () => {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const next = [...stack];
      const previous = next.pop() ?? "";
      setText(previous);
      setStatus("Undo");
      return next;
    });
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
    const payload = matches.map((m) => ({
      match: m.match,
      index: m.index,
      line: m.line,
      column: m.column,
      context: m.context,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "text-search-matches.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded matches");
  };

  const downloadTextFile = (name: string, contents: string, type: string) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMatchesTxt = () => {
    downloadTextFile("text-search-matches.txt", matches.map((m) => m.match).join("\n"), "text/plain");
    setStatus("Downloaded matches (TXT)");
  };

  const escapeCsvCell = (value: string | number) => {
    const textValue = String(value);
    if (/[",\n]/.test(textValue)) {
      return `"${textValue.replace(/"/g, '""')}"`;
    }
    return textValue;
  };

  const downloadMatchesCsv = () => {
    const header = ["match", "index", "line", "column", "context"];
    const rows = matches.map((m) => [
      escapeCsvCell(m.match),
      m.index,
      m.line,
      m.column,
      escapeCsvCell(m.context),
    ]);
    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    downloadTextFile("text-search-matches.csv", csv, "text/csv");
    setStatus("Downloaded matches (CSV)");
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
  const contextOptions = [20, 50, 120];
  const contextIndex = Math.max(0, contextOptions.indexOf(contextSize));
  const hasSelection = selectionLength > 0;
  const canReplaceBase = Boolean(compiled?.regex) && inputsInSync;
  const canReplaceCurrent = canReplaceBase && Boolean(activeMatch);
  const canReplaceAll = canReplaceBase;
  const canReplaceSelection = canReplaceBase && hasSelection;

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
              {(["g", "i", "m", "s", "u", "y"] as const).map((flag) => (
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
              <span className="text-slate-500">Match lists always scan globally; g affects replace behavior.</span>
            </div>
          ) : null}
          <button
            onClick={() => {
              setText("");
              setQuery("");
              setOptions({ mode: "plain", caseSensitive: false, wholeWord: false, regexFlags: "g" });
              setContextSize(20);
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
          onSelect={updateSelection}
          onKeyUp={updateSelection}
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
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-700">Context: {contextSize} chars</span>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={contextIndex}
              onChange={(event) => {
                const nextSize = contextOptions[Number(event.target.value)] ?? 20;
                setContextSize(nextSize);
                if (!autoRun) setStatus("Context updated (auto-run off)");
              }}
              className="h-2 w-28 accent-slate-900"
              aria-label="Context length"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setRunInputs({ text, query, options, contextSize });
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
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <span className="font-medium text-slate-800">Replace with</span>
              <input
                type="text"
                value={replaceWith}
                onChange={(event) => setReplaceWith(event.target.value)}
                className="min-w-[160px] rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Replacement text"
                aria-label="Replacement text"
              />
            </label>
            <button
              type="button"
              onClick={handleReplaceCurrent}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!canReplaceCurrent}
              aria-label="Replace current match"
            >
              Replace current
            </button>
            <button
              type="button"
              onClick={handleReplaceAll}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!canReplaceAll}
              aria-label="Replace all matches"
            >
              Replace all
            </button>
            <button
              type="button"
              onClick={handleReplaceSelection}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!canReplaceSelection}
              aria-label="Replace in selection"
            >
              Replace selection
            </button>
            <button
              type="button"
              onClick={handleUndo}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!undoStack.length}
              aria-label="Undo last replace"
            >
              Undo
            </button>
            {hasSelection ? (
              <span className="text-xs text-slate-500">Selection: {selectionLength} chars</span>
            ) : null}
          </div>
          {!inputsInSync ? (
            <p className="text-xs text-amber-700">Wait for sync or press Run before replacing.</p>
          ) : null}
          {replacePreview ? (
            <div className="rounded-lg border border-slate-200 bg-white/90 p-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">{replacePreview.title}</p>
              <p className="mt-2 text-slate-500">Before</p>
              <p className="font-mono text-slate-800">{replacePreview.before}</p>
              <p className="mt-2 text-slate-500">After</p>
              <p className="font-mono text-slate-800">{replacePreview.after}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Preview updates when a match or selection is available.
            </p>
          )}
        </div>
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-sm text-slate-600">Matches: {counts.total}</p>
        )}
        {options.mode === "regex" ? (
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">Explain this regex</p>
            {regexExplanation.length ? (
              <ul className="mt-2 space-y-1">
                {regexExplanation.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-slate-500">Enter a pattern to see a quick breakdown.</p>
            )}
          </div>
        ) : null}
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
            seg.highlight && activeMatch ? (
              <span key={seg.key}>{renderMatchSegments(seg.content, activeMatch.groupHighlights)}</span>
            ) : (
              <span key={seg.key}>{seg.content}</span>
            )
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
            <button
              type="button"
              onClick={downloadMatchesCsv}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!matches.length}
              aria-label="Download matches as CSV"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={downloadMatchesTxt}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!matches.length}
              aria-label="Download matches as TXT"
            >
              <Download className="h-4 w-4" />
              TXT
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
                <p className="text-xs text-slate-400">
                  Index: {m.index} · Line: {m.line}, Col: {m.column}
                </p>
                <p className="mt-1 text-slate-100">{renderContextWithGroups(m)}</p>
                {m.groups.length ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                    {m.groups.map((group, groupIndex) => (
                      <span
                        key={`${group.name}-${groupIndex}`}
                        className="rounded-full bg-slate-800 px-2 py-0.5 text-emerald-200"
                      >
                        {group.name}: {group.value}
                      </span>
                    ))}
                  </div>
                ) : null}
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
