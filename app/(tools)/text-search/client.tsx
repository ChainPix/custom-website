"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { Download, RefreshCcw } from "lucide-react";

type Mode = "plain" | "regex";

type SearchOptions = {
  mode: Mode;
  caseSensitive: boolean;
  wholeWord: boolean;
  regexFlags: string;
  wordChars: string;
};

type TextTab = {
  id: string;
  name: string;
  content: string;
  source: "manual" | "file" | "split";
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

function escapeCharClass(value: string) {
  return value.replace(/[\\\]\-^]/g, "\\$&");
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
  const wordChars = opts.wordChars.trim();
  const boundary =
    opts.wholeWord && wordChars
      ? `(?<![${escapeCharClass(wordChars)}])${escaped}(?![${escapeCharClass(wordChars)}])`
      : opts.wholeWord
        ? `\\b${escaped}\\b`
        : escaped;
  const pattern = boundary;
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

function findMatches(
  text: string,
  regex: RegExp | null,
  contextSize: number,
  maxMatches?: number,
): { matches: MatchResult[]; total: number; hasMore: boolean } {
  if (!regex) return { matches: [], total: 0, hasMore: false };
  regex.lastIndex = 0;
  const lineStarts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }
  const results: MatchResult[] = [];
  let hasMore = false;
  for (const m of text.matchAll(regex)) {
    if (maxMatches && results.length >= maxMatches) {
      hasMore = true;
      break;
    }
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
  return { matches: results, total: results.length, hasMore };
}

export default function TextSearchClient() {
  const tabCounter = useRef(2);
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const [tabs, setTabs] = useState<TextTab[]>([
    {
      id: "tab-1",
      name: "Tab 1",
      content: "",
      source: "manual",
    },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [autoRun, setAutoRun] = useState(true);
  const [debounce, setDebounce] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const activeMatchRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [runInputs, setRunInputs] = useState<{
    tabs: TextTab[];
    activeTabId: string;
    query: string;
    options: SearchOptions;
    contextSize: number;
    performanceMode: boolean;
    matchLimitByTab: Record<string, number>;
  }>({
    tabs: [
      {
        id: "tab-1",
        name: "Tab 1",
        content: "",
        source: "manual",
      },
    ],
    activeTabId: "tab-1",
    query: "",
    options: {
      mode: "plain",
      caseSensitive: false,
      wholeWord: false,
      regexFlags: "g",
      wordChars: "A-Za-z0-9_",
    },
    contextSize: 20,
    performanceMode: false,
    matchLimitByTab: {},
  });
  const [activeIndexByTab, setActiveIndexByTab] = useState<Record<string, number>>({});
  const [contextSize, setContextSize] = useState(20);
  const [matchLimitByTab, setMatchLimitByTab] = useState<Record<string, number>>({});
  const [replaceWith, setReplaceWith] = useState("");
  const [undoStackByTab, setUndoStackByTab] = useState<Record<string, string[]>>({});
  const [selectionByTab, setSelectionByTab] = useState<Record<string, { start: number; end: number }>>({});
  const [options, setOptions] = useState<SearchOptions>({
    mode: "plain",
    caseSensitive: false,
    wholeWord: false,
    regexFlags: "g",
    wordChars: "A-Za-z0-9_",
  });
  const [presets, setPresets] = useState<Array<{ id: string; name: string; options: SearchOptions }>>([]);
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState("");
  const presetCounter = useRef(1);
  const shareSyncRef = useRef(false);
  const urlUpdateRef = useRef<number | null>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeText = activeTab?.content ?? "";
  const activeIndex = activeIndexByTab[activeTabId] ?? 0;
  const activeSelection = selectionByTab[activeTabId] ?? { start: 0, end: 0 };
  const defaultMatchLimit = 200;
  const matchLimitStep = 200;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setActiveTabContent = (nextContent: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, content: nextContent } : tab)),
    );
  };

  const createTab = (name: string, content: string, source: TextTab["source"] = "manual") => ({
    id: `tab-${tabCounter.current++}`,
    name,
    content,
    source,
  });

  const addTab = (name = `Tab ${tabCounter.current}`) => {
    const newTab = createTab(name, "", "manual");
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    if (performanceMode) {
      setMatchLimitByTab((prev) => ({ ...prev, [newTab.id]: defaultMatchLimit }));
    }
    setStatus("Added new tab");
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setOptions((prev) => ({
      ...prev,
      ...preset.options,
      wordChars: preset.options.wordChars ?? prev.wordChars,
    }));
    setStatus(`Preset applied: ${preset.name}`);
  };

  const savePreset = () => {
    const name = presetName.trim() || `Preset ${presetCounter.current++}`;
    const newPreset = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      options,
    };
    setPresets((prev) => [...prev, newPreset]);
    setPresetName("");
    setActivePresetId(newPreset.id);
    setStatus(`Saved preset: ${name}`);
  };

  const deletePreset = () => {
    if (!activePresetId) return;
    setPresets((prev) => prev.filter((preset) => preset.id !== activePresetId));
    setActivePresetId("");
    setStatus("Preset deleted");
  };

  const loadMoreMatches = () => {
    setMatchLimitByTab((prev) => ({
      ...prev,
      [activeTabId]: (prev[activeTabId] ?? defaultMatchLimit) + matchLimitStep,
    }));
    if (!autoRun) {
      const nextLimits = {
        ...matchLimitByTab,
        [activeTabId]: (matchLimitByTab[activeTabId] ?? defaultMatchLimit) + matchLimitStep,
      };
      setRunInputs({
        tabs,
        activeTabId,
        query,
        options,
        contextSize,
        performanceMode,
        matchLimitByTab: nextLimits,
      });
    }
  };

  const removeTab = (id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((tab) => tab.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next[0]?.id ?? "");
      }
      return next;
    });
    setSelectionByTab((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setUndoStackByTab((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setMatchLimitByTab((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("text-search:presets");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Array<{ id: string; name: string; options: SearchOptions }>;
      if (Array.isArray(parsed)) {
        setPresets(parsed);
      }
    } catch (err) {
      console.error("Preset load failed", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("text-search:presets", JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    if (shareSyncRef.current) return;
    shareSyncRef.current = true;
    const q = searchParams.get("q");
    const mode = searchParams.get("mode");
    const cs = searchParams.get("cs");
    const ww = searchParams.get("ww");
    const flags = searchParams.get("flags");
    const wc = searchParams.get("wc");
    if (q != null) setQuery(q);
    setOptions((prev) => ({
      ...prev,
      mode: mode === "regex" ? "regex" : "plain",
      caseSensitive: cs === "1",
      wholeWord: ww === "1",
      regexFlags: flags ?? prev.regexFlags,
      wordChars: wc ?? prev.wordChars,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!shareSyncRef.current) return;
    if (urlUpdateRef.current) window.clearTimeout(urlUpdateRef.current);
    urlUpdateRef.current = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (options.mode === "regex") params.set("mode", "regex");
      if (options.caseSensitive) params.set("cs", "1");
      if (options.wholeWord) params.set("ww", "1");
      if (options.regexFlags) params.set("flags", options.regexFlags);
      if (options.wordChars && options.wordChars !== "A-Za-z0-9_") params.set("wc", options.wordChars);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => {
      if (urlUpdateRef.current) window.clearTimeout(urlUpdateRef.current);
    };
  }, [query, options, pathname, router]);

  useEffect(() => {
    if (!activeText && !query) {
      setWarning("Enter text and a search query to begin.");
      return;
    }
    const chars = activeText.length;
    if (chars > 120000) {
      setWarning(
        `Large input (${chars.toLocaleString()} chars). Consider enabling performance mode.`,
      );
    } else {
      setWarning("");
    }
  }, [activeText, query]);

  const deferredTabs = useDeferredValue(tabs);
  const deferredActiveTabId = useDeferredValue(activeTabId);
  const deferredQuery = useDeferredValue(query);
  const deferredOptions = useDeferredValue(options);
  const deferredContextSize = useDeferredValue(contextSize);
  const deferredPerformanceMode = useDeferredValue(performanceMode);
  const deferredMatchLimitByTab = useDeferredValue(matchLimitByTab);

  useEffect(() => {
    if (!autoRun) return;
    if (debounce) {
      const id = setTimeout(() => {
        setRunInputs({
          tabs: deferredTabs,
          activeTabId: deferredActiveTabId,
          query: deferredQuery,
          options: deferredOptions,
          contextSize: deferredContextSize,
          performanceMode: deferredPerformanceMode,
          matchLimitByTab: deferredMatchLimitByTab,
        });
      }, 180);
      return () => clearTimeout(id);
    }
    setRunInputs({
      tabs: deferredTabs,
      activeTabId: deferredActiveTabId,
      query: deferredQuery,
      options: deferredOptions,
      contextSize: deferredContextSize,
      performanceMode: deferredPerformanceMode,
      matchLimitByTab: deferredMatchLimitByTab,
    });
  }, [
    autoRun,
    debounce,
    deferredTabs,
    deferredActiveTabId,
    deferredQuery,
    deferredOptions,
    deferredContextSize,
    deferredPerformanceMode,
    deferredMatchLimitByTab,
  ]);

  const compiled = useMemo(() => {
    if (!runInputs.query) return null;
    return buildRegex(runInputs.query, runInputs.options);
  }, [runInputs.query, runInputs.options]);

  const matchRegex = useMemo(() => {
    if (!compiled?.regex) return null;
    return new RegExp(compiled.regex.source, ensureGlobal(compiled.regex.flags));
  }, [compiled]);

  const matchRun = useMemo(() => {
    const start = typeof performance !== "undefined" ? performance.now() : 0;
    const groups = runInputs.tabs.map((tab) => {
      const limit = runInputs.performanceMode
        ? runInputs.matchLimitByTab[tab.id] ?? defaultMatchLimit
        : undefined;
      const result = findMatches(tab.content, matchRegex, runInputs.contextSize, limit);
      return {
        tabId: tab.id,
        name: tab.name,
        matches: result.matches,
        total: result.total,
        hasMore: result.hasMore,
      };
    });
    const end = typeof performance !== "undefined" ? performance.now() : 0;
    return {
      groups,
      durationMs: Math.max(0, Math.round(end - start)),
    };
  }, [
    runInputs.tabs,
    runInputs.performanceMode,
    runInputs.matchLimitByTab,
    matchRegex,
    runInputs.contextSize,
    defaultMatchLimit,
  ]);
  const matchesByTab = matchRun.groups;
  const activeRunTab =
    runInputs.tabs.find((tab) => tab.id === runInputs.activeTabId) ?? runInputs.tabs[0];
  const activeGroup = matchesByTab.find((group) => group.tabId === activeTabId);
  const activeMatches = activeGroup?.matches ?? [];
  const activeHasMore = activeGroup?.hasMore ?? false;

  useEffect(() => {
    setActiveIndexByTab((prev) => ({ ...prev, [activeTabId]: 0 }));
  }, [runInputs, activeTabId]);

  useEffect(() => {
    if (!activeMatches.length) return;
    activeMatchRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, activeMatches.length]);

  const inputsInSync =
    activeText === (activeRunTab?.content ?? "") &&
    activeTabId === runInputs.activeTabId &&
    query === runInputs.query &&
    options.mode === runInputs.options.mode &&
    options.caseSensitive === runInputs.options.caseSensitive &&
    options.wholeWord === runInputs.options.wholeWord &&
    options.regexFlags === runInputs.options.regexFlags &&
    options.wordChars === runInputs.options.wordChars &&
    contextSize === runInputs.contextSize;

  const moveActiveMatch = (direction: "next" | "prev") => {
    setActiveIndexByTab((prev) => {
      const current = prev[activeTabId] ?? 0;
      const total = activeMatches.length;
      if (!total) return prev;
      const nextIndex = direction === "next" ? (current + 1) % total : (current - 1 + total) % total;
      return { ...prev, [activeTabId]: nextIndex };
    });
    setStatus(direction === "next" ? "Moved to next match" : "Moved to previous match");
  };

  const runManualSearch = () => {
    setRunInputs({
      tabs,
      activeTabId,
      query,
      options,
      contextSize,
      performanceMode,
      matchLimitByTab,
    });
    setStatus("Manual run");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextArea = target?.tagName === "TEXTAREA";
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        queryInputRef.current?.focus();
        queryInputRef.current?.select();
        return;
      }

      if (event.key === "F3" || event.key === "f3") {
        event.preventDefault();
        moveActiveMatch(event.shiftKey ? "prev" : "next");
        return;
      }

      if (!autoRun && event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (!isTextArea) {
          event.preventDefault();
          runManualSearch();
        }
        return;
      }

      if (isTypingTarget && !(event.ctrlKey && event.key === "Enter")) return;

      if (event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        moveActiveMatch("next");
      } else if (event.altKey && event.key === "ArrowUp") {
        event.preventDefault();
        moveActiveMatch("prev");
      } else if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        if (!autoRun) {
          runManualSearch();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    autoRun,
    activeMatches.length,
    tabs,
    activeTabId,
    query,
    options,
    contextSize,
    performanceMode,
    matchLimitByTab,
  ]);

  const error = runInputs.options.mode === "regex" && runInputs.query ? compiled?.error ?? "" : "";
  const regexExplanation = useMemo(() => {
    if (options.mode !== "regex" || !query) return [];
    return explainRegex(query, options.regexFlags);
  }, [options.mode, options.regexFlags, query]);

  const previewSegments = useMemo(() => {
    if (!activeMatches.length) {
      return [{ key: "all", content: activeRunTab?.content ?? "", highlight: false }];
    }
    const active = activeMatches[Math.max(0, Math.min(activeIndex, activeMatches.length - 1))];
    if (!active) {
      return [{ key: "all", content: activeRunTab?.content ?? "", highlight: false }];
    }
    const windowSize = 140;
    const matchStart = active.index;
    const matchEnd = active.index + active.match.length;
    const start = Math.max(0, matchStart - windowSize);
    const activeTextValue = activeRunTab?.content ?? "";
    const end = Math.min(activeTextValue.length, matchEnd + windowSize);
    const segs: Array<{ key: string; content: string; highlight: boolean }> = [];
    const prefix = activeTextValue.slice(start, matchStart);
    const match = activeTextValue.slice(matchStart, matchEnd);
    const suffix = activeTextValue.slice(matchEnd, end);
    if (start > 0) segs.push({ key: "lead-ellipsis", content: "...", highlight: false });
    if (prefix) segs.push({ key: "prefix", content: prefix, highlight: false });
    if (match) segs.push({ key: "match", content: match, highlight: true });
    if (suffix) segs.push({ key: "suffix", content: suffix, highlight: false });
    if (end < activeTextValue.length) segs.push({ key: "tail-ellipsis", content: "...", highlight: false });
    return segs;
  }, [activeRunTab?.content, activeMatches, activeIndex]);

  const renderMatchSegments = (matchText: string, highlights: MatchResult["groupHighlights"]) => {
    if (!highlights.length) {
      return (
        <span className="rounded bg-emerald-200/80 px-0.5 text-slate-900">
          {matchText}
        </span>
      );
    }
    const nodes: ReactNode[] = [];
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

  const selectionLength = Math.max(0, activeSelection.end - activeSelection.start);
  const activeMatch = activeMatches[Math.max(0, Math.min(activeIndex, activeMatches.length - 1))];

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
      const selectionText = activeText.slice(activeSelection.start, activeSelection.end);
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
  }, [
    compiled,
    replaceWith,
    activeMatch,
    selectionLength,
    activeText,
    activeSelection.start,
    activeSelection.end,
  ]);

  const updateSelection = (event: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget;
    setSelectionByTab((prev) => ({
      ...prev,
      [activeTabId]: {
        start: target.selectionStart ?? 0,
        end: target.selectionEnd ?? 0,
      },
    }));
  };

  const pushUndo = (prevText: string) => {
    setUndoStackByTab((prev) => {
      const stack = prev[activeTabId] ?? [];
      const next = [...stack, prevText].slice(Math.max(0, stack.length + 1 - 10));
      return { ...prev, [activeTabId]: next };
    });
  };

  const handleReplaceCurrent = () => {
    if (!compiled?.regex || !activeMatch) return;
    if (!inputsInSync) {
      setStatus("Sync inputs before replacing");
      return;
    }
    const replacement = getReplacementForMatch(activeMatch.match);
    const before = activeText.slice(0, activeMatch.index);
    const after = activeText.slice(activeMatch.index + activeMatch.matchLength);
    const nextText = `${before}${replacement}${after}`;
    if (nextText === activeText) return;
    pushUndo(activeText);
    setActiveTabContent(nextText);
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
    const nextText = activeText.replace(globalRegex, replaceWith);
    if (nextText === activeText) return;
    pushUndo(activeText);
    setActiveTabContent(nextText);
    setStatus("Replaced all matches");
  };

  const handleReplaceSelection = () => {
    if (!compiled?.regex) return;
    if (selectionLength === 0) return;
    if (!inputsInSync) {
      setStatus("Sync inputs before replacing");
      return;
    }
    const selectionText = activeText.slice(activeSelection.start, activeSelection.end);
    const globalRegex = getGlobalReplaceRegex();
    if (!globalRegex) return;
    globalRegex.lastIndex = 0;
    const replaced = selectionText.replace(globalRegex, replaceWith);
    const nextText =
      activeText.slice(0, activeSelection.start) +
      replaced +
      activeText.slice(activeSelection.end);
    if (nextText === activeText) return;
    pushUndo(activeText);
    setActiveTabContent(nextText);
    setStatus("Replaced in selection");
  };

  const handleUndo = () => {
    setUndoStackByTab((prev) => {
      const stack = prev[activeTabId] ?? [];
      if (!stack.length) return prev;
      const nextStack = [...stack];
      const previous = nextStack.pop() ?? "";
      setActiveTabContent(previous);
      setStatus("Undo");
      return { ...prev, [activeTabId]: nextStack };
    });
  };

  const allMatches = useMemo(
    () =>
      matchesByTab.flatMap((group) =>
        group.matches.map((match) => ({
          tabId: group.tabId,
          tabName: group.name,
          ...match,
        })),
      ),
    [matchesByTab],
  );

  const copyMatches = async () => {
    try {
      const payload = allMatches.length
        ? allMatches.map((m) => `${m.tabName}: ${m.match}`).join("\n")
        : "";
      await navigator.clipboard.writeText(payload);
      setStatus("Copied matches");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const copyContexts = async () => {
    try {
      const payload = activeMatches.map((m) => m.context).join("\n\n");
      await navigator.clipboard.writeText(payload);
      setStatus("Copied contexts");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const downloadMatches = () => {
    const payload = allMatches.map((m) => ({
      tab: m.tabName,
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
    const lines = allMatches.map((m) => `${m.tabName}: ${m.match}`);
    downloadTextFile("text-search-matches.txt", lines.join("\n"), "text/plain");
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
    const header = ["tab", "match", "index", "line", "column", "context"];
    const rows = allMatches.map((m) => [
      escapeCsvCell(m.tabName),
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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const newTabs = await Promise.all(
      files.map(async (file) => createTab(file.name, await file.text(), "file")),
    );
    setTabs((prev) => [...prev, ...newTabs]);
    setActiveTabId(newTabs[0]?.id ?? activeTabId);
    if (performanceMode) {
      setMatchLimitByTab((prev) => ({
        ...prev,
        ...Object.fromEntries(newTabs.map((tab) => [tab.id, defaultMatchLimit])),
      }));
    }
    setStatus(`Loaded ${newTabs.length} file${newTabs.length === 1 ? "" : "s"}`);
    event.target.value = "";
  };

  const splitTabsFromText = () => {
    const separatorPattern = /^(?:-{3,}|={3,})\s*(.+?)\s*(?:-{3,}|={3,})$/;
    const lines = activeText.split(/\r?\n/);
    const sections: Array<{ name: string; content: string }> = [];
    let buffer: string[] = [];
    let currentName = "";
    let foundSeparator = false;
    lines.forEach((line) => {
      const match = line.match(separatorPattern);
      if (match) {
        if (foundSeparator || buffer.length) {
          sections.push({
            name: currentName || `Section ${sections.length + 1}`,
            content: buffer.join("\n"),
          });
          buffer = [];
        }
        currentName = match[1]?.trim() || `Section ${sections.length + 1}`;
        foundSeparator = true;
      } else {
        buffer.push(line);
      }
    });
    if (!foundSeparator) {
      setStatus("No separators found to split.");
      return;
    }
    sections.push({
      name: currentName || `Section ${sections.length + 1}`,
      content: buffer.join("\n"),
    });
    const newTabs = sections.map((section) => createTab(section.name, section.content, "split"));
    if (!newTabs.length) return;
    setTabs(newTabs);
    setActiveTabId(newTabs[0].id);
    setSelectionByTab({});
    setUndoStackByTab({});
    if (performanceMode) {
      setMatchLimitByTab(Object.fromEntries(newTabs.map((tab) => [tab.id, defaultMatchLimit])));
    }
    setStatus(`Split into ${newTabs.length} tabs`);
  };

  const loadSample = () => {
    setActiveTabContent(
      "ToolStack makes fast browser tools.\nJSON formatter, text search, and regex tester help developers.\nSearch this paragraph for the word 'tool' or 'text'.",
    );
    setQuery("tool");
    setOptions({ ...options, mode: "plain", caseSensitive: false, wholeWord: true });
    setStatus("Loaded sample");
  };

  const counts = useMemo(
    () => ({
      total: matchesByTab.reduce((sum, group) => sum + group.total, 0),
      hasMore: matchesByTab.some((group) => group.hasMore),
      byTab: matchesByTab.map((group) => ({
        id: group.tabId,
        name: group.name,
        count: group.total,
        hasMore: group.hasMore,
      })),
    }),
    [matchesByTab],
  );
  const contextOptions = [20, 50, 120];
  const contextIndex = Math.max(0, contextOptions.indexOf(contextSize));
  const hasSelection = selectionLength > 0;
  const canReplaceBase = Boolean(compiled?.regex) && inputsInSync;
  const canReplaceCurrent = canReplaceBase && Boolean(activeMatch);
  const canReplaceAll = canReplaceBase;
  const canReplaceSelection = canReplaceBase && hasSelection;
  const undoCount = undoStackByTab[activeTabId]?.length ?? 0;
  const formatCount = (value: number, hasMore: boolean) => (hasMore ? `${value}+` : `${value}`);
  const lineCounts = useMemo(() => {
    const countsMap = new Map<number, number>();
    activeMatches.forEach((match) => {
      countsMap.set(match.line, (countsMap.get(match.line) ?? 0) + 1);
    });
    return Array.from(countsMap.entries()).map(([line, count]) => ({ line, count }));
  }, [activeMatches]);
  const activeStats = useMemo(() => {
    const content = activeRunTab?.content ?? "";
    const totalLines = content ? content.split(/\r?\n/).length : 0;
    return {
      chars: content.length,
      lines: totalLines,
    };
  }, [activeRunTab?.content]);

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
            ref={queryInputRef}
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
              Whole word (ignore inside words)
            </span>
          </label>
          <label className="flex items-center gap-2">
            <span className={`text-xs ${options.mode === "regex" ? "text-slate-400" : "text-slate-600"}`}>
              Word chars
            </span>
            <input
              type="text"
              value={options.wordChars}
              onChange={(event) => setOptions((prev) => ({ ...prev, wordChars: event.target.value }))}
              className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              placeholder="A-Za-z0-9_"
              aria-label="Word character set"
              disabled={!options.wholeWord || options.mode === "regex"}
            />
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
              setActiveTabContent("");
              setQuery("");
              setOptions({
                mode: "plain",
                caseSensitive: false,
                wholeWord: false,
                regexFlags: "g",
                wordChars: "A-Za-z0-9_",
              });
              setContextSize(20);
              setSelectionByTab((prev) => ({ ...prev, [activeTabId]: { start: 0, end: 0 } }));
              setUndoStackByTab((prev) => ({ ...prev, [activeTabId]: [] }));
              setStatus("Cleared");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Clear text and query"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                tab.id === activeTabId
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className="text-xs font-semibold"
                aria-label={`Switch to ${tab.name}`}
              >
                {tab.name}
              </button>
              {tabs.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeTab(tab.id)}
                  className={`text-[10px] ${tab.id === activeTabId ? "text-white/70" : "text-slate-400"}`}
                  aria-label={`Remove ${tab.name}`}
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addTab()}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Add new tab"
          >
            New tab
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Upload text or log files"
          >
            Upload .txt/.log
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.log"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={splitTabsFromText}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Split current text into tabs by separator"
          >
            Split by separator
          </button>
          <span className="text-[11px] text-slate-400">Use lines like --- filename ---</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <label className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Presets</span>
            <select
              value={activePresetId}
              onChange={(event) => {
                const value = event.target.value;
                setActivePresetId(value);
                applyPreset(value);
              }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Select preset"
            >
              <option value="">Select preset</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Name</span>
            <input
              type="text"
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
              className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="My preset"
              aria-label="Preset name"
            />
          </label>
          <button
            type="button"
            onClick={savePreset}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Save preset"
          >
            Save preset
          </button>
          <button
            type="button"
            onClick={deletePreset}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={!activePresetId}
            aria-label="Delete preset"
          >
            Delete preset
          </button>
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={activeText}
          onChange={(event) => {
            setActiveTabContent(event.target.value);
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
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={performanceMode}
              onChange={(e) => {
                const nextLimits = e.target.checked
                  ? {
                      ...Object.fromEntries(tabs.map((tab) => [tab.id, defaultMatchLimit])),
                      ...matchLimitByTab,
                    }
                  : matchLimitByTab;
                setPerformanceMode(e.target.checked);
                setStatus(e.target.checked ? "Performance mode on" : "Performance mode off");
                if (e.target.checked) {
                  setMatchLimitByTab(nextLimits);
                }
                if (!autoRun) {
                  setRunInputs({
                    tabs,
                    activeTabId,
                    query,
                    options,
                    contextSize,
                    performanceMode: e.target.checked,
                    matchLimitByTab: nextLimits,
                  });
                }
              }}
            />
            Performance mode
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
              onClick={runManualSearch}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={autoRun}
              aria-label="Run search manually"
              title="Shortcut: Enter"
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
            {performanceMode ? (
              <span className="text-xs text-slate-500">Performance mode: previews off, matches capped.</span>
            ) : null}
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
              disabled={!undoCount}
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
          <div className="text-sm text-slate-600">
            <p>Total matches: {formatCount(counts.total, counts.hasMore)}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {counts.byTab.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`rounded-full px-2 py-1 ${
                    tab.id === activeTabId
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                  aria-label={`Show ${tab.count} matches for ${tab.name}`}
                >
                  {tab.name}: {formatCount(tab.count, tab.hasMore)}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>Total chars: {activeStats.chars.toLocaleString()}</span>
              <span>Total lines: {activeStats.lines.toLocaleString()}</span>
              <span>Search time: {matchRun.durationMs} ms</span>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Match count by line</p>
          {lineCounts.length ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
              {lineCounts.slice(0, 12).map((entry) => (
                <span key={entry.line} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                  Line {entry.line}: {entry.count}
                </span>
              ))}
              {lineCounts.length > 12 ? (
                <span className="text-slate-400">+{lineCounts.length - 12} more</span>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-slate-500">No matches in the active tab yet.</p>
          )}
        </div>
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
        {performanceMode ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            Preview is disabled in performance mode. Use snippets below.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Preview
                {activeTab ? <span className="text-slate-500"> · {activeTab.name}</span> : null}
              </h2>
              <span className="text-xs text-slate-600">
                {activeMatches.length
                  ? `Match ${activeIndex + 1} of ${activeMatches.length}`
                  : "No matches yet"}
              </span>
            </div>
            <p className="sr-only">
              {activeMatches.length
                ? `Active match ${activeIndex + 1} of ${activeMatches.length}: ${activeMatches[activeIndex]?.context ?? ""}`
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
          </>
        )}
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
                setActiveIndexByTab((prev) => {
                  const current = prev[activeTabId] ?? 0;
                  return {
                    ...prev,
                    [activeTabId]: activeMatches.length
                      ? (current - 1 + activeMatches.length) % activeMatches.length
                      : 0,
                  };
                });
                setStatus("Moved to previous match");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!activeMatches.length}
              aria-label="Previous match"
              title="Shortcut: Shift+F3 or Alt+ArrowUp"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveIndexByTab((prev) => {
                  const current = prev[activeTabId] ?? 0;
                  return {
                    ...prev,
                    [activeTabId]: activeMatches.length ? (current + 1) % activeMatches.length : 0,
                  };
                });
                setStatus("Moved to next match");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!activeMatches.length}
              aria-label="Next match"
              title="Shortcut: F3 or Alt+ArrowDown"
            >
              Next
            </button>
            <button
              type="button"
              onClick={copyMatches}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!allMatches.length}
              aria-label="Copy matches"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={copyContexts}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!activeMatches.length}
              aria-label="Copy match contexts"
            >
              Copy context
            </button>
            <button
              type="button"
              onClick={downloadMatches}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!allMatches.length}
              aria-label="Download matches as JSON"
            >
              <Download className="h-4 w-4" />
              JSON
            </button>
            <button
              type="button"
              onClick={downloadMatchesCsv}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!allMatches.length}
              aria-label="Download matches as CSV"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={downloadMatchesTxt}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!allMatches.length}
              aria-label="Download matches as TXT"
            >
              <Download className="h-4 w-4" />
              TXT
            </button>
          </div>
        </div>
        <div className="max-h-[300px] overflow-auto divide-y divide-slate-800">
          {matchesByTab.some((group) => group.matches.length) ? (
            matchesByTab.map((group) => (
              <div key={group.tabId} className="border-b border-slate-800 last:border-b-0">
            <button
              type="button"
              onClick={() => setActiveTabId(group.tabId)}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs font-semibold ${
                group.tabId === activeTabId ? "bg-slate-800 text-emerald-200" : "text-slate-300"
              }`}
              aria-label={`Show matches for ${group.name}`}
            >
              <span>{group.name}</span>
              <span>{formatCount(group.total, group.hasMore)}</span>
            </button>
                {group.matches.map((m, idx) => (
                  <div
                    key={`${m.index}-${idx}-${group.tabId}`}
                    ref={group.tabId === activeTabId && idx === activeIndex ? activeMatchRef : null}
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      group.tabId === activeTabId && idx === activeIndex ? "bg-slate-800" : ""
                    }`}
                    onClick={() => {
                      setActiveTabId(group.tabId);
                      setActiveIndexByTab((prev) => ({ ...prev, [group.tabId]: idx }));
                      setStatus("Focused match");
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveTabId(group.tabId);
                        setActiveIndexByTab((prev) => ({ ...prev, [group.tabId]: idx }));
                      }
                    }}
                  >
                    <p className="font-semibold text-emerald-300">{m.match}</p>
                    <p className="text-xs text-slate-400">
                      Index: {m.index} · Line: {m.line}, Col: {m.column}
                    </p>
                    <p className="mt-1 text-slate-100">{renderContextWithGroups(m)}</p>
                    {m.groups.length ? (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                        {m.groups.map((groupInfo, groupIndex) => (
                          <span
                            key={`${groupInfo.name}-${groupIndex}`}
                            className="rounded-full bg-slate-800 px-2 py-0.5 text-emerald-200"
                          >
                            {groupInfo.name}: {groupInfo.value}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-300">No matches yet.</div>
          )}
        </div>
        {performanceMode && activeHasMore ? (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
            <span>
              Showing {activeMatches.length} matches. Load more to scan deeper.
            </span>
            <button
              type="button"
              onClick={loadMoreMatches}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste text into a tab (or upload files) and enter a query (plain or regex).</li>
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
