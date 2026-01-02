"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, Info, RefreshCcw } from "lucide-react";
import {
  alnumAlphabet,
  clampCount,
  clampLength,
  crockfordAlphabet,
  defaultAlphabet,
  getAlphabetValidation,
  hexAlphabet,
  lowerAlphabet,
  randomNanoId,
  type GenerationMode,
} from "@/lib/nanoid-generator";

const historyStorageKey = "nanoid-generator-history";
type CaseTransform = "none" | "upper" | "lower";
type OutputFormat = "txt" | "csv" | "json" | "ndjson";

export default function NanoIdClient() {
  const [length, setLength] = useState(10);
  const [alphabet, setAlphabet] = useState(defaultAlphabet);
  const [count, setCount] = useState(5);
  const [ids, setIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("nanoid");
  const [uniqueStats, setUniqueStats] = useState<{ attempts: number; collisions: number } | null>(null);
  const [uniqueError, setUniqueError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [separator, setSeparator] = useState("-");
  const [groupSize, setGroupSize] = useState(4);
  const [caseTransform, setCaseTransform] = useState<CaseTransform>("none");
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("txt");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [history, setHistory] = useState<
    { timestamp: number; count: number; length: number; alphabetSize: number; mode: GenerationMode; sample: string }[]
  >([]);

  const hasLoadedRef = useRef(false);

  const { alphabetIssues, effectiveAlphabet } = useMemo(() => {
    const validation = getAlphabetValidation(alphabet, excludeAmbiguous);
    return {
      alphabetIssues: validation.issues[0] ?? "",
      effectiveAlphabet: validation.effectiveAlphabet,
    };
  }, [alphabet, excludeAmbiguous]);

  const isAlphabetValid = !alphabetIssues;
  const safeLength = clampLength(length);
  const safeCount = clampCount(count);
  const alpha = isAlphabetValid ? effectiveAlphabet : defaultAlphabet;

  const applyCaseTransform = (value: string) => {
    if (caseTransform === "upper") return value.toUpperCase();
    if (caseTransform === "lower") return value.toLowerCase();
    return value;
  };

  const applyGrouping = (value: string) => {
    if (!separator || !Number.isFinite(groupSize) || groupSize <= 0) return value;
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += groupSize) {
      parts.push(value.slice(i, i + groupSize));
    }
    return parts.join(separator);
  };

  const decorateId = (rawId: string) => {
    const transformed = applyCaseTransform(rawId);
    const grouped = applyGrouping(transformed);
    return `${prefix}${grouped}${suffix}`;
  };

  const displayIds = useMemo(
    () => ids.map((id) => decorateId(id)),
    [ids, prefix, suffix, separator, groupSize, caseTransform]
  );

  const formatOutput = (format: OutputFormat, values: string[]) => {
    if (format === "json") return JSON.stringify(values);
    if (format === "ndjson") return values.map((value) => JSON.stringify(value)).join("\n");
    if (format === "csv") {
      return values
        .map((value) => {
          if (/[",\n]/.test(value)) {
            return `"${value.replace(/"/g, "\"\"")}"`;
          }
          return value;
        })
        .join(",");
    }
    return values.join("\n");
  };

  const outputText = useMemo(() => formatOutput(outputFormat, displayIds), [outputFormat, displayIds]);

  const pushHistory = (entry: {
    timestamp: number;
    count: number;
    length: number;
    alphabetSize: number;
    mode: GenerationMode;
    sample: string;
  }) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 5);
      try {
        localStorage.setItem(historyStorageKey, JSON.stringify(next));
      } catch (err) {
        console.error("History save failed", err);
      }
      return next;
    });
  };

  const resetAll = () => {
    setLength(10);
    setCount(5);
    setAlphabet(defaultAlphabet);
    setPrefix("");
    setSuffix("");
    setSeparator("-");
    setGroupSize(4);
    setCaseTransform("none");
    setExcludeAmbiguous(false);
    setOutputFormat("txt");
    setAutoGenerate(false);
    setIds([]);
    setCopied(false);
    setCopiedId(null);
    setUniqueStats(null);
    setUniqueError(null);
    setStatus("Reset to defaults");
  };

  const securityStats = useMemo(() => {
    const alphabetSize = Math.max(alpha.length, 1);
    const entropyBits = safeLength * Math.log2(alphabetSize);
    const totalSpace = alphabetSize ** safeLength;
    const pairs = (safeCount * (safeCount - 1)) / 2;
    const collisionProbability = totalSpace === Infinity ? 0 : 1 - Math.exp(-pairs / totalSpace);
    const percent = Math.min(collisionProbability * 100, 100);
    const isHex = alpha === hexAlphabet;
    const warnings: string[] = [];

    if (isHex && safeLength <= 8) {
      warnings.push("Hex + length 8 is weak for tokens; OK for UI keys.");
    } else if (entropyBits < 40) {
      warnings.push("Low entropy for secrets; OK for non-sensitive UI keys.");
    } else if (entropyBits < 64) {
      warnings.push("Moderate entropy; avoid long-lived secrets or auth tokens.");
    }

    return {
      alphabetSize,
      entropyBits,
      collisionProbability,
      collisionPercent: percent,
      warnings,
    };
  }, [alpha, safeCount, safeLength]);

  const generate = () => {
    const set = new Set<string>();
    const list: string[] = [];
    let attempts = 0;
    let collisions = 0;
    const maxAttempts = uniqueOnly ? Math.max(safeCount * 25, 250) : safeCount;

    let errorMessage: string | null = null;
    while (list.length < safeCount) {
      attempts += 1;
      const id = randomNanoId(safeLength, alpha, generationMode);
      if (uniqueOnly && set.has(id)) {
        collisions += 1;
        if (attempts >= maxAttempts) break;
        continue;
      }
      set.add(id);
      list.push(id);
      if (!uniqueOnly) continue;
      if (list.length >= safeCount) break;
      if (attempts >= maxAttempts) break;
    }

    if (uniqueOnly) {
      setUniqueStats({ attempts, collisions });
    } else {
      setUniqueStats(null);
    }

    if (uniqueOnly && list.length < safeCount) {
      errorMessage = `Couldn't generate ${safeCount} unique IDs with alphabet size ${alpha.length} and length ${safeLength}; increase length/alphabet.`;
    }

    setIds(list);
    setCopied(false);
    setCopiedId(null);
    setUniqueError(errorMessage);
    if (list.length) {
      pushHistory({
        timestamp: Date.now(),
        count: list.length,
        length: safeLength,
        alphabetSize: alpha.length,
        mode: generationMode,
        sample: decorateId(list[0]),
      });
    }
    if (errorMessage) {
      setStatus(errorMessage);
    } else {
      setStatus(
        `Generated ${list.length} IDs (len ${safeLength}, ${generationMode === "nanoid" ? "NanoID compatible" : "simple"}${
          uniqueOnly ? ", unique" : ""
        })${
          !isAlphabetValid ? " (default alphabet used)" : ""
        }`
      );
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!displayIds.length) return;
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const extension = outputFormat === "json" ? "json" : outputFormat === "csv" ? "csv" : "txt";
    a.download = `nanoid-list.${extension}`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 200);
    setStatus("Downloaded");
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(displayIds));
      setStatus("Copied JSON");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(value);
      setTimeout(() => setCopiedId(null), 1200);
      setStatus("Copied ID");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const regenerateAt = (index: number) => {
    if (!ids.length) return;
    const set = new Set(ids);
    const attemptsCap = uniqueOnly ? Math.max(safeCount * 25, 250) : 25;
    let attempts = 0;
    let collisions = 0;
    let nextId = ids[index];
    while (attempts < attemptsCap) {
      attempts += 1;
      const candidate = randomNanoId(safeLength, alpha, generationMode);
      if (uniqueOnly && set.has(candidate) && candidate !== ids[index]) {
        collisions += 1;
        continue;
      }
      nextId = candidate;
      break;
    }
    if (uniqueOnly && attempts >= attemptsCap && nextId === ids[index]) {
      const errorMessage = `Couldn't regenerate a unique ID with alphabet size ${alpha.length} and length ${safeLength}; increase length/alphabet.`;
      setUniqueError(errorMessage);
      setStatus(errorMessage);
      return;
    }
    const nextIds = [...ids];
    nextIds[index] = nextId;
    setIds(nextIds);
    if (uniqueOnly) {
      setUniqueStats({
        attempts: (uniqueStats?.attempts ?? 0) + attempts,
        collisions: (uniqueStats?.collisions ?? 0) + collisions,
      });
    }
    setUniqueError(null);
    setStatus("Regenerated ID");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nextLength = Number(params.get("len"));
    const nextCount = Number(params.get("count"));
    const nextGroupSize = Number(params.get("group"));
    const nextAlphabet = params.get("alpha");
    const nextPrefix = params.get("prefix");
    const nextSuffix = params.get("suffix");
    const nextSeparator = params.get("sep");
    const nextMode = params.get("mode") as GenerationMode | null;
    const nextCase = params.get("case") as CaseTransform | null;
    const nextFormat = params.get("format") as OutputFormat | null;

    if (!Number.isNaN(nextLength) && nextLength > 0) setLength(nextLength);
    if (!Number.isNaN(nextCount) && nextCount > 0) setCount(nextCount);
    if (!Number.isNaN(nextGroupSize) && nextGroupSize >= 0) setGroupSize(nextGroupSize);
    if (nextAlphabet) setAlphabet(nextAlphabet);
    if (nextPrefix !== null) setPrefix(nextPrefix);
    if (nextSuffix !== null) setSuffix(nextSuffix);
    if (nextSeparator !== null) setSeparator(nextSeparator);
    if (nextMode === "nanoid" || nextMode === "simple") setGenerationMode(nextMode);
    if (nextCase === "none" || nextCase === "upper" || nextCase === "lower") setCaseTransform(nextCase);
    if (nextFormat === "txt" || nextFormat === "csv" || nextFormat === "json" || nextFormat === "ndjson") {
      setOutputFormat(nextFormat);
    }
    if (params.get("unique") === "1") setUniqueOnly(true);
    if (params.get("exclude") === "1") setExcludeAmbiguous(true);
    if (params.get("auto") === "1") setAutoGenerate(true);

    try {
      const stored = localStorage.getItem(historyStorageKey);
      if (stored) setHistory(JSON.parse(stored));
    } catch (err) {
      console.error("History load failed", err);
    }

    hasLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (length !== 10) params.set("len", String(length));
    if (count !== 5) params.set("count", String(count));
    if (alphabet !== defaultAlphabet) params.set("alpha", alphabet);
    if (uniqueOnly) params.set("unique", "1");
    if (generationMode !== "nanoid") params.set("mode", generationMode);
    if (prefix) params.set("prefix", prefix);
    if (suffix) params.set("suffix", suffix);
    if (separator !== "-") params.set("sep", separator);
    if (groupSize !== 4) params.set("group", String(groupSize));
    if (caseTransform !== "none") params.set("case", caseTransform);
    if (excludeAmbiguous) params.set("exclude", "1");
    if (outputFormat !== "txt") params.set("format", outputFormat);
    if (autoGenerate) params.set("auto", "1");
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", url);
  }, [
    length,
    count,
    alphabet,
    uniqueOnly,
    generationMode,
    prefix,
    suffix,
    separator,
    groupSize,
    caseTransform,
    excludeAmbiguous,
    outputFormat,
    autoGenerate,
  ]);

  useEffect(() => {
    if (!autoGenerate || !hasLoadedRef.current) return;
    const timeout = window.setTimeout(() => {
      generate();
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [autoGenerate, length, count, alphabet, uniqueOnly, generationMode, excludeAmbiguous]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "g") {
        event.preventDefault();
        generate();
      }
      if (key === "c") {
        event.preventDefault();
        handleCopy();
      }
      if (key === "r") {
        event.preventDefault();
        resetAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [generate, handleCopy, resetAll]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status}
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
              Nanoid Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">NanoID Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate short, URL-safe IDs with custom length and alphabet. Great for slugs, tokens, and refs.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Length (4–32)
            <input
              type="number"
              min={4}
              max={32}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="NanoID length"
            />
            {(length < 4 || length > 32) && (
              <p className="text-xs font-medium text-amber-600">Clamped to 4–32 when generating.</p>
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Count (1–50)
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Number of IDs to generate"
            />
            {(count < 1 || count > 50) && (
              <p className="text-xs font-medium text-amber-600">Clamped to 1–50 when generating.</p>
            )}
          </label>
          <div className="flex flex-col gap-1 text-sm text-slate-700">
            Alphabet
            <textarea
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={alphabet}
              onChange={(event) => setAlphabet(event.target.value)}
              rows={2}
              aria-label="Custom alphabet"
            />
            {alphabetIssues ? (
              <p className="text-xs font-medium text-amber-600">{alphabetIssues}</p>
            ) : (
              <p className="text-xs text-slate-500">
                Default is URL-safe; customize as needed{excludeAmbiguous ? " (ambiguous chars removed)." : "."}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span className="flex items-center gap-1 font-semibold text-slate-900">
            <Info className="h-4 w-4" /> Presets:
          </span>
          <button
            onClick={() => setAlphabet(defaultAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use URL-safe alphabet"
          >
            URL-safe
          </button>
          <button
            onClick={() => setAlphabet(hexAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use hex alphabet"
          >
            Hex
          </button>
          <button
            onClick={() => setAlphabet(lowerAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use lowercase alphabet"
          >
            Lowercase
          </button>
          <button
            onClick={() => setAlphabet(alnumAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use letters and digits alphabet"
          >
            Letters+Digits
          </button>
          <button
            onClick={() => setAlphabet(crockfordAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use Crockford Base32 alphabet"
          >
            Crockford Base32
          </button>
          <span className="mx-2 text-slate-400">|</span>
          <button
            onClick={() => setLength(10)}
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Set length 10"
          >
            Len 10
          </button>
          <button
            onClick={() => setLength(16)}
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Set length 16"
          >
            Len 16
          </button>
          <button
            onClick={() => setLength(21)}
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Set length 21"
          >
            Len 21
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Prefix
            <input
              type="text"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Prefix"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Suffix
            <input
              type="text"
              value={suffix}
              onChange={(event) => setSuffix(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Suffix"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Separator
            <input
              type="text"
              value={separator}
              onChange={(event) => setSeparator(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Separator"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Group size
            <input
              type="number"
              min={0}
              max={32}
              value={groupSize}
              onChange={(event) => setGroupSize(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Group size"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Case transform
            <select
              value={caseTransform}
              onChange={(event) => setCaseTransform(event.target.value as CaseTransform)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Case transform"
            >
              <option value="none">None</option>
              <option value="upper">Uppercase</option>
              <option value="lower">Lowercase</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={excludeAmbiguous}
              onChange={(event) => setExcludeAmbiguous(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Exclude ambiguous chars
          </label>
        </div>
        <fieldset className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <legend className="text-xs font-semibold text-slate-900">Generation mode</legend>
          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5">
            <input
              type="radio"
              name="generation-mode"
              value="nanoid"
              checked={generationMode === "nanoid"}
              onChange={() => setGenerationMode("nanoid")}
              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            NanoID compatible
          </label>
          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5">
            <input
              type="radio"
              name="generation-mode"
              value="simple"
              checked={generationMode === "simple"}
              onChange={() => setGenerationMode("simple")}
              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Simple mode
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            aria-label="Generate NanoIDs"
          >
            Generate
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset NanoID settings"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={uniqueOnly}
              onChange={(event) => setUniqueOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Unique IDs only
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(event) => setAutoGenerate(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Auto-generate on change
          </label>
          {uniqueOnly ? (
            <p className="text-xs font-medium text-amber-600">
              Uniqueness uses capped retries; small alphabets or short lengths increase collision risk.
            </p>
          ) : null}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!ids.length}
            aria-label="Copy generated IDs"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!ids.length}
            aria-label="Copy generated IDs as JSON"
          >
            <Clipboard className="h-4 w-4" />
            Copy JSON
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!ids.length}
            aria-label="Download generated IDs"
          >
            <Download className="h-4 w-4" />
            Save file
          </button>
          <span className="text-xs text-slate-500">Shortcuts: G generate · C copy · R reset</span>
        </div>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="nanoid-output-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <span id="nanoid-output-heading">Generated IDs</span>
          <label className="text-xs font-medium text-slate-300">
            Format
            <select
              value={outputFormat}
              onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
              className="ml-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              aria-label="Output format"
            >
              <option value="txt">TXT</option>
              <option value="csv">CSV</option>
              <option value="json">JSON array</option>
              <option value="ndjson">NDJSON</option>
            </select>
          </label>
        </div>
        <pre className="max-h-[220px] overflow-auto p-4 text-sm leading-relaxed text-slate-100" aria-live="polite">
          {displayIds.length ? outputText : "IDs will appear here after generation."}
        </pre>
        {displayIds.length ? (
          <div className="border-t border-slate-800 px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {displayIds.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-200"
                >
                  <span className="truncate">{value}</span>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => regenerateAt(index)}
                      className="rounded-md px-1.5 py-1 text-slate-200 hover:bg-slate-800"
                      aria-label="Regenerate ID"
                    >
                      <RefreshCcw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleCopyId(value)}
                      className="rounded-md px-1.5 py-1 text-slate-200 hover:bg-slate-800"
                      aria-label="Copy ID"
                    >
                      {copiedId === value ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-300">
          Length: {safeLength} · Count: {safeCount} · Mode: {generationMode === "nanoid" ? "NanoID compatible" : "Simple"}{" "}
          · Alphabet: {isAlphabetValid ? `${alpha.length} chars` : "default (invalid custom)"}
        </div>
      </div>

      {uniqueOnly && uniqueStats ? (
        <div className="rounded-2xl bg-amber-50 p-4 text-xs text-amber-900 ring-1 ring-amber-200">
          Attempts: {uniqueStats.attempts} · Collisions avoided: {uniqueStats.collisions}
        </div>
      ) : null}
      {uniqueError ? (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-200">
          {uniqueError}
        </div>
      ) : null}

      <section className="rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">History</h2>
          <span className="text-xs text-slate-500">Last 5 runs</span>
        </div>
        <div className="mt-3 space-y-2 text-xs text-slate-600">
          {history.length ? (
            history.map((entry) => (
              <div key={entry.timestamp} className="flex items-center justify-between gap-3">
                <div className="text-slate-900">
                  {new Date(entry.timestamp).toLocaleTimeString()} · {entry.count} ids · len {entry.length} ·{" "}
                  {entry.alphabetSize} chars
                </div>
                <div className="truncate text-slate-500">{entry.sample}</div>
              </div>
            ))
          ) : (
            <p>No history yet. Generate a set to save it here.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Security & collision math</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-400">Entropy bits</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {securityStats.entropyBits.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Length {safeLength} × log2({securityStats.alphabetSize})
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-400">Collision probability</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {securityStats.collisionPercent < 0.01
                ? "<0.01%"
                : `${securityStats.collisionPercent.toFixed(4)}%`}
            </p>
            <p className="mt-1 text-xs text-slate-500">Birthday bound for {safeCount} IDs</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {securityStats.warnings.length ? (
                securityStats.warnings.map((warning) => <p key={warning}>{warning}</p>)
              ) : (
                <p>Looks solid for most short-lived tokens and identifiers.</p>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Collision math uses a simple birthday approximation with total space = alphabetSize^length.
        </p>
      </section>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick length (4–32) and count (1–50); choose an alphabet or use presets.</li>
          <li>Add prefixes, suffixes, grouping separators, or case transforms for consistent formatting.</li>
          <li>Enable “Unique IDs only” for best-effort uniqueness (more reliable with larger alphabets and lengths).</li>
          <li>Generate, then copy in TXT/CSV/JSON/NDJSON or download the file.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. IDs are generated with Web Crypto in your browser.</p>
          <p><strong>When do collisions happen?</strong> Short lengths or tiny alphabets can collide; increase length/alphabet size or use “Unique IDs only.”</p>
          <p><strong>Why NanoID?</strong> Short, URL-safe IDs with good collision resistance for slugs, tokens, and references.</p>
        </div>
      </div>
  </main>
);
}
