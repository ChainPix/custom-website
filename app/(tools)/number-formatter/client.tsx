"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  locale: string;
  style: "decimal" | "currency" | "percent" | "unit";
  currency: string;
  currencyDisplay: "symbol" | "narrowSymbol" | "code" | "name";
  currencySign: "standard" | "accounting";
  signDisplay: "auto" | "always" | "never" | "exceptZero";
  compactDisplay: "short" | "long";
  unit: string;
  unitDisplay: "short" | "long" | "narrow";
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  useGrouping: boolean;
  notation: "standard" | "compact" | "scientific";
  roundingMode:
    | "halfExpand"
    | "halfCeil"
    | "halfFloor"
    | "halfEven"
    | "ceil"
    | "floor"
    | "expand"
    | "trunc";
};

const defaultOptions: Options = {
  locale: "en-US",
  style: "decimal",
  currency: "USD",
  currencyDisplay: "symbol",
  currencySign: "standard",
  signDisplay: "auto",
  compactDisplay: "short",
  unit: "kilometer",
  unitDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  useGrouping: true,
  notation: "standard",
  roundingMode: "halfExpand",
};

type ComparePreset = {
  name: string;
  locales: string[];
};

type SavedPreset = {
  name: string;
  options: Options;
  parseLocale: string;
  cleanInput: boolean;
  safeMode: boolean;
};

type ParseResult = {
  value: number | null;
  normalized: string;
  confidence: "High" | "Medium" | "Low" | "";
  confidenceNote: string;
  error: string;
};

const COMPARE_PRESET_STORAGE_KEY = "numberFormatterComparePresets";
const SAVED_PRESET_STORAGE_KEY = "numberFormatterSavedPresets";
const DEFAULT_COMPARE_LOCALES = ["en-US", "de-DE", "fr-FR", "ja-JP"];
const COMMON_COMPARE_LOCALES = [
  "en-US",
  "en-GB",
  "de-DE",
  "fr-FR",
  "es-ES",
  "it-IT",
  "pt-BR",
  "ja-JP",
  "zh-CN",
  "hi-IN",
  "ar-EG",
  "ru-RU",
];

const CURRENCY_CODES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
  "HKD",
  "INR",
  "KRW",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "SGD",
  "MXN",
  "BRL",
  "ZAR",
  "PLN",
  "TRY",
  "AED",
  "SAR",
  "ILS",
  "CZK",
  "HUF",
  "RUB",
  "THB",
  "IDR",
  "MYR",
  "PHP",
  "VND",
  "PKR",
  "BDT",
  "CLP",
  "COP",
  "ARS",
]);

const DEFAULT_SAVED_PRESETS: SavedPreset[] = [
  {
    name: "My invoice format",
    options: {
      ...defaultOptions,
      style: "currency",
      currency: "USD",
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    },
    parseLocale: "en-US",
    cleanInput: true,
    safeMode: false,
  },
  {
    name: "JP accounting",
    options: {
      ...defaultOptions,
      locale: "ja-JP",
      style: "currency",
      currency: "JPY",
      currencySign: "accounting",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
    parseLocale: "ja-JP",
    cleanInput: true,
    safeMode: false,
  },
  {
    name: "No grouping scientific",
    options: {
      ...defaultOptions,
      notation: "scientific",
      useGrouping: false,
    },
    parseLocale: "en-US",
    cleanInput: true,
    safeMode: false,
  },
];

const getLocaleSeparators = (locale: string) => {
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1000000.5);
    const group = parts.find((part) => part.type === "group")?.value ?? ",";
    const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
    return { group, decimal };
  } catch {
    return { group: ",", decimal: "." };
  }
};

const MAX_SAFE_INTEGER_STRING = "9007199254740991";

const isPrecisionSafe = (normalized: string) => {
  const cleaned = normalized.replace(/^[+-]/, "");
  if (!cleaned) return false;
  const [integerPartRaw, fractionalPartRaw] = cleaned.split(".");
  const integerPart = integerPartRaw.replace(/^0+/, "") || "0";
  const fractionalPart = fractionalPartRaw ?? "";
  const significant = (integerPart === "0" ? "" : integerPart) + fractionalPart.replace(/0+$/, "");

  if (significant.length > 15) {
    return false;
  }

  if (!fractionalPart) {
    if (integerPart.length > MAX_SAFE_INTEGER_STRING.length) return false;
    if (integerPart.length === MAX_SAFE_INTEGER_STRING.length && integerPart > MAX_SAFE_INTEGER_STRING) {
      return false;
    }
  }

  return true;
};

const parseLocaleNumber = (
  rawInput: string,
  locale: string,
  allowFallbackClean: boolean,
  safeMode: boolean,
): ParseResult => {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { value: null, normalized: "", confidence: "", confidenceNote: "", error: "" };
  }

  let working = trimmed;
  let isNegative = false;
  let usedSwap = false;
  let usedFallback = false;
  let collapsedSeparators = false;

  if (/^\(.*\)$/.test(working)) {
    isNegative = true;
    working = working.slice(1, -1);
  }

  working = working.replace(/[−–—]/g, "-");
  if (working.trim().startsWith("-")) {
    isNegative = true;
  }
  working = working.replace(/[-+]/g, "");

  working = working.replace(/[\p{Sc}]/gu, "");
  working = working.replace(/[\p{L}]/gu, "");
  working = working.replace(/\s+/g, "");

  const { group, decimal } = getLocaleSeparators(locale);
  const hasDot = working.includes(".");
  const hasComma = working.includes(",");
  let usedGroup = group;
  let usedDecimal = decimal;

  if (hasDot && hasComma) {
    const lastDot = working.lastIndexOf(".");
    const lastComma = working.lastIndexOf(",");
    if (decimal === "." && lastComma > lastDot) {
      usedDecimal = ",";
      usedGroup = ".";
      usedSwap = true;
    } else if (decimal === "," && lastDot > lastComma) {
      usedDecimal = ".";
      usedGroup = ",";
      usedSwap = true;
    }
  }

  let normalized = working;
  if (usedGroup) {
    normalized = normalized.split(usedGroup).join("");
  }
  if (usedDecimal && usedDecimal !== ".") {
    normalized = normalized.split(usedDecimal).join(".");
  }

  const dotCount = (normalized.match(/\./g) || []).length;
  if (dotCount > 1) {
    const lastDot = normalized.lastIndexOf(".");
    normalized =
      normalized.slice(0, lastDot).replace(/\./g, "") +
      "." +
      normalized.slice(lastDot + 1).replace(/\./g, "");
    collapsedSeparators = true;
  }

  normalized = normalized.replace(/[^0-9.]/g, "");
  if (normalized === "") {
    return { value: null, normalized: "", confidence: "", confidenceNote: "", error: "Invalid number." };
  }

  if (isNegative) normalized = `-${normalized}`;

  if (safeMode && !isPrecisionSafe(normalized)) {
    return {
      value: null,
      normalized,
      confidence: "",
      confidenceNote: "",
      error: "Safe mode: value exceeds JS precision limits.",
    };
  }

  let value = Number(normalized);
  if (Number.isNaN(value) && allowFallbackClean) {
    const fallback = trimmed.replace(/,/g, "").replace(/\s+/g, "");
    value = Number(fallback);
    if (!Number.isNaN(value)) {
      normalized = fallback;
      usedFallback = true;
    }
  }

  if (Number.isNaN(value)) {
    return {
      value: null,
      normalized: "",
      confidence: "",
      confidenceNote: "",
      error: "Unable to parse input for the selected locale.",
    };
  }

  let confidence: ParseResult["confidence"] = "High";
  let confidenceNote = "Confidence: High (matched locale separators).";
  if (usedSwap) {
    confidence = "Medium";
    confidenceNote = "Confidence: Medium (inferred decimal separator).";
  }
  if (collapsedSeparators) {
    confidence = "Low";
    confidenceNote = "Confidence: Low (multiple separators collapsed).";
  }
  if (usedFallback) {
    confidence = "Low";
    confidenceNote = "Confidence: Low (fallback cleanup used).";
  }

  return { value, normalized, confidence, confidenceNote, error: "" };
};

const buildNumberFormatOptions = (opts: Options): Intl.NumberFormatOptions => {
  const base: Intl.NumberFormatOptions = {
    style: opts.style,
    minimumFractionDigits: opts.minimumFractionDigits,
    maximumFractionDigits: opts.maximumFractionDigits,
    useGrouping: opts.useGrouping,
    notation: opts.notation,
    roundingMode: opts.roundingMode as Intl.NumberFormatOptions["roundingMode"],
    signDisplay: opts.signDisplay,
  };

  if (opts.notation === "compact") {
    base.compactDisplay = opts.compactDisplay;
  }

  if (opts.style === "currency") {
    base.currency = opts.currency;
    base.currencyDisplay = opts.currencyDisplay;
    base.currencySign = opts.currencySign;
  }

  if (opts.style === "unit") {
    base.unit = opts.unit;
    base.unitDisplay = opts.unitDisplay;
  }

  return base;
};

const isSupportedLocale = (locale: string) => {
  const trimmed = locale.trim();
  if (!trimmed) return false;
  try {
    return Intl.NumberFormat.supportedLocalesOf([trimmed]).length > 0;
  } catch {
    return false;
  }
};

const encodeSharePayload = (payload: object) => {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
};

const decodeSharePayload = (payload: string) => {
  const json = decodeURIComponent(escape(atob(payload)));
  return JSON.parse(json);
};

export default function NumberFormatterClient() {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [input, setInput] = useState("1234567.89");
  const [batchInput, setBatchInput] = useState("");
  const [batchDelimiter, setBatchDelimiter] = useState<"newline" | "comma" | "tab">("newline");
  const [batchOutputFormat, setBatchOutputFormat] = useState<"newline" | "csv" | "json">("newline");
  const [opts, setOpts] = useState<Options>(defaultOptions);
  const [copied, setCopied] = useState(false);
  const [batchCopied, setBatchCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [cleanInput, setCleanInput] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const [parseLocale, setParseLocale] = useState(defaultOptions.locale);
  const prevLocaleRef = useRef(defaultOptions.locale);
  const [compareLocales, setCompareLocales] = useState<string[]>(DEFAULT_COMPARE_LOCALES);
  const [compareLocaleInput, setCompareLocaleInput] = useState("");
  const [comparePresets, setComparePresets] = useState<ComparePreset[]>([]);
  const [comparePresetName, setComparePresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [savedPresetName, setSavedPresetName] = useState("");

  useEffect(() => {
    if (parseLocale === prevLocaleRef.current) {
      setParseLocale(opts.locale);
    }
    prevLocaleRef.current = opts.locale;
  }, [opts.locale, parseLocale]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(COMPARE_PRESET_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ComparePreset[];
      if (Array.isArray(parsed)) {
        setComparePresets(parsed);
      }
    } catch (err) {
      console.error("Compare presets load failed", err);
    }
  }, []);

  const localeError = useMemo(() => {
    if (!opts.locale.trim()) return "Locale is required.";
    if (!isSupportedLocale(opts.locale)) return "Locale not supported.";
    return "";
  }, [opts.locale]);

  const parseLocaleError = useMemo(() => {
    if (!parseLocale.trim()) return "Parse locale is required.";
    if (!isSupportedLocale(parseLocale)) return "Parse locale not supported.";
    return "";
  }, [parseLocale]);

  const currencyError = useMemo(() => {
    if (opts.style !== "currency") return "";
    const code = opts.currency.trim().toUpperCase();
    if (!code) return "Currency is required.";
    if (!CURRENCY_CODES.has(code)) return "Unknown currency code.";
    return "";
  }, [opts.currency, opts.style]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COMPARE_PRESET_STORAGE_KEY, JSON.stringify(comparePresets));
  }, [comparePresets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(SAVED_PRESET_STORAGE_KEY);
    if (!stored) {
      setSavedPresets(DEFAULT_SAVED_PRESETS);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as SavedPreset[];
      if (Array.isArray(parsed)) {
        setSavedPresets(parsed);
      }
    } catch (err) {
      console.error("Saved presets load failed", err);
      setSavedPresets(DEFAULT_SAVED_PRESETS);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SAVED_PRESET_STORAGE_KEY, JSON.stringify(savedPresets));
  }, [savedPresets]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const value = params.get("value");
    const locale = params.get("locale");
    const style = params.get("style");
    const currency = params.get("currency");
    const currencyDisplay = params.get("currencyDisplay");
    const currencySign = params.get("currencySign");
    const signDisplay = params.get("signDisplay");
    const compactDisplay = params.get("compactDisplay");
    const unit = params.get("unit");
    const unitDisplay = params.get("unitDisplay");
    const minFraction = params.get("minFraction");
    const maxFraction = params.get("maxFraction");
    const useGrouping = params.get("grouping");
    const notation = params.get("notation");
    const roundingMode = params.get("roundingMode");
    const parseLocaleParam = params.get("parseLocale");
    const cleanInputParam = params.get("cleanInput");
    const safeModeParam = params.get("safeMode");
    const minFractionValue = minFraction ? Number(minFraction) : null;
    const maxFractionValue = maxFraction ? Number(maxFraction) : null;

    if (value !== null) {
      setInput(value);
    }

    setOpts((prev) => ({
      ...prev,
      locale: locale ?? prev.locale,
      style: (style as Options["style"]) ?? prev.style,
      currency: currency ?? prev.currency,
      currencyDisplay: (currencyDisplay as Options["currencyDisplay"]) ?? prev.currencyDisplay,
      currencySign: (currencySign as Options["currencySign"]) ?? prev.currencySign,
      signDisplay: (signDisplay as Options["signDisplay"]) ?? prev.signDisplay,
      compactDisplay: (compactDisplay as Options["compactDisplay"]) ?? prev.compactDisplay,
      unit: unit ?? prev.unit,
      unitDisplay: (unitDisplay as Options["unitDisplay"]) ?? prev.unitDisplay,
      minimumFractionDigits: minFractionValue !== null && !Number.isNaN(minFractionValue)
        ? minFractionValue
        : prev.minimumFractionDigits,
      maximumFractionDigits: maxFractionValue !== null && !Number.isNaN(maxFractionValue)
        ? maxFractionValue
        : prev.maximumFractionDigits,
      useGrouping: useGrouping ? useGrouping === "true" : prev.useGrouping,
      notation: (notation as Options["notation"]) ?? prev.notation,
      roundingMode: (roundingMode as Options["roundingMode"]) ?? prev.roundingMode,
    }));

    if (parseLocaleParam) {
      setParseLocale(parseLocaleParam);
    }
    if (cleanInputParam) {
      setCleanInput(cleanInputParam === "true");
    }
    if (safeModeParam) {
      setSafeMode(safeModeParam === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const payload = params.get("compare");
    if (!payload) return;
    try {
      const decoded = decodeSharePayload(payload) as {
        input?: string;
        compareLocales?: string[];
        parseLocale?: string;
        options?: Partial<Options>;
      };
      if (typeof decoded.input === "string") {
        setInput(decoded.input);
      }
      if (Array.isArray(decoded.compareLocales)) {
        const unique = Array.from(new Set(decoded.compareLocales.map((locale) => locale.trim()).filter(Boolean)));
        setCompareLocales(unique.slice(0, 8));
      }
      if (typeof decoded.parseLocale === "string") {
        setParseLocale(decoded.parseLocale);
      }
      if (decoded.options) {
        setOpts((prev) => ({ ...prev, ...decoded.options }));
      }
      setStatus("Loaded compare view from link");
    } catch (err) {
      console.error("Compare share decode failed", err);
      setStatus("Compare link invalid");
    }
  }, []);

  const parseResult = useMemo(
    () =>
      parseLocaleError
        ? {
            value: null,
            normalized: "",
            confidence: "",
            confidenceNote: "",
            error: parseLocaleError,
          }
        : parseLocaleNumber(input, parseLocale, cleanInput, safeMode),
    [input, parseLocale, cleanInput, safeMode, parseLocaleError],
  );

  const { formatter, formatError } = useMemo(() => {
    if (localeError || currencyError) {
      return { formatter: null, formatError: localeError || currencyError };
    }
    try {
      const nextFormatter = new Intl.NumberFormat(opts.locale, buildNumberFormatOptions(opts));
      return { formatter: nextFormatter, formatError: "" };
    } catch (err) {
      console.error("Format error", err);
      return { formatter: null, formatError: "Check locale/currency code." };
    }
  }, [opts]);

  const { formatted, error, warningMsg } = useMemo(() => {
    if (!input.trim()) return { formatted: "", error: "Enter a number to format.", warningMsg: "" };
    if (parseResult.error) return { formatted: "", error: parseResult.error, warningMsg: "" };
    const value = parseResult.value;
    if (value === null || Number.isNaN(value)) return { formatted: "", error: "Invalid number.", warningMsg: "" };
    const warningNote =
      Math.abs(value) > 1e15 ? "Large number; rounding may occur in some locales." : "";
    if (opts.minimumFractionDigits > opts.maximumFractionDigits) {
      return { formatted: "", error: "Minimum fraction digits cannot exceed maximum.", warningMsg: warningNote };
    }
    if (formatError || !formatter) {
      return { formatted: "", error: formatError, warningMsg: warningNote };
    }
    const result = formatter.format(value);
    return { formatted: result, error: "", warningMsg: warningNote };
  }, [input, opts, parseResult, formatter, formatError]);

  const batchEntries = useMemo(() => {
    if (!batchInput.trim()) return [];
    let parts: string[] = [];
    if (batchDelimiter === "newline") {
      parts = batchInput.split(/\r?\n/);
    } else if (batchDelimiter === "comma") {
      parts = batchInput.split(",");
    } else {
      parts = batchInput.split("\t");
    }
    return parts.map((part) => part.trim()).filter((part) => part.length > 0);
  }, [batchInput, batchDelimiter]);

  const batchResults = useMemo(() => {
    if (!batchEntries.length) return [];
    return batchEntries.map((raw) => {
      const parsed = parseLocaleNumber(raw, parseLocale, cleanInput, safeMode);
      if (parsed.error || parsed.value === null || Number.isNaN(parsed.value)) {
        return { raw, parsed: parsed.normalized, formatted: "", error: parsed.error || "Invalid number." };
      }
      if (!formatter || formatError) {
        return { raw, parsed: parsed.normalized, formatted: "", error: formatError || "Formatter unavailable." };
      }
      return { raw, parsed: parsed.normalized, formatted: formatter.format(parsed.value), error: "" };
    });
  }, [batchEntries, parseLocale, cleanInput, formatter, formatError]);

  const batchErrorCount = batchResults.filter((result) => result.error).length;

  const escapeCsv = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, "\"\"")}"`;
    }
    return value;
  };

  const batchCsv = useMemo(() => {
    const header = ["raw", "parsed", "formatted", "error"].join(",");
    const rows = batchResults.map((row) =>
      [
        escapeCsv(row.raw),
        escapeCsv(row.parsed),
        escapeCsv(row.formatted),
        escapeCsv(row.error),
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }, [batchResults]);

  const batchOutput = useMemo(() => {
    if (!batchResults.length) return "";
    if (batchOutputFormat === "json") {
      return JSON.stringify(batchResults, null, 2);
    }
    if (batchOutputFormat === "csv") {
      return batchCsv;
    }
    return batchResults.map((row) => row.formatted).join("\n");
  }, [batchResults, batchOutputFormat, batchCsv]);

  const compareParsed = parseResult;

  const compareResults = useMemo(() => {
    if (!input.trim()) return [];
    if (compareParsed.error) {
      return compareLocales.map((locale) => ({
        locale,
        formatted: "",
        error: compareParsed.error,
      }));
    }
    const value = compareParsed.value;
    if (value === null || Number.isNaN(value)) {
      return compareLocales.map((locale) => ({ locale, formatted: "", error: "Invalid number." }));
    }
    return compareLocales.map((locale) => {
      try {
        const localFormatter = new Intl.NumberFormat(locale, buildNumberFormatOptions(opts));
        return { locale, formatted: localFormatter.format(value), error: "" };
      } catch (err) {
        console.error("Compare format error", err);
        return { locale, formatted: "", error: "Check locale/currency code." };
      }
    });
  }, [compareLocales, compareParsed, input, opts]);

  const addCompareLocale = (locale: string) => {
    const normalized = locale.trim();
    if (!normalized) return;
    setCompareLocales((prev) => {
      if (prev.includes(normalized)) return prev;
      if (prev.length >= 8) {
        setStatus("Compare view supports up to 8 locales");
        return prev;
      }
      return [...prev, normalized];
    });
  };

  const toggleCompareLocale = (locale: string) => {
    const normalized = locale.trim();
    if (!normalized) return;
    setCompareLocales((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((value) => value !== normalized);
      }
      if (prev.length >= 8) {
        setStatus("Compare view supports up to 8 locales");
        return prev;
      }
      return [...prev, normalized];
    });
  };

  const handlePinPreset = () => {
    if (!compareLocales.length) return;
    const name = comparePresetName.trim() || `Preset ${comparePresets.length + 1}`;
    const newPreset: ComparePreset = { name, locales: compareLocales };
    setComparePresets((prev) => [...prev, newPreset]);
    setComparePresetName("");
    setStatus("Pinned compare preset");
  };

  const handleRemoveComparePreset = (name: string) => {
    setComparePresets((prev) => prev.filter((preset) => preset.name !== name));
    setStatus("Removed compare preset");
  };

  const handleShareCompare = async () => {
    if (typeof window === "undefined") return;
    const payload = {
      input,
      compareLocales,
      parseLocale,
      options: opts,
    };
    const encoded = encodeSharePayload(payload);
    if (encoded.length > 12000) {
      setStatus("Share link too large");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("compare", encoded);
    try {
      await navigator.clipboard.writeText(url.toString());
      setStatus("Copied compare share link");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleShareLink = async () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("value", input);
    url.searchParams.set("locale", opts.locale);
    url.searchParams.set("style", opts.style);
    url.searchParams.set("currency", opts.currency);
    url.searchParams.set("currencyDisplay", opts.currencyDisplay);
    url.searchParams.set("currencySign", opts.currencySign);
    url.searchParams.set("signDisplay", opts.signDisplay);
    url.searchParams.set("compactDisplay", opts.compactDisplay);
    url.searchParams.set("unit", opts.unit);
    url.searchParams.set("unitDisplay", opts.unitDisplay);
    url.searchParams.set("minFraction", String(opts.minimumFractionDigits));
    url.searchParams.set("maxFraction", String(opts.maximumFractionDigits));
    url.searchParams.set("grouping", String(opts.useGrouping));
    url.searchParams.set("notation", opts.notation);
    url.searchParams.set("roundingMode", opts.roundingMode);
    url.searchParams.set("parseLocale", parseLocale);
    url.searchParams.set("cleanInput", String(cleanInput));
    url.searchParams.set("safeMode", String(safeMode));
    url.searchParams.delete("compare");
    try {
      await navigator.clipboard.writeText(url.toString());
      setStatus("Copied shareable link");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleSavePreset = () => {
    const name = savedPresetName.trim() || `Preset ${savedPresets.length + 1}`;
    const preset: SavedPreset = {
      name,
      options: opts,
      parseLocale,
      cleanInput,
      safeMode,
    };
    setSavedPresets((prev) => {
      const existingIndex = prev.findIndex((item) => item.name === name);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = preset;
        return next;
      }
      return [...prev, preset];
    });
    setSavedPresetName("");
    setStatus("Saved preset");
  };

  const handleApplyPreset = (preset: SavedPreset) => {
    setOpts(preset.options);
    setParseLocale(preset.parseLocale);
    setCleanInput(preset.cleanInput);
    setSafeMode(preset.safeMode);
    setStatus(`Applied preset: ${preset.name}`);
  };

  const handleRemovePreset = (name: string) => {
    setSavedPresets((prev) => prev.filter((preset) => preset.name !== name));
    setStatus("Removed preset");
  };

  useEffect(() => {
    setWarning(warningMsg);
  }, [warningMsg]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleBatchCopy = async () => {
    if (!batchOutput) return;
    try {
      await navigator.clipboard.writeText(batchOutput);
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 1200);
      setStatus("Batch output copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!formatted) return;
    const blob = new Blob([formatted], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "formatted-number.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const handleBatchDownload = () => {
    if (!batchOutput) return;
    const ext = batchOutputFormat === "json" ? "json" : "txt";
    const blob = new Blob([batchOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `formatted-batch.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Batch output downloaded");
  };

  const handleBatchCsvExport = () => {
    if (!batchResults.length) return;
    const blob = new Blob([batchCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "formatted.csv";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Exported formatted.csv");
  };

  const loadSampleValue = (value: string, preset?: Partial<Options>) => {
    setInput(value);
    if (preset) {
      setOpts((prev) => ({ ...prev, ...preset }));
    }
    setStatus("Loaded sample");
  };

  const applyPreset = (preset: "us" | "de" | "jp") => {
    if (preset === "us") setOpts((prev) => ({ ...prev, locale: "en-US", currency: "USD" }));
    if (preset === "de") setOpts((prev) => ({ ...prev, locale: "de-DE", currency: "EUR" }));
    if (preset === "jp") setOpts((prev) => ({ ...prev, locale: "ja-JP", currency: "JPY" }));
    setStatus("Applied locale/currency preset");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {error} {mode === "single" ? parseResult.confidenceNote : ""}
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
              Number Formatter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Number Formatter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Format numbers and currencies with locale-aware grouping and decimal control. Runs in your
          browser.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${
            mode === "single"
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5"
          }`}
          aria-pressed={mode === "single"}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition ${
            mode === "batch"
              ? "bg-slate-900 text-white ring-slate-900"
              : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5"
          }`}
          aria-pressed={mode === "batch"}
        >
          Batch
        </button>
      </div>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Number input and options">
        {mode === "single" ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Enter number e.g. 1234567.89"
              aria-label="Number input"
            />
            <button
              onClick={() => {
              setInput("1234567.89");
              setOpts(defaultOptions);
              setParseLocale(defaultOptions.locale);
              setCopied(false);
              setSafeMode(false);
              setStatus("Reset to defaults");
            }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Reset to defaults"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            <textarea
              value={batchInput}
              onChange={(event) => setBatchInput(event.target.value)}
              className="min-h-[160px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Paste numbers (one per line or CSV)"
              aria-label="Batch input"
            />
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Input delimiter
                <select
                  value={batchDelimiter}
                  onChange={(event) => setBatchDelimiter(event.target.value as typeof batchDelimiter)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="newline">Newline</option>
                  <option value="comma">Comma</option>
                  <option value="tab">Tab</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Output format
                <select
                  value={batchOutputFormat}
                  onChange={(event) => setBatchOutputFormat(event.target.value as typeof batchOutputFormat)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="newline">Newline</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </label>
              <button
                onClick={() => {
                  setBatchInput("");
                  setBatchDelimiter("newline");
                  setBatchOutputFormat("newline");
                  setOpts(defaultOptions);
                  setParseLocale(defaultOptions.locale);
                  setBatchCopied(false);
                  setSafeMode(false);
                  setStatus("Reset to defaults");
                }}
                className="mt-6 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Reset to defaults"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Locale
            <input
              type="text"
              value={opts.locale}
              onChange={(event) => setOpts((prev) => ({ ...prev, locale: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="en-US"
            />
            {localeError ? <span className="text-xs font-medium text-rose-600">{localeError}</span> : null}
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Parse locale
            <input
              type="text"
              value={parseLocale}
              onChange={(event) => setParseLocale(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Matches format locale"
            />
            {parseLocaleError ? (
              <span className="text-xs font-medium text-rose-600">{parseLocaleError}</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Style
            <select
              value={opts.style}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, style: event.target.value as Options["style"] }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="decimal">Decimal</option>
              <option value="currency">Currency</option>
              <option value="percent">Percent</option>
              <option value="unit">Unit</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Currency (when style=currency)
            <input
              type="text"
              value={opts.currency}
              onChange={(event) => setOpts((prev) => ({ ...prev, currency: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="USD"
            />
            {currencyError ? (
              <span className="text-xs font-medium text-rose-600">{currencyError}</span>
            ) : null}
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Currency display
            <select
              value={opts.currencyDisplay}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  currencyDisplay: event.target.value as Options["currencyDisplay"],
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="symbol">Symbol</option>
              <option value="narrowSymbol">Narrow symbol</option>
              <option value="code">Code</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Currency sign
            <select
              value={opts.currencySign}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  currencySign: event.target.value as Options["currencySign"],
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="standard">Standard</option>
              <option value="accounting">Accounting</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Sign display
            <select
              value={opts.signDisplay}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  signDisplay: event.target.value as Options["signDisplay"],
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="auto">Auto</option>
              <option value="always">Always</option>
              <option value="never">Never</option>
              <option value="exceptZero">Except zero</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Compact display (compact notation)
            <select
              value={opts.compactDisplay}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  compactDisplay: event.target.value as Options["compactDisplay"],
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="short">Short</option>
              <option value="long">Long</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Unit (when style=unit)
            <input
              type="text"
              value={opts.unit}
              onChange={(event) => setOpts((prev) => ({ ...prev, unit: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="kilometer"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Unit display
            <select
              value={opts.unitDisplay}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  unitDisplay: event.target.value as Options["unitDisplay"],
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="short">Short</option>
              <option value="long">Long</option>
              <option value="narrow">Narrow</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Min fraction digits
            <input
              type="number"
              min={0}
              max={10}
              value={opts.minimumFractionDigits}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  minimumFractionDigits: Number(event.target.value),
                  maximumFractionDigits: Math.max(
                    Number(event.target.value),
                    prev.maximumFractionDigits,
                  ),
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Max fraction digits
            <input
              type="number"
              min={0}
              max={10}
              value={opts.maximumFractionDigits}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  maximumFractionDigits: Number(event.target.value),
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Grouping
            <select
              value={opts.useGrouping ? "on" : "off"}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, useGrouping: event.target.value === "on" }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Notation
            <select
              value={opts.notation}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, notation: event.target.value as Options["notation"] }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
              <option value="scientific">Scientific</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Rounding mode
            <select
              value={opts.roundingMode}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, roundingMode: event.target.value as Options["roundingMode"] }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="halfExpand">Half expand</option>
              <option value="halfCeil">Half ceil</option>
              <option value="halfFloor">Half floor</option>
              <option value="halfEven">Half even</option>
              <option value="ceil">Ceil</option>
              <option value="floor">Floor</option>
              <option value="expand">Expand</option>
              <option value="trunc">Truncate</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={cleanInput}
              onChange={(e) => setCleanInput(e.target.checked)}
            />
            Fallback cleanup (trim & strip commas)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
            />
            Safe mode (no precision loss)
          </label>
          {mode === "single" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadSampleValue("1234567.89")}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Load sample 1,234,567.89"
              >
                Sample: 1,234,567.89
              </button>
              <button
                type="button"
                onClick={() => loadSampleValue("0.1234")}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Load sample 0.1234"
              >
                Sample: 0.1234
              </button>
              <button
                type="button"
                onClick={() => loadSampleValue("9876543210", { notation: "compact" })}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Load large number sample"
              >
                Sample: Large number
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Locale/Currency presets:</span>
            <button
              type="button"
              onClick={() => applyPreset("us")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Apply US locale and USD currency"
            >
              US / USD
            </button>
            <button
              type="button"
              onClick={() => applyPreset("de")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Apply German locale and Euro"
            >
              DE / EUR
            </button>
            <button
              type="button"
              onClick={() => applyPreset("jp")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Apply Japan locale and Yen"
            >
              JP / JPY
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
          <div>
            <p className="text-sm font-semibold text-slate-900">Shareable link</p>
            <p className="text-xs text-slate-600">Copy a URL with your current input + settings.</p>
          </div>
          <button
            type="button"
            onClick={handleShareLink}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            aria-label="Copy shareable link"
          >
            Copy link
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Saved presets</p>
              <p className="text-xs text-slate-600">Store your favorite formatting setups locally.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Preset name
              <input
                type="text"
                value={savedPresetName}
                onChange={(event) => setSavedPresetName(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="My invoice format"
              />
            </label>
            <button
              type="button"
              onClick={handleSavePreset}
              className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              Save preset
            </button>
          </div>
          {savedPresets.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {savedPresets.map((preset) => (
                <div
                  key={preset.name}
                  className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-slate-900"
                  >
                    {preset.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveComparePreset(preset.name)}
                    className="text-slate-500 hover:text-slate-900"
                    aria-label={`Remove preset ${preset.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-500">No presets saved yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800" role="region" aria-label="Formatted output">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">{mode === "single" ? "Formatted number" : "Batch output"}</p>
          <div className="flex items-center gap-2">
            {mode === "single" ? (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!formatted}
                  aria-label="Copy formatted number"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!formatted}
                  aria-label="Download formatted number"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleBatchCopy}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!batchOutput}
                  aria-label="Copy batch output"
                >
                  {batchCopied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {batchCopied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handleBatchDownload}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!batchOutput}
                  aria-label="Download batch output"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={handleBatchCsvExport}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                  disabled={!batchResults.length}
                  aria-label="Export formatted CSV"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>
        <div className="p-4 text-lg font-semibold text-slate-50">
          {mode === "single" ? (
            <>
              {error ? <span className="text-amber-300">{error}</span> : formatted}
              {warning ? <div className="mt-2 text-sm font-medium text-amber-300">{warning}</div> : null}
              <div className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <span>Parsed value (normalized)</span>
                  <span>{parseResult.confidenceNote || "Confidence: --"}</span>
                </div>
                <div className="mt-2 text-base font-semibold text-slate-50">
                  {parseResult.normalized || "—"}
                </div>
              </div>
            </>
          ) : (
            <>
              {batchOutput ? (
                <pre className="whitespace-pre-wrap break-words text-sm font-medium text-slate-100">
                  {batchOutput}
                </pre>
              ) : (
                <span className="text-slate-400">Paste values to see batch output.</span>
              )}
              {batchResults.length ? (
                <div className="mt-3 text-xs text-slate-300">
                  {batchResults.length} values · {batchErrorCount} errors
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Compare locales">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Compare View</h2>
            <p className="text-sm text-slate-600">
              Compare the same input across multiple locales to spot formatting differences.
            </p>
          </div>
          <button
            type="button"
            onClick={handleShareCompare}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            aria-label="Copy compare share link"
          >
            Copy share link
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Compare input (shared with Single)
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Enter number to compare"
          />
        </label>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Selected locales ({compareLocales.length}/8)</span>
            {compareLocales.map((locale) => (
              <button
                key={`selected-${locale}`}
                type="button"
                onClick={() => toggleCompareLocale(locale)}
                className="rounded-full border border-slate-200 bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:-translate-y-0.5"
                aria-label={`Remove ${locale}`}
              >
                {locale} ×
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {COMMON_COMPARE_LOCALES.map((locale) => {
              const selected = compareLocales.includes(locale);
              return (
                <button
                  key={locale}
                  type="button"
                  onClick={() => toggleCompareLocale(locale)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                    selected
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5"
                  }`}
                  aria-pressed={selected}
                >
                  {locale}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Add locale
              <input
                type="text"
                value={compareLocaleInput}
                onChange={(event) => setCompareLocaleInput(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. en-IN"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                addCompareLocale(compareLocaleInput);
                setCompareLocaleInput("");
              }}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Add locale
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-semibold text-slate-900">Pinned presets</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Preset name
              <input
                type="text"
                value={comparePresetName}
                onChange={(event) => setComparePresetName(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="My locale mix"
              />
            </label>
            <button
              type="button"
              onClick={handlePinPreset}
              className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              Pin selection
            </button>
          </div>
          {comparePresets.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {comparePresets.map((preset) => (
                <div key={preset.name} className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  <button
                    type="button"
                    onClick={() => setCompareLocales(preset.locales.slice(0, 8))}
                    className="text-slate-900"
                  >
                    {preset.name}
                  </button>
                  <span className="text-slate-400">({preset.locales.length})</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePreset(preset.name)}
                    className="text-slate-500 hover:text-slate-900"
                    aria-label={`Remove preset ${preset.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-500">Pin locale mixes you use often.</div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {compareResults.length ? (
            compareResults.map((result) => (
              <div
                key={`compare-${result.locale}`}
                className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{result.locale}</div>
                {result.error ? (
                  <div className="mt-2 text-sm font-semibold text-amber-600">{result.error}</div>
                ) : (
                  <div className="mt-2 text-base font-semibold text-slate-900">{result.formatted}</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">Enter a value to compare locales.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter or paste a number and choose a style (decimal or currency) and locale.</li>
          <li>Adjust grouping, notation, rounding, and fraction digits to fit your use case.</li>
          <li>Copy or download the formatted value for reuse.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser; no data is sent to a server.</p>
          <p><strong>Invalid locale/currency?</strong> Check that your locale (e.g., en-US) and currency code (e.g., USD) are valid ISO codes.</p>
          <p><strong>Large numbers?</strong> Very large values may round depending on locale; a warning will appear.</p>
        </div>
      </div>
    </main>
  );
}
