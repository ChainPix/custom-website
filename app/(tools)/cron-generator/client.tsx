"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Check, Download, RefreshCcw } from "lucide-react";

type CronDialect = "unix" | "quartz" | "aws" | "k8s";

type Picker = {
  seconds: string;
  minutes: string;
  hours: string;
  dom: string;
  mon: string;
  dow: string;
  year: string;
};

type FieldKey = keyof Picker;

type DialectConfig = {
  label: string;
  description: string;
  supportsSeconds: boolean;
  supportsYear: boolean;
  requireYear: boolean;
  allowQuestion: boolean;
  allowSpecial: boolean;
  requireQuestion: boolean;
  domDowMode: "or" | "and";
  dowMin: number;
  dowMax: number;
};

type TimeZoneChoice = "local" | "UTC" | string;

type SavedEntry = {
  id: string;
  label: string;
  cron: string;
  dialect: CronDialect;
  timeZone: TimeZoneChoice;
  includeYear: boolean;
  previewCount: number;
  windowDays: number;
  autoWindow: boolean;
  picker: Picker;
  createdAt: number;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WINDOW_PRESETS = [1, 7, 30, 90, 365];
const RECENT_STORAGE_KEY = "cron-generator-recents";
const FAVORITE_STORAGE_KEY = "cron-generator-favorites";

const DIALECTS: Record<CronDialect, DialectConfig> = {
  unix: {
    label: "Unix 5-field",
    description: "Minutes Hours Day-of-month Month Day-of-week. DOM/DOW use OR semantics.",
    supportsSeconds: false,
    supportsYear: false,
    requireYear: false,
    allowQuestion: false,
    allowSpecial: false,
    requireQuestion: false,
    domDowMode: "or",
    dowMin: 0,
    dowMax: 6,
  },
  quartz: {
    label: "Quartz (6/7-field, ?, L, W, #)",
    description: "Seconds + minutes + hours + dom + month + dow, with optional year. One of DOM/DOW must be ?.",
    supportsSeconds: true,
    supportsYear: true,
    requireYear: false,
    allowQuestion: true,
    allowSpecial: true,
    requireQuestion: true,
    domDowMode: "and",
    dowMin: 1,
    dowMax: 7,
  },
  aws: {
    label: "AWS EventBridge",
    description: "Minutes + hours + dom + month + dow + year. One of DOM/DOW must be ?.",
    supportsSeconds: false,
    supportsYear: true,
    requireYear: true,
    allowQuestion: true,
    allowSpecial: true,
    requireQuestion: true,
    domDowMode: "and",
    dowMin: 1,
    dowMax: 7,
  },
  k8s: {
    label: "Kubernetes CronJob",
    description: "Standard 5-field cron. DOM/DOW use OR semantics.",
    supportsSeconds: false,
    supportsYear: false,
    requireYear: false,
    allowQuestion: false,
    allowSpecial: false,
    requireQuestion: false,
    domDowMode: "or",
    dowMin: 0,
    dowMax: 6,
  },
};

const FIELD_LABELS: Record<FieldKey, string> = {
  seconds: "Seconds",
  minutes: "Minutes",
  hours: "Hours",
  dom: "Day of month",
  mon: "Month",
  dow: "Day of week",
  year: "Year",
};

const defaultPicker: Picker = {
  seconds: "0",
  minutes: "0",
  hours: "0",
  dom: "*",
  mon: "*",
  dow: "*",
  year: "*",
};

const getFieldOrder = (dialect: CronDialect, includeYear: boolean): FieldKey[] => {
  const config = DIALECTS[dialect];
  const fields: FieldKey[] = [];
  if (config.supportsSeconds) fields.push("seconds");
  fields.push("minutes", "hours", "dom", "mon", "dow");
  if (config.supportsYear && (config.requireYear || includeYear)) fields.push("year");
  return fields;
};

const getDefaults = (dialect: CronDialect, includeYear: boolean): Picker => {
  const config = DIALECTS[dialect];
  const defaults = { ...defaultPicker };
  if (config.requireQuestion) {
    defaults.dom = "?";
    defaults.dow = "*";
  }
  if (config.supportsYear && (config.requireYear || includeYear)) {
    defaults.year = "*";
  }
  return defaults;
};

const splitParts = (expr: string) => expr.split(",").map((part) => part.trim()).filter(Boolean);

const parseSimpleList = (expr: string, min: number, max: number) => {
  const values = new Set<number>();
  const parts = splitParts(expr);
  if (!parts.length) return { values: [], valid: false };
  for (const part of parts) {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isFinite(step) || step < 1) return { values: [], valid: false };
    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-").map(Number);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return { values: [], valid: false };
      start = a;
      end = b;
    } else {
      const num = Number(rangePart);
      if (!Number.isFinite(num)) return { values: [], valid: false };
      start = num;
      end = stepPart ? max : num;
    }
    if (start < min || end > max) return { values: [], valid: false };
    for (let i = start; i <= end; i += step) values.add(i);
  }
  return { values: [...values].sort((a, b) => a - b), valid: true };
};

const getDowForDate = (year: number, monthIndex: number, day: number, dialect: CronDialect) => {
  const base = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  if (dialect === "unix" || dialect === "k8s") return base;
  return base + 1;
};

const getWeekdayName = (value: number, dialect: CronDialect) => {
  const index = dialect === "unix" || dialect === "k8s" ? value : value - 1;
  return WEEKDAYS[index] ?? `Day ${value}`;
};

const getLastDayOfMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();

const getLastWeekdayOfMonth = (year: number, monthIndex: number, targetDow: number, dialect: CronDialect) => {
  const lastDate = new Date(year, monthIndex + 1, 0);
  for (let day = lastDate.getDate(); day >= 1; day -= 1) {
    if (getDowForDate(year, monthIndex, day, dialect) === targetDow) return day;
  }
  return null;
};

const getNthWeekdayOfMonth = (year: number, monthIndex: number, targetDow: number, nth: number, dialect: CronDialect) => {
  const firstDow = getDowForDate(year, monthIndex, 1, dialect);
  const offset = (targetDow - firstDow + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  const lastDay = getLastDayOfMonth(year, monthIndex);
  return day <= lastDay ? day : null;
};

const getNearestWeekday = (year: number, monthIndex: number, targetDay: number) => {
  const lastDay = getLastDayOfMonth(year, monthIndex);
  const date = new Date(year, monthIndex, targetDay);
  const dow = date.getDay();
  if (dow >= 1 && dow <= 5) return targetDay;
  if (dow === 6) {
    if (targetDay === 1) return 3;
    return targetDay - 1;
  }
  if (targetDay === lastDay) return targetDay - 2;
  return targetDay + 1;
};

const matchDom = (expr: string, year: number, monthIndex: number, day: number, dialect: CronDialect) => {
  if (expr === "?") return true;
  const parts = splitParts(expr);
  const lastDay = getLastDayOfMonth(year, monthIndex);
  for (const part of parts) {
    if (part === "L") {
      if (day === lastDay) return true;
      continue;
    }
    if (/^(?:[1-9]|[12][0-9]|3[01])W$/.test(part)) {
      const target = Number(part.replace("W", ""));
      const nearest = getNearestWeekday(year, monthIndex, target);
      if (day === nearest) return true;
      continue;
    }
    const parsed = parseSimpleList(part, 1, 31);
    if (parsed.valid && parsed.values.includes(day)) return true;
  }
  return false;
};

const matchDow = (expr: string, year: number, monthIndex: number, day: number, dialect: CronDialect) => {
  if (expr === "?") return true;
  const parts = splitParts(expr);
  const dow = getDowForDate(year, monthIndex, day, dialect);
  for (const part of parts) {
    const lastMatch = part.match(/^([1-7])L$/);
    if (lastMatch) {
      const targetDow = Number(lastMatch[1]);
      const lastDay = getLastWeekdayOfMonth(year, monthIndex, targetDow, dialect);
      if (lastDay && day === lastDay) return true;
      continue;
    }
    const nthMatch = part.match(/^([1-7])#([1-5])$/);
    if (nthMatch) {
      const targetDow = Number(nthMatch[1]);
      const nth = Number(nthMatch[2]);
      const nthDay = getNthWeekdayOfMonth(year, monthIndex, targetDow, nth, dialect);
      if (nthDay && day === nthDay) return true;
      continue;
    }
    const parsed = parseSimpleList(part, DIALECTS[dialect].dowMin, DIALECTS[dialect].dowMax);
    if (parsed.valid && parsed.values.includes(dow)) return true;
  }
  return false;
};

const ordinal = (value: number) => {
  const suffix = value % 10 === 1 && value % 100 !== 11 ? "st" : value % 10 === 2 && value % 100 !== 12 ? "nd" : value % 10 === 3 && value % 100 !== 13 ? "rd" : "th";
  return `${value}${suffix}`;
};

const describeField = (
  field: string,
  label: string,
  dialect: CronDialect,
  config: DialectConfig,
  isDow: boolean,
  isDom: boolean,
) => {
  const value = field.trim();
  if (config.allowQuestion && value === "?") return `${label}: no specific value`;
  if (isDom && config.allowSpecial) {
    if (value === "L") return `${label}: last day of month`;
    const weekdayMatch = value.match(/^(?:[1-9]|[12][0-9]|3[01])W$/);
    if (weekdayMatch) return `${label}: nearest weekday to ${value.replace("W", "")}`;
  }
  if (isDow && config.allowSpecial) {
    const lastMatch = value.match(/^([1-7])L$/);
    if (lastMatch) return `${label}: last ${getWeekdayName(Number(lastMatch[1]), dialect)}`;
    const nthMatch = value.match(/^([1-7])#([1-5])$/);
    if (nthMatch) {
      return `${label}: ${ordinal(Number(nthMatch[2]))} ${getWeekdayName(Number(nthMatch[1]), dialect)}`;
    }
  }
  if (value === "*") return `${label}: any`;
  if (value.includes("/")) {
    const [start, step] = value.split("/");
    return `${label}: every ${step} starting at ${start}`;
  }
  if (value.includes(",")) return `${label}: ${value}`;
  return `${label}: ${value}`;
};

const parseFieldDetailed = (expr: string, min: number, max: number, label: string) => {
  const errors: string[] = [];
  const values = new Set<number>();
  const parts = splitParts(expr);
  if (!parts.length) {
    errors.push(`${label}: value required.`);
    return { set: values, valid: false, errors };
  }
  for (const part of parts) {
    const [rangePart, stepPart] = part.split("/");
    if (stepPart !== undefined) {
      const step = Number(stepPart);
      if (!Number.isFinite(step) || step <= 0) {
        errors.push(`${label}: step must be > 0.`);
        continue;
      }
    }
    const step = stepPart ? Number(stepPart) : 1;
    const addValues = (start: number, end: number) => {
      for (let i = start; i <= end; i += step) values.add(i);
    };
    if (rangePart === "*") {
      addValues(min, max);
      continue;
    }
    if (rangePart.includes("-")) {
      const [startRaw, endRaw] = rangePart.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        errors.push(`${label}: expected number range, got ${rangePart}.`);
        continue;
      }
      if (start > end) {
        errors.push(`${label}: range start must be <= end.`);
        continue;
      }
      if (start < min || end > max) {
        errors.push(`${label}: ${min}–${max} only, got ${start}-${end}.`);
        continue;
      }
      addValues(start, end);
      continue;
    }
    const value = Number(rangePart);
    if (!Number.isFinite(value)) {
      errors.push(`${label}: expected number or range, got ${rangePart}.`);
      continue;
    }
    if (value < min || value > max) {
      errors.push(`${label}: ${min}–${max} only, got ${value}.`);
      continue;
    }
    addValues(value, stepPart ? max : value);
  }
  return { set: values, valid: errors.length === 0 && values.size > 0, errors };
};

const parseDomField = (expr: string, config: DialectConfig, label: string) => {
  const errors: string[] = [];
  const value = expr.trim();
  if (config.allowQuestion && value === "?") {
    return { set: null, valid: true, errors, hasSpecial: false, isQuestion: true };
  }
  const parts = splitParts(value);
  if (config.allowQuestion && parts.includes("?")) {
    errors.push(`${label}: '?' must stand alone.`);
    return { set: null, valid: false, errors, hasSpecial: false, isQuestion: false };
  }
  if (!parts.length) {
    errors.push(`${label}: value required.`);
    return { set: null, valid: false, errors, hasSpecial: false, isQuestion: false };
  }
  let hasSpecial = false;
  const values = new Set<number>();
  for (const part of parts) {
    if (config.allowSpecial && part === "L") {
      hasSpecial = true;
      continue;
    }
    if (config.allowSpecial && /^(?:[1-9]|[12][0-9]|3[01])W$/.test(part)) {
      hasSpecial = true;
      continue;
    }
    const parsed = parseFieldDetailed(part, 1, 31, label);
    if (!parsed.valid) {
      errors.push(...parsed.errors);
      continue;
    }
    parsed.set.forEach((num) => values.add(num));
  }
  if (errors.length) return { set: null, valid: false, errors, hasSpecial, isQuestion: false };
  return { set: hasSpecial ? null : values, valid: true, errors, hasSpecial, isQuestion: false };
};

const parseDowField = (expr: string, config: DialectConfig, label: string) => {
  const errors: string[] = [];
  const value = expr.trim();
  if (config.allowQuestion && value === "?") {
    return { set: null, valid: true, errors, hasSpecial: false, isQuestion: true };
  }
  const parts = splitParts(value);
  if (config.allowQuestion && parts.includes("?")) {
    errors.push(`${label}: '?' must stand alone.`);
    return { set: null, valid: false, errors, hasSpecial: false, isQuestion: false };
  }
  if (!parts.length) {
    errors.push(`${label}: value required.`);
    return { set: null, valid: false, errors, hasSpecial: false, isQuestion: false };
  }
  let hasSpecial = false;
  const values = new Set<number>();
  for (const part of parts) {
    if (config.allowSpecial && /^([1-7])L$/.test(part)) {
      hasSpecial = true;
      continue;
    }
    if (config.allowSpecial && /^([1-7])#([1-5])$/.test(part)) {
      hasSpecial = true;
      continue;
    }
    const parsed = parseFieldDetailed(part, config.dowMin, config.dowMax, label);
    if (!parsed.valid) {
      errors.push(...parsed.errors);
      continue;
    }
    parsed.set.forEach((num) => values.add(num));
  }
  if (errors.length) return { set: null, valid: false, errors, hasSpecial, isQuestion: false };
  return { set: hasSpecial ? null : values, valid: true, errors, hasSpecial, isQuestion: false };
};

const getNextWindowDays = (current: number) => {
  for (const preset of WINDOW_PRESETS) {
    if (preset > current) return preset;
  }
  return current;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const getSingleValue = (values: Set<number>) => (values.size === 1 ? [...values][0] : null);

const isFullRange = (values: Set<number>, min: number, max: number) => values.size === max - min + 1;

const getWeekdayIndex = (date: Date, timeZone: TimeZoneChoice) => {
  if (timeZone === "local") return date.getDay();
  if (timeZone === "UTC") return date.getUTCDay();
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
};

const readStoredEntries = (key: string): SavedEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read stored cron entries", err);
    return [];
  }
};

const writeStoredEntries = (key: string, entries: SavedEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(entries));
  } catch (err) {
    console.error("Failed to save cron entries", err);
  }
};

export default function CronGeneratorClient() {
  const [dialect, setDialect] = useState<CronDialect>("unix");
  const [includeYear, setIncludeYear] = useState(false);
  const [picker, setPicker] = useState<Picker>(() => getDefaults("unix", false));
  const [copied, setCopied] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [timeZone, setTimeZone] = useState<TimeZoneChoice>("local");
  const [timeZoneOptions, setTimeZoneOptions] = useState<string[]>([
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Kolkata",
    "Asia/Tokyo",
    "Australia/Sydney",
  ]);
  const [autoWindow, setAutoWindow] = useState(true);
  const [windowDays, setWindowDays] = useState(30);
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string[]>>>({});
  const [cronInput, setCronInput] = useState("");
  const [cronInputError, setCronInputError] = useState<string | null>(null);
  const [humanInput, setHumanInput] = useState("");
  const [humanInputError, setHumanInputError] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState(30);
  const [testTimestamp, setTestTimestamp] = useState("");
  const [testExpected, setTestExpected] = useState<"match" | "no-match">("match");
  const [testResults, setTestResults] = useState<
    Array<{ input: string; expected: boolean; actual: boolean; reasons: string[] }>
  >([]);
  const [testError, setTestError] = useState<string | null>(null);
  const [recentEntries, setRecentEntries] = useState<SavedEntry[]>([]);
  const [favoriteEntries, setFavoriteEntries] = useState<SavedEntry[]>([]);
  const MAX_LEN = 80;

  const config = DIALECTS[dialect];
  const fieldOrder = useMemo(() => getFieldOrder(dialect, includeYear), [dialect, includeYear]);
  const pendingExprRef = useRef<string | null>(null);
  const hasParsedUrlRef = useRef(false);

  const parsedFields = useMemo(() => {
    const build = (expr: string, min: number, max: number, label: string) =>
      parseFieldDetailed(expr, min, max, label);
    return {
      seconds: build(picker.seconds, 0, 59, FIELD_LABELS.seconds),
      minutes: build(picker.minutes, 0, 59, FIELD_LABELS.minutes),
      hours: build(picker.hours, 0, 23, FIELD_LABELS.hours),
      dom: parseDomField(picker.dom, config, FIELD_LABELS.dom),
      mon: build(picker.mon, 1, 12, FIELD_LABELS.mon),
      dow: parseDowField(picker.dow, config, FIELD_LABELS.dow),
      year: build(picker.year, 1970, 2099, FIELD_LABELS.year),
    };
  }, [
    picker.seconds,
    picker.minutes,
    picker.hours,
    picker.dom,
    picker.mon,
    picker.dow,
    picker.year,
    config.allowSpecial,
    config.dowMin,
    config.dowMax,
  ]);

  const suggestedWindowDays = useMemo(() => {
    if (config.supportsSeconds) {
      const secondsValue = picker.seconds.trim();
      return secondsValue === "0" ? 7 : 1;
    }
    if (config.supportsYear && (config.requireYear || includeYear) && picker.year.trim() !== "*") {
      return 365;
    }
    if (config.allowSpecial && (parsedFields.dom.hasSpecial || parsedFields.dow.hasSpecial)) {
      return 365;
    }
    if (picker.mon.trim() !== "*") return 365;
    if (picker.dom.trim() !== "*" || picker.dow.trim() !== "*") return 90;
    return 30;
  }, [
    config.supportsSeconds,
    config.supportsYear,
    config.requireYear,
    config.allowSpecial,
    includeYear,
    picker.seconds,
    picker.year,
    picker.mon,
    picker.dom,
    picker.dow,
    parsedFields.dom.hasSpecial,
    parsedFields.dow.hasSpecial,
  ]);

  useEffect(() => {
    setIncludeYear((prev) => {
      if (dialect === "aws") return true;
      if (dialect === "quartz") return prev;
      return false;
    });
    setPicker((prev) => {
      const next = { ...prev };
      if (config.requireQuestion) {
        if (next.dom !== "?" && next.dow !== "?") next.dom = "?";
      } else {
        if (next.dom === "?") next.dom = "*";
        if (next.dow === "?") next.dow = "*";
      }
      return next;
    });
  }, [dialect, config.requireQuestion]);

  useEffect(() => {
    setMounted(true);
    if (typeof Intl.supportedValuesOf === "function") {
      setTimeZoneOptions(Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "UTC"));
    }
  }, []);

  useEffect(() => {
    const storedRecents = readStoredEntries(RECENT_STORAGE_KEY);
    const storedFavorites = readStoredEntries(FAVORITE_STORAGE_KEY);
    setRecentEntries(storedRecents);
    setFavoriteEntries(storedFavorites);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) {
      hasParsedUrlRef.current = true;
      return;
    }
    const urlDialect = params.get("dialect") as CronDialect | null;
    const urlExpr = params.get("expr");
    const urlTimezone = params.get("tz");
    const urlUtc = params.get("utc");
    const urlIncludeYear = params.get("year");
    const urlPreview = params.get("preview");
    const urlWindow = params.get("window");
    const urlAuto = params.get("auto");

    if (urlDialect && DIALECTS[urlDialect]) {
      setDialect(urlDialect);
    }
    if (urlTimezone) {
      setTimeZone(urlTimezone);
    } else if (urlUtc === "1") {
      setTimeZone("UTC");
    }
    if (urlIncludeYear === "1") {
      setIncludeYear(true);
    }
    if (urlPreview) {
      const value = Number(urlPreview);
      if (Number.isFinite(value)) setPreviewCount(value);
    }
    if (urlWindow) {
      const value = Number(urlWindow);
      if (Number.isFinite(value)) {
        setAutoWindow(urlAuto === "1");
        setWindowDays(value);
      }
    } else if (urlAuto === "1" || urlAuto === "0") {
      setAutoWindow(urlAuto === "1");
    }
    if (urlExpr) {
      pendingExprRef.current = urlExpr;
      setCronInput(urlExpr);
    }
    hasParsedUrlRef.current = true;
  }, []);

  useEffect(() => {
    if (!pendingExprRef.current) return;
    const expr = pendingExprRef.current;
    const parts = expr.trim().split(/\s+/);
    if (parts.length === fieldOrder.length) {
      const next = getDefaults(dialect, includeYear);
      fieldOrder.forEach((field, index) => {
        next[field] = parts[index];
      });
      setPicker(next);
    }
    pendingExprRef.current = null;
  }, [fieldOrder, dialect, includeYear]);

  useEffect(() => {
    if (autoWindow) {
      setWindowDays(suggestedWindowDays);
    }
  }, [autoWindow, suggestedWindowDays]);

  const cron = useMemo(() => fieldOrder.map((field) => picker[field]).join(" "), [fieldOrder, picker]);

  const summary = useMemo(
    () =>
      fieldOrder
        .map((field) =>
          describeField(
            picker[field],
            FIELD_LABELS[field],
            dialect,
            config,
            field === "dow",
            field === "dom",
          ),
        )
        .join(" • "),
    [fieldOrder, picker, dialect, config],
  );

  const humanSummary = useMemo(() => {
    const minuteSet = parsedFields.minutes.set;
    const hourSet = parsedFields.hours.set;
    const monthSet = parsedFields.mon.set;
    const domSet = parsedFields.dom.set;
    const dowSet = parsedFields.dow.set;
    const secondsSet = parsedFields.seconds.set;
    const minuteSingle = getSingleValue(minuteSet);
    const hourSingle = getSingleValue(hourSet);
    const domSingle = domSet ? getSingleValue(domSet) : null;
    const dowSingle = dowSet ? getSingleValue(dowSet) : null;
    const allMinutes = isFullRange(minuteSet, 0, 59);
    const allHours = isFullRange(hourSet, 0, 23);
    const allMonths = isFullRange(monthSet, 1, 12);
    const allDom = domSet ? isFullRange(domSet, 1, 31) : picker.dom.trim() === "*";
    const allDow = dowSet ? isFullRange(dowSet, config.dowMin, config.dowMax) : picker.dow.trim() === "*";

    const minutesStep = picker.minutes.trim().match(/^\*\/(\d+)$/);
    const hoursStep = picker.hours.trim().match(/^\*\/(\d+)$/);

    if (
      allMinutes &&
      allHours &&
      allDom &&
      allMonths &&
      allDow &&
      (!config.supportsSeconds || isFullRange(secondsSet, 0, 59) || picker.seconds.trim() === "0")
    ) {
      return "Every minute";
    }

    if (minutesStep && allHours && allDom && allMonths && allDow) {
      return `Every ${minutesStep[1]} minutes`;
    }

    if (hoursStep && minuteSingle === 0 && allDom && allMonths && allDow) {
      return `Every ${hoursStep[1]} hours`;
    }

    if (hourSingle !== null && minuteSingle !== null) {
      const time = `${pad2(hourSingle)}:${pad2(minuteSingle)}`;
      if (dowSet && dowSet.size === 5) {
        const weekdaySet = config.dowMin === 0 ? new Set([1, 2, 3, 4, 5]) : new Set([2, 3, 4, 5, 6]);
        const isWeekday = [...dowSet].every((value) => weekdaySet.has(value));
        if (isWeekday && allDom) return `Every weekday at ${time}`;
      }
      if (dowSingle !== null && allDom) {
        return `Every ${getWeekdayName(dowSingle, dialect)} at ${time}`;
      }
      if (domSingle !== null && allMonths && allDow) {
        return `Every month on day ${domSingle} at ${time}`;
      }
      if (allDom && allDow && allMonths) {
        return `Every day at ${time}`;
      }
      return `At ${time} on selected schedule`;
    }

    return `Schedule: ${summary}`;
  }, [config, dialect, parsedFields, picker, summary]);

  useEffect(() => {
    const errs: string[] = [];
    const fieldErrs: Partial<Record<FieldKey, string[]>> = {};
    const addFieldError = (field: FieldKey, message: string) => {
      errs.push(message);
      fieldErrs[field] = fieldErrs[field] ? [...fieldErrs[field], message] : [message];
    };
    const fields = fieldOrder.map((key) => ({ key, label: FIELD_LABELS[key] }));
    const asString = fields.map((f) => picker[f.key]).join(" ");
    if (asString.trim().length === 0) {
      errs.push("Enter values for all cron fields.");
    }
    if (asString.length > MAX_LEN) {
      errs.push("Expression is too long; check ranges and lists.");
    }
    fields.forEach((field) => {
      const val = picker[field.key].trim();
      if (!val) {
        addFieldError(field.key, `${field.label}: value required.`);
        return;
      }
      if (field.key === "dom") {
        parsedFields.dom.errors.forEach((message) => addFieldError(field.key, message));
        return;
      }
      if (field.key === "dow") {
        parsedFields.dow.errors.forEach((message) => addFieldError(field.key, message));
        return;
      }
      if (field.key === "year") {
        parsedFields.year.errors.forEach((message) => addFieldError(field.key, message));
        return;
      }
      if (field.key === "seconds") {
        parsedFields.seconds.errors.forEach((message) => addFieldError(field.key, message));
        return;
      }
      if (field.key === "minutes") {
        parsedFields.minutes.errors.forEach((message) => addFieldError(field.key, message));
        return;
      }
      if (field.key === "hours") {
        parsedFields.hours.errors.forEach((message) => addFieldError(field.key, message));
        return;
      }
      if (field.key === "mon") {
        parsedFields.mon.errors.forEach((message) => addFieldError(field.key, message));
      }
    });
    if (config.requireQuestion) {
      const domIsQuestion = picker.dom.trim() === "?";
      const dowIsQuestion = picker.dow.trim() === "?";
      if (domIsQuestion === dowIsQuestion) {
        const message = "For this dialect, set exactly one of Day of month or Day of week to '?'.";
        addFieldError("dom", message);
        addFieldError("dow", message);
      }
    }
    setErrors(errs);
    setFieldErrors(fieldErrs);
  }, [fieldOrder, picker, config, parsedFields]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cron);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const update = (key: FieldKey, value: string) => {
    setPicker((prev) => ({ ...prev, [key]: value || "*" }));
    setCopied(false);
  };

  const applyCronInput = () => {
    const trimmed = cronInput.trim();
    if (!trimmed) {
      setCronInputError("Enter a cron expression to parse.");
      return;
    }
    const parts = trimmed.split(/\s+/);
    if (parts.length !== fieldOrder.length) {
      setCronInputError(`Expected ${fieldOrder.length} fields for ${config.label}.`);
      return;
    }
    const next = getDefaults(dialect, includeYear);
    fieldOrder.forEach((field, index) => {
      next[field] = parts[index];
    });
    setPicker(next);
    setCronInputError(null);
  };

  const applyHumanInput = () => {
    const raw = humanInput.trim().toLowerCase();
    if (!raw) {
      setHumanInputError("Enter a human-friendly schedule to parse.");
      return;
    }
    const next = getDefaults(dialect, includeYear);
    const setTime = (hour: number, minute: number) => {
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error("Time must be between 00:00 and 23:59.");
      }
      next.hours = String(hour);
      next.minutes = String(minute);
    };

    try {
      let matched = false;
      const stepMatch = raw.match(/^every\s+(\d+)\s+(seconds|minutes|hours)$/);
      if (stepMatch) {
        const amount = Number(stepMatch[1]);
        const unit = stepMatch[2];
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Step must be > 0.");
        }
        if (unit === "seconds") {
          if (!config.supportsSeconds) throw new Error("Seconds are not supported in this dialect.");
          next.seconds = `*/${amount}`;
          next.minutes = "*";
          next.hours = "*";
        } else if (unit === "minutes") {
          next.minutes = `*/${amount}`;
          next.hours = "*";
        } else {
          next.hours = `*/${amount}`;
          next.minutes = "0";
        }
        matched = true;
      }

      const weekdayMatch = raw.match(/^every\s+weekday\s+at\s+(\d{1,2})(?::(\d{2}))?$/);
      if (!matched && weekdayMatch) {
        const hour = Number(weekdayMatch[1]);
        const minute = Number(weekdayMatch[2] ?? "0");
        setTime(hour, minute);
        next.dow = config.dowMin === 0 ? "1-5" : "2-6";
        if (config.requireQuestion) next.dom = "?";
        matched = true;
      }

      const dailyMatch = raw.match(/^every\s+day\s+at\s+(\d{1,2})(?::(\d{2}))?$/);
      if (!matched && dailyMatch) {
        const hour = Number(dailyMatch[1]);
        const minute = Number(dailyMatch[2] ?? "0");
        setTime(hour, minute);
        if (config.requireQuestion) next.dow = "?";
        matched = true;
      }

      const timeOnlyMatch = raw.match(/^at\s+(\d{1,2})(?::(\d{2}))?$/);
      if (!matched && timeOnlyMatch) {
        const hour = Number(timeOnlyMatch[1]);
        const minute = Number(timeOnlyMatch[2] ?? "0");
        setTime(hour, minute);
        if (config.requireQuestion) next.dow = "?";
        matched = true;
      }

      const monthlyMatch = raw.match(/^every\s+month\s+on\s+(\d{1,2})\s+at\s+(\d{1,2})(?::(\d{2}))?$/);
      if (!matched && monthlyMatch) {
        const dom = Number(monthlyMatch[1]);
        const hour = Number(monthlyMatch[2]);
        const minute = Number(monthlyMatch[3] ?? "0");
        if (dom < 1 || dom > 31) throw new Error("Day of month must be 1-31.");
        setTime(hour, minute);
        next.dom = String(dom);
        if (config.requireQuestion) next.dow = "?";
        matched = true;
      }

      if (!matched) {
        throw new Error("Try phrases like 'every weekday at 9:30' or 'every 15 minutes'.");
      }

      if (config.supportsYear && (config.requireYear || includeYear)) {
        next.year = "*";
      }

      setPicker(next);
      setHumanInputError(null);
    } catch (err) {
      setHumanInputError(err instanceof Error ? err.message : "Unable to parse the schedule.");
    }
  };

  const applySavedEntry = (entry: SavedEntry) => {
    setDialect(entry.dialect);
    setTimeZone(entry.timeZone);
    setIncludeYear(entry.includeYear);
    setAutoWindow(entry.autoWindow);
    setWindowDays(entry.windowDays);
    setPreviewCount(entry.previewCount);
    setPicker(entry.picker);
    setCronInput(entry.cron);
  };

  const toggleFavoriteEntry = (entry: SavedEntry) => {
    setFavoriteEntries((prev) => {
      const exists = prev.some((item) => item.id === entry.id);
      const next = exists ? prev.filter((item) => item.id !== entry.id) : [entry, ...prev];
      writeStoredEntries(FAVORITE_STORAGE_KEY, next);
      return next;
    });
  };

  const explainMismatch = (date: Date) => {
    const parts = getZonedParts(date);
    const reasons: string[] = [];
    if (config.supportsSeconds && !parsedFields.seconds.set.has(parts.sec)) {
      reasons.push(`Seconds: ${parts.sec} not in ${picker.seconds}`);
    }
    if (!parsedFields.minutes.set.has(parts.min)) {
      reasons.push(`Minutes: ${parts.min} not in ${picker.minutes}`);
    }
    if (!parsedFields.hours.set.has(parts.hr)) {
      reasons.push(`Hours: ${parts.hr} not in ${picker.hours}`);
    }
    if (!parsedFields.mon.set.has(parts.mon)) {
      reasons.push(`Month: ${parts.mon} not in ${picker.mon}`);
    }
    if (config.supportsYear && (config.requireYear || includeYear) && !parsedFields.year.set.has(parts.year)) {
      reasons.push(`Year: ${parts.year} not in ${picker.year}`);
    }

    const domMatches = parsedFields.dom.isQuestion
      ? true
      : parsedFields.dom.hasSpecial
        ? matchDom(picker.dom, parts.year, parts.mon - 1, parts.dom, dialect)
        : parsedFields.dom.set?.has(parts.dom) ?? false;
    const dowMatches = parsedFields.dow.isQuestion
      ? true
      : parsedFields.dow.hasSpecial
        ? matchDow(picker.dow, parts.year, parts.mon - 1, parts.dom, dialect)
        : parsedFields.dow.set?.has(parts.dow) ?? false;

    if (config.domDowMode === "or") {
      const domIsStar = picker.dom.trim() === "*";
      const dowIsStar = picker.dow.trim() === "*";
      const domOk = domIsStar ? true : domMatches;
      const dowOk = dowIsStar ? true : dowMatches;
      if (!domOk && !dowOk) {
        reasons.push(`DOM/DOW: ${parts.dom}/${parts.dow} did not satisfy either field`);
      }
    } else {
      const domIsQuestion = picker.dom.trim() === "?";
      const dowIsQuestion = picker.dow.trim() === "?";
      if (domIsQuestion && !dowMatches) {
        reasons.push(`DOW: ${parts.dow} not in ${picker.dow}`);
      }
      if (dowIsQuestion && !domMatches) {
        reasons.push(`DOM: ${parts.dom} not in ${picker.dom}`);
      }
    }

    if (!reasons.length) {
      reasons.push("All fields matched; check expected value.");
    }
    return reasons;
  };

  const runTest = () => {
    const raw = testTimestamp.trim();
    if (!raw) {
      setTestError("Enter a timestamp to test.");
      return;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      setTestError("Invalid timestamp. Try ISO 8601 like 2025-03-01T09:30:00Z.");
      return;
    }
    const actual = matchesCron(date);
    const expected = testExpected === "match";
    const reasons = actual === expected ? [] : explainMismatch(date);
    setTestResults((prev) => [
      {
        input: raw,
        expected,
        actual,
        reasons,
      },
      ...prev,
    ]);
    setTestError(null);
  };

  const presets = ["Every 5m", "Hourly", "Daily 2am", "Weekdays 9-5", "First of month"] as const;

  const getPresetPicker = (label: (typeof presets)[number]) => {
    const base = getDefaults(dialect, includeYear);
    switch (label) {
      case "Every 5m":
        base.minutes = "*/5";
        base.hours = "*";
        base.dom = config.requireQuestion ? "?" : "*";
        base.mon = "*";
        base.dow = config.requireQuestion ? "*" : "*";
        return base;
      case "Hourly":
        base.minutes = "0";
        base.hours = "*";
        base.dom = config.requireQuestion ? "?" : "*";
        base.mon = "*";
        base.dow = config.requireQuestion ? "*" : "*";
        return base;
      case "Daily 2am":
        base.minutes = "0";
        base.hours = "2";
        base.dom = config.requireQuestion ? "*" : "*";
        base.mon = "*";
        base.dow = config.requireQuestion ? "?" : "*";
        return base;
      case "Weekdays 9-5":
        base.minutes = "0";
        base.hours = "9-17";
        base.dom = config.requireQuestion ? "?" : "*";
        base.mon = "*";
        base.dow = config.dowMin === 0 ? "1-5" : "2-6";
        return base;
      case "First of month":
        base.minutes = "0";
        base.hours = "0";
        base.dom = "1";
        base.mon = "*";
        base.dow = config.requireQuestion ? "?" : "*";
        return base;
      default:
        return base;
    }
  };

  const getZonedParts = (date: Date) => {
    if (timeZone === "local") {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return {
        sec: date.getSeconds(),
        min: date.getMinutes(),
        hr: date.getHours(),
        dom: day,
        mon: month,
        year,
        dow: getDowForDate(year, month - 1, day, dialect),
      };
    }
    if (timeZone === "UTC") {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      return {
        sec: date.getUTCSeconds(),
        min: date.getUTCMinutes(),
        hr: date.getUTCHours(),
        dom: day,
        mon: month,
        year,
        dow: getDowForDate(year, month - 1, day, dialect),
      };
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const year = Number(lookup.year);
    const month = Number(lookup.month);
    const day = Number(lookup.day);
    return {
      sec: Number(lookup.second),
      min: Number(lookup.minute),
      hr: Number(lookup.hour),
      dom: day,
      mon: month,
      year,
      dow: getDowForDate(year, month - 1, day, dialect),
    };
  };

  const formatRunDisplay = (date: Date) =>
    timeZone === "local"
      ? date.toLocaleString()
      : date.toLocaleString("en-US", { timeZone, hour12: false });

  const getSnippet = (target: "k8s" | "github" | "aws" | "crontab") => {
    const commandPlaceholder = "/path/to/command";
    switch (target) {
      case "k8s":
        return `apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: example-cron\nspec:\n  schedule: \"${cron}\"\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          restartPolicy: OnFailure\n          containers:\n            - name: job\n              image: alpine:3.19\n              command:\n                - /bin/sh\n                - -c\n                - \"${commandPlaceholder}\"`;
      case "github":
        return `on:\n  schedule:\n    - cron: \"${cron}\"`;
      case "aws":
        return `{\n  \"Name\": \"example-rule\",\n  \"ScheduleExpression\": \"cron(${cron})\"\n}`;
      case "crontab":
        return `${cron} ${commandPlaceholder}`;
      default:
        return cron;
    }
  };

  const matchesCron = (date: Date) => {
    const parts = getZonedParts(date);

    const secondsOk = config.supportsSeconds ? parsedFields.seconds.set.has(parts.sec) : true;
    const minutesOk = parsedFields.minutes.set.has(parts.min);
    const hoursOk = parsedFields.hours.set.has(parts.hr);
    const monOk = parsedFields.mon.set.has(parts.mon);
    const yearOk =
      config.supportsYear && (config.requireYear || includeYear)
        ? parsedFields.year.set.has(parts.year)
        : true;

    const domMatches = parsedFields.dom.isQuestion
      ? true
      : parsedFields.dom.hasSpecial
        ? matchDom(picker.dom, parts.year, parts.mon - 1, parts.dom, dialect)
        : parsedFields.dom.set?.has(parts.dom) ?? false;
    const dowMatches = parsedFields.dow.isQuestion
      ? true
      : parsedFields.dow.hasSpecial
        ? matchDow(picker.dow, parts.year, parts.mon - 1, parts.dom, dialect)
        : parsedFields.dow.set?.has(parts.dow) ?? false;

    let domDowOk = true;
    if (config.domDowMode === "or") {
      const domIsStar = picker.dom.trim() === "*";
      const dowIsStar = picker.dow.trim() === "*";
      if (domIsStar && dowIsStar) domDowOk = true;
      else if (domIsStar) domDowOk = dowMatches;
      else if (dowIsStar) domDowOk = domMatches;
      else domDowOk = domMatches || dowMatches;
    } else {
      const domIsQuestion = picker.dom.trim() === "?";
      const dowIsQuestion = picker.dow.trim() === "?";
      if (domIsQuestion) domDowOk = dowMatches;
      else if (dowIsQuestion) domDowOk = domMatches;
      else domDowOk = domMatches && dowMatches;
    }

    return secondsOk && minutesOk && hoursOk && monOk && yearOk && domDowOk;
  };

  const safeWindowDays = Number.isFinite(windowDays) ? windowDays : suggestedWindowDays;
  const effectiveWindowDays = autoWindow ? suggestedWindowDays : Math.max(1, safeWindowDays);

  const searchResult = useMemo(() => {
    if (!mounted || errors.length) return { runs: [], windowDays: effectiveWindowDays };
    const runs: Date[] = [];
    const now = new Date();
    let cursor = new Date(now.getTime());
    cursor.setSeconds(cursor.getSeconds() + 1);
    const stepMs = config.supportsSeconds ? 1000 : 60000;
    const endTime = now.getTime() + effectiveWindowDays * 24 * 60 * 60 * 1000;
    while (runs.length < previewCount && cursor.getTime() <= endTime) {
      if (matchesCron(cursor)) {
        runs.push(new Date(cursor.getTime()));
      }
      cursor = new Date(cursor.getTime() + stepMs);
    }
    return { runs, windowDays: effectiveWindowDays };
  }, [config.supportsSeconds, effectiveWindowDays, errors.length, matchesCron, mounted, previewCount]);

  const downloadJson = () => {
    const data = {
      cron,
      dialect: config.label,
      fields: picker,
      summary,
      timezone: timeZone === "local" ? "Local" : timeZone,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cron-expression.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fieldPlaceholders = {
    seconds: "0 or */10",
    minutes: "*/5 or 0",
    hours: "* or 0 or 9-17",
    dom: config.allowSpecial ? "* or 1,15 or L or 15W" : "* or 1,15",
    mon: "* or 1-12",
    dow: config.allowSpecial
      ? `${config.dowMin}-${config.dowMax} or 2-6 or 5L or 3#2`
      : `${config.dowMin}-${config.dowMax} or 1-5`,
    year: "* or 2025-2035",
  };

  const displayTimezone = timeZone === "local" ? "Local" : timeZone;
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    params.set("expr", cron);
    params.set("dialect", dialect);
    if (includeYear) params.set("year", "1");
    if (timeZone === "UTC") params.set("utc", "1");
    if (timeZone !== "local") params.set("tz", timeZone);
    params.set("preview", String(previewCount));
    params.set("window", String(effectiveWindowDays));
    params.set("auto", autoWindow ? "1" : "0");
    return `${window.location.pathname}?${params.toString()}`;
  }, [autoWindow, cron, dialect, effectiveWindowDays, includeYear, previewCount, timeZone]);

  useEffect(() => {
    if (!hasParsedUrlRef.current || pendingExprRef.current) return;
    if (typeof window === "undefined") return;
    const url = shareUrl || window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [shareUrl]);

  useEffect(() => {
    if (!mounted || errors.length > 0) return;
    const entry: SavedEntry = {
      id: `${dialect}-${cron}-${timeZone}-${includeYear ? "1" : "0"}`,
      label: humanSummary,
      cron,
      dialect,
      timeZone,
      includeYear,
      previewCount,
      windowDays: effectiveWindowDays,
      autoWindow,
      picker,
      createdAt: Date.now(),
    };
    setRecentEntries((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id);
      const next = [entry, ...filtered].slice(0, 10);
      writeStoredEntries(RECENT_STORAGE_KEY, next);
      return next;
    });
  }, [
    autoWindow,
    cron,
    dialect,
    effectiveWindowDays,
    errors.length,
    humanSummary,
    includeYear,
    mounted,
    picker,
    previewCount,
    timeZone,
  ]);
  const nextWindowDays = getNextWindowDays(effectiveWindowDays);
  const shouldSuggestWindowIncrease =
    searchResult.runs.length === 0 && errors.length === 0 && nextWindowDays > effectiveWindowDays;
  const showNoRuns = searchResult.runs.length === 0 && errors.length === 0;
  const calendarBaseDate = searchResult.runs[0] ?? new Date();
  const calendarParts = getZonedParts(calendarBaseDate);
  const calendarYear = calendarParts.year;
  const calendarMonthIndex = calendarParts.mon - 1;
  const daysInCalendarMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1);
  const startWeekday = getWeekdayIndex(firstDayOfMonth, timeZone);
  const calendarHighlights = new Set(
    searchResult.runs
      .map((run) => getZonedParts(run))
      .filter((parts) => parts.year === calendarYear && parts.mon - 1 === calendarMonthIndex)
      .map((parts) => parts.dom),
  );
  const monthLabel =
    timeZone === "local"
      ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarBaseDate)
      : new Intl.DateTimeFormat("en-US", { timeZone, month: "long", year: "numeric" }).format(calendarBaseDate);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {errors.length ? `Errors: ${errors.join(", ")}` : "Cron ready"}
        {copied ? "Cron copied" : ""}
        {copiedSummary ? "Summary copied" : ""}
      </div>
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
              Cron Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Cron Expression Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Choose a cron dialect, fill in the fields, and copy the generated expression with a readable summary.
        </p>
      </header>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 space-y-4">
          <div className="flex flex-wrap items-end gap-4 text-sm text-slate-700">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Dialect
            <select
              value={dialect}
              onChange={(event) => setDialect(event.target.value as CronDialect)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Select cron dialect"
            >
              {Object.entries(DIALECTS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-slate-600 max-w-2xl">{config.description}</div>
          {dialect === "quartz" ? (
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={includeYear}
                onChange={(event) => setIncludeYear(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Toggle optional year field"
              />
              Include year field
            </label>
          ) : null}
          {dialect === "aws" ? <span className="text-xs text-slate-600">Year field is required.</span> : null}
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Timezone
            <select
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Select timezone"
            >
              <option value="local">Local</option>
              <option value="UTC">UTC</option>
              {timeZoneOptions.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Search window (days)
            <input
              type="number"
              min={1}
              max={365}
              value={effectiveWindowDays}
              onChange={(event) => {
                setAutoWindow(false);
                const value = Number(event.target.value);
                setWindowDays(Number.isFinite(value) ? value : 1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Set search window in days"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Preview count
            <select
              value={previewCount}
              onChange={(event) => setPreviewCount(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Select preview count"
            >
              {[20, 30, 40, 50].map((count) => (
                <option key={count} value={count}>
                  {count} runs
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={autoWindow}
              onChange={(event) => setAutoWindow(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Toggle automatic search window"
            />
            Auto window ({suggestedWindowDays} days)
          </label>
          {errors.length > 0 ? (
            <span className="text-amber-600 font-medium text-xs">Resolve errors before copying.</span>
          ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fieldOrder.map((field) => (
            <label key={field} className="flex flex-col gap-1 text-sm text-slate-700">
              {FIELD_LABELS[field]}
              <input
                type="text"
                value={picker[field]}
                onChange={(event) => update(field, event.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
                  fieldErrors[field]?.length ? "border-amber-400 ring-1 ring-amber-300" : "border-slate-200"
                }`}
                placeholder={fieldPlaceholders[field]}
                aria-label={`${FIELD_LABELS[field]} field`}
                aria-invalid={fieldErrors[field]?.length ? "true" : "false"}
              />
            </label>
          ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPicker(getDefaults(dialect, includeYear));
              setCopied(false);
              setCopiedSummary(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset cron inputs"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          {presets.map((label) => (
            <button
              key={label}
              onClick={() => {
                setPicker(getPresetPicker(label));
                setCopied(false);
                setCopiedSummary(false);
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              {label}
            </button>
          ))}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={errors.length > 0}
            aria-label="Copy cron expression"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy cron"}
          </button>
          <button
            onClick={async () => {
              if (!shareUrl) return;
              try {
                await navigator.clipboard.writeText(shareUrl);
              } catch (err) {
                console.error("Copy failed", err);
              }
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={errors.length > 0}
            aria-label="Copy shareable link"
          >
            <Clipboard className="h-4 w-4" />
            Copy link
          </button>
          <button
            onClick={copySummary}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={errors.length > 0}
            aria-label="Copy cron summary"
          >
            {copiedSummary ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copiedSummary ? "Copied summary" : "Copy summary"}
          </button>
          <button
            onClick={downloadJson}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
            disabled={errors.length > 0}
            aria-label="Download cron as JSON"
          >
            <Download className="h-4 w-4" />
            Download JSON
          </button>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-800 ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">Cron</p>
          <p className="font-mono text-sm text-slate-700">{cron}</p>
          <p className="mt-2 text-slate-700">{summary}</p>
          <p className="mt-2 text-slate-600">{humanSummary}</p>
          <p className="mt-2 text-xs text-slate-600">
            DOM/DOW semantics: {config.domDowMode === "or" ? "OR (either may match)" : "AND (use ? in one field)"}
          </p>
          {errors.length === 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-700">
              <span className="text-slate-600">
                Upcoming runs ({displayTimezone}) · showing {searchResult.runs.length} of {previewCount}
              </span>
            </div>
          ) : null}
          {searchResult.runs.length ? (
            <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Calendar</span>
                  <span>{monthLabel}</span>
                </div>
                <div className="mt-2 grid grid-cols-7 gap-1 text-[11px] text-slate-500">
                  {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                    <span key={`${label}-${index}`} className="text-center font-semibold">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1 text-xs">
                  {Array.from({ length: startWeekday }).map((_, index) => (
                    <span key={`empty-${index}`} />
                  ))}
                  {Array.from({ length: daysInCalendarMonth }).map((_, index) => {
                    const day = index + 1;
                    const highlighted = calendarHighlights.has(day);
                    return (
                      <span
                        key={`day-${day}`}
                        className={`flex h-7 items-center justify-center rounded-full ${
                          highlighted ? "bg-slate-900 text-white" : "text-slate-700"
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Timeline</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(searchResult.runs.map((run) => run.toISOString()).join("\n"));
                      } catch (err) {
                        console.error("Copy failed", err);
                      }
                    }}
                    disabled={searchResult.runs.length === 0}
                    className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    Copy ISO timestamps
                  </button>
                </div>
                <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-slate-700">
                  {searchResult.runs.map((run, index) => (
                    <li
                      key={`${run.toISOString()}-${index}`}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-1 ring-1 ring-slate-100"
                    >
                      <span className="text-sm">{formatRunDisplay(run)}</span>
                      <span className="text-[11px] text-slate-400">{run.toISOString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : showNoRuns ? (
            <div className="mt-2 space-y-2 text-slate-600">
              <p>No run found in next {searchResult.windowDays} days.</p>
              {shouldSuggestWindowIncrease ? (
                <button
                  type="button"
                  onClick={() => {
                    setAutoWindow(false);
                    setWindowDays(nextWindowDays);
                  }}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Search {nextWindowDays} days
                </button>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-slate-600">Adjust fields to see the next run times.</p>
          )}
          {errors.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-700">
              {errors.map((err, index) => (
                <li key={`${err}-${index}`}>{err}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200 shadow-[var(--shadow-soft)] space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Two-way conversion</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="flex flex-col gap-1 text-xs text-slate-700">
                Cron → Human
                <input
                  type="text"
                  value={cronInput}
                  onChange={(event) => {
                    setCronInput(event.target.value);
                    setCronInputError(null);
                  }}
                  placeholder={fieldOrder.map((field) => FIELD_LABELS[field]).join(" ")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Cron to human input"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyCronInput}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Load cron into fields
                </button>
                <button
                  type="button"
                  onClick={() => setCronInput(cron)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Use current cron
                </button>
              </div>
              {cronInputError ? <p className="text-xs text-amber-700">{cronInputError}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="flex flex-col gap-1 text-xs text-slate-700">
                Human → Cron
                <input
                  type="text"
                  value={humanInput}
                  onChange={(event) => {
                    setHumanInput(event.target.value);
                    setHumanInputError(null);
                  }}
                  placeholder="every weekday at 9:30"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Human to cron input"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyHumanInput}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Convert to cron
                </button>
                <button
                  type="button"
                  onClick={() => setHumanInput(humanSummary)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Use current summary
                </button>
              </div>
              {humanInputError ? <p className="text-xs text-amber-700">{humanInputError}</p> : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200 shadow-[var(--shadow-soft)] space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent expressions & favorites</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Recent</p>
              {recentEntries.length ? (
                <ul className="space-y-2 text-xs text-slate-700">
                  {recentEntries.map((entry) => (
                    <li key={entry.id} className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200">
                      <div className="font-mono text-xs text-slate-700">{entry.cron}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {entry.label} · {entry.dialect} · {entry.timeZone === "local" ? "Local" : entry.timeZone}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applySavedEntry(entry)}
                          className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavoriteEntry(entry)}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                        >
                          {favoriteEntries.some((item) => item.id === entry.id) ? "Unfavorite" : "Favorite"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(entry.cron);
                            } catch (err) {
                              console.error("Copy failed", err);
                            }
                          }}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                        >
                          Copy cron
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No recent expressions yet.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Favorites</p>
              {favoriteEntries.length ? (
                <ul className="space-y-2 text-xs text-slate-700">
                  {favoriteEntries.map((entry) => (
                    <li key={`fav-${entry.id}`} className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200">
                      <div className="font-mono text-xs text-slate-700">{entry.cron}</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {entry.label} · {entry.dialect} · {entry.timeZone === "local" ? "Local" : entry.timeZone}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applySavedEntry(entry)}
                          className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavoriteEntry(entry)}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Star a recent entry to save it here.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200 shadow-[var(--shadow-soft)] space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Export snippets</h2>
          <p className="text-xs text-slate-600">
            Generate ready-to-paste cron snippets for popular schedulers.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "k8s", label: "Kubernetes CronJob YAML" },
              { key: "github", label: "GitHub Actions schedule" },
              { key: "aws", label: "AWS EventBridge rule" },
              { key: "crontab", label: "Linux crontab line" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(getSnippet(item.key as "k8s" | "github" | "aws" | "crontab"));
                  } catch (err) {
                    console.error("Copy failed", err);
                  }
                }}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Note</p>
            <p>Snippets use the current cron expression and include a placeholder command where applicable.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200 shadow-[var(--shadow-soft)] space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Test harness</h2>
          <p className="text-xs text-slate-600">
            Validate a timestamp against the current cron expression and inspect mismatches.
          </p>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,160px)_minmax(0,140px)]">
            <label className="flex flex-col gap-1 text-xs text-slate-700">
              Timestamp (ISO or local)
              <input
                type="text"
                value={testTimestamp}
                onChange={(event) => {
                  setTestTimestamp(event.target.value);
                  setTestError(null);
                }}
                placeholder="2025-03-01T09:30:00Z"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Test timestamp input"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-700">
              Expected
              <select
                value={testExpected}
                onChange={(event) => setTestExpected(event.target.value as "match" | "no-match")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Expected match result"
              >
                <option value="match">Match</option>
                <option value="no-match">No match</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={runTest}
                className="w-full rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              >
                Run test
              </button>
            </div>
          </div>
          {testError ? <p className="text-xs text-amber-700">{testError}</p> : null}
          {testResults.length ? (
            <ul className="space-y-2 text-xs text-slate-700">
              {testResults.map((result, index) => {
                const status = result.actual === result.expected ? "Pass" : "Fail";
                return (
                  <li key={`${result.input}-${index}`} className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-700">{result.input}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          status === "Pass" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Expected {result.expected ? "match" : "no match"} · Actual {result.actual ? "match" : "no match"}
                    </div>
                    {result.actual !== result.expected && result.reasons.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-600">
                        {result.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No tests yet. Run a timestamp check to populate results.</p>
          )}
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200 shadow-[var(--shadow-soft)] space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Gotchas</h2>
          <ul className="space-y-2 text-xs text-slate-700">
            <li>
              <span className="font-semibold text-slate-900">DOM vs DOW:</span> Unix/Kubernetes use OR semantics; Quartz/AWS
              require one field to be <code className="font-mono">?</code>.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Timezone:</span> Your cron runs in the server/app timezone, not
              your browser’s. Always confirm the deployment zone.
            </li>
            <li>
              <span className="font-semibold text-slate-900">DST:</span> Spring-forward skips times; fall-back can trigger
              duplicate runs. Previews reflect the selected timezone but production may differ.
            </li>
            <li>
              <span className="font-semibold text-slate-900">Quartz tokens:</span> <code className="font-mono">L</code>,{" "}
              <code className="font-mono">W</code>, <code className="font-mono">#</code> can be vendor-specific. Validate
              against your scheduler.
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-semibold text-slate-900">How to use</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
            <li>Select the cron dialect and enter values into the fields or choose a preset.</li>
            <li>Resolve any validation warnings, then copy the cron or summary, or download JSON.</li>
            <li>Review the next run times in local time or UTC.</li>
          </ol>
          <div className="mt-3 space-y-1 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">FAQ & privacy</p>
            <p><strong>Local only?</strong> Yes. Everything runs in your browser.</p>
            <p><strong>Dialect differences?</strong> Seconds, DOM/DOW semantics, and special tokens change by dialect.</p>
            <p><strong>Timezone?</strong> Switch between local and UTC for previews.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
