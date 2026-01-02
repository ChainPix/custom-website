"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Download, RefreshCcw, Shuffle, Wand2 } from "lucide-react";

type Row = {
  match: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
};

type ComputeResult = {
  rows: Row[];
  warning: string;
  regexError: string;
  replacedText: string;
  splitParts: string[];
};

type GroupColumn = {
  key: string;
  label: string;
  getValue: (row: Row) => string;
};

type ExplainToken = {
  label: string;
  detail: string;
};

const getExplainTokens = (pattern: string): ExplainToken[] => {
  const tokens: ExplainToken[] = [];
  const add = (label: string, detail: string) => {
    if (tokens.some((token) => token.label === label)) return;
    tokens.push({ label, detail });
  };
  if (/\(\?<[^>]+>/.test(pattern)) add("Named group", "Captures a group by name: (?<name>...)");
  if (/\(\?:/.test(pattern)) add("Non-capturing group", "Groups without capturing: (?:...)");
  if (/\(\?=/.test(pattern)) add("Positive lookahead", "Matches if next pattern exists: (?=...)");
  if (/\(\?!/.test(pattern)) add("Negative lookahead", "Matches if next pattern does not exist: (?!...)");
  if (/\(\?<=/.test(pattern)) add("Positive lookbehind", "Matches if previous pattern exists: (?<=...)");
  if (/\(\?<!/.test(pattern)) add("Negative lookbehind", "Matches if previous pattern does not exist: (?<!...)");
  if (/\((?!\?)/.test(pattern)) add("Capturing group", "Captures a group: (...)");
  if (/\[[^\]]+\]/.test(pattern)) add("Character class", "Matches any character in brackets: [abc]");
  if (/(^|[^\\])\./.test(pattern)) add("Any character", "Dot matches any character (except newlines unless dotall)");
  if (/(^|[^\\])\*/.test(pattern)) add("Zero or more", "* repeats the previous token zero or more times");
  if (/(^|[^\\])\+/.test(pattern)) add("One or more", "+ repeats the previous token one or more times");
  if (/(^|[^\\])\?/.test(pattern)) add("Optional", "? makes the previous token optional");
  if (/(^|[^\\])\|/.test(pattern)) add("Alternation", "| matches either the left or right side");
  if (/(^|[^\\])\^/.test(pattern)) add("Start anchor", "^ matches the start of input or line");
  if (/(^|[^\\])\$/.test(pattern)) add("End anchor", "$ matches the end of input or line");
  if (/\\d/.test(pattern)) add("Digit", "\\d matches digits 0-9");
  if (/\\w/.test(pattern)) add("Word char", "\\w matches letters, digits, underscore");
  if (/\\s/.test(pattern)) add("Whitespace", "\\s matches spaces, tabs, and newlines");
  if (/\\b/.test(pattern)) add("Word boundary", "\\b matches a word boundary");
  if (/\{\d+(,\d*)?\}/.test(pattern)) add("Range quantifier", "{m,n} repeats the previous token");
  return tokens;
};

const regexCheatSheet = [
  { label: "Character class", detail: "[a-z] matches any lowercase letter" },
  { label: "Grouping", detail: "(...) captures, (?:...) non-captures" },
  { label: "Quantifiers", detail: "*, +, ?, {m,n} control repetition" },
  { label: "Anchors", detail: "^ start, $ end, \\b word boundary" },
  { label: "Shorthands", detail: "\\d digit, \\w word, \\s whitespace" },
  { label: "Alternation", detail: "foo|bar matches foo or bar" },
];

const flagOptions = [
  { key: "i", label: "Ignore case (i)" },
  { key: "m", label: "Multiline (m)" },
  { key: "s", label: "Dotall (s)" },
] as const;

const SAMPLE_SIMPLE = {
  pattern: "(\\w+)@(\\w+)",
  text: "email me at hello@fastformat.com and info@tools.dev",
};

const SAMPLE_GROUPS = {
  pattern: "(https?):\\/\\/([^/]+)\\/(\\S+)",
  text: "Links: https://toolstack.dev/path/to/page and http://example.com/other",
};

const sanitizeRegexError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  const cleaned = message.replace(/^Invalid regular expression: .*?:\s*/, "");
  return cleaned || message;
};

const computeMatches = (
  pattern: string,
  flags: string,
  text: string,
  mode: "extract" | "replace" | "split",
  replacement: string,
  limits: { maxLen: number; maxMatches: number },
): ComputeResult => {
  if (!pattern) {
    return { rows: [], warning: "Enter a regex pattern.", regexError: "", replacedText: "", splitParts: [] };
  }
  try {
    const regex = new RegExp(pattern, flags);
    const limitedText = text.slice(0, limits.maxLen);
    let warning = text.length > limits.maxLen ? "Large input; results may be truncated." : "";
    if (mode === "replace") {
      return {
        rows: [],
        warning,
        regexError: "",
        replacedText: limitedText.replace(regex, replacement),
        splitParts: [],
      };
    }
    if (mode === "split") {
      return {
        rows: [],
        warning,
        regexError: "",
        replacedText: "",
        splitParts: limitedText.split(regex),
      };
    }
    const matches: Row[] = [];
    for (const m of limitedText.matchAll(regex)) {
      matches.push({
        match: m[0] ?? "",
        index: m.index ?? 0,
        groups: (m as RegExpExecArray).slice(1) as string[],
        namedGroups: ((m as RegExpExecArray).groups ?? {}) as Record<string, string>,
      });
      if (matches.length >= limits.maxMatches) {
        warning = `Results truncated at ${limits.maxMatches} matches.`;
        break;
      }
    }
    if (!matches.length && !warning) {
      warning = "No matches found.";
    }
    return { rows: matches, warning, regexError: "", replacedText: "", splitParts: [] };
  } catch (error) {
    return { rows: [], warning: "", regexError: sanitizeRegexError(error), replacedText: "", splitParts: [] };
  }
};

const toCsv = (rows: Row[], groupColumns: GroupColumn[]) => {
  if (!rows.length) return "";
  const header = ["match", "index", ...groupColumns.map((column) => column.label)];
  const lines = rows.map((r) => {
    const cols = [
      r.match,
      String(r.index),
      ...groupColumns.map((column) => column.getValue(r)),
    ];
    return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });
  return [header.join(","), ...lines].join("\n");
};

export default function RegexExtractorClient() {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+)");
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [text, setText] = useState("email me at hello@fastformat.com and info@tools.dev");
  const [mode, setMode] = useState<"extract" | "replace" | "split">("extract");
  const [replacement, setReplacement] = useState("$1");
  const [showExplain, setShowExplain] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [copied, setCopied] = useState(false);
  const [debouncedPattern, setDebouncedPattern] = useState(pattern);
  const [debouncedText, setDebouncedText] = useState(text);
  const [workerResult, setWorkerResult] = useState<ComputeResult>({
    rows: [],
    warning: "",
    regexError: "",
    replacedText: "",
    splitParts: [],
  });
  const [activeMatchIndex, setActiveMatchIndex] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerRequestId = useRef(0);
  const highlightContainerRef = useRef<HTMLDivElement | null>(null);
  const matchRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const MAX_LEN = 30000;
  const MAX_MATCHES = 500;

  const flags = useMemo(() => {
    const ordered = ["g", ...flagOptions.map((flag) => flag.key)];
    const set = new Set<string>(["g", ...selectedFlags]);
    return ordered.filter((flag) => set.has(flag)).join("");
  }, [selectedFlags]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPattern(pattern), 200);
    return () => window.clearTimeout(timer);
  }, [pattern]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedText(text), 200);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./regex-extractor.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ComputeResult & { id: number }>) => {
      const { id, rows, warning, regexError, replacedText, splitParts } = event.data;
      if (id !== workerRequestId.current) return;
      setWorkerResult({ rows, warning, regexError, replacedText, splitParts });
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    const id = (workerRequestId.current += 1);
    workerRef.current.postMessage({
      id,
      pattern: debouncedPattern,
      flags,
      text: debouncedText,
      limits: { maxLen: MAX_LEN, maxMatches: MAX_MATCHES },
      mode,
      replacement,
    });
  }, [debouncedPattern, debouncedText, flags, mode, replacement]);

  const fallbackResult = useMemo(() => {
    if (workerRef.current) {
      return { rows: [], warning: "", regexError: "", replacedText: "", splitParts: [] };
    }
    return computeMatches(debouncedPattern, flags, debouncedText, mode, replacement, {
      maxLen: MAX_LEN,
      maxMatches: MAX_MATCHES,
    });
  }, [debouncedPattern, debouncedText, flags, mode, replacement]);

  const { rows: results, warning, regexError, replacedText, splitParts } = workerRef.current
    ? workerResult
    : fallbackResult;
  const maxGroups = useMemo(() => Math.max(0, ...results.map((row) => row.groups.length)), [results]);
  const isPatternValid = !regexError;
  const namedGroupKeys = useMemo(() => {
    const keys: string[] = [];
    const seen = new Set<string>();
    results.forEach((row) => {
      Object.keys(row.namedGroups).forEach((key) => {
        if (seen.has(key)) return;
        seen.add(key);
        keys.push(key);
      });
    });
    return keys;
  }, [results]);
  const groupColumns = useMemo<GroupColumn[]>(() => {
    if (namedGroupKeys.length) {
      return namedGroupKeys.map((key) => ({
        key,
        label: key,
        getValue: (row) => row.namedGroups[key] ?? "",
      }));
    }
    return Array.from({ length: maxGroups }, (_, index) => ({
      key: `group-${index + 1}`,
      label: `group${index + 1}`,
      getValue: (row) => row.groups[index] ?? "",
    }));
  }, [maxGroups, namedGroupKeys]);
  const explainTokens = useMemo(() => getExplainTokens(debouncedPattern), [debouncedPattern]);

  const highlightText = useMemo(() => debouncedText.slice(0, MAX_LEN), [debouncedText, MAX_LEN]);
  const highlightSegments = useMemo(() => {
    if (!highlightText) {
      return [{ text: "", matchIndex: null }];
    }
    if (mode !== "extract" || !results.length) {
      return [{ text: highlightText, matchIndex: null }];
    }
    const segments: Array<{ text: string; matchIndex: number | null }> = [];
    let cursor = 0;
    results.forEach((row, idx) => {
      const start = Math.min(row.index, highlightText.length);
      const end = Math.min(row.index + row.match.length, highlightText.length);
      if (start < cursor) return;
      if (start > cursor) {
        segments.push({ text: highlightText.slice(cursor, start), matchIndex: null });
      }
      if (end >= start) {
        segments.push({ text: highlightText.slice(start, end), matchIndex: idx });
        cursor = Math.max(end, cursor);
      }
    });
    if (cursor < highlightText.length) {
      segments.push({ text: highlightText.slice(cursor), matchIndex: null });
    }
    return segments;
  }, [highlightText, mode, results]);

  useEffect(() => {
    if (activeMatchIndex === null) return;
    const target = matchRefs.current[activeMatchIndex];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchIndex, highlightSegments]);

  useEffect(() => {
    if (activeMatchIndex === null) return;
    if (activeMatchIndex >= results.length) {
      setActiveMatchIndex(null);
    }
  }, [activeMatchIndex, results.length]);

  useEffect(() => {
    if (mode !== "extract") {
      setActiveMatchIndex(null);
    }
  }, [mode]);

  const toggleFlag = (flag: string) => {
    setSelectedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) {
        next.delete(flag);
      } else {
        next.add(flag);
      }
      return flagOptions.map((option) => option.key).filter((key) => next.has(key));
    });
  };

  const applySample = (variant: "simple" | "groups") => {
    if (variant === "simple") {
      setPattern(SAMPLE_SIMPLE.pattern);
      setText(SAMPLE_SIMPLE.text);
    } else {
      setPattern(SAMPLE_GROUPS.pattern);
      setText(SAMPLE_GROUPS.text);
    }
    setSelectedFlags([]);
    setStatus("Loaded sample");
  };

  const handleSwap = () => {
    setPattern(text);
    setText(pattern);
    setStatus("Swapped pattern and text");
  };

  const copyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  matchRefs.current = [];

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {regexError ? `Regex error: ${regexError}` : ""}
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
              Regex Extractor
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Regex Extractor</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Extract regex matches and capture groups. View results in a structured table.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {(["extract", "replace", "split"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setMode(tab);
                setStatus(`Switched to ${tab} mode`);
              }}
              className={`rounded-full px-3 py-1 text-[11px] transition ${
                mode === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              aria-pressed={mode === tab}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={() => setShowExplain((prev) => !prev)}
            className="ml-auto rounded-full bg-white px-3 py-1 text-[11px] text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            {showExplain ? "Hide explain" : "Explain regex"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Regex pattern"
            aria-label="Regex pattern"
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
                  checked={selectedFlags.includes(flag.key)}
                  onChange={() => toggleFlag(flag.key)}
                  aria-label={`Toggle flag ${flag.label}`}
                />
                {flag.label}
              </label>
            ))}
            <label className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <input type="checkbox" className="h-4 w-4 accent-slate-900" checked disabled />
              Global (g) always on
            </label>
          </div>
          <button
            onClick={() => {
              setPattern("(\\w+)@(\\w+)");
              setSelectedFlags([]);
              setText("email me at hello@fastformat.com and info@tools.dev");
              setStatus("Reset to default");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset pattern and text"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={() => applySample("simple")}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample for emails"
          >
            Sample: emails
          </button>
          <button
            onClick={() => applySample("groups")}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample for URLs"
          >
            Sample: URLs
          </button>
          <button
            onClick={handleSwap}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Swap pattern and text"
          >
            <Shuffle className="h-4 w-4" />
            Swap pattern/text
          </button>
          <button
            onClick={() => {
              setPattern((prev) => prev.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
              setStatus("Escaped pattern");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Escape pattern characters"
          >
            <Wand2 className="h-4 w-4" />
            Escape pattern
          </button>
        </div>
        {mode === "replace" ? (
          <input
            type="text"
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Replacement string (supports $1, $<name>)"
            aria-label="Replacement string"
          />
        ) : null}
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste text to extract matches"
          aria-label="Input text to extract from"
        />
        {mode === "extract" ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 shadow-inner shadow-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Highlighted preview</span>
              <span className="text-[11px] font-medium normal-case text-slate-400">Click a result row to jump</span>
            </div>
            <div
              ref={highlightContainerRef}
              className="max-h-[220px] overflow-auto px-3 py-3 text-sm text-slate-800 whitespace-pre-wrap"
            >
              {highlightSegments.map((segment, segmentIndex) => {
                if (segment.matchIndex === null) {
                  return <span key={`plain-${segmentIndex}`}>{segment.text}</span>;
                }
                const isActive = activeMatchIndex === segment.matchIndex;
                return (
                  <mark
                    key={`match-${segmentIndex}`}
                    ref={(el) => {
                      matchRefs.current[segment.matchIndex] = el;
                    }}
                    className={`rounded px-0.5 transition ${
                      isActive ? "bg-amber-300 ring-2 ring-amber-400" : "bg-amber-200"
                    }`}
                    onClick={() => {
                      setActiveMatchIndex(segment.matchIndex);
                      setStatus("Jumped to match");
                    }}
                  >
                    {segment.text || ""}
                  </mark>
                );
              })}
            </div>
          </div>
        ) : null}
        {showExplain ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Explain this regex</div>
            <div className="mt-3 space-y-2">
              {explainTokens.length ? (
                explainTokens.map((token) => (
                  <div key={token.label} className="flex items-start gap-2">
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {token.label}
                    </span>
                    <span className="text-slate-600">{token.detail}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No recognizable tokens detected yet.</p>
              )}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick cheat sheet</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {regexCheatSheet.map((item) => (
                  <div key={item.label} className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
                    <div className="text-[11px] font-semibold text-slate-700">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {!isPatternValid ? (
          <p className="text-sm font-medium text-amber-600">Regex error: {regexError}</p>
        ) : (
          <p className="text-sm text-slate-600">
            {mode === "extract" ? "Matches found" : mode === "replace" ? "Output length" : "Segments"}:{" "}
            {mode === "extract" ? results.length : mode === "replace" ? replacedText.length : splitParts.length}
          </p>
        )}
        {warning ? <p className="text-sm font-medium text-amber-600">{warning}</p> : null}
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="regex-extractor-results"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span id="regex-extractor-results">
              {mode === "extract" ? "Results" : mode === "replace" ? "Replace output" : "Split output"}
            </span>
            <span className="text-xs font-medium text-slate-300">
              {mode === "extract"
                ? `Matches: ${results.length}`
                : mode === "replace"
                  ? `Length: ${replacedText.length}`
                  : `Segments: ${splitParts.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => copyContent(pattern)}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
              aria-label="Copy regex pattern"
            >
              <Clipboard className="h-4 w-4" /> Copy pattern
            </button>
            {mode === "extract" ? (
              <>
                <button
                  onClick={() => copyContent(toCsv(results, groupColumns))}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  disabled={!results.length}
                  aria-label="Copy results as CSV"
                >
                  <Clipboard className="h-4 w-4" /> Copy CSV
                </button>
                <button
                  onClick={() => downloadContent(JSON.stringify(results, null, 2), "regex-results.json")}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  disabled={!results.length}
                  aria-label="Download results as JSON"
                >
                  <Download className="h-4 w-4" /> Save JSON
                </button>
                <button
                  onClick={() => downloadContent(toCsv(results, groupColumns), "regex-results.csv")}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  disabled={!results.length}
                  aria-label="Download results as CSV"
                >
                  <Download className="h-4 w-4" /> Save CSV
                </button>
              </>
            ) : (
              <button
                onClick={() => copyContent(mode === "replace" ? replacedText : splitParts.join("\n"))}
                className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
                disabled={!pattern || Boolean(regexError)}
                aria-label="Copy output"
              >
                <Clipboard className="h-4 w-4" /> Copy output
              </button>
            )}
            {copied ? <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-semibold">Copied</span> : null}
          </div>
        </div>
        <div className="max-h-[320px] overflow-auto">
          {mode === "extract" ? (
            results.length ? (
              <table className="w-full text-sm leading-relaxed">
                <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase tracking-wide text-slate-300">
                  <tr>
                    <th className="px-4 py-2 text-left">Match</th>
                    <th className="px-4 py-2 text-left">Index</th>
                    {groupColumns.map((column) => (
                      <th key={column.key} className="px-4 py-2 text-left">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {results.map((row, idx) => (
                    <tr
                      key={`${row.index}-${idx}`}
                      className={`cursor-pointer transition hover:bg-slate-800/40 ${
                        activeMatchIndex === idx ? "bg-slate-800/60" : ""
                      }`}
                      onClick={() => {
                        setActiveMatchIndex(idx);
                        setStatus("Jumped to match");
                      }}
                      aria-selected={activeMatchIndex === idx}
                    >
                      <td className="px-4 py-2 font-semibold text-emerald-200">{row.match}</td>
                      <td className="px-4 py-2 text-slate-200">{row.index}</td>
                      {groupColumns.map((column) => (
                        <td key={column.key} className="px-4 py-2 text-slate-100">
                          {column.getValue(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-300">No matches yet.</div>
            )
          ) : mode === "replace" ? (
            replacedText ? (
              <pre className="px-4 py-3 text-sm text-slate-100 whitespace-pre-wrap">{replacedText}</pre>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-300">No output yet.</div>
            )
          ) : splitParts.length ? (
            <div className="divide-y divide-slate-800">
              {splitParts.map((part, index) => (
                <div key={`${index}-${part.length}`} className="px-4 py-3 text-sm text-slate-100">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Segment {index + 1}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{part || "\u2014"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-300">No split output yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a regex pattern (or load a sample) and set flags; global is always on.</li>
          <li>Paste text, then copy or download matches as JSON/CSV; use escape helper if needed.</li>
          <li>Warnings appear for invalid patterns or very large inputs; matches are capped to stay responsive.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Extraction happens in your browser; data is not uploaded.</p>
          <p><strong>What can I export?</strong> Copy pattern, copy/save results as JSON or CSV.</p>
          <p><strong>Limits?</strong> Large inputs may be truncated and matches capped to keep the tool fast.</p>
        </div>
      </div>
    </main>
  );
}
