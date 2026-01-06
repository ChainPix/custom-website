"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import { buildHighlightSegments, buildRegex, computeMatches } from "../../../lib/regex-tester";

const flagOptions = [
  { key: "i", label: "Ignore case (i)" },
  { key: "g", label: "Global (g)" },
  { key: "m", label: "Multiline (m)" },
  { key: "s", label: "Dotall (s)" },
  { key: "y", label: "Sticky (y)" },
  { key: "u", label: "Unicode (u)" },
] as const;

export default function RegexTesterClient() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [text, setText] = useState("");
  const [replacement, setReplacement] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [treatAsLiteral, setTreatAsLiteral] = useState(false);
  const [patternError, setPatternError] = useState("");
  const [autoRun, setAutoRun] = useState(true);
  const [runVersion, setRunVersion] = useState(0);
  const [debouncedVersion, setDebouncedVersion] = useState(0);
  const [safeMode, setSafeMode] = useState(true);
  const [showExplain, setShowExplain] = useState(false);
  const [testCases, setTestCases] = useState<
    Array<{ id: number; input: string; expectedMatches: string; expectedReplace: string }>
  >([
    {
      id: 1,
      input: "Order 123 shipped, order 456 pending.",
      expectedMatches: "123\n456",
      expectedReplace: "Order #123 shipped, order #456 pending.",
    },
  ]);
  const [nextCaseId, setNextCaseId] = useState(2);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [recentPatterns, setRecentPatterns] = useState<string[]>([]);

  const patternInputRef = useRef<HTMLInputElement | null>(null);
  const highlightRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const matchRefs = useRef<Array<HTMLDivElement | null>>([]);

  const debouncedDelayMs = 200;
  const safeModeMaxChars = 20000;
  const baseTimeBudgetMs = 25;
  const recentPatternsLimit = 10;
  const matchesPerSecondThreshold = 20000;

  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(() => setDebouncedVersion((v) => v + 1), debouncedDelayMs);
    return () => clearTimeout(timer);
  }, [pattern, flags, text, treatAsLiteral, autoRun]);

  const regexResult = useMemo(() => buildRegex(pattern, flags, treatAsLiteral), [pattern, flags, treatAsLiteral]);
  const regex = regexResult.regex;
  const safetySource = regexResult.source;

  useEffect(() => {
    setPatternError(regexResult.error);
  }, [regexResult.error]);

  const isSuspiciousPattern = (source: string) =>
    /(\([^)]*[+*][^)]*\)[+*])|(\.\*){2,}|(\.\+){2,}/.test(source);

  const shouldBlockRun = useMemo(() => {
    if (safeMode && isSuspiciousPattern(safetySource)) return "Suspicious pattern blocked by safe mode.";
    if (safeMode && text.length > safeModeMaxChars) return "Input too large for safe mode.";
    return "";
  }, [safeMode, safetySource, text.length]);

  const runWithBudget = <T,>(work: () => T, budgetMs: number) => {
    const start = performance.now();
    const value = work();
    const elapsed = performance.now() - start;
    if (elapsed > budgetMs) {
      return { value, expensive: true };
    }
    return { value, expensive: false };
  };

  const matchResult = useMemo(() => {
    const trigger = autoRun ? debouncedVersion : runVersion;
    if (!autoRun && runVersion === 0) {
      return { matches: [], expensive: false, skipped: false, elapsedMs: 0 };
    }
    if (!trigger) {
      return { matches: [], expensive: false, skipped: false, elapsedMs: 0 };
    }
    if (!regex) return { matches: [], expensive: false, skipped: false, elapsedMs: 0 };
    if (!text) return { matches: [], expensive: false, skipped: false, elapsedMs: 0 };
    if (shouldBlockRun) {
      return { matches: [], expensive: false, skipped: true, elapsedMs: 0 };
    }
    const timeBudgetMs = safeMode ? Math.min(baseTimeBudgetMs, 15) : baseTimeBudgetMs;
    const result = computeMatches(text, regex, timeBudgetMs);
    return { matches: result.matches, expensive: result.expensive, skipped: false, elapsedMs: result.elapsedMs };
  }, [regex, text, autoRun, debouncedVersion, runVersion, flags, shouldBlockRun]);

  const matches = matchResult.matches;
  const matchesPerSecond =
    matchResult.elapsedMs > 0 ? Math.round((matches.length / (matchResult.elapsedMs / 1000)) * 10) / 10 : 0;

  const toggleFlag = (flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(matches.map((m) => m.match).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied matches");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  useEffect(() => {
    const chars = text.length;
    const lines = text ? text.split("\n").length : 0;
    if (chars > 50000) {
      setWarning(`Large input (${chars.toLocaleString()} chars, ${lines.toLocaleString()} lines). Matching may be slow.`);
    } else {
      setWarning("");
    }
  }, [text]);

  const highlightSegments = useMemo(() => buildHighlightSegments(text, matches), [text, matches]);

  const totalCaptureGroups = useMemo(
    () => matches.reduce((sum, m) => sum + m.groups.length, 0),
    [matches],
  );

  const totalNamedGroups = useMemo(
    () => matches.reduce((sum, m) => sum + Object.keys(m.namedGroups).length, 0),
    [matches],
  );

  const hasZeroLengthMatches = useMemo(() => matches.some((m) => m.zeroLength), [matches]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(matches, null, 2));
      setStatus("Copied JSON");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(matches, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "regex-matches.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const runMatches = () => {
    setRunVersion((v) => v + 1);
    setStatus("Ran test");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const patternParam = params.get("pattern");
    const flagsParam = params.get("flags");
    const textParam = params.get("text");
    const replaceParam = params.get("replace");
    if (patternParam) setPattern(patternParam);
    if (flagsParam) setFlags(flagsParam.split(""));
    if (textParam) setText(textParam);
    if (replaceParam) setReplacement(replaceParam);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("regexTesterRecentPatterns");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentPatterns(parsed.filter((item) => typeof item === "string"));
      }
    } catch (err) {
      console.error("Failed to load recent patterns", err);
    }
  }, []);

  useEffect(() => {
    const trigger = autoRun ? debouncedVersion : runVersion;
    if (!trigger || !pattern.trim()) return;
    setRecentPatterns((prev) => {
      const next = [pattern, ...prev.filter((item) => item !== pattern)].slice(0, recentPatternsLimit);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("regexTesterRecentPatterns", JSON.stringify(next));
      }
      return next;
    });
  }, [pattern, autoRun, debouncedVersion, runVersion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (pattern) params.set("pattern", pattern);
    if (flags.length) params.set("flags", flags.join(""));
    if (text) params.set("text", text);
    if (replacement) params.set("replace", replacement);
    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", next);
  }, [pattern, flags, text, replacement, debouncedVersion, runVersion]);

  useEffect(() => {
    if (!matches.length) {
      setActiveMatchIndex(-1);
      return;
    }
    if (activeMatchIndex >= matches.length) {
      setActiveMatchIndex(0);
    }
  }, [matches, activeMatchIndex]);

  useEffect(() => {
    if (activeMatchIndex < 0) return;
    const node = highlightRefs.current[activeMatchIndex];
    if (node) {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    const listNode = matchRefs.current[activeMatchIndex];
    if (listNode) {
      listNode.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeMatchIndex, matches]);

  const handleSelectMatch = (index: number) => {
    setActiveMatchIndex(index);
  };

  const handleNextMatch = () => {
    if (!matches.length) return;
    if (activeMatchIndex < 0) {
      setActiveMatchIndex(0);
      return;
    }
    setActiveMatchIndex((prev) => (prev + 1) % matches.length);
  };

  const handlePrevMatch = () => {
    if (!matches.length) return;
    if (activeMatchIndex < 0) {
      setActiveMatchIndex(matches.length - 1);
      return;
    }
    setActiveMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  };

  const lines = useMemo(() => text.split("\n"), [text]);
  const lineOffsets = useMemo(() => {
    const offsets: number[] = [];
    let cursor = 0;
    lines.forEach((line) => {
      offsets.push(cursor);
      cursor += line.length + 1;
    });
    return offsets;
  }, [lines]);

  const lineMatchMap = useMemo(() => {
    const set = new Set<number>();
    matches.forEach((m) => {
      const start = m.index ?? 0;
      const end = start + m.match.length;
      lineOffsets.forEach((offset, lineIndex) => {
        const lineStart = offset;
        const lineEnd = offset + (lines[lineIndex]?.length ?? 0);
        if (start <= lineEnd && end >= lineStart) {
          set.add(lineIndex);
        }
      });
    });
    return set;
  }, [matches, lineOffsets, lines]);

  const handleCopyCsv = async () => {
    const rows = matches.map((m) => [m.match, String(m.index), ...m.groups]);
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 2);
    const header = ["match", "index", ...Array.from({ length: maxCols - 2 }, (_, i) => `group${i + 1}`)];
    const csvRows = [header, ...rows].map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","),
    );
    try {
      await navigator.clipboard.writeText(csvRows.join("\n"));
      setStatus("Copied CSV");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const replacePreview = useMemo(() => {
    const trigger = autoRun ? debouncedVersion : runVersion;
    if (!trigger || !regex || !text) return { output: "", expensive: false, skipped: false };
    if (shouldBlockRun) return { output: "", expensive: false, skipped: true };
    const timeBudgetMs = safeMode ? Math.min(baseTimeBudgetMs, 15) : baseTimeBudgetMs;
    const localRegex = new RegExp(regex.source, flags.join(""));
    const { value, expensive } = runWithBudget(() => text.replace(localRegex, replacement), timeBudgetMs);
    return { output: value, expensive, skipped: false };
  }, [autoRun, debouncedVersion, runVersion, regex, text, replacement, shouldBlockRun, safeMode, flags]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key.toLowerCase() === "enter") {
        event.preventDefault();
        runMatches();
        return;
      }
      if (isModifier && event.key.toLowerCase() === "l") {
        event.preventDefault();
        patternInputRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        setActiveMatchIndex(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const splitResult = useMemo(() => {
    const trigger = autoRun ? debouncedVersion : runVersion;
    if (!trigger || !regex || !text) return { parts: [], expensive: false, skipped: false };
    if (shouldBlockRun) return { parts: [], expensive: false, skipped: true };
    const timeBudgetMs = safeMode ? Math.min(baseTimeBudgetMs, 15) : baseTimeBudgetMs;
    const localRegex = new RegExp(regex.source, flags.join(""));
    const { value, expensive } = runWithBudget(() => text.split(localRegex), timeBudgetMs);
    return { parts: value, expensive, skipped: false };
  }, [autoRun, debouncedVersion, runVersion, regex, text, shouldBlockRun, safeMode, flags]);

  const explainedTokens = useMemo(() => {
    if (!pattern) return [];
    const tokens: Array<{ token: string; meaning: string }> = [];
    let i = 0;
    while (i < pattern.length) {
      const ch = pattern[i];
      if (ch === "\\") {
        const next = pattern[i + 1] ?? "";
        tokens.push({ token: `\\${next}`, meaning: "Escaped character" });
        i += 2;
        continue;
      }
      if (ch === "[") {
        const end = pattern.indexOf("]", i + 1);
        const body = end === -1 ? pattern.slice(i) : pattern.slice(i, end + 1);
        tokens.push({ token: body, meaning: "Character class" });
        i += body.length;
        continue;
      }
      if (ch === "(") {
        const isNamed = pattern.slice(i, i + 3) === "(?<";
        const isNonCapture = pattern.slice(i, i + 2) === "(?";
        tokens.push({
          token: isNamed ? "(?<name>" : isNonCapture ? "(?..." : "(",
          meaning: isNamed ? "Named capture group" : isNonCapture ? "Special group" : "Capture group",
        });
        i += 1;
        continue;
      }
      if (ch === ")") {
        tokens.push({ token: ")", meaning: "End group" });
        i += 1;
        continue;
      }
      if (ch === "^") {
        tokens.push({ token: "^", meaning: "Start of line" });
        i += 1;
        continue;
      }
      if (ch === "$") {
        tokens.push({ token: "$", meaning: "End of line" });
        i += 1;
        continue;
      }
      if (ch === ".") {
        tokens.push({ token: ".", meaning: "Any character" });
        i += 1;
        continue;
      }
      if (["*", "+", "?", "{"].includes(ch)) {
        if (ch === "{") {
          const end = pattern.indexOf("}", i + 1);
          const range = end === -1 ? "{...}" : pattern.slice(i, end + 1);
          tokens.push({ token: range, meaning: "Quantifier" });
          i += range.length;
          continue;
        }
        tokens.push({ token: ch, meaning: "Quantifier" });
        i += 1;
        continue;
      }
      if (ch === "|") {
        tokens.push({ token: "|", meaning: "Alternation" });
        i += 1;
        continue;
      }
      tokens.push({ token: ch, meaning: "Literal" });
      i += 1;
    }
    return tokens;
  }, [pattern]);

  const recipes = [
    { label: "Email", pattern: "^[\\w.%+-]+@[\\w.-]+\\.[A-Za-z]{2,}$", sample: "hello@example.com" },
    { label: "URL", pattern: "https?://[^\\s/$.?#].[^\\s]*", sample: "https://example.com/path" },
    { label: "UUID", pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$", sample: "550e8400-e29b-41d4-a716-446655440000" },
    { label: "IPv4", pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b", sample: "192.168.0.1" },
    { label: "IPv6", pattern: "\\b(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}\\b", sample: "2001:0db8:85a3:0000:0000:8a2e:0370:7334" },
    { label: "Date (YYYY-MM-DD)", pattern: "\\b\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b", sample: "2024-05-14" },
    { label: "Sri Lankan NIC", pattern: "\\b\\d{9}[VvXx]|\\d{12}\\b", sample: "902345678V" },
  ];

  const updateTestCase = (id: number, field: "input" | "expectedMatches" | "expectedReplace", value: string) => {
    setTestCases((prev) => prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc)));
  };

  const addTestCase = () => {
    setTestCases((prev) => [
      ...prev,
      { id: nextCaseId, input: "", expectedMatches: "", expectedReplace: "" },
    ]);
    setNextCaseId((id) => id + 1);
  };

  const removeTestCase = (id: number) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const collectMatches = (input: string, activeRegex: RegExp) =>
    computeMatches(input, activeRegex).matches.map((m) => m.match);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {patternError}
      </div>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={pattern}
            ref={patternInputRef}
            onChange={(event) => {
              setPattern(event.target.value);
            }}
            className="flex-1 min-w-[240px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Enter regex pattern e.g. \\w+"
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
              setReplacement("");
              setRecentPatterns([]);
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("regexTesterRecentPatterns");
              }
              setRunVersion(0);
              setStatus("Cleared");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={() => {
              setPattern("\\b[A-Za-z]{4}\\b");
              setText("This test text finds four letter words like test, code, and more.");
              setReplacement("[$&]");
              setStatus("Loaded sample");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Sample pattern/text
          </button>
        </div>
        {recentPatterns.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Recent patterns:</span>
            {recentPatterns.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setPattern(item);
                }}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
              >
                {item.length > 42 ? `${item.slice(0, 40)}…` : item}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-3 text-xs text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={treatAsLiteral}
              onChange={(e) => setTreatAsLiteral(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Treat pattern as literal
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => {
                setAutoRun(e.target.checked);
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Auto-run
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Safe mode
          </label>
          <button
            type="button"
            onClick={runMatches}
            disabled={autoRun}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Run regex manually"
          >
            Run
          </button>
          {warning && (
            <span className="font-medium text-amber-600" role="alert">
              {warning}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Quick recipes:</span>
          {recipes.map((recipe) => (
            <button
              key={recipe.label}
              type="button"
              onClick={() => {
                setPattern(recipe.pattern);
                setText(recipe.sample);
                setStatus(`Loaded ${recipe.label} recipe`);
              }}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              {recipe.label}
            </button>
          ))}
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          placeholder="Paste test text here"
          aria-label="Test text"
        />
        {patternError ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {patternError}
          </p>
        ) : (
          <div className="space-y-1 text-sm text-slate-600">
            <p>
              Matches: {matches.length}
              {matches.length ? (
                <>
                  {" "}
                  · Capture groups: {totalCaptureGroups}
                  {" · "}Named groups: {totalNamedGroups}
                </>
              ) : matchResult.expensive ? (
                " · Pattern too expensive"
              ) : matchResult.skipped ? (
                " · Safe mode blocked match"
              ) : (
                " (none)"
              )}
            </p>
            <p className="text-xs text-slate-500">
              Regex literal:{" "}
              <span className="font-mono text-slate-700">
                {regex ? `/${regex.source}/${flags.join("")}` : pattern ? `/${pattern}/${flags.join("")}` : "/ /"}
              </span>
              {" · "}Time: {matchResult.elapsedMs.toFixed(1)} ms
              {text.length > matchesPerSecondThreshold ? ` · ${matchesPerSecond} matches/sec` : ""}
            </p>
          </div>
        )}
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-label="Regex matches"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Matches</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrevMatch}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Previous match"
            >
              Prev
            </button>
            <button
              onClick={handleNextMatch}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Next match"
            >
              Next
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Copy all matches"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy all"}
            </button>
            <button
              onClick={handleCopyCsv}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Copy matches as CSV"
            >
              CSV
            </button>
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Copy matches as JSON"
            >
              JSON
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!matches.length}
              aria-label="Download matches as JSON"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      <div className="bg-slate-800/70 px-4 py-3 text-xs text-slate-300">
        <p className="font-semibold text-slate-100">Highlighted text</p>
        {hasZeroLengthMatches ? (
          <p className="mt-1 text-[11px] text-slate-400">Zero-length matches are shown as a highlighted | marker.</p>
        ) : null}
        <div className="mt-2 flex max-h-48 overflow-auto rounded-lg border border-slate-700 bg-slate-950 text-left font-mono text-[12px] leading-relaxed">
          <div className="border-r border-slate-800 bg-slate-900/80 px-2 py-2 text-right text-[11px] text-slate-500">
            {lines.map((_, index) => (
              <div
                key={`line-${index}`}
                className={`px-1 ${lineMatchMap.has(index) ? "text-emerald-300" : ""}`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="px-3 py-2">
            {highlightSegments.map((seg) => (
              <span
                key={seg.key}
                ref={(node) => {
                  if (seg.highlight && typeof seg.matchIndex === "number") {
                    highlightRefs.current[seg.matchIndex] = node;
                  }
                }}
                className={
                  seg.highlight
                    ? `rounded bg-emerald-600/60 px-0.5 text-white${
                        seg.zeroLength ? " ring-1 ring-emerald-200" : ""
                      }${seg.matchIndex === activeMatchIndex ? " outline outline-1 outline-emerald-200" : ""}`
                    : ""
                }
              >
                {seg.content}
              </span>
            ))}
          </div>
        </div>
      </div>
        <div className="max-h-[260px] overflow-auto divide-y divide-slate-800">
          {matches.length ? (
            matches.map((m, idx) => (
              <div
                key={`${m.index}-${idx}`}
                ref={(node) => {
                  matchRefs.current[idx] = node;
                }}
                className={`cursor-pointer px-4 py-3 text-sm leading-relaxed transition ${
                  idx === activeMatchIndex ? "bg-white/5" : ""
                }`}
                onClick={() => handleSelectMatch(idx)}
              >
                <p className="font-semibold text-emerald-300">
                  {m.match === "" ? "'' (zero-length)" : m.match}
                </p>
                <p className="text-xs text-slate-400">Index: {m.index}</p>
                {m.groups.length ? (
                  <div className="mt-1 space-y-1 text-xs text-slate-200">
                    {m.groups.map((g, gi) => (
                      <p key={`${idx}-g-${gi}`}>
                        Group {gi + 1}: <span className="font-mono text-emerald-200">{g || "''"}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
                {Object.keys(m.namedGroups).length ? (
                  <div className="mt-2 space-y-1 text-xs text-slate-200">
                    <p className="font-semibold text-slate-100">Named groups</p>
                    {Object.entries(m.namedGroups).map(([name, value]) => (
                      <p key={`${idx}-ng-${name}`}>
                        {name}: <span className="font-mono text-emerald-200">{value || "''"}</span>
                      </p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Replace tester</h2>
            <span className="text-xs text-slate-500">Supports $1 and $&lt;name&gt;</span>
          </div>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={replacement}
              onChange={(event) => {
                setReplacement(event.target.value);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Replacement string e.g. [$1]"
              aria-label="Replacement string"
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {replacePreview.expensive ? (
                <p className="font-medium text-amber-700">Pattern too expensive to replace.</p>
              ) : replacePreview.skipped ? (
                <p className="font-medium text-amber-700">Safe mode blocked replace preview.</p>
              ) : replacePreview.output ? (
                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800">{replacePreview.output}</pre>
              ) : (
                <p className="text-slate-500">Replacement output preview appears here.</p>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Split tester</h2>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            {splitResult.expensive ? (
              <p className="font-medium text-amber-700">Pattern too expensive to split.</p>
            ) : splitResult.skipped ? (
              <p className="font-medium text-amber-700">Safe mode blocked split results.</p>
            ) : splitResult.parts.length ? (
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800">
                {JSON.stringify(splitResult.parts, null, 2)}
              </pre>
            ) : (
              <p className="text-slate-500">Split results appear here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Explain mode</h2>
          <button
            type="button"
            onClick={() => setShowExplain((prev) => !prev)}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            {showExplain ? "Hide tokens" : "Show tokens"}
          </button>
        </div>
        {showExplain ? (
          <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            {explainedTokens.length ? (
              <ul className="space-y-1 text-xs">
                {explainedTokens.map((token, idx) => (
                  <li key={`${token.token}-${idx}`} className="flex items-start justify-between gap-4">
                    <span className="font-mono text-slate-900">{token.token}</span>
                    <span className="text-slate-600">{token.meaning}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Enter a pattern to see the token breakdown.</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Toggle on to see a quick token breakdown of the regex.</p>
        )}
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Test cases</h2>
          <button
            type="button"
            onClick={addTestCase}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            Add case
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {testCases.map((tc) => {
            const activeRegex = regex ? new RegExp(regex.source, flags.join("")) : null;
            const replaceRegex = regex ? new RegExp(regex.source, flags.join("")) : null;
            let actualMatches: string[] = [];
            let actualReplace = "";
            let verdict = "Waiting";
            if (!tc.input) {
              verdict = "Add input";
            } else if (!activeRegex || !replaceRegex) {
              verdict = "No regex";
            } else if (safeMode && isSuspiciousPattern(safetySource)) {
              verdict = "Blocked by safe mode";
            } else if (safeMode && tc.input.length > safeModeMaxChars) {
              verdict = "Input too large";
            } else {
              const timeBudgetMs = safeMode ? Math.min(baseTimeBudgetMs, 15) : baseTimeBudgetMs;
              const matchCheck = runWithBudget(
                () => collectMatches(tc.input, activeRegex),
                timeBudgetMs,
              );
              const replaceCheck = runWithBudget(
                () => tc.input.replace(replaceRegex, replacement),
                timeBudgetMs,
              );
              if (matchCheck.expensive || replaceCheck.expensive) {
                verdict = "Pattern too expensive";
              } else {
                actualMatches = matchCheck.value;
                actualReplace = replaceCheck.value;
                const expectedMatches = tc.expectedMatches.trim();
                const expectedReplace = tc.expectedReplace.trim();
                const matchPass =
                  !expectedMatches || expectedMatches === actualMatches.join("\n");
                const replacePass = !expectedReplace || expectedReplace === actualReplace;
                verdict = matchPass && replacePass ? "Pass" : "Fail";
              }
            }
            return (
              <div key={tc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-600">Case #{tc.id}</p>
                  <button
                    type="button"
                    onClick={() => removeTestCase(tc.id)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <textarea
                    className="min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner shadow-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={tc.input}
                    onChange={(event) => updateTestCase(tc.id, "input", event.target.value)}
                    placeholder="Test input"
                    aria-label={`Test input ${tc.id}`}
                  />
                  <div className="grid gap-2">
                    <textarea
                      className="min-h-[64px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner shadow-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={tc.expectedMatches}
                      onChange={(event) => updateTestCase(tc.id, "expectedMatches", event.target.value)}
                      placeholder="Expected matches (one per line)"
                      aria-label={`Expected matches ${tc.id}`}
                    />
                    <textarea
                      className="min-h-[64px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner shadow-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={tc.expectedReplace}
                      onChange={(event) => updateTestCase(tc.id, "expectedReplace", event.target.value)}
                      placeholder="Expected replace output (optional)"
                      aria-label={`Expected replace ${tc.id}`}
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs text-slate-600">
                  <span className="font-semibold">Status:</span> {verdict}
                </div>
                {verdict === "Fail" ? (
                  <div className="mt-2 grid gap-2 text-[11px] text-slate-600 lg:grid-cols-2">
                    <div>
                      <p className="font-semibold text-slate-700">Actual matches</p>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-700">
                        {actualMatches.join("\n") || "(none)"}
                      </pre>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Actual replace</p>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-700">
                        {actualReplace || "(empty)"}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a regex pattern and toggle flags (i/g/m/s/y/u) as needed.</li>
          <li>Paste your test text; matches highlight in the preview and list below.</li>
          <li>Use `Treat pattern as literal` to escape regex characters.</li>
          <li>Enable `Safe mode` to limit input size and block suspicious patterns.</li>
          <li>Try Replace and Split testers to validate transformations.</li>
          <li>Use Test cases to validate expected matches or replacement output.</li>
          <li>Use Prev/Next or click a match to jump to highlights.</li>
          <li>Shareable URLs keep pattern, flags, and text in the query string.</li>
          <li>Shortcuts: Cmd/Ctrl+Enter to run, Cmd/Ctrl+L to focus pattern, Esc to clear selection.</li>
          <li>Copy or download matches as JSON for quick debugging.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes, everything happens in your browser; no data is sent to a server.</p>
          <p>
            <strong>Why do I see no matches?</strong> Make sure your pattern is valid and flags are set correctly; use the sample
            button to verify the workflow.
          </p>
          <p>
            <strong>What does “Pattern too expensive” mean?</strong> The matcher exceeded the time budget; simplify the regex or
            reduce input size.
          </p>
          <p><strong>Can I test large text?</strong> Yes, but inputs over ~50k chars will show a warning to avoid slow runs.</p>
        </div>
      </div>
    </main>
  );
}
