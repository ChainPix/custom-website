"use client";

import Link from "next/link";
import { parseExpression } from "cron-parser";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";

type FieldSet = Set<number>;
type FieldErrors = Partial<Record<"seconds" | "minutes" | "hours" | "dom" | "months" | "dow", string>>;

type FieldSelection = {
  every: boolean;
  values: number[];
};

const parseField = (field: string, min: number, max: number): FieldSet | null => {
  const set = new Set<number>();
  const parts = field.split(",");
  for (const part of parts) {
    if (part === "*") {
      for (let i = min; i <= max; i += 1) set.add(i);
      continue;
    }
    const stepSplit = part.split("/");
    const rangePart = stepSplit[0] ?? "";
    const step = stepSplit[1] ? Number(stepSplit[1]) : 1;
    if (Number.isNaN(step) || step <= 0) return null;

    if (rangePart === "*") {
      for (let i = min; i <= max; i += step) {
        set.add(i);
      }
      continue;
    }

    if (rangePart.includes("-")) {
      const [startStr, endStr] = rangePart.split("-");
      const start = Number(startStr);
      const end = Number(endStr);
      if ([start, end].some(Number.isNaN)) return null;
      if (max === 6 && end === 7) {
        if (start > 7) return null;
        for (let i = start; i <= 6; i += step) {
          if (i < min || i > max) return null;
          set.add(i);
        }
        if ((7 - start) % step === 0) {
          set.add(0);
        }
        continue;
      }
      for (let i = start; i <= end; i += step) {
        if (i < min || i > max) return null;
        set.add(i);
      }
    } else {
      const rawVal = Number(rangePart);
      const val = max === 6 && rawVal === 7 ? 0 : rawVal;
      if (Number.isNaN(val) || val < min || val > max) return null;
      set.add(val);
    }
  }
  return set;
};

const timezoneOptions = [
  "local",
  "UTC",
  "Asia/Colombo",
  "America/New_York",
  "Europe/London",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const formatters = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string, includeWeekday: boolean) => {
  const key = `${timeZone}:${includeWeekday ? "wd" : "base"}`;
  const cached = formatters.get(key);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone === "local" ? undefined : timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: includeWeekday ? "short" : undefined,
    hourCycle: "h23",
  });
  formatters.set(key, formatter);
  return formatter;
};

const getZonedParts = (date: Date, timeZone: string) => {
  const formatter = getFormatter(timeZone, true);
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayLabel = lookup("weekday");
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };
  return {
    year: Number(lookup("year")),
    month: Number(lookup("month")),
    day: Number(lookup("day")),
    hour: Number(lookup("hour")),
    minute: Number(lookup("minute")),
    second: Number(lookup("second")),
    weekday: weekdayMap[weekdayLabel] ?? 0,
  };
};

const formatDateInZone = (date: Date, timeZone: string) => {
  const formatter = getFormatter(timeZone, false);
  const parts = formatter.formatToParts(date);
  const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const formatted = `${lookup("year")}-${lookup("month")}-${lookup("day")} ${lookup("hour")}:${lookup("minute")}:${lookup("second")}`;
  return `${formatted} (${timeZone === "local" ? "local" : timeZone})`;
};

const vixieShortcuts: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const quartzShortcuts: Record<string, string> = {
  "@yearly": "0 0 0 1 1 ?",
  "@annually": "0 0 0 1 1 ?",
  "@monthly": "0 0 0 1 * ?",
  "@weekly": "0 0 0 ? * 0",
  "@daily": "0 0 0 * * ?",
  "@midnight": "0 0 0 * * ?",
  "@hourly": "0 0 * * * ?",
};

const expandShortcut = (expr: string, includeSeconds: boolean, quartzMode: boolean) => {
  const trimmed = expr.trim();
  const key = trimmed.toLowerCase();
  const shortcuts = quartzMode ? quartzShortcuts : vixieShortcuts;
  if (!shortcuts[key]) return trimmed;
  const base = shortcuts[key];
  return quartzMode ? base : includeSeconds ? `0 ${base}` : base;
};

const matchesNumericToken = (token: string, value: number, min: number, max: number, allowSundaySeven = false) => {
  if (token === "*" || token === "?") return true;
  const normalized = allowSundaySeven && token === "7" ? "0" : token;
  const [base, stepPart] = normalized.split("/");
  const step = stepPart ? Number(stepPart) : 1;
  if (Number.isNaN(step) || step <= 0) return false;
  const matchesRange = (start: number, end: number) => {
    if (value < start || value > end) return false;
    return ((value - start) % step) === 0;
  };

  if (base === "*") return ((value - min) % step) === 0;
  if (base.includes("-")) {
    const [startStr, endStr] = base.split("-");
    const start = Number(startStr);
    const end = Number(endStr);
    if ([start, end].some(Number.isNaN)) return false;
    return matchesRange(start, end);
  }
  const start = Number(base);
  if (Number.isNaN(start)) return false;
  if (stepPart) return matchesRange(start, max);
  return value === start;
};

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const getWeekdayForDate = (year: number, month: number, day: number, timeZone: string) => {
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return getZonedParts(probe, timeZone).weekday;
};

const nearestWeekday = (year: number, month: number, day: number, timeZone: string) => {
  const maxDay = daysInMonth(year, month);
  const target = Math.min(day, maxDay);
  const weekday = getWeekdayForDate(year, month, target, timeZone);
  if (weekday === 6) {
    if (target === 1) return 3;
    return target - 1;
  }
  if (weekday === 0) {
    if (target === maxDay) return target - 2;
    return target + 1;
  }
  return target;
};

const lastWeekdayOfMonth = (year: number, month: number, timeZone: string) => {
  const lastDay = daysInMonth(year, month);
  const weekday = getWeekdayForDate(year, month, lastDay, timeZone);
  if (weekday === 6) return lastDay - 1;
  if (weekday === 0) return lastDay - 2;
  return lastDay;
};

const lastWeekdayOfType = (year: number, month: number, weekday: number, timeZone: string) => {
  const lastDay = daysInMonth(year, month);
  for (let day = lastDay; day >= 1; day -= 1) {
    if (getWeekdayForDate(year, month, day, timeZone) === weekday) return day;
  }
  return lastDay;
};

const nthWeekdayOfType = (year: number, month: number, weekday: number, nth: number, timeZone: string) => {
  let count = 0;
  const maxDay = daysInMonth(year, month);
  for (let day = 1; day <= maxDay; day += 1) {
    if (getWeekdayForDate(year, month, day, timeZone) === weekday) {
      count += 1;
      if (count === nth) return day;
    }
  }
  return null;
};

const matchesQuartzDay = (domField: string, dowField: string, parts: ReturnType<typeof getZonedParts>, timeZone: string) => {
  const domTokens = domField.split(",").map((token) => token.trim()).filter(Boolean);
  const dowTokens = dowField.split(",").map((token) => token.trim()).filter(Boolean);
  const domIsQuestion = domTokens.length === 1 && domTokens[0] === "?";
  const dowIsQuestion = dowTokens.length === 1 && dowTokens[0] === "?";
  const domMatch = domTokens.some((token) => {
    if (token === "*" || token === "?") return true;
    if (token === "L") return parts.day === daysInMonth(parts.year, parts.month);
    if (token === "LW") return parts.day === lastWeekdayOfMonth(parts.year, parts.month, timeZone);
    if (/^\d+W$/.test(token)) {
      const target = Number(token.slice(0, -1));
      return parts.day === nearestWeekday(parts.year, parts.month, target, timeZone);
    }
    return matchesNumericToken(token, parts.day, 1, 31);
  });
  const dowMatch = dowTokens.some((token) => {
    if (token === "*" || token === "?") return true;
    const lastMatch = token.match(/^(\d|[0-7])L$/);
    if (lastMatch) {
      const weekday = Number(lastMatch[1]) % 7;
      return parts.day === lastWeekdayOfType(parts.year, parts.month, weekday, timeZone);
    }
    const nthMatch = token.match(/^(\d|[0-7])#(\d)$/);
    if (nthMatch) {
      const weekday = Number(nthMatch[1]) % 7;
      const nth = Number(nthMatch[2]);
      const day = nthWeekdayOfType(parts.year, parts.month, weekday, nth, timeZone);
      return day !== null && parts.day === day;
    }
    return matchesNumericToken(token, parts.weekday, 0, 6, true);
  });
  if (domIsQuestion && dowIsQuestion) return true;
  if (domIsQuestion) return dowMatch;
  if (dowIsQuestion) return domMatch;
  return domMatch && dowMatch;
};

const detectImpossibleSchedule = (expr: string, includeSeconds: boolean, quartzMode: boolean) => {
  const expanded = expandShortcut(expr, includeSeconds, quartzMode);
  const parts = expanded.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const baseParts = quartzMode ? parts.slice(0, 6) : parts;
  const normalizedParts = includeSeconds && !quartzMode && baseParts.length === 5 ? ["0", ...baseParts] : baseParts;
  if (normalizedParts.length !== 6 && !quartzMode) return "";
  if (normalizedParts.length < 5) return "";
  const [secField, minField, hourField, domField, monField] = normalizedParts;
  if ([secField, minField, hourField].some((field) => field.includes("L") || field.includes("W") || field.includes("#"))) return "";
  if (domField.includes("L") || domField.includes("W") || domField.includes("#")) return "";
  if (monField.includes("L") || monField.includes("W") || monField.includes("#")) return "";
  if (domField === "*" || domField === "?") return "";
  if (monField === "*") return "";
  const domSet = parseField(domField.replace("?", "*"), 1, 31);
  const monthSet = parseField(monField.replace("?", "*"), 1, 12);
  if (!domSet || !monthSet) return "";
  const domValues = [...domSet];
  const monthValues = [...monthSet];
  const hasPossible = monthValues.some((month) => {
    const maxDay = daysInMonth(2024, month);
    return domValues.some((day) => day <= maxDay || (day === 29 && month === 2));
  });
  return hasPossible ? "" : "No valid dates for the chosen month/day combination (e.g., Feb 31).";
};

const isSimpleField = (field: string) => /^(\*|\d+(,\d+)*)$/.test(field);

const parseSimpleField = (field: string): FieldSelection => {
  if (field === "*") return { every: true, values: [] };
  const values = field
    .split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  return { every: false, values };
};

const buildFieldFromSelection = (selection: FieldSelection) => {
  if (selection.every || !selection.values.length) return "*";
  return [...new Set(selection.values)].sort((a, b) => a - b).join(",");
};

const rangeOptions = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, idx) => min + idx);

const describeField = (field: string, label: string) => {
  if (field === "*") return `${label}: any`;
  return `${label}: ${field}`;
};

const humanizeField = (field: string, unit: string) => {
  if (field === "*") return `every ${unit}`;
  if (field.startsWith("*/")) {
    const step = Number(field.slice(2));
    if (!Number.isNaN(step)) return `every ${step} ${unit}${step === 1 ? "" : "s"}`;
  }
  if (/^\d+$/.test(field)) return `${unit} ${field}`;
  if (/^\d+(,\d+)+$/.test(field)) return `${unit}s ${field.split(",").join(", ")}`;
  if (/^\d+-\d+$/.test(field)) {
    const [start, end] = field.split("-");
    return `${unit}s ${start} through ${end}`;
  }
  return `${unit} ${field}`;
};

const humanizeCron = (expr: string, includeSeconds: boolean, quartzMode: boolean) => {
  const expanded = expandShortcut(expr, includeSeconds, quartzMode);
  const parts = expanded.trim().split(/\s+/);
  if (quartzMode) {
    if (parts.length < 6) return "";
    const [secField, minField, hourField, domField, monField, dowField] = parts;
    const pieces = [
      humanizeField(secField, "second"),
      humanizeField(minField, "minute"),
      humanizeField(hourField, "hour"),
      humanizeField(domField, "day-of-month"),
      humanizeField(monField, "month"),
      humanizeField(dowField, "day-of-week"),
    ];
    return `Schedule: ${pieces.join(", ")}`;
  }
  if (includeSeconds ? parts.length !== 6 : parts.length !== 5) return "";
  const [secField, minField, hourField, domField, monField, dowField] = includeSeconds
    ? parts
    : ["0", ...parts];
  const pieces = [
    includeSeconds ? humanizeField(secField, "second") : null,
    humanizeField(minField, "minute"),
    humanizeField(hourField, "hour"),
    humanizeField(domField, "day-of-month"),
    humanizeField(monField, "month"),
    humanizeField(dowField, "day-of-week"),
  ].filter(Boolean);
  return `Schedule: ${pieces.join(", ")}`;
};

const parseCronFields = (expr: string, includeSeconds: boolean) => {
  const parts = expr.trim().split(/\s+/);
  const fieldErrors: FieldErrors = {};
  if (includeSeconds ? parts.length !== 6 : parts.length !== 5) {
    return {
      error: includeSeconds ? "Cron must have 6 fields: s m h dom mon dow" : "Cron must have 5 fields: m h dom mon dow",
      fieldErrors,
      fields: null,
    };
  }

  const [secField, minField, hourField, domField, monField, dowField] = includeSeconds
    ? parts
    : ["0", ...parts];

  const seconds = includeSeconds ? parseField(secField, 0, 59) : new Set([0]);
  if (includeSeconds && !seconds) fieldErrors.seconds = "Invalid seconds field.";
  const minutes = parseField(minField, 0, 59);
  if (!minutes) fieldErrors.minutes = "Invalid minutes field.";
  const hours = parseField(hourField, 0, 23);
  if (!hours) fieldErrors.hours = "Invalid hours field.";
  const dom = parseField(domField, 1, 31);
  if (!dom) fieldErrors.dom = "Invalid day-of-month field.";
  const months = parseField(monField, 1, 12);
  if (!months) fieldErrors.months = "Invalid month field.";
  const dow = parseField(dowField, 0, 6); // 0=Sunday
  if (!dow) fieldErrors.dow = "Invalid day-of-week field.";

  if (Object.keys(fieldErrors).length) {
    return {
      error: Object.values(fieldErrors)[0] ?? "Invalid field values.",
      fieldErrors,
      fields: null,
    };
  }

  return {
    error: "",
    fieldErrors,
    fields: { seconds: seconds ?? new Set([0]), minutes, hours, dom, months, dow },
  };
};

const computeNextRuns = (
  expr: string,
  count = 5,
  includeSeconds = false,
  timeZone = "local",
  quartzMode = false,
) => {
  const expanded = expandShortcut(expr, includeSeconds, quartzMode);
  const impossibleReason = detectImpossibleSchedule(expanded, includeSeconds, quartzMode);
  if (impossibleReason) {
    return { error: impossibleReason, runs: [], fieldErrors: {} as FieldErrors };
  }

  const parts = expanded.trim().split(/\s+/).filter(Boolean);
  if (!quartzMode) {
    const normalized = includeSeconds && parts.length === 5 ? `0 ${expanded}` : !includeSeconds && parts.length === 6 ? parts.slice(1).join(" ") : expanded;
    const parsed = parseCronFields(normalized, includeSeconds);
    if (parsed.error || !parsed.fields) {
      return { error: parsed.error, runs: [], fieldErrors: parsed.fieldErrors };
    }
    try {
      const iterator = parseExpression(normalized, {
        currentDate: new Date(),
        tz: timeZone === "local" ? undefined : timeZone,
      });
      const runs: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const next = iterator.next();
        const nextDate = typeof next?.toDate === "function" ? next.toDate() : next;
        if (!(nextDate instanceof Date)) {
          return { error: "Unable to compute next run time.", runs: [], fieldErrors: parsed.fieldErrors };
        }
        runs.push(formatDateInZone(nextDate, timeZone));
      }
      return { error: "", runs, fieldErrors: parsed.fieldErrors };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid cron expression.";
      return { error: message, runs: [], fieldErrors: parsed.fieldErrors };
    }
  }

  if (parts.length !== 6 && parts.length !== 7) {
    return { error: "Quartz cron must have 6 or 7 fields: s m h dom mon dow [year]", runs: [], fieldErrors: {} as FieldErrors };
  }
  const [secField, minField, hourField, domField, monField, dowField, yearField = "*"] = parts;
  const normalizedDom = domField.replace(/\?/g, "*");
  const normalizedDow = dowField.replace(/\?/g, "*");
  const baseDom = /[LW#]/.test(domField) ? "*" : normalizedDom;
  const baseDow = /[LW#]/.test(dowField) ? "*" : normalizedDow;
  const baseExpr = `${secField} ${minField} ${hourField} ${baseDom} ${monField} ${baseDow}`;
  const needsFilter = /[LW#?]/.test(domField) || /[LW#?]/.test(dowField) || yearField !== "*";
  try {
    const iterator = parseExpression(baseExpr, {
      currentDate: new Date(),
      tz: timeZone === "local" ? undefined : timeZone,
    });
    const runs: string[] = [];
    let attempts = 0;
    const attemptsCap = count * 500;
    while (runs.length < count && attempts < attemptsCap) {
      const next = iterator.next();
      const nextDate = typeof next?.toDate === "function" ? next.toDate() : next;
      if (!(nextDate instanceof Date)) {
        return { error: "Unable to compute next run time.", runs: [], fieldErrors: {} as FieldErrors };
      }
      if (needsFilter) {
        const partsForDate = getZonedParts(nextDate, timeZone);
        const yearMatch = matchesNumericToken(yearField, partsForDate.year, 1970, 2199);
        const dayMatch = matchesQuartzDay(domField, dowField, partsForDate, timeZone);
        if (yearMatch && dayMatch) {
          runs.push(formatDateInZone(nextDate, timeZone));
        }
      } else {
        runs.push(formatDateInZone(nextDate, timeZone));
      }
      attempts += 1;
    }
    if (!runs.length) {
      return { error: "No occurrences found soon. Check the expression.", runs: [], fieldErrors: {} as FieldErrors };
    }
    return { error: "", runs, fieldErrors: {} as FieldErrors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid cron expression.";
    return { error: message, runs: [], fieldErrors: {} as FieldErrors };
  }
};

export default function CronParserClient() {
  const [expr, setExpr] = useState("*/5 * * * *");
  const [runs, setRuns] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [impossibleReason, setImpossibleReason] = useState("");
  const [status, setStatus] = useState("Ready");
  const [useSeconds, setUseSeconds] = useState(false);
  const [timezone, setTimezone] = useState("local");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareTimezone, setCompareTimezone] = useState("UTC");
  const [compareRuns, setCompareRuns] = useState<string[]>([]);
  const [compareError, setCompareError] = useState("");
  const [quartzMode, setQuartzMode] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [fieldEditorNotice, setFieldEditorNotice] = useState("");
  const [debouncing, setDebouncing] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [fieldSelections, setFieldSelections] = useState<Record<string, FieldSelection>>({
    seconds: { every: true, values: [] },
    minutes: { every: true, values: [] },
    hours: { every: true, values: [] },
    dom: { every: true, values: [] },
    months: { every: true, values: [] },
    dow: { every: true, values: [] },
  });
  const initializedRef = useRef(false);
  const lastSavedExprRef = useRef("");
  const storageKeys = {
    recent: "cron-parser:recent",
    favorites: "cron-parser:favorites",
  };

  const saveRecent = (value: string) => {
    if (!value.trim()) return;
    if (value === lastSavedExprRef.current) return;
    const updated = [value, ...recent.filter((item) => item !== value)].slice(0, 8);
    setRecent(updated);
    lastSavedExprRef.current = value;
    localStorage.setItem(storageKeys.recent, JSON.stringify(updated));
  };

  const toggleFavorite = (value: string) => {
    const updated = favorites.includes(value)
      ? favorites.filter((item) => item !== value)
      : [value, ...favorites];
    setFavorites(updated);
    localStorage.setItem(storageKeys.favorites, JSON.stringify(updated));
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const exprParam = params.get("expr");
    const utcParam = params.get("utc");
    const secParam = params.get("sec");
    const tzParam = params.get("tz");
    const compareParam = params.get("cmp");
    const compareTzParam = params.get("ctz");
    const quartzParam = params.get("quartz");
    const storedRecent = localStorage.getItem(storageKeys.recent);
    const storedFavorites = localStorage.getItem(storageKeys.favorites);
    if (exprParam) setExpr(exprParam);
    if (utcParam === "1") setTimezone("UTC");
    if (secParam === "1") setUseSeconds(true);
    if (tzParam) setTimezone(tzParam);
    if (compareParam === "1") setCompareEnabled(true);
    if (compareTzParam) setCompareTimezone(compareTzParam);
    if (quartzParam === "1") setQuartzMode(true);
    try {
      if (storedRecent) setRecent(JSON.parse(storedRecent));
      if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
    } catch {
      setRecent([]);
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;
    const params = new URLSearchParams();
    if (expr.trim()) params.set("expr", expr.trim());
    if (useSeconds) params.set("sec", "1");
    if (timezone !== "local") params.set("tz", timezone);
    if (compareEnabled) params.set("cmp", "1");
    if (compareEnabled && compareTimezone) params.set("ctz", compareTimezone);
    if (quartzMode) params.set("quartz", "1");
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [expr, useSeconds, timezone, compareEnabled, compareTimezone, quartzMode]);

  useEffect(() => {
    if (!editorMode) return;
    const parts = expr.trim().split(/\s+/);
    if (useSeconds ? parts.length !== 6 : parts.length !== 5) return;
    const [secField, minField, hourField, domField, monField, dowField] = useSeconds
      ? parts
      : ["0", ...parts];
    if ([secField, minField, hourField, domField, monField, dowField].some((field) => !isSimpleField(field))) {
      setFieldEditorNotice("Field editor supports numeric lists only. Use advanced text mode for ranges/steps.");
      setEditorMode(false);
      return;
    }
    setFieldSelections({
      seconds: parseSimpleField(secField),
      minutes: parseSimpleField(minField),
      hours: parseSimpleField(hourField),
      dom: parseSimpleField(domField),
      months: parseSimpleField(monField),
      dow: parseSimpleField(dowField),
    });
  }, [editorMode]);

  useEffect(() => {
    if (!editorMode) return;
    const nextExprParts = [
      useSeconds ? buildFieldFromSelection(fieldSelections.seconds) : null,
      buildFieldFromSelection(fieldSelections.minutes),
      buildFieldFromSelection(fieldSelections.hours),
      buildFieldFromSelection(fieldSelections.dom),
      buildFieldFromSelection(fieldSelections.months),
      buildFieldFromSelection(fieldSelections.dow),
    ].filter((part) => part !== null) as string[];
    const nextExpr = nextExprParts.join(" ");
    setExpr(nextExpr);
  }, [fieldSelections, editorMode, useSeconds]);

  useEffect(() => {
    setDebouncing(true);
    const timer = window.setTimeout(() => {
      const result = computeNextRuns(expr, 6, useSeconds, timezone, quartzMode);
      setError(result.error);
      setRuns(result.runs);
      setFieldErrors(result.fieldErrors ?? {});
      setImpossibleReason(result.error && result.error.includes("No valid dates") ? result.error : "");
      setStatus(result.error ? "Parse failed" : "Parsed");
      if (!result.error) saveRecent(expr);
      if (compareEnabled) {
        const compareResult = computeNextRuns(expr, 6, useSeconds, compareTimezone, quartzMode);
        setCompareRuns(compareResult.runs);
        setCompareError(compareResult.error);
      } else {
        setCompareRuns([]);
        setCompareError("");
      }
      setDebouncing(false);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [expr, useSeconds, timezone, compareEnabled, compareTimezone, quartzMode]);

  const summary = useMemo(() => {
    const expanded = expandShortcut(expr, useSeconds, quartzMode);
    const parts = expanded.trim().split(/\s+/);
    if (quartzMode) {
      if (parts.length !== 6 && parts.length !== 7) return "Quartz cron must have 6 or 7 fields.";
      const [s, m, h, dom, mon, dow] = parts;
      return [
        describeField(s, "Second"),
        describeField(m, "Minute"),
        describeField(h, "Hour"),
        describeField(dom, "Day"),
        describeField(mon, "Month"),
        describeField(dow, "Weekday"),
      ]
        .filter(Boolean)
        .join(" • ");
    }
    if (useSeconds ? parts.length !== 6 : parts.length !== 5)
      return useSeconds ? "Cron must have 6 fields." : "Cron must have 5 fields.";
    const [s, m, h, dom, mon, dow] = useSeconds ? parts : ["0", ...parts];
    return [
      useSeconds ? describeField(s, "Second") : null,
      describeField(m, "Minute"),
      describeField(h, "Hour"),
      describeField(dom, "Day"),
      describeField(mon, "Month"),
      describeField(dow, "Weekday"),
    ]
      .filter(Boolean)
      .join(" • ");
  }, [expr, useSeconds, quartzMode]);

  const humanSummary = useMemo(() => humanizeCron(expr, useSeconds, quartzMode), [expr, useSeconds, quartzMode]);
  const minuteOptions = useMemo(() => rangeOptions(0, 59), []);
  const hourOptions = useMemo(() => rangeOptions(0, 23), []);
  const domOptions = useMemo(() => rangeOptions(1, 31), []);
  const monthOptions = useMemo(() => rangeOptions(1, 12), []);
  const dowOptions = useMemo(() => rangeOptions(0, 6), []);
  const secondOptions = useMemo(() => rangeOptions(0, 59), []);

  const handleParse = () => {
    const result = computeNextRuns(expr, 6, useSeconds, timezone, quartzMode);
    setError(result.error);
    setRuns(result.runs);
    setFieldErrors(result.fieldErrors ?? {});
    setImpossibleReason(result.error && result.error.includes("No valid dates") ? result.error : "");
    setStatus(result.error ? "Parse failed" : "Parsed");
    if (!result.error) saveRecent(expr);
    if (compareEnabled) {
      const compareResult = computeNextRuns(expr, 6, useSeconds, compareTimezone, quartzMode);
      setCompareRuns(compareResult.runs);
      setCompareError(compareResult.error);
    } else {
      setCompareRuns([]);
      setCompareError("");
    }
  };

  const handleSecondsToggle = (checked: boolean) => {
    if (quartzMode) return;
    setUseSeconds(checked);
    const parts = expr.trim().split(/\s+/);
    if (checked && parts.length === 5) {
      setExpr(`0 ${expr.trim()}`);
    } else if (!checked && parts.length === 6) {
      setExpr(parts.slice(1).join(" "));
    }
  };

  useEffect(() => {
    if (quartzMode && !useSeconds) {
      setUseSeconds(true);
    }
  }, [quartzMode, useSeconds]);

  useEffect(() => {
    if (quartzMode && editorMode) {
      setEditorMode(false);
      setFieldEditorNotice("Field editor is available for standard numeric cron; use advanced text mode for Quartz.");
    }
  }, [quartzMode, editorMode]);

  useEffect(() => {
    if (!quartzMode) return;
    const parts = expr.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 5) {
      setExpr(`0 ${expr.trim()}`);
    }
  }, [quartzMode]);

  const handleEditorToggle = (checked: boolean) => {
    if (!checked) {
      setEditorMode(false);
      setFieldEditorNotice("");
      return;
    }
    if (quartzMode) {
      setFieldEditorNotice("Field editor is available for standard numeric cron; use advanced text mode for Quartz.");
      return;
    }
    const parts = expr.trim().split(/\s+/);
    if (useSeconds ? parts.length !== 6 : parts.length !== 5) {
      setFieldEditorNotice("Field editor needs a complete cron expression. Fix the field count first.");
      return;
    }
    const fields = useSeconds ? parts : ["0", ...parts];
    if (fields.some((field) => !isSimpleField(field))) {
      setFieldEditorNotice("Field editor supports numeric lists only. Use advanced text mode for ranges/steps.");
      return;
    }
    setFieldEditorNotice("");
    setEditorMode(true);
  };

  const buildShareUrl = () => {
    const params = new URLSearchParams();
    if (expr.trim()) params.set("expr", expr.trim());
    if (useSeconds) params.set("sec", "1");
    if (timezone !== "local") params.set("tz", timezone);
    if (compareEnabled) params.set("cmp", "1");
    if (compareEnabled && compareTimezone) params.set("ctz", compareTimezone);
    if (quartzMode) params.set("quartz", "1");
    const query = params.toString();
    return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
  };

  const copyText = (text: string, nextStatus: string) => {
    navigator.clipboard.writeText(text);
    setStatus(nextStatus);
  };

  const handleShare = () => {
    copyText(buildShareUrl(), "Copied share link");
  };

  const handleCopyCrontab = () => {
    copyText(`${expr} command`, "Copied crontab line");
  };

  const handleCopyK8s = () => {
    const snippet = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: example
spec:
  schedule: "${expr}"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: job
              image: busybox
              args: ["echo", "hello"]
          restartPolicy: OnFailure`;
    copyText(snippet, "Copied Kubernetes CronJob");
  };

  const handleCopyGithub = () => {
    const snippet = `on:
  schedule:
    - cron: "${expr}"`;
    copyText(snippet, "Copied GitHub Actions schedule");
  };

  const updateSelection = (key: string, values: number[]) => {
    setFieldSelections((prev) => ({
      ...prev,
      [key]: { ...prev[key], values, every: values.length ? false : prev[key].every },
    }));
  };

  const updateEvery = (key: string, every: boolean) => {
    setFieldSelections((prev) => ({
      ...prev,
      [key]: { ...prev[key], every, values: every ? [] : prev[key].values },
    }));
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
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
              Cron Parser
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Cron Parser</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Validate cron expressions and view upcoming run times across timezones with live feedback.
        </p>
      </header>

      <div
        className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
        role="region"
        aria-label="Cron input and options"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={expr}
            onChange={(event) => setExpr(event.target.value)}
            className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="*/5 * * * *"
            spellCheck={false}
            disabled={editorMode}
          />
          <button
            onClick={handleParse}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            aria-label="Parse cron expression"
          >
            Parse
          </button>
          <button
            onClick={() => {
              setExpr("*/5 * * * *");
              setRuns([]);
              setError("");
              setStatus("Reset to default");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset cron expression"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleShare}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Copy shareable link"
          >
            Share
          </button>
          <button
            onClick={() => toggleFavorite(expr)}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Toggle favorite cron expression"
          >
            {favorites.includes(expr) ? "Starred" : "Star"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={useSeconds}
              onChange={(e) => handleSecondsToggle(e.target.checked)}
              disabled={quartzMode}
            />
            6-field (include seconds)
          </label>
          <label className="flex items-center gap-2">
            Timezone
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezoneOptions.map((zone) => (
                <option key={zone} value={zone}>
                  {zone === "local" ? "Local" : zone}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
            />
            Compare
          </label>
          {compareEnabled ? (
            <label className="flex items-center gap-2">
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                value={compareTimezone}
                onChange={(e) => setCompareTimezone(e.target.value)}
              >
                {timezoneOptions.map((zone) => (
                  <option key={`compare-${zone}`} value={zone}>
                    {zone === "local" ? "Local" : zone}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={quartzMode}
              onChange={(e) => setQuartzMode(e.target.checked)}
            />
            Quartz mode
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={editorMode}
              onChange={(e) => handleEditorToggle(e.target.checked)}
            />
            Field editor
          </label>
          {debouncing ? <span className="text-xs text-slate-500">Validating…</span> : null}
        </div>
        {fieldEditorNotice ? (
          <p className="text-xs font-medium text-amber-700" role="alert">
            {fieldEditorNotice}
          </p>
        ) : null}
        {Object.keys(fieldErrors).length ? (
          <div className="text-xs text-amber-700" role="alert">
            {Object.entries(fieldErrors)
              .map(([key, message]) => `${key}: ${message}`)
              .join(" • ")}
          </div>
        ) : null}
        {impossibleReason && impossibleReason !== error ? (
          <div className="text-xs text-amber-700" role="alert">
            {impossibleReason}
          </div>
        ) : null}
        {quartzMode ? (
          <p className="text-xs text-slate-500">
            Quartz mode expects 6 or 7 fields and supports ?, L, W, and # in day-of-month/day-of-week.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Examples:</span>
          <button
            type="button"
            onClick={() => setExpr("*/5 * * * *")}
            className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Every 5 minutes
          </button>
          <button
            type="button"
            onClick={() => setExpr("0 * * * *")}
            className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Hourly on the hour
          </button>
          <button
            type="button"
            onClick={() => setExpr("0 2 * * *")}
            className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Daily at 2 AM
          </button>
          <button
            type="button"
            onClick={() => setExpr("0 9-17 * * 1-5")}
            className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Weekdays 9-5
          </button>
          <button
            type="button"
            onClick={() => setExpr("0 0 1 * *")}
            className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            First of month
          </button>
        </div>
        {editorMode ? (
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-700 md:grid-cols-3">
            {useSeconds ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Seconds</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                      checked={fieldSelections.seconds.every}
                      onChange={(e) => updateEvery("seconds", e.target.checked)}
                    />
                    Every
                  </label>
                </div>
                <select
                  multiple
                  className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2"
                  disabled={fieldSelections.seconds.every}
                  value={fieldSelections.seconds.values.map(String)}
                  onChange={(e) =>
                    updateSelection(
                      "seconds",
                      Array.from(e.target.selectedOptions).map((option) => Number(option.value)),
                    )
                  }
                >
                  {secondOptions.map((value) => (
                    <option key={`sec-${value}`} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                {fieldErrors.seconds ? <span className="text-amber-700">{fieldErrors.seconds}</span> : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>Minutes</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={fieldSelections.minutes.every}
                    onChange={(e) => updateEvery("minutes", e.target.checked)}
                  />
                  Every
                </label>
              </div>
              <select
                multiple
                className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2"
                disabled={fieldSelections.minutes.every}
                value={fieldSelections.minutes.values.map(String)}
                onChange={(e) =>
                  updateSelection(
                    "minutes",
                    Array.from(e.target.selectedOptions).map((option) => Number(option.value)),
                  )
                }
              >
                {minuteOptions.map((value) => (
                  <option key={`min-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.minutes ? <span className="text-amber-700">{fieldErrors.minutes}</span> : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>Hours</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={fieldSelections.hours.every}
                    onChange={(e) => updateEvery("hours", e.target.checked)}
                  />
                  Every
                </label>
              </div>
              <select
                multiple
                className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2"
                disabled={fieldSelections.hours.every}
                value={fieldSelections.hours.values.map(String)}
                onChange={(e) =>
                  updateSelection(
                    "hours",
                    Array.from(e.target.selectedOptions).map((option) => Number(option.value)),
                  )
                }
              >
                {hourOptions.map((value) => (
                  <option key={`hour-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.hours ? <span className="text-amber-700">{fieldErrors.hours}</span> : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>Day of month</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={fieldSelections.dom.every}
                    onChange={(e) => updateEvery("dom", e.target.checked)}
                  />
                  Every
                </label>
              </div>
              <select
                multiple
                className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2"
                disabled={fieldSelections.dom.every}
                value={fieldSelections.dom.values.map(String)}
                onChange={(e) =>
                  updateSelection(
                    "dom",
                    Array.from(e.target.selectedOptions).map((option) => Number(option.value)),
                  )
                }
              >
                {domOptions.map((value) => (
                  <option key={`dom-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.dom ? <span className="text-amber-700">{fieldErrors.dom}</span> : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>Month</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={fieldSelections.months.every}
                    onChange={(e) => updateEvery("months", e.target.checked)}
                  />
                  Every
                </label>
              </div>
              <select
                multiple
                className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2"
                disabled={fieldSelections.months.every}
                value={fieldSelections.months.values.map(String)}
                onChange={(e) =>
                  updateSelection(
                    "months",
                    Array.from(e.target.selectedOptions).map((option) => Number(option.value)),
                  )
                }
              >
                {monthOptions.map((value) => (
                  <option key={`mon-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.months ? <span className="text-amber-700">{fieldErrors.months}</span> : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>Day of week</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={fieldSelections.dow.every}
                    onChange={(e) => updateEvery("dow", e.target.checked)}
                  />
                  Every
                </label>
              </div>
              <select
                multiple
                className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2"
                disabled={fieldSelections.dow.every}
                value={fieldSelections.dow.values.map(String)}
                onChange={(e) =>
                  updateSelection(
                    "dow",
                    Array.from(e.target.selectedOptions).map((option) => Number(option.value)),
                  )
                }
              >
                {dowOptions.map((value) => (
                  <option key={`dow-${value}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.dow ? <span className="text-amber-700">{fieldErrors.dow}</span> : null}
            </div>
          </div>
        ) : null}
        <p className="text-sm text-slate-600">{summary}</p>
        {humanSummary ? <p className="text-sm text-slate-600">{humanSummary}</p> : null}
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-label="Next run times"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <span>Next runs ({runs.length || 0})</span>
          <div className="flex items-center gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(runs.join("\n"));
                setStatus("Copied runs");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!runs.length}
              aria-label="Copy next runs"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([runs.join("\n")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "cron-runs.txt";
                link.click();
                URL.revokeObjectURL(url);
                setStatus("Downloaded runs");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20 disabled:opacity-40"
              disabled={!runs.length}
              aria-label="Download next runs"
            >
              Download
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
          <span className="font-semibold text-slate-100">Copy as:</span>
          <button
            type="button"
            onClick={handleCopyCrontab}
            className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
          >
            Crontab line
          </button>
          <button
            type="button"
            onClick={handleCopyK8s}
            className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
          >
            Kubernetes CronJob
          </button>
          <button
            type="button"
            onClick={handleCopyGithub}
            className="rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
          >
            GitHub Actions
          </button>
        </div>
        <div className={`grid ${compareEnabled ? "md:grid-cols-2" : ""}`}>
          <div className={`divide-y divide-slate-800 ${compareEnabled ? "md:border-r md:border-slate-800" : ""}`}>
            <div className="px-4 py-2 text-xs font-semibold text-slate-300">
              Primary ({timezone === "local" ? "Local" : timezone})
            </div>
            {error ? (
              <div className="px-4 py-3 text-sm text-amber-300">{error}</div>
            ) : runs.length ? (
              runs.map((r, idx) => (
                <div key={`${r}-${idx}`} className="flex items-start gap-3 px-4 py-3 text-sm text-slate-100">
                  <span className="mt-0.5 text-xs text-slate-400">{idx + 1}.</span>
                  <span>{r}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-300">Parse to view upcoming times.</div>
            )}
          </div>
          {compareEnabled ? (
            <div className="divide-y divide-slate-800">
              <div className="px-4 py-2 text-xs font-semibold text-slate-300">
                Compare ({compareTimezone === "local" ? "Local" : compareTimezone})
              </div>
              {compareError ? (
                <div className="px-4 py-3 text-sm text-amber-300">{compareError}</div>
              ) : compareRuns.length ? (
                compareRuns.map((r, idx) => (
                  <div key={`compare-${r}-${idx}`} className="flex items-start gap-3 px-4 py-3 text-sm text-slate-100">
                    <span className="mt-0.5 text-xs text-slate-400">{idx + 1}.</span>
                    <span>{r}</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-300">Enable compare to view runs.</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">History & favorites</h2>
          <span className="text-xs text-slate-500">Saved locally</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Recent</p>
            {recent.length ? (
              <div className="flex flex-wrap gap-2">
                {recent.map((item) => (
                  <button
                    key={`recent-${item}`}
                    type="button"
                    onClick={() => setExpr(item)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No recent expressions yet.</p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Favorites</p>
            {favorites.length ? (
              <div className="flex flex-wrap gap-2">
                {favorites.map((item) => (
                  <button
                    key={`fav-${item}`}
                    type="button"
                    onClick={() => setExpr(item)}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Star expressions to save them here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a 5-field cron (or enable seconds for 6-field); live validation updates as you type.</li>
          <li>Enable the field editor for quick numeric lists, or stay in advanced text mode for ranges/steps.</li>
          <li>Switch timezones or compare two to preview schedule differences.</li>
          <li>Share links, copy snippets, or download run times for documentation.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser.</p>
          <p><strong>Supported format?</strong> Vixie-style numeric cron (5 fields, optional seconds) with lists/ranges/steps + shortcuts like @daily. Quartz mode supports 6/7 fields with ?, L, W, and #.</p>
          <p><strong>Timezone?</strong> Choose a timezone or compare two side-by-side. Links preserve selections.</p>
        </div>
      </div>
    </main>
  );
}
