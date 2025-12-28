"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Check, Download, RefreshCcw, Sparkles, Star } from "lucide-react";

type CaseType =
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "title"
  | "upper"
  | "lower"
  | "sentence"
  | "capitalized"
  | "constant"
  | "dot"
  | "path"
  | "train"
  | "sentence-kebab"
  | "studly";

type ConverterOptions = {
  preserveAcronyms: boolean;
  smartNumbers: boolean;
  extraDelimiters: boolean;
  keepPunctuation: boolean;
  locale: string;
  perLine: boolean;
};

type ExportFormat = "json" | "csv" | "ts" | "env" | "yaml";

type Token = {
  type: "word" | "delimiter";
  value: string;
  isSeparator: boolean;
};

const localeLower = (value: string, locale: string) => value.toLocaleLowerCase(locale);
const localeUpper = (value: string, locale: string) => value.toLocaleUpperCase(locale);
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseBoolean = (value: string | null) => value === "1" || value === "true";
const DIFF_LIMIT = 600;

const isLetter = (char: string) => /\p{L}/u.test(char);
const isDigit = (char: string) => /[0-9]/.test(char);
const isSoftDelimiter = (char: string) => char === "." || char === "/" || char === ":";

const isSeparatorChar = (char: string, options: ConverterOptions) =>
  char === "_" || char === "-" || /\s/.test(char) || (options.extraDelimiters && isSoftDelimiter(char));

const isWordChar = (char: string, options: ConverterOptions) =>
  isLetter(char) || isDigit(char) || (!options.extraDelimiters && isSoftDelimiter(char));

const tokenize = (text: string, options: ConverterOptions): Token[] => {
  const tokens: Token[] = [];
  let current = "";
  let currentType: "letter" | "digit" | "other" | null = null;

  const flush = () => {
    if (current) {
      tokens.push({ type: "word", value: current, isSeparator: false });
      current = "";
      currentType = null;
    }
  };

  for (const char of text) {
    if (isWordChar(char, options)) {
      const nextType = isLetter(char) ? "letter" : isDigit(char) ? "digit" : "other";
      if (
        options.smartNumbers &&
        current &&
        ((currentType === "letter" && nextType === "digit") || (currentType === "digit" && nextType === "letter"))
      ) {
        flush();
      }
      current += char;
      currentType = nextType;
    } else {
      flush();
      tokens.push({ type: "delimiter", value: char, isSeparator: isSeparatorChar(char, options) });
    }
  }
  flush();
  return tokens;
};

const getLetters = (value: string) => value.match(/\p{L}+/gu)?.join("") ?? "";

const isAcronymToken = (value: string, locale: string) => {
  const letters = getLetters(value);
  if (letters.length < 2) return false;
  return letters === letters.toLocaleUpperCase(locale);
};

const capitalizeWord = (value: string, locale: string) => {
  let result = "";
  let upperNext = true;
  for (const char of value) {
    if (isLetter(char)) {
      result += upperNext ? char.toLocaleUpperCase(locale) : char.toLocaleLowerCase(locale);
      upperNext = false;
    } else {
      result += char;
    }
  }
  return result;
};

const toStudly = (value: string, locale: string) => {
  let result = "";
  let upperNext = true;
  for (const char of value) {
    if (isLetter(char)) {
      result += upperNext ? char.toLocaleUpperCase(locale) : char.toLocaleLowerCase(locale);
      upperNext = !upperNext;
    } else {
      result += char;
    }
  }
  return result;
};

const buildWordInfos = (tokens: Token[], options: ConverterOptions) =>
  tokens
    .filter((token) => token.type === "word")
    .map((token) => ({
      value: token.value,
      isAcronym: options.preserveAcronyms && isAcronymToken(token.value, options.locale),
    }));

const getJoiner = (caseType: CaseType) => {
  switch (caseType) {
    case "snake":
    case "constant":
      return "_";
    case "kebab":
    case "train":
    case "sentence-kebab":
      return "-";
    case "dot":
      return ".";
    case "path":
      return "/";
    case "title":
    case "capitalized":
    case "sentence":
      return " ";
    default:
      return "";
  }
};

const convertWords = (words: ReturnType<typeof buildWordInfos>, caseType: CaseType, options: ConverterOptions) => {
  const lower = (value: string) => localeLower(value, options.locale);
  const upper = (value: string) => localeUpper(value, options.locale);
  const lowerPreserve = (word: { value: string; isAcronym: boolean }) =>
    word.isAcronym ? upper(word.value) : lower(word.value);
  const capitalized = (word: { value: string; isAcronym: boolean }) =>
    word.isAcronym ? upper(word.value) : capitalizeWord(word.value, options.locale);

  switch (caseType) {
    case "camel":
      return words.map((word, index) => {
        if (index === 0) {
          return word.isAcronym ? upper(word.value) : lower(word.value);
        }
        return word.isAcronym ? upper(word.value) : capitalized(word);
      });
    case "pascal":
      return words.map((word) => (word.isAcronym ? upper(word.value) : capitalized(word)));
    case "studly": {
      const base = words.map((word) => (word.isAcronym ? upper(word.value) : capitalized(word))).join("");
      return [toStudly(base, options.locale)];
    }
    case "snake":
    case "kebab":
    case "dot":
    case "path":
      return words.map((word) => lowerPreserve(word));
    case "constant":
      return words.map((word) => upper(word.value));
    case "train":
      return words.map((word) => capitalized(word));
    case "sentence-kebab":
    case "sentence":
      return words.map((word, index) => {
        if (index === 0) {
          return word.isAcronym ? upper(word.value) : capitalized(word);
        }
        return word.isAcronym ? upper(word.value) : word.value;
      });
    case "title":
    case "capitalized":
      return words.map((word) => capitalized(word));
    default:
      return words.map((word) => word.value);
  }
};

const convertText = (text: string, caseType: CaseType, options: ConverterOptions) => {
  if (!text) return "";
  if (caseType === "upper") {
    return localeUpper(text, options.locale);
  }
  if (caseType === "lower") {
    return localeLower(text, options.locale);
  }
  if (caseType === "studly" && options.keepPunctuation) {
    return toStudly(text, options.locale);
  }

  const tokens = tokenize(text, options);
  const words = buildWordInfos(tokens, options);
  if (!words.length) {
    return text;
  }

  const convertedWords = convertWords(words, caseType, options);
  const joiner = getJoiner(caseType);

  if (caseType === "studly") {
    return convertedWords[0] ?? "";
  }

  if (!options.keepPunctuation) {
    return joiner ? convertedWords.join(joiner) : convertedWords.join("");
  }

  let output = "";
  let wordIndex = 0;
  for (const token of tokens) {
    if (token.type === "word") {
      output += convertedWords[wordIndex] ?? "";
      wordIndex += 1;
      continue;
    }
    if (token.isSeparator) {
      if (joiner) {
        output += joiner;
      }
    } else {
      output += token.value;
    }
  }
  return output;
};

const convertTextWithLineMode = (text: string, caseType: CaseType, options: ConverterOptions) => {
  if (!options.perLine) {
    return convertText(text, caseType, options);
  }
  return text
    .split(/\n/)
    .map((line) => convertText(line, caseType, options))
    .join("\n");
};

const diffOutput = (input: string, output: string) => {
  if (input.length + output.length > DIFF_LIMIT) {
    return [{ value: output, changed: false }];
  }
  const m = input.length;
  const n = output.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (input[i - 1] === output[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const result: Array<{ value: string; changed: boolean }> = [];
  let i = m;
  let j = n;
  while (j > 0) {
    if (i > 0 && input[i - 1] === output[j - 1]) {
      result.push({ value: output[j - 1], changed: false });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ value: output[j - 1], changed: true });
      j -= 1;
    } else {
      i -= 1;
    }
  }
  result.reverse();
  return result;
};

const buildExportText = (entries: OutputEntry[], format: ExportFormat) => {
  const asObject = Object.fromEntries(entries);
  switch (format) {
    case "json":
      return JSON.stringify(asObject, null, 2);
    case "csv": {
      const header = "case,value";
      const rows = entries.map(([key, value]) => {
        const safeValue = value.replace(/"/g, '""');
        return `"${key}","${safeValue}"`;
      });
      return [header, ...rows].join("\n");
    }
    case "ts": {
      const lines = entries.map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`);
      return `const cases = {\n${lines.join("\n")}\n} as const;`;
    }
    case "env": {
      return entries
        .map(([key, value]) => `${key.toUpperCase().replace(/-/g, "_")}=${value.replace(/\n/g, "\\n")}`)
        .join("\n");
    }
    case "yaml": {
      return entries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n");
    }
    default:
      return "";
  }
};

const LARGE_THRESHOLD = 50000;
const VIRTUALIZE_AFTER = 12;
const caseOrder: CaseType[] = [
  "camel",
  "pascal",
  "studly",
  "snake",
  "constant",
  "kebab",
  "train",
  "dot",
  "path",
  "title",
  "sentence",
  "sentence-kebab",
  "capitalized",
  "upper",
  "lower",
];

const defaultPinnedCases: CaseType[] = ["camel", "snake", "constant"];

const caseLabels: Record<CaseType, string> = {
  camel: "camelCase",
  pascal: "PascalCase",
  studly: "StudlyCaps",
  snake: "snake_case",
  constant: "CONSTANT_CASE",
  kebab: "kebab-case",
  train: "Train-Case",
  dot: "dot.case",
  path: "path/case",
  title: "Title Case",
  sentence: "Sentence case",
  "sentence-kebab": "Sentence-case",
  capitalized: "Capitalized Words",
  upper: "UPPERCASE",
  lower: "lowercase",
};

type OutputEntry = readonly [CaseType, string];

export default function TextCaseClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CaseType>("camel");
  const [copiedKey, setCopiedKey] = useState<CaseType | null>(null);
  const [trimInput, setTrimInput] = useState(true);
  const [preserveAcronyms, setPreserveAcronyms] = useState(true);
  const [smartNumbers, setSmartNumbers] = useState(true);
  const [extraDelimiters, setExtraDelimiters] = useState(false);
  const [keepPunctuation, setKeepPunctuation] = useState(false);
  const [perLine, setPerLine] = useState(false);
  const [locale, setLocale] = useState("en");
  const [status, setStatus] = useState("Ready");
  const [showOnlySelected, setShowOnlySelected] = useState(true);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [pinnedCases, setPinnedCases] = useState<CaseType[]>(defaultPinnedCases);
  const [findQuery, setFindQuery] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [replaceCase, setReplaceCase] = useState<CaseType>("snake");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [history, setHistory] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [outputs, setOutputs] = useState<OutputEntry[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingWorker = useRef(new Map<number, (outputs: OutputEntry[]) => void>());
  const workerRequestId = useRef(0);
  const deferredInput = useDeferredValue(input);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastCommittedRef = useRef(input);
  const skipHistoryRef = useRef(false);
  const hasSyncedFromUrl = useRef(false);

  const pushHistory = useCallback((value: string) => {
    setHistory((prev) => {
      const next = [...prev, value];
      if (next.length > 10) next.shift();
      return next;
    });
  }, []);

  const options = useMemo<ConverterOptions>(
    () => ({
      preserveAcronyms,
      smartNumbers,
      extraDelimiters,
      keepPunctuation,
      locale,
      perLine,
    }),
    [preserveAcronyms, smartNumbers, extraDelimiters, keepPunctuation, locale, perLine],
  );
  const normalizedInput = useMemo(
    () => (trimInput ? deferredInput.trim() : deferredInput),
    [deferredInput, trimInput],
  );
  const visibleKeys = useMemo(() => {
    if (showOnlySelected) return [selected];
    if (showPinnedOnly) return pinnedCases.length ? pinnedCases : caseOrder;
    return caseOrder;
  }, [pinnedCases, selected, showOnlySelected, showPinnedOnly]);
  const chars = input.length;
  const lines = useMemo(() => (input ? input.split("\n").length : 0), [input]);
  const warning = useMemo(() => {
    if (!input || chars < LARGE_THRESHOLD) return "";
    return `Large input detected (${chars.toLocaleString()} chars, ${lines.toLocaleString()} lines). Conversions may take a moment.`;
  }, [chars, input, lines]);
  const isLargeInput = normalizedInput.length >= LARGE_THRESHOLD;
  const tokenCount = useMemo(
    () => tokenize(input, options).filter((token) => token.type === "word").length,
    [input, options],
  );
  const selectedOutput = useMemo(() => outputs.find(([key]) => key === selected)?.[1] ?? "", [outputs, selected]);
  const diffSegments = useMemo(
    () => (selectedOutput ? diffOutput(normalizedInput, selectedOutput) : []),
    [normalizedInput, selectedOutput],
  );
  const lengthWarning = useMemo(() => {
    if (!selectedOutput) return "";
    if (selectedOutput.length >= 64) {
      return "Selected output is 64+ chars. Consider shortening for identifiers.";
    }
    return "";
  }, [selectedOutput]);

  useEffect(() => {
    if (hasSyncedFromUrl.current) return;
    const params = new URLSearchParams(searchParams.toString());
    const caseParam = params.get("case");
    if (caseParam && caseOrder.includes(caseParam as CaseType)) {
      setSelected(caseParam as CaseType);
    }
    if (params.has("trim")) setTrimInput(parseBoolean(params.get("trim")));
    if (params.has("line")) setPerLine(parseBoolean(params.get("line")));
    if (params.has("acronyms")) setPreserveAcronyms(parseBoolean(params.get("acronyms")));
    if (params.has("numbers")) setSmartNumbers(parseBoolean(params.get("numbers")));
    if (params.has("delims")) setExtraDelimiters(parseBoolean(params.get("delims")));
    if (params.has("punct")) setKeepPunctuation(parseBoolean(params.get("punct")));
    if (params.has("only")) setShowOnlySelected(parseBoolean(params.get("only")));
    if (params.has("pinned")) setShowPinnedOnly(parseBoolean(params.get("pinned")));
    const localeParam = params.get("locale");
    if (localeParam) setLocale(localeParam);
    const pinsParam = params.get("pins");
    if (pinsParam) {
      const pins = pinsParam
        .split(",")
        .map((item) => item.trim())
        .filter((item): item is CaseType => caseOrder.includes(item as CaseType));
      if (pins.length) setPinnedCases(pins);
    }
    hasSyncedFromUrl.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!hasSyncedFromUrl.current) return;
    const params = new URLSearchParams();
    params.set("case", selected);
    params.set("trim", trimInput ? "1" : "0");
    if (perLine) params.set("line", "1");
    if (!preserveAcronyms) params.set("acronyms", "0");
    if (!smartNumbers) params.set("numbers", "0");
    if (extraDelimiters) params.set("delims", "1");
    if (keepPunctuation) params.set("punct", "1");
    if (!showOnlySelected) params.set("only", "0");
    if (showPinnedOnly) params.set("pinned", "1");
    if (locale !== "en") params.set("locale", locale);
    if (pinnedCases.join(",") !== defaultPinnedCases.join(",")) {
      params.set("pins", pinnedCases.join(","));
    }
    const query = params.toString();
    router.replace(query ? `?${query}` : "/text-case");
  }, [
    extraDelimiters,
    keepPunctuation,
    locale,
    perLine,
    pinnedCases,
    preserveAcronyms,
    router,
    selected,
    showOnlySelected,
    showPinnedOnly,
    smartNumbers,
    trimInput,
  ]);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./text-case.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event) => {
      const { id, outputs: workerOutputs } = event.data as { id: number; outputs: OutputEntry[] };
      const resolver = pendingWorker.current.get(id);
      if (resolver) {
        resolver(workerOutputs);
        pendingWorker.current.delete(id);
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingWorker.current.clear();
    };
  }, []);

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      if (input !== lastCommittedRef.current) {
        setHistory((prev) => {
          const next = [...prev, lastCommittedRef.current];
          if (next.length > 10) next.shift();
          return next;
        });
        lastCommittedRef.current = input;
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const buildOutputs = useCallback((text: string, keys: CaseType[], activeOptions: ConverterOptions) => {
    if (!text) {
      return keys.map((key) => [key, ""] as const);
    }
    return keys.map((key) => [key, convertTextWithLineMode(text, key, activeOptions)] as const);
  }, []);

  const computeWithWorker = useCallback(
    (text: string, keys: CaseType[], activeOptions: ConverterOptions) =>
      new Promise<OutputEntry[]>((resolve) => {
        if (!workerRef.current) {
          resolve(buildOutputs(text, keys, activeOptions));
          return;
        }
        const id = (workerRequestId.current += 1);
        pendingWorker.current.set(id, resolve);
        workerRef.current.postMessage({ id, text, keys, options: activeOptions });
      }),
    [buildOutputs],
  );

  const computeWithIdle = useCallback(
    (text: string, keys: CaseType[], activeOptions: ConverterOptions) =>
      new Promise<OutputEntry[]>((resolve) => {
        if (!text) {
          resolve(keys.map((key) => [key, ""] as const));
          return;
        }
        if (typeof requestIdleCallback !== "function") {
          resolve(buildOutputs(text, keys, activeOptions));
          return;
        }
        const results: OutputEntry[] = [];
        let index = 0;
        const handle = (deadline: IdleDeadline) => {
          while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && index < keys.length) {
            const key = keys[index];
            results.push([key, convertTextWithLineMode(text, key, activeOptions)]);
            index += 1;
          }
          if (index < keys.length) {
            requestIdleCallback(handle, { timeout: 1200 });
          } else {
            resolve(results);
          }
        };
        requestIdleCallback(handle, { timeout: 1200 });
      }),
    [buildOutputs],
  );

  const computeOutputs = useCallback(
    async (text: string, keys: CaseType[], activeOptions: ConverterOptions) => {
      if (!text) {
        return keys.map((key) => [key, ""] as const);
      }
      if (text.length >= LARGE_THRESHOLD && workerRef.current) {
        return computeWithWorker(text, keys, activeOptions);
      }
      if (text.length >= LARGE_THRESHOLD) {
        return computeWithIdle(text, keys, activeOptions);
      }
      return buildOutputs(text, keys, activeOptions);
    },
    [buildOutputs, computeWithIdle, computeWithWorker],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!normalizedInput) {
        setOutputs(buildOutputs("", visibleKeys, options));
        setIsComputing(false);
        return;
      }
      if (isLargeInput) {
        setIsComputing(true);
        const result = await (workerRef.current
          ? computeWithWorker(normalizedInput, visibleKeys, options)
          : computeWithIdle(normalizedInput, visibleKeys, options));
        if (cancelled) return;
        setOutputs(result);
        setIsComputing(false);
        return;
      }
      setOutputs(buildOutputs(normalizedInput, visibleKeys, options));
      setIsComputing(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    buildOutputs,
    computeWithIdle,
    computeWithWorker,
    isLargeInput,
    normalizedInput,
    options,
    visibleKeys,
  ]);

  const handleCopy = useCallback(async (text: string, key: CaseType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
      setStatus("Copied");
      setToast("Copied to clipboard");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  }, []);

  const handleCopySelected = useCallback(async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, [selected], options);
    const entry = entries[0];
    if (!entry) return;
    handleCopy(entry[1], selected);
  }, [computeOutputs, handleCopy, input, options, selected, trimInput]);

  const handleCopyAll = useCallback(async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, caseOrder, options);
    const outputText = entries.map(([key, value]) => `${key}: ${value}`).join("\n");
    try {
      await navigator.clipboard.writeText(outputText);
      setStatus("Copied all");
      setToast("Copied all outputs");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  }, [computeOutputs, input, options, trimInput]);

  const handleDownload = useCallback(async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, caseOrder, options);
    const outputText = entries.map(([key, value]) => `${key}: ${value}`).join("\n");
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "text-cases.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  }, [computeOutputs, input, options, trimInput]);

  const handleExportCopy = useCallback(async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, caseOrder, options);
    const outputText = buildExportText(entries, exportFormat);
    try {
      await navigator.clipboard.writeText(outputText);
      setStatus(`Copied ${exportFormat.toUpperCase()}`);
      setToast(`Copied ${exportFormat.toUpperCase()}`);
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  }, [computeOutputs, exportFormat, input, options, trimInput]);

  const handleExportDownload = useCallback(async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, caseOrder, options);
    const outputText = buildExportText(entries, exportFormat);
    const extensionMap: Record<ExportFormat, string> = {
      json: "json",
      csv: "csv",
      ts: "ts",
      env: "env",
      yaml: "yaml",
    };
    const typeMap: Record<ExportFormat, string> = {
      json: "application/json",
      csv: "text/csv",
      ts: "text/plain",
      env: "text/plain",
      yaml: "text/yaml",
    };
    const blob = new Blob([outputText], { type: `${typeMap[exportFormat]}; charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `text-cases.${extensionMap[exportFormat]}`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${exportFormat.toUpperCase()}`);
  }, [computeOutputs, exportFormat, input, options, trimInput]);

  const handleSwapInput = useCallback(async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, [selected], options);
    const entry = entries[0];
    if (!entry) return;
    const nextValue = entry[1];
    pushHistory(input);
    skipHistoryRef.current = true;
    lastCommittedRef.current = nextValue;
    setInput(nextValue);
    setStatus("Swapped input");
  }, [computeOutputs, input, options, pushHistory, selected, trimInput]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (!prev.length) return prev;
      const nextValue = prev[prev.length - 1];
      skipHistoryRef.current = true;
      lastCommittedRef.current = nextValue;
      setInput(nextValue);
      setStatus("Undo");
      return prev.slice(0, -1);
    });
  }, []);

  const handleTogglePin = useCallback((key: CaseType) => {
    setPinnedCases((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      if (prev.length >= 4) {
        setStatus("Pin limit reached");
        return prev;
      }
      return [...prev, key];
    });
  }, []);

  const handleApplyFindReplace = useCallback(() => {
    if (!findQuery.trim()) return;
    let regex: RegExp;
    try {
      regex = useRegex ? new RegExp(findQuery, "g") : new RegExp(escapeRegExp(findQuery), "g");
    } catch (err) {
      console.error("Invalid pattern", err);
      setStatus("Invalid pattern");
      return;
    }
    const nextText = input.replace(regex, (match) =>
      convertText(match, replaceCase, { ...options, perLine: false }),
    );
    pushHistory(input);
    skipHistoryRef.current = true;
    lastCommittedRef.current = nextText;
    setInput(nextText);
    setStatus("Replaced matches");
  }, [findQuery, input, options, pushHistory, replaceCase, useRegex]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      if (!isMeta) return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleCopySelected();
        return;
      }
      if (event.key.toLowerCase() === "c" && event.shiftKey) {
        event.preventDefault();
        handleCopyAll();
        return;
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleCopyAll, handleCopySelected]);

  return (
    <main className="space-y-8">
      {toast ? (
        <div className="fixed right-6 top-6 z-50 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_40px_-20px_rgba(15,23,42,0.55)]">
          {toast}
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite">
        {status} {warning}
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
              Text Case
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Text Case Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text to camelCase, PascalCase, snake_case, kebab-case, Title Case, upper, or lower
          instantly.
        </p>
        <p className="text-sm text-slate-600">Runs fully in your browser; text is never uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="case-select">
            <span className="font-semibold text-slate-900">Case</span>
            <select
              id="case-select"
              value={selected}
              onChange={(event) => setSelected(event.target.value as CaseType)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {caseOrder.map((caseKey) => (
                <option key={caseKey} value={caseKey}>
                  {caseLabels[caseKey]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={trimInput}
              onChange={(e) => setTrimInput(e.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Trim whitespace
          </label>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Privacy: local only
          </span>
          <button
            onClick={() => setInput("")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={handleUndo}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!history.length}
          >
            Undo
          </button>
          <button
            onClick={() => {
              setInput("convert THIS_sample-text to Multiple Cases easily");
              setStatus("Sample loaded");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Load sample
          </button>
          <button
            onClick={handleSwapInput}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!input.trim()}
          >
            Swap with selected
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preserveAcronyms}
              onChange={(event) => setPreserveAcronyms(event.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Preserve acronyms
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smartNumbers}
              onChange={(event) => setSmartNumbers(event.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Smart numbers
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={extraDelimiters}
              onChange={(event) => setExtraDelimiters(event.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Treat . / : as separators
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={keepPunctuation}
              onChange={(event) => setKeepPunctuation(event.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Keep punctuation
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={perLine}
              onChange={(event) => setPerLine(event.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Per-line mode
          </label>
          <label className="flex items-center gap-2">
            <span className="font-medium text-slate-900">Locale</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="en">English</option>
              <option value="tr">Turkish</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </label>
        </div>
        <textarea
          ref={inputRef}
          className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste text to convert"
          aria-label="Text input"
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span>
            <span className="font-semibold text-slate-900">{chars.toLocaleString()}</span> chars
          </span>
          <span>
            <span className="font-semibold text-slate-900">{lines.toLocaleString()}</span> lines
          </span>
          <span>
            <span className="font-semibold text-slate-900">{tokenCount.toLocaleString()}</span> tokens
          </span>
          {selectedOutput ? (
            <span>
              <span className="font-semibold text-slate-900">{selectedOutput.length.toLocaleString()}</span> selected
              length
            </span>
          ) : null}
          {lengthWarning ? <span className="font-medium text-amber-600">{lengthWarning}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-inner">
          <span className="font-medium text-slate-900">Find & replace</span>
          <input
            value={findQuery}
            onChange={(event) => setFindQuery(event.target.value)}
            className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Find text or regex"
            aria-label="Find text"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(event) => setUseRegex(event.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Regex
          </label>
          <select
            value={replaceCase}
            onChange={(event) => setReplaceCase(event.target.value as CaseType)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Replacement case"
          >
            {caseOrder.map((caseKey) => (
              <option key={caseKey} value={caseKey}>
                {caseLabels[caseKey]}
              </option>
            ))}
          </select>
          <button
            onClick={handleApplyFindReplace}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!input.trim() || !findQuery.trim()}
          >
            Apply
          </button>
        </div>
        {warning ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {warning}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: use this for variable names, headings, and quick case formatting.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {outputs.map(([key, value]) => {
          const isSelected = key === selected;
          const cardStyle =
            !showOnlySelected && outputs.length > VIRTUALIZE_AFTER
              ? { contentVisibility: "auto", containIntrinsicSize: "260px" }
              : undefined;
          return (
            <div
              key={key}
              style={cardStyle}
              className={`rounded-2xl ${
                isSelected ? "bg-slate-900 text-white ring-slate-800" : "bg-white text-slate-900 ring-slate-200"
              } shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1`}
            >
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${
                  isSelected ? "border-slate-800/50" : "border-slate-200"
                }`}
              >
                <p className="text-sm font-semibold">{caseLabels[key]}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePin(key)}
                    className={`flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium transition ${
                      pinnedCases.includes(key)
                        ? "bg-amber-100 text-amber-700"
                        : isSelected
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5"
                    }`}
                  >
                    <Star className="h-3.5 w-3.5" />
                    {pinnedCases.includes(key) ? "Pinned" : "Pin"}
                  </button>
                  <button
                    onClick={() => handleCopy(value, key)}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? "bg-white/10 hover:bg-white/20"
                        : "bg-slate-900 text-white hover:-translate-y-0.5"
                    }`}
                  >
                    {copiedKey === key ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    {copiedKey === key ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <pre
                className={`min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed ${
                  isSelected ? "text-slate-100" : "text-slate-900"
                }`}
                role="region"
                aria-label={`${caseLabels[key]} output`}
                tabIndex={0}
              >
                {value ? (
                  isSelected ? (
                    diffSegments.map((segment, index) => (
                      <span
                        key={`${key}-${index}`}
                        className={
                          segment.changed ? "rounded bg-amber-300/20 px-0.5 text-amber-100" : undefined
                        }
                      >
                        {segment.value}
                      </span>
                    ))
                  ) : (
                    value
                  )
                ) : isComputing ? (
                  "Converting..."
                ) : (
                  "Converted text will appear here."
                )}
              </pre>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <button
          onClick={handleCopySelected}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          Copy selected
        </button>
        <button
          onClick={handleCopyAll}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          Copy all
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          <Download className="h-4 w-4" />
          Download outputs
        </button>
        <div className="flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <span className="text-slate-600">Export</span>
          <select
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="ts">TypeScript object</option>
            <option value="env">Env vars</option>
            <option value="yaml">YAML</option>
          </select>
          <button
            onClick={handleExportCopy}
            className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!input.trim()}
          >
            Copy
          </button>
          <button
            onClick={handleExportDownload}
            className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!input.trim()}
          >
            Download
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={(e) => setShowOnlySelected(e.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          Show only selected case
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showPinnedOnly}
            onChange={(e) => setShowPinnedOnly(e.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          Show pinned only
        </label>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste text or load the sample, choose your target case, and enable trim if needed.</li>
          <li>Copy an individual case, copy all outputs, or download all cases as a text file.</li>
          <li>Use “Show only selected case” to focus on a single output.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is this private?</summary>
            <p className="mt-2 text-slate-700">Yes. Conversion runs locally in your browser; no data is sent to servers.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Which cases are supported?</summary>
            <p className="mt-2 text-slate-700">camel, pascal, snake, kebab, title, upper, lower, sentence, and capitalized words.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I download results?</summary>
            <p className="mt-2 text-slate-700">Yes. Use the “Download outputs” button to save all cases to a text file.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
