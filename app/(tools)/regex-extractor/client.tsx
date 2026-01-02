"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Download, RefreshCcw, Shuffle, Wand2 } from "lucide-react";
import { RE2 } from "re2-wasm";

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

type Preset = {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  text: string;
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

const buildSelectedFlags = (flagsValue: string) => {
  const allowed = new Set(flagOptions.map((flag) => flag.key));
  return flagsValue
    .split("")
    .filter((flag) => allowed.has(flag));
};

const ensureSafeFlags = (flagsValue: string) => {
  const set = new Set(flagsValue.split(""));
  set.add("u");
  return Array.from(set).join("");
};

const createRegex = (pattern: string, flagsValue: string, safeMode: boolean) => {
  if (safeMode) {
    return new RE2(pattern, ensureSafeFlags(flagsValue));
  }
  return new RegExp(pattern, flagsValue);
};

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
  safeMode: boolean,
  limits: { maxLen: number; maxMatches: number },
): ComputeResult => {
  if (!pattern) {
    return { rows: [], warning: "Enter a regex pattern.", regexError: "", replacedText: "", splitParts: [] };
  }
  try {
    const regex = createRegex(pattern, flags, safeMode);
    const limitedText = text.slice(0, limits.maxLen);
    let warning = text.length > limits.maxLen ? "Large input; results may be truncated." : "";
    if (mode === "replace") {
      return {
        rows: [],
        warning,
        regexError: "",
        replacedText: limitedText.replace(regex as RegExp, replacement),
        splitParts: [],
      };
    }
    if (mode === "split") {
      return {
        rows: [],
        warning,
        regexError: "",
        replacedText: "",
        splitParts: limitedText.split(regex as RegExp),
      };
    }
    const matches: Row[] = [];
    let guard = 0;
    let match = (regex as RegExp).exec(limitedText);
    while (match) {
      matches.push({
        match: match[0] ?? "",
        index: match.index ?? 0,
        groups: (match as RegExpExecArray).slice(1) as string[],
        namedGroups: ((match as RegExpExecArray).groups ?? {}) as Record<string, string>,
      });
      if (matches.length >= limits.maxMatches) {
        warning = `Results truncated at ${limits.maxMatches} matches.`;
        break;
      }
      if ((regex as RegExp).global) {
        if (match[0] === "") {
          (regex as RegExp).lastIndex += 1;
        }
      } else {
        break;
      }
      match = (regex as RegExp).exec(limitedText);
      guard += 1;
      if (guard > limits.maxMatches * 4) break;
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
  const [safeMode, setSafeMode] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [sessionJson, setSessionJson] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [sortKey, setSortKey] = useState<"index" | "length" | "groups">("index");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [columnCopyKey, setColumnCopyKey] = useState("match");
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
  const hasLoadedFromUrl = useRef(false);
  const MAX_LEN = 30000;
  const MAX_MATCHES = 500;
  const MAX_PATTERN_LEN = 5000;

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
    if (hasLoadedFromUrl.current) return;
    hasLoadedFromUrl.current = true;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlPattern = params.get("pattern");
    const urlFlags = params.get("flags");
    const urlText = params.get("text");
    if (urlPattern !== null) setPattern(urlPattern);
    if (urlFlags !== null) setSelectedFlags(buildSelectedFlags(urlFlags));
    if (urlText !== null) setText(urlText);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("regex-extractor-presets");
      if (stored) {
        const parsed = JSON.parse(stored) as Preset[];
        if (Array.isArray(parsed)) {
          setPresets(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load presets", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("regex-extractor-presets", JSON.stringify(presets));
    } catch (error) {
      console.error("Failed to save presets", error);
    }
  }, [presets]);

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
      safeMode,
    });
  }, [debouncedPattern, debouncedText, flags, mode, replacement, safeMode]);

  const fallbackResult = useMemo(() => {
    if (workerRef.current) {
      return { rows: [], warning: "", regexError: "", replacedText: "", splitParts: [] };
    }
    return computeMatches(debouncedPattern, flags, debouncedText, mode, replacement, safeMode, {
      maxLen: MAX_LEN,
      maxMatches: MAX_MATCHES,
    });
  }, [debouncedPattern, debouncedText, flags, mode, replacement, safeMode]);

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

  const preparedRows = useMemo(
    () => results.map((row, originalIndex) => ({ row, originalIndex })),
    [results],
  );
  const filteredRows = useMemo(() => {
    let rows = preparedRows;
    if (uniqueOnly) {
      const seen = new Set<string>();
      rows = rows.filter(({ row }) => {
        if (seen.has(row.match)) return false;
        seen.add(row.match);
        return true;
      });
    }
    if (filterQuery.trim()) {
      const needle = filterQuery.trim().toLowerCase();
      rows = rows.filter(({ row }) => {
        if (row.match.toLowerCase().includes(needle)) return true;
        if (String(row.index).includes(needle)) return true;
        if (row.groups.some((group) => group.toLowerCase().includes(needle))) return true;
        return Object.values(row.namedGroups).some((value) => value.toLowerCase().includes(needle));
      });
    }
    rows = [...rows].sort((a, b) => {
      const aRow = a.row;
      const bRow = b.row;
      let compare = 0;
      if (sortKey === "index") {
        compare = aRow.index - bRow.index;
      } else if (sortKey === "length") {
        compare = aRow.match.length - bRow.match.length;
      } else {
        const aCount = Math.max(aRow.groups.length, Object.keys(aRow.namedGroups).length);
        const bCount = Math.max(bRow.groups.length, Object.keys(bRow.namedGroups).length);
        compare = aCount - bCount;
      }
      return sortDir === "asc" ? compare : -compare;
    });
    return rows;
  }, [filterQuery, preparedRows, sortDir, sortKey, uniqueOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pagedRows = filteredRows.slice(pageStart, pageStart + pageSize);

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

  useEffect(() => {
    setPage(1);
  }, [filterQuery, uniqueOnly, sortKey, sortDir, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const allowed = new Set(["match", "index", ...groupColumns.map((column) => column.key)]);
    if (!allowed.has(columnCopyKey)) {
      setColumnCopyKey("match");
    }
  }, [columnCopyKey, groupColumns]);

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
    setReplacement("$1");
    setSelectedFlags([]);
    setStatus("Loaded sample");
  };

  const handleSwap = () => {
    if (text.length > MAX_PATTERN_LEN) {
      setStatus("Swap skipped: text too large for pattern");
      return;
    }
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

  const downloadContent = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const handleCopyShareLink = async () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("pattern", pattern);
    if (selectedFlags.length) {
      params.set("flags", selectedFlags.join(""));
    }
    if (text) {
      params.set("text", text);
    }
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    await copyContent(url);
    setStatus("Share link copied");
  };

  const handleSavePreset = () => {
    const name = presetName.trim() || `Preset ${presets.length + 1}`;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const next: Preset = {
      id,
      name,
      pattern,
      flags: selectedFlags.join(""),
      text,
    };
    setPresets((prev) => [next, ...prev]);
    setPresetName("");
    setStatus("Preset saved");
  };

  const handleLoadPreset = (preset: Preset) => {
    setPattern(preset.pattern);
    setSelectedFlags(buildSelectedFlags(preset.flags));
    setText(preset.text);
    setStatus("Preset loaded");
  };

  const handleDeletePreset = (presetId: string) => {
    setPresets((prev) => prev.filter((preset) => preset.id !== presetId));
    setStatus("Preset deleted");
  };

  const handleExportSession = () => {
    const payload = {
      pattern,
      flags: selectedFlags.join(""),
      text,
    };
    setSessionJson(JSON.stringify(payload, null, 2));
    setStatus("Session exported");
  };

  const handleImportSession = () => {
    try {
      const parsed = JSON.parse(sessionJson) as { pattern?: string; flags?: string; text?: string };
      if (typeof parsed.pattern === "string") setPattern(parsed.pattern);
      if (typeof parsed.flags === "string") setSelectedFlags(buildSelectedFlags(parsed.flags));
      if (typeof parsed.text === "string") setText(parsed.text);
      setStatus("Session imported");
    } catch (error) {
      console.error("Session import failed", error);
      setStatus("Session import failed");
    }
  };

  const handleCopyColumn = () => {
    if (!filteredRows.length) return;
    const columnValues =
      columnCopyKey === "match"
        ? filteredRows.map(({ row }) => row.match)
        : columnCopyKey === "index"
          ? filteredRows.map(({ row }) => String(row.index))
          : filteredRows.map(({ row }) => {
              const column = groupColumns.find((entry) => entry.key === columnCopyKey);
              return column ? column.getValue(row) : "";
            });
    void copyContent(columnValues.join("\n"));
    setStatus("Column copied");
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
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Copy shareable link"
          >
            <Clipboard className="h-4 w-4" />
            Copy link
          </button>
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
            <label className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-700"
                checked={safeMode}
                onChange={(event) => setSafeMode(event.target.checked)}
                aria-label="Toggle safe regex engine (RE2)"
              />
              Safe engine (RE2)
            </label>
          </div>
          <button
            onClick={() => {
              setPattern("(\\w+)@(\\w+)");
              setSelectedFlags([]);
              setText("email me at hello@fastformat.com and info@tools.dev");
              setReplacement("$1");
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
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 shadow-inner shadow-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Presets & sharing</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              placeholder="Preset name"
              aria-label="Preset name"
              className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200"
            />
            <button
              onClick={handleSavePreset}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-soft)]"
            >
              Save preset
            </button>
          </div>
          {presets.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{preset.name}</div>
                    <div className="text-xs text-slate-500">{preset.pattern}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="rounded-full bg-slate-100 px-3 py-1 text-slate-600"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset.id)}
                      className="rounded-full bg-rose-100 px-3 py-1 text-rose-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No presets saved yet.</p>
          )}
        </div>
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-inner shadow-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Import / export session</div>
          <textarea
            className="h-[140px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 shadow-inner shadow-slate-200"
            value={sessionJson}
            onChange={(event) => setSessionJson(event.target.value)}
            placeholder='{"pattern":"...","flags":"ims","text":"..."}'
            aria-label="Session JSON"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportSession}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-soft)]"
            >
              Export session
            </button>
            <button
              onClick={handleImportSession}
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Import session
            </button>
            <button
              onClick={() => copyContent(sessionJson)}
              disabled={!sessionJson}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 disabled:opacity-50"
            >
              Copy JSON
            </button>
          </div>
        </div>
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
            {mode === "extract"
              ? `${filteredRows.length}${filteredRows.length !== results.length ? ` / ${results.length}` : ""}`
              : mode === "replace"
                ? replacedText.length
                : splitParts.length}
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
                  onClick={() => downloadContent(JSON.stringify(results, null, 2), "regex-results.json", "application/json")}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  disabled={!results.length}
                  aria-label="Download results as JSON"
                >
                  <Download className="h-4 w-4" /> Save JSON
                </button>
                <button
                  onClick={() => downloadContent(toCsv(results, groupColumns), "regex-results.csv", "text/csv")}
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
        {mode === "extract" ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800/70 px-4 py-3 text-xs text-slate-200">
            <input
              type="text"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Filter matches"
              aria-label="Filter matches"
              className="min-w-[160px] flex-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500"
            />
            <label className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1">
              <input
                type="checkbox"
                className="h-3 w-3 accent-emerald-400"
                checked={uniqueOnly}
                onChange={(event) => setUniqueOnly(event.target.checked)}
              />
              Unique only
            </label>
            <label className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1">
              Sort
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as typeof sortKey)}
                className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-slate-100"
              >
                <option value="index">Index</option>
                <option value="length">Match length</option>
                <option value="groups">Group count</option>
              </select>
            </label>
            <button
              onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
              className="rounded-full bg-slate-800 px-3 py-1 text-xs"
            >
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>
            <label className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1">
              Page size
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-slate-100"
              >
                {[25, 50, 100, 250].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1">
              <span>Copy column</span>
              <select
                value={columnCopyKey}
                onChange={(event) => setColumnCopyKey(event.target.value)}
                className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-slate-100"
              >
                <option value="match">Match</option>
                <option value="index">Index</option>
                {groupColumns.map((column) => (
                  <option key={column.key} value={column.key}>
                    {column.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCopyColumn}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]"
                disabled={!filteredRows.length}
              >
                Copy
              </button>
            </div>
            <span className="ml-auto text-[11px] text-slate-400">
              Showing {pagedRows.length} of {filteredRows.length}
            </span>
          </div>
        ) : null}
        <div className="max-h-[320px] overflow-auto">
          {mode === "extract" ? (
            filteredRows.length ? (
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
                  {pagedRows.map(({ row, originalIndex }) => (
                    <tr
                      key={`${row.index}-${originalIndex}`}
                      className={`cursor-pointer transition hover:bg-slate-800/40 ${
                        activeMatchIndex === originalIndex ? "bg-slate-800/60" : ""
                      }`}
                      onClick={() => {
                        setActiveMatchIndex(originalIndex);
                        setStatus("Jumped to match");
                      }}
                      aria-selected={activeMatchIndex === originalIndex}
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
        {mode === "extract" ? (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="rounded-full bg-white/10 px-2 py-1 disabled:opacity-40"
              >
                First
              </button>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-full bg-white/10 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-full bg-white/10 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="rounded-full bg-white/10 px-2 py-1 disabled:opacity-40"
              >
                Last
              </button>
            </div>
          </div>
        ) : null}
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
