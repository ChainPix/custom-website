"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

const validateDomExpr = (expr: string, config: DialectConfig) => {
  if (config.allowQuestion && expr === "?") return true;
  const parts = splitParts(expr);
  if (!parts.length) return false;
  for (const part of parts) {
    if (config.allowSpecial && part === "L") continue;
    if (config.allowSpecial && /^(?:[1-9]|[12][0-9]|3[01])W$/.test(part)) continue;
    const parsed = parseSimpleList(part, 1, 31);
    if (!parsed.valid) return false;
  }
  return true;
};

const validateDowExpr = (expr: string, config: DialectConfig) => {
  if (config.allowQuestion && expr === "?") return true;
  const parts = splitParts(expr);
  if (!parts.length) return false;
  for (const part of parts) {
    if (config.allowSpecial && /^([1-7])L$/.test(part)) continue;
    if (config.allowSpecial && /^([1-7])#([1-5])$/.test(part)) continue;
    const parsed = parseSimpleList(part, config.dowMin, config.dowMax);
    if (!parsed.valid) return false;
  }
  return true;
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

const detectDomSpecial = (value: string) => /L|W/.test(value);

const detectDowSpecial = (value: string) => /L|#/.test(value);

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
  const [mounted, setMounted] = useState(false);
  const MAX_LEN = 80;

  const config = DIALECTS[dialect];
  const fieldOrder = useMemo(() => getFieldOrder(dialect, includeYear), [dialect, includeYear]);

  const parsedFields = useMemo(() => {
    const build = (expr: string, min: number, max: number) => {
      const parsed = parseSimpleList(expr, min, max);
      return { set: new Set(parsed.values), valid: parsed.valid };
    };
    const domValue = picker.dom.trim();
    const dowValue = picker.dow.trim();
    const domHasSpecial = config.allowSpecial && detectDomSpecial(domValue);
    const dowHasSpecial = config.allowSpecial && detectDowSpecial(dowValue);
    return {
      seconds: build(picker.seconds, 0, 59),
      minutes: build(picker.minutes, 0, 59),
      hours: build(picker.hours, 0, 23),
      dom: domValue === "?" || domHasSpecial ? null : build(picker.dom, 1, 31),
      mon: build(picker.mon, 1, 12),
      dow: dowValue === "?" || dowHasSpecial ? null : build(picker.dow, config.dowMin, config.dowMax),
      year: build(picker.year, 1970, 2099),
      domHasSpecial,
      dowHasSpecial,
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

  const errors = useMemo(() => {
    const errs: string[] = [];
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
        errs.push(`${field.label} cannot be empty.`);
        return;
      }
      if (field.key === "dom") {
        if (!validateDomExpr(val, config)) {
          errs.push(`${field.label} has invalid values for ${config.label}.`);
        }
        return;
      }
      if (field.key === "dow") {
        if (!validateDowExpr(val, config)) {
          errs.push(`${field.label} has invalid values for ${config.label}.`);
        }
        return;
      }
      if (field.key === "year") {
        if (!parsedFields.year.valid) errs.push(`${field.label} must be between 1970-2099.`);
        return;
      }
      if (field.key === "seconds") {
        if (!parsedFields.seconds.valid) errs.push(`${field.label} must be between 0-59.`);
        return;
      }
      if (field.key === "minutes") {
        if (!parsedFields.minutes.valid) errs.push(`${field.label} must be between 0-59.`);
        return;
      }
      if (field.key === "hours") {
        if (!parsedFields.hours.valid) errs.push(`${field.label} must be between 0-23.`);
        return;
      }
      if (field.key === "mon") {
        if (!parsedFields.mon.valid) errs.push(`${field.label} must be between 1-12.`);
      }
    });
    if (config.requireQuestion) {
      const domIsQuestion = picker.dom.trim() === "?";
      const dowIsQuestion = picker.dow.trim() === "?";
      if (domIsQuestion === dowIsQuestion) {
        errs.push("For this dialect, set exactly one of Day of month or Day of week to '?'.");
      }
    }
    return errs;
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

    const domMatches =
      picker.dom.trim() === "?"
        ? true
        : config.allowSpecial && parsedFields.domHasSpecial
          ? matchDom(picker.dom, parts.year, parts.mon - 1, parts.dom, dialect)
          : parsedFields.dom?.set.has(parts.dom) ?? false;
    const dowMatches =
      picker.dow.trim() === "?"
        ? true
        : config.allowSpecial && parsedFields.dowHasSpecial
          ? matchDow(picker.dow, parts.year, parts.mon - 1, parts.dom, dialect)
          : parsedFields.dow?.set.has(parts.dow) ?? false;

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

  const nextRuns = useMemo(() => {
    if (!mounted || errors.length) return [];
    const runs: string[] = [];
    let cursor = new Date();
    cursor.setSeconds(cursor.getSeconds() + 1);
    let iterations = 0;
    const stepMs = config.supportsSeconds ? 1000 : 60000;
    while (runs.length < 5 && iterations < 5000) {
      if (matchesCron(cursor)) {
        runs.push(
          timeZone === "local"
            ? cursor.toLocaleString()
            : cursor.toLocaleString("en-US", { timeZone, hour12: false }),
        );
      }
      cursor = new Date(cursor.getTime() + stepMs);
      iterations += 1;
    }
    return runs;
  }, [config.supportsSeconds, errors.length, matchesCron, mounted, timeZone]);

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

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
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
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder={fieldPlaceholders[field]}
                aria-label={`${FIELD_LABELS[field]} field`}
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
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-800 ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">Cron</p>
          <p className="font-mono text-sm text-slate-700">{cron}</p>
          <p className="mt-2 text-slate-700">{summary}</p>
          <p className="mt-2 text-xs text-slate-600">
            DOM/DOW semantics: {config.domDowMode === "or" ? "OR (either may match)" : "AND (use ? in one field)"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-700">
            {nextRuns.length ? <span className="text-slate-600">Upcoming runs ({displayTimezone})</span> : null}
          </div>
          {nextRuns.length ? (
            <ul className="mt-2 space-y-1 text-slate-700">
              {nextRuns.map((run) => (
                <li
                  key={run}
                  className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-1 ring-1 ring-slate-200"
                >
                  <span className="text-sm">{run}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-slate-600">Adjust fields to see the next run times.</p>
          )}
          {errors.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-700">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-semibold text-slate-900">How to use</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
            <li>Select the cron dialect and fill in the fields or choose a preset.</li>
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
