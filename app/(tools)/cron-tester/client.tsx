"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Link2, RefreshCcw } from "lucide-react";
import { parseExpression } from "cron-parser";

const describeField = (field: string, label: string) => {
  if (field === "*") return `${label}: any`;
  return `${label}: ${field}`;
};

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateWithTimezone = (d: Date, timezone: string) => {
  if (timezone === "local") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}:${pad(d.getSeconds())} (local)`;
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(d);
    const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
    return `${lookup("year")}-${lookup("month")}-${lookup("day")} ${lookup("hour")}:${lookup("minute")}:${lookup(
      "second"
    )} (${timezone})`;
  } catch (err) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}:${pad(d.getSeconds())} (local)`;
  }
};

const getZonedParts = (d: Date, timezone: string) => {
  const tz = timezone === "local" ? undefined : timezone;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(d);
  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return {
    year: Number(lookup("year")),
    month: Number(lookup("month")),
    day: Number(lookup("day")),
  };
};

const getWeekdayIndex = (d: Date, timezone: string) => {
  const tz = timezone === "local" ? undefined : timezone;
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  const label = formatter.format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? 0;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const describeNumberList = (values: number[], formatter: (value: number) => string) => {
  if (!values.length) return "";
  if (values.length === 1) return formatter(values[0]);
  if (values.length === 2) return `${formatter(values[0])} and ${formatter(values[1])}`;
  return `${values.slice(0, -1).map(formatter).join(", ")}, and ${formatter(values[values.length - 1])}`;
};

const describeStringList = (values: string[]) => {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
};

const parseListField = (field: string) => field.split(",").map((part) => part.trim()).filter(Boolean);

const parseRange = (part: string) => {
  const [startStr, endStr] = part.split("-");
  if (!startStr || !endStr) return null;
  const start = Number(startStr);
  const end = Number(endStr);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
};

const parseStep = (part: string) => {
  if (!part.includes("/")) return null;
  const [base, stepStr] = part.split("/");
  const step = Number(stepStr);
  if (!base || Number.isNaN(step) || step <= 0) return null;
  return { base, step };
};

type FieldDescriptor =
  | { kind: "any" }
  | { kind: "single"; value: number }
  | { kind: "range"; start: number; end: number }
  | { kind: "step"; step: number }
  | { kind: "list"; values: number[] }
  | { kind: "custom"; raw: string };

const describeFieldDescriptor = (field: string): FieldDescriptor => {
  if (field === "*") return { kind: "any" };
  const step = parseStep(field);
  if (step && step.base === "*") return { kind: "step", step: step.step };
  const range = parseRange(field);
  if (range) return { kind: "range", start: range.start, end: range.end };
  if (/^\d+$/.test(field)) return { kind: "single", value: Number(field) };
  const parts = parseListField(field);
  if (parts.length > 1 && parts.every((part) => /^\d+$/.test(part))) {
    return { kind: "list", values: parts.map((part) => Number(part)) };
  }
  return { kind: "custom", raw: field };
};

const describeTime = (minuteField: string, hourField: string) => {
  const minute = describeFieldDescriptor(minuteField);
  const hour = describeFieldDescriptor(hourField);

  if (hour.kind === "range") {
    if (minute.kind === "step") return `Every ${minute.step} minutes, between ${pad(hour.start)}:00–${pad(hour.end)}:59`;
    if (minute.kind === "any") return `Every minute, between ${pad(hour.start)}:00–${pad(hour.end)}:59`;
    if (minute.kind === "single") return `At minute ${pad(minute.value)}, between ${pad(hour.start)}:00–${pad(hour.end)}:59`;
    if (minute.kind === "list") return `At minutes ${describeNumberList(minute.values, (value) => pad(value))}, between ${pad(hour.start)}:00–${pad(hour.end)}:59`;
    return `Custom minutes, between ${pad(hour.start)}:00–${pad(hour.end)}:59`;
  }

  if (hour.kind === "single") {
    if (minute.kind === "single") return `At ${pad(hour.value)}:${pad(minute.value)}`;
    if (minute.kind === "step") return `Every ${minute.step} minutes at ${pad(hour.value)}:00–${pad(hour.value)}:59`;
    if (minute.kind === "any") return `Every minute during ${pad(hour.value)}:00–${pad(hour.value)}:59`;
    if (minute.kind === "list") return `At minutes ${describeNumberList(minute.values, (value) => pad(value))} past ${pad(hour.value)}:00`;
    return `At ${pad(hour.value)}:00`;
  }

  if (hour.kind === "list") {
    const hourList = describeNumberList(hour.values, (value) => `${pad(value)}:00`);
    if (minute.kind === "single") return `At ${pad(minute.value)} past ${hourList}`;
    if (minute.kind === "step") return `Every ${minute.step} minutes during ${hourList}`;
    if (minute.kind === "any") return `Every minute during ${hourList}`;
    if (minute.kind === "list") return `At minutes ${describeNumberList(minute.values, (value) => pad(value))} during ${hourList}`;
    return `At selected minutes during ${hourList}`;
  }

  if (minute.kind === "step") return `Every ${minute.step} minutes`;
  if (minute.kind === "any") return "Every minute";
  if (minute.kind === "single") return `At minute ${pad(minute.value)} past every hour`;
  if (minute.kind === "list") return `At minutes ${describeNumberList(minute.values, (value) => pad(value))} past every hour`;
  if (minute.kind === "range") return `Minutes ${pad(minute.start)}–${pad(minute.end)} past every hour`;
  return "Custom minute pattern";
};

const describeDayOfWeek = (field: string) => {
  if (field === "*") return "";
  const parts = parseListField(field);
  const labels: string[] = [];
  for (const part of parts) {
    const range = parseRange(part);
    if (range) {
      const start = range.start === 7 ? 0 : range.start;
      const end = range.end === 7 ? 0 : range.end;
      labels.push(`${dayNames[start]} to ${dayNames[end]}`);
      continue;
    }
    const value = Number(part);
    if (!Number.isNaN(value)) {
      const normalized = value === 7 ? 0 : value;
      labels.push(dayNames[normalized]);
    }
  }
  return labels.length ? describeStringList(labels) : "";
};

const describeDayOfMonth = (field: string) => {
  if (field === "*") return "";
  const range = parseRange(field);
  if (range) return `on days ${range.start}-${range.end}`;
  if (/^\d+$/.test(field)) return `on day ${Number(field)}`;
  const parts = parseListField(field);
  if (parts.length > 1) {
    const days = parts.map((part) => Number(part)).filter((value) => !Number.isNaN(value));
    return `on days ${describeNumberList(days, (value) => String(value))}`;
  }
  return "on selected days";
};

const describeMonths = (field: string) => {
  if (field === "*") return "";
  const range = parseRange(field);
  if (range) return `in ${monthNames[range.start - 1]} to ${monthNames[range.end - 1]}`;
  if (/^\d+$/.test(field)) return `in ${monthNames[Number(field) - 1]}`;
  const parts = parseListField(field);
  if (parts.length > 1) {
    const months = parts.map((part) => Number(part)).filter((value) => !Number.isNaN(value));
    return `in ${describeNumberList(months, (value) => monthNames[value - 1])}`;
  }
  return "in selected months";
};

const describeCron = (expression: string, useSeconds: boolean) => {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  if (useSeconds ? parts.length !== 6 : parts.length !== 5) return "";
  const [secField, minField, hourField, domField, monField, dowField] = useSeconds ? parts : ["0", ...parts];
  const timeDesc = describeTime(minField, hourField);
  const domDesc = describeDayOfMonth(domField);
  const dowDesc = describeDayOfWeek(dowField);
  const monthDesc = describeMonths(monField);

  const timeBits: string[] = [];
  if (useSeconds && secField !== "0") {
    const secStep = parseStep(secField);
    if (secField === "*") timeBits.push("Every second");
    else if (secStep && secStep.base === "*") timeBits.push(`Every ${secStep.step} seconds`);
    else timeBits.push(`At second ${secField}`);
  }

  if (timeDesc) timeBits.push(timeDesc);

  const dayBits: string[] = [];
  if (domDesc && dowDesc) {
    dayBits.push(`on days matching day-of-month or day-of-week (${domDesc}; ${dowDesc})`);
  } else if (domDesc) {
    dayBits.push(domDesc);
  } else if (dowDesc) {
    dayBits.push(dowDesc);
  } else {
    dayBits.push("every day");
  }

  if (monthDesc) dayBits.push(monthDesc);

  return `${[...timeBits, ...dayBits].filter(Boolean).join(", ")}.`.replace(/\s+/g, " ").replace(", .", ".");
};

type MinuteMode = "every" | "list" | "range" | "custom";
type HourMode = "any" | "range" | "custom";
type WeekdayMode = "toggle" | "custom";

const normalizeExprForMode = (expression: string, useSeconds: boolean) => {
  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (useSeconds && parts.length === 5) return `0 ${trimmed}`;
  if (!useSeconds && parts.length === 6) return parts.slice(1).join(" ");
  return trimmed;
};

const getCronParts = (expression: string, useSeconds: boolean) => {
  const normalized = normalizeExprForMode(expression, useSeconds);
  const parts = normalized.trim().split(/\s+/).filter(Boolean);
  if (useSeconds ? parts.length !== 6 : parts.length !== 5) return null;
  const [secField, minField, hourField, domField, monField, dowField] = useSeconds ? parts : ["0", ...parts];
  return { secField, minField, hourField, domField, monField, dowField };
};

type CronDiagnostic = {
  fieldLabel: string;
  token: string;
  allowed: string;
  suggestion: string;
  expression: string;
};

type FieldRules = {
  label: string;
  min: number;
  max: number;
  allowSundaySeven?: boolean;
};

const buildAllowedHint = (rules: FieldRules) => {
  if (rules.allowSundaySeven) return `${rules.min}-${rules.max} (or 7 for Sunday), *, ranges (a-b), steps (*/n), lists (a,b,c)`;
  return `${rules.min}-${rules.max}, *, ranges (a-b), steps (*/n), lists (a,b,c)`;
};

const validateFieldToken = (token: string, rules: FieldRules) => {
  if (token === "*") return "";
  const allowedMax = rules.allowSundaySeven ? Math.max(rules.max, 7) : rules.max;
  const checkValue = (value: number) => value >= rules.min && value <= allowedMax;
  const step = parseStep(token);
  const base = step ? step.base : token;
  const stepValue = step?.step ?? 1;
  if (step && (!Number.isFinite(stepValue) || stepValue <= 0)) return "Step must be a positive number.";

  const range = parseRange(base);
  if (range) {
    if (!checkValue(range.start) || !checkValue(range.end)) return "Range values are out of bounds.";
    if (range.start > range.end) return "Range start must be <= end.";
    return "";
  }

  if (/^\d+$/.test(base)) {
    const value = Number(base);
    if (!checkValue(value)) return "Value is out of bounds.";
    return "";
  }

  return "Token format is not supported.";
};

const getCronDiagnostics = (expression: string, useSeconds: boolean): CronDiagnostic | null => {
  const parts = getCronParts(expression, useSeconds);
  if (!parts) return null;
  const fields: Array<[string, FieldRules]> = [
    [parts.secField, { label: "Second", min: 0, max: 59 }],
    [parts.minField, { label: "Minute", min: 0, max: 59 }],
    [parts.hourField, { label: "Hour", min: 0, max: 23 }],
    [parts.domField, { label: "Day of month", min: 1, max: 31 }],
    [parts.monField, { label: "Month", min: 1, max: 12 }],
    [parts.dowField, { label: "Day of week", min: 0, max: 6, allowSundaySeven: true }],
  ];
  const relevantFields = useSeconds ? fields : fields.slice(1);

  for (const [fieldValue, rules] of relevantFields) {
    const tokens = parseListField(fieldValue);
    for (const token of tokens) {
      const message = validateFieldToken(token, rules);
      if (message) {
        return {
          fieldLabel: rules.label,
          token,
          allowed: buildAllowedHint(rules),
          suggestion: `Try *, ${rules.min}-${rules.max}, or */5.`,
          expression,
        };
      }
    }
  }
  return null;
};

const parseMinuteMode = (field: string) => {
  if (field === "*") return { mode: "every" as MinuteMode, every: 1, list: "0", rangeStart: 0, rangeEnd: 59, custom: "*" };
  const step = parseStep(field);
  if (step && step.base === "*" && Number.isFinite(step.step)) {
    return { mode: "every" as MinuteMode, every: step.step, list: "0", rangeStart: 0, rangeEnd: 59, custom: field };
  }
  const range = parseRange(field);
  if (range) {
    return { mode: "range" as MinuteMode, every: 1, list: "0", rangeStart: range.start, rangeEnd: range.end, custom: field };
  }
  if (/^\d+(,\d+)+$/.test(field) || /^\d+$/.test(field)) {
    return { mode: "list" as MinuteMode, every: 1, list: field, rangeStart: 0, rangeEnd: 59, custom: field };
  }
  return { mode: "custom" as MinuteMode, every: 1, list: "0", rangeStart: 0, rangeEnd: 59, custom: field };
};

const parseHourMode = (field: string) => {
  if (field === "*") return { mode: "any" as HourMode, rangeStart: 0, rangeEnd: 23, custom: "*" };
  const range = parseRange(field);
  if (range) {
    return { mode: "range" as HourMode, rangeStart: range.start, rangeEnd: range.end, custom: field };
  }
  if (/^\d+$/.test(field)) {
    const value = Number(field);
    return { mode: "range" as HourMode, rangeStart: value, rangeEnd: value, custom: field };
  }
  return { mode: "custom" as HourMode, rangeStart: 0, rangeEnd: 23, custom: field };
};

const parseWeekdayMode = (field: string) => {
  const selections = Array.from({ length: 7 }, () => true);
  if (field === "*") return { mode: "toggle" as WeekdayMode, selections, custom: "*" };
  if (field.includes("/") || /[A-Za-z?#L]/.test(field)) {
    return { mode: "custom" as WeekdayMode, selections, custom: field };
  }
  const tokens = parseListField(field);
  const selected = Array.from({ length: 7 }, () => false);
  for (const token of tokens) {
    const range = parseRange(token);
    if (range) {
      if (range.start > range.end) return { mode: "custom" as WeekdayMode, selections, custom: field };
      for (let value = range.start; value <= range.end; value += 1) {
        const normalized = value === 7 ? 0 : value;
        if (normalized < 0 || normalized > 6) return { mode: "custom" as WeekdayMode, selections, custom: field };
        selected[normalized] = true;
      }
      continue;
    }
    if (!/^\d+$/.test(token)) return { mode: "custom" as WeekdayMode, selections, custom: field };
    const value = Number(token);
    const normalized = value === 7 ? 0 : value;
    if (normalized < 0 || normalized > 6) return { mode: "custom" as WeekdayMode, selections, custom: field };
    selected[normalized] = true;
  }
  return { mode: "toggle" as WeekdayMode, selections: selected, custom: field };
};

const computeNextRuns = (expr: string, count = 5, includeSeconds = false, timezone = "local") => {
  const parts = expr.trim().split(/\s+/);
  if (includeSeconds ? parts.length !== 6 : parts.length !== 5) {
    return {
      error: includeSeconds ? "Cron must have 6 fields: s m h dom mon dow" : "Cron must have 5 fields: m h dom mon dow",
      runs: [],
      dates: [],
    };
  }
  try {
    const iterator = parseExpression(expr, {
      currentDate: new Date(),
      tz: timezone === "local" ? undefined : timezone,
    });
    const runs: string[] = [];
    const dates: Date[] = [];
    for (let i = 0; i < count; i += 1) {
      const next = iterator.next();
      const nextDate = typeof next?.toDate === "function" ? next.toDate() : next;
      if (!(nextDate instanceof Date)) {
        return { error: "Unable to compute next run time.", runs: [], dates: [] };
      }
      runs.push(formatDateWithTimezone(nextDate, timezone));
      dates.push(nextDate);
    }
    return runs.length ? { error: "", runs, dates } : { error: "No occurrences found soon. Check the expression.", runs: [], dates: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid cron expression.";
    return { error: message, runs: [], dates: [] };
  }
};

const samples = [
  { label: "Every 5 mins", value: "*/5 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily 2am", value: "0 2 * * *" },
  { label: "Weekdays 9-5", value: "0 9-17 * * 1-5" },
  { label: "First of month", value: "0 6 1 * *" },
];

type CalendarPreviewProps = {
  runDates: Date[];
  timezone: string;
};

const CalendarPreview = ({ runDates, timezone }: CalendarPreviewProps) => {
  const now = new Date();
  const zonedNow = getZonedParts(now, timezone);
  const monthStart = new Date(Date.UTC(zonedNow.year, zonedNow.month - 1, 1));
  const monthEnd = new Date(Date.UTC(zonedNow.year, zonedNow.month, 0));
  const daysInMonth = monthEnd.getUTCDate();
  const startWeekday = getWeekdayIndex(monthStart, timezone);
  const runSet = new Set(
    runDates.map((date) => {
      const parts = getZonedParts(date, timezone);
      return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
    })
  );

  const cells = Array.from({ length: startWeekday + daysInMonth }, (_, index) => {
    if (index < startWeekday) return null;
    const dayNumber = index - startWeekday + 1;
    const key = `${zonedNow.year}-${pad(zonedNow.month)}-${pad(dayNumber)}`;
    return { dayNumber, isRun: runSet.has(key), isToday: dayNumber === zonedNow.day };
  });

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
        <span>
          {monthNames[zonedNow.month - 1]} {zonedNow.year}
        </span>
        <span className="text-xs font-medium text-slate-500">{timezone === "local" ? "Local time" : timezone}</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2 text-xs text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="text-center font-semibold">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2 text-sm">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} className="h-9" />;
          return (
            <div
              key={`day-${cell.dayNumber}`}
              className={`flex h-9 items-center justify-center rounded-lg border text-xs font-semibold ${
                cell.isRun ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
              } ${cell.isToday ? "ring-2 ring-slate-400" : ""}`}
            >
              {cell.dayNumber}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">Highlighted days indicate upcoming runs in this month.</p>
    </div>
  );
};

export default function CronTesterClient() {
  const [expr, setExpr] = useState("*/5 * * * *");
  const [runs, setRuns] = useState<string[]>([]);
  const [runDates, setRunDates] = useState<Date[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [shareStatus, setShareStatus] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [diagnostic, setDiagnostic] = useState<CronDiagnostic | null>(null);
  const [dialect, setDialect] = useState("vixie");
  const [timezone, setTimezone] = useState("local");
  const [count, setCount] = useState(5);
  const useSeconds = dialect === "quartz" || dialect === "aws";
  const hasParsedUrl = useRef(false);
  const shareTimeoutRef = useRef<number | null>(null);
  const exportTimeoutRef = useRef<number | null>(null);
  const syncSourceRef = useRef<"editor" | "text" | null>(null);

  const [minuteMode, setMinuteMode] = useState<MinuteMode>("every");
  const [minuteEvery, setMinuteEvery] = useState(5);
  const [minuteList, setMinuteList] = useState("0");
  const [minuteRangeStart, setMinuteRangeStart] = useState(0);
  const [minuteRangeEnd, setMinuteRangeEnd] = useState(59);
  const [minuteCustom, setMinuteCustom] = useState("*");

  const [hourMode, setHourMode] = useState<HourMode>("any");
  const [hourRangeStart, setHourRangeStart] = useState(9);
  const [hourRangeEnd, setHourRangeEnd] = useState(17);
  const [hourCustom, setHourCustom] = useState("*");

  const [weekdayMode, setWeekdayMode] = useState<WeekdayMode>("toggle");
  const [weekdaySelections, setWeekdaySelections] = useState<boolean[]>(() => Array.from({ length: 7 }, () => true));
  const [weekdayCustom, setWeekdayCustom] = useState("*");

  const summary = useMemo(() => {
    const normalized = normalizeExprForMode(expr, useSeconds);
    const parts = normalized.trim().split(/\s+/);
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
      `Dialect: ${dialect === "vixie" ? "Vixie (Linux)" : dialect === "quartz" ? "Quartz" : dialect === "github" ? "GitHub Actions" : "AWS EventBridge"}`,
    ]
      .filter(Boolean)
      .join(" • ");
  }, [expr, useSeconds, dialect]);

  const humanReadable = useMemo(() => {
    const normalized = normalizeExprForMode(expr, useSeconds);
    return describeCron(normalized, useSeconds);
  }, [expr, useSeconds]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    params.set("expr", expr.trim());
    params.set("count", String(count));
    params.set("sec", useSeconds ? "1" : "0");
    if (dialect !== "vixie") params.set("dialect", dialect);
    if (timezone === "UTC") params.set("utc", "1");
    if (timezone !== "local") params.set("tz", timezone);
    return `${window.location.pathname}?${params.toString()}`;
  }, [count, dialect, expr, timezone, useSeconds]);

  const weekdayOptions = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 0 },
  ];

  const buildMinuteField = () => {
    if (minuteMode === "custom") return minuteCustom || "*";
    if (minuteMode === "every") {
      const step = Math.max(1, Math.min(59, minuteEvery));
      return step === 1 ? "*" : `*/${step}`;
    }
    if (minuteMode === "range") {
      const start = Math.max(0, Math.min(59, minuteRangeStart));
      const end = Math.max(0, Math.min(59, minuteRangeEnd));
      return start === end ? String(start) : `${Math.min(start, end)}-${Math.max(start, end)}`;
    }
    const values = minuteList
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 59);
    if (!values.length) return "*";
    const unique = Array.from(new Set(values)).sort((a, b) => a - b);
    return unique.join(",");
  };

  const buildHourField = () => {
    if (hourMode === "custom") return hourCustom || "*";
    if (hourMode === "any") return "*";
    const start = Math.max(0, Math.min(23, hourRangeStart));
    const end = Math.max(0, Math.min(23, hourRangeEnd));
    return start === end ? String(start) : `${Math.min(start, end)}-${Math.max(start, end)}`;
  };

  const buildWeekdayField = () => {
    if (weekdayMode === "custom") return weekdayCustom || "*";
    const selectedDays = weekdaySelections
      .map((selected, value) => (selected ? value : null))
      .filter((value): value is number => value !== null);
    if (!selectedDays.length || selectedDays.length === 7) return "*";
    const order = [1, 2, 3, 4, 5, 6, 0];
    const ordered = order.filter((value) => selectedDays.includes(value));
    return ordered.join(",");
  };

  useEffect(() => {
    if (syncSourceRef.current === "editor") {
      syncSourceRef.current = null;
      return;
    }
    const parts = getCronParts(expr, useSeconds);
    if (!parts) return;
    const minuteParsed = parseMinuteMode(parts.minField);
    const hourParsed = parseHourMode(parts.hourField);
    const weekdayParsed = parseWeekdayMode(parts.dowField);

    setMinuteMode(minuteParsed.mode);
    setMinuteEvery(minuteParsed.every);
    setMinuteList(minuteParsed.list);
    setMinuteRangeStart(minuteParsed.rangeStart);
    setMinuteRangeEnd(minuteParsed.rangeEnd);
    setMinuteCustom(minuteParsed.custom);

    setHourMode(hourParsed.mode);
    setHourRangeStart(hourParsed.rangeStart);
    setHourRangeEnd(hourParsed.rangeEnd);
    setHourCustom(hourParsed.custom);

    setWeekdayMode(weekdayParsed.mode);
    setWeekdaySelections(weekdayParsed.selections);
    setWeekdayCustom(weekdayParsed.custom);
    syncSourceRef.current = null;
  }, [expr, useSeconds]);

  useEffect(() => {
    const parts = getCronParts(expr, useSeconds);
    if (!parts) return;
    const nextParts = { ...parts };
    nextParts.minField = buildMinuteField();
    nextParts.hourField = buildHourField();
    nextParts.dowField = buildWeekdayField();
    const nextExpr = useSeconds
      ? [nextParts.secField, nextParts.minField, nextParts.hourField, nextParts.domField, nextParts.monField, nextParts.dowField].join(" ")
      : [nextParts.minField, nextParts.hourField, nextParts.domField, nextParts.monField, nextParts.dowField].join(" ");
    if (nextExpr !== expr) {
      syncSourceRef.current = "editor";
      setExpr(nextExpr);
    }
  }, [
    expr,
    hourMode,
    hourRangeEnd,
    hourRangeStart,
    hourCustom,
    minuteEvery,
    minuteList,
    minuteMode,
    minuteRangeEnd,
    minuteRangeStart,
    minuteCustom,
    useSeconds,
    weekdayMode,
    weekdaySelections,
    weekdayCustom,
  ]);

  const handleParse = () => {
    const normalized = normalizeExprForMode(expr, useSeconds);
    if (!normalized) {
      setError("Enter a cron expression.");
      setDiagnostic(null);
      setRuns([]);
      setStatus("Parse failed");
      return;
    }
    const safeCount = Math.min(Math.max(count || 5, 1), 20);
    const result = computeNextRuns(normalized, safeCount, useSeconds, timezone);
    if (result.error) {
      const diag = getCronDiagnostics(normalized, useSeconds);
      setDiagnostic(diag);
      setError(diag ? `Invalid ${diag.fieldLabel.toLowerCase()} token.` : result.error);
    } else {
      setDiagnostic(null);
      setError("");
    }
    setRuns(result.runs);
    setRunDates(result.dates);
    setStatus(result.error ? "Parse failed" : "Parsed");
  };

  const handleDialectChange = (value: string) => {
    setDialect(value);
    const requiresSeconds = value === "quartz" || value === "aws";
    const parts = expr.trim().split(/\s+/);
    if (requiresSeconds && parts.length === 5) {
      setExpr(`0 ${expr.trim()}`);
    } else if (!requiresSeconds && parts.length === 6) {
      setExpr(parts.slice(1).join(" "));
    }
    if ((value === "github" || value === "aws") && timezone === "local") {
      setTimezone("UTC");
    }
  };

  const handleCopyShare = async () => {
    if (typeof window === "undefined" || !shareUrl) return;
    const url = new URL(shareUrl, window.location.origin);
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Copied share link");
    } catch (err) {
      console.error("Copy failed", err);
      setShareStatus("Copy failed");
    }
    if (shareTimeoutRef.current) window.clearTimeout(shareTimeoutRef.current);
    shareTimeoutRef.current = window.setTimeout(() => {
      setShareStatus("");
    }, 2000);
  };

  const handleCopyIso = async () => {
    if (!runDates.length) return;
    const payload = runDates.map((date) => date.toISOString()).join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setExportStatus("Copied ISO timestamps");
    } catch (err) {
      console.error("Copy failed", err);
      setExportStatus("Copy failed");
    }
    if (exportTimeoutRef.current) window.clearTimeout(exportTimeoutRef.current);
    exportTimeoutRef.current = window.setTimeout(() => setExportStatus(""), 2000);
  };

  const handleCopyUnix = async () => {
    if (!runDates.length) return;
    const payload = runDates.map((date) => Math.floor(date.getTime() / 1000)).join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setExportStatus("Copied Unix timestamps");
    } catch (err) {
      console.error("Copy failed", err);
      setExportStatus("Copy failed");
    }
    if (exportTimeoutRef.current) window.clearTimeout(exportTimeoutRef.current);
    exportTimeoutRef.current = window.setTimeout(() => setExportStatus(""), 2000);
  };

  const handleDownloadIcs = () => {
    if (!runDates.length) return;
    const now = new Date();
    const formatIcs = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Cron Tester//EN",
    ];
    runDates.forEach((date, index) => {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:cron-tester-${now.getTime()}-${index}@local`);
      lines.push(`DTSTAMP:${formatIcs(now)}`);
      lines.push(`DTSTART:${formatIcs(date)}`);
      lines.push(`SUMMARY:Cron run ${index + 1}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cron-runs.ics";
    link.click();
    URL.revokeObjectURL(url);
    setExportStatus("Downloaded .ics");
    if (exportTimeoutRef.current) window.clearTimeout(exportTimeoutRef.current);
    exportTimeoutRef.current = window.setTimeout(() => setExportStatus(""), 2000);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.size === 0) {
      hasParsedUrl.current = true;
      return;
    }
    const urlExpr = params.get("expr");
    const urlDialect = params.get("dialect");
    const urlTimezone = params.get("tz");
    const urlUtc = params.get("utc");
    const urlCount = params.get("count");
    const urlSeconds = params.get("sec");

    let nextDialect = "vixie";
    if (urlDialect && ["vixie", "quartz", "github", "aws"].includes(urlDialect)) {
      nextDialect = urlDialect;
    } else if (urlSeconds === "1") {
      nextDialect = "quartz";
    }

    let nextExpr = urlExpr ?? "*/5 * * * *";
    const requiresSeconds = nextDialect === "quartz" || nextDialect === "aws";
    const parts = nextExpr.trim().split(/\s+/).filter(Boolean);
    if (requiresSeconds && parts.length === 5) {
      nextExpr = `0 ${nextExpr.trim()}`;
    } else if (!requiresSeconds && parts.length === 6) {
      nextExpr = parts.slice(1).join(" ");
    }

    setDialect(nextDialect);
    setExpr(nextExpr);
    if (urlCount) {
      const value = Number(urlCount);
      if (Number.isFinite(value)) setCount(Math.min(Math.max(value, 1), 20));
    }
    if (urlTimezone) {
      setTimezone(urlTimezone);
    } else if (urlUtc === "1") {
      setTimezone("UTC");
    }
    hasParsedUrl.current = true;
  }, []);

  useEffect(() => {
    if (!hasParsedUrl.current) return;
    if (typeof window === "undefined") return;
    const url = shareUrl || window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [shareUrl]);

  const timezoneOptions = [
    { label: "Local", value: "local" },
    { label: "UTC", value: "UTC" },
    { label: "Asia/Colombo", value: "Asia/Colombo" },
    { label: "America/New_York", value: "America/New_York" },
    { label: "Europe/London", value: "Europe/London" },
    { label: "Asia/Tokyo", value: "Asia/Tokyo" },
    { label: "Australia/Sydney", value: "Australia/Sydney" },
  ];

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
              Cron Tester
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Cron Expression Tester</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Validate cron syntax and see the next run times. Choose a dialect (Vixie, Quartz, GitHub Actions, AWS EventBridge) and a timezone for the
          preview results.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Samples:</span>
              {samples.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    const value = useSeconds ? `0 ${s.value}` : s.value;
            setExpr(value);
            setRuns([]);
            setRunDates([]);
            setError("");
            setDiagnostic(null);
            setStatus("Ready");
          }}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  aria-label={`Load sample ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              Dialect:
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={dialect}
                onChange={(e) => handleDialectChange(e.target.value)}
                aria-label="Cron dialect"
              >
                <option value="vixie">Vixie (Linux)</option>
                <option value="quartz">Quartz</option>
                <option value="github">GitHub Actions</option>
                <option value="aws">AWS EventBridge</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Timezone:
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                aria-label="Timezone selection"
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Next runs:
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Number of runs to show"
              />
            </label>
            <button
              onClick={() => {
                setExpr("*/5 * * * *");
                setRuns([]);
                setRunDates([]);
                setError("");
                setDiagnostic(null);
                setDialect("vixie");
                setTimezone("local");
                setCount(5);
                setStatus("Ready");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset inputs"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <textarea
            className="h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={expr}
            onChange={(event) => {
              syncSourceRef.current = "text";
              setExpr(event.target.value);
            }}
            placeholder="*/5 * * * *"
            aria-label="Cron expression input"
            spellCheck={false}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Field builder</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minutes</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={minuteMode}
                  onChange={(e) => setMinuteMode(e.target.value as MinuteMode)}
                  aria-label="Minute mode"
                >
                  <option value="every">Every N</option>
                  <option value="list">Specific list</option>
                  <option value="range">Range</option>
                  <option value="custom">Custom</option>
                </select>
                {minuteMode === "every" && (
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    Every
                    <input
                      type="number"
                      min={1}
                      max={59}
                      value={minuteEvery}
                      onChange={(e) => setMinuteEvery(Number(e.target.value))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    minutes
                  </label>
                )}
                {minuteMode === "list" && (
                  <input
                    type="text"
                    value={minuteList}
                    onChange={(e) => setMinuteList(e.target.value)}
                    placeholder="0,15,30,45"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    aria-label="Minute list"
                  />
                )}
                {minuteMode === "range" && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minuteRangeStart}
                      onChange={(e) => setMinuteRangeStart(Number(e.target.value))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      aria-label="Minute range start"
                    />
                    to
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minuteRangeEnd}
                      onChange={(e) => setMinuteRangeEnd(Number(e.target.value))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      aria-label="Minute range end"
                    />
                  </div>
                )}
                {minuteMode === "custom" && (
                  <input
                    type="text"
                    value={minuteCustom}
                    onChange={(e) => setMinuteCustom(e.target.value)}
                    placeholder="*/5"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    aria-label="Custom minute field"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hours</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={hourMode}
                  onChange={(e) => setHourMode(e.target.value as HourMode)}
                  aria-label="Hour mode"
                >
                  <option value="any">Any hour</option>
                  <option value="range">Range</option>
                  <option value="custom">Custom</option>
                </select>
                {hourMode === "range" && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={hourRangeStart}
                      onChange={(e) => setHourRangeStart(Number(e.target.value))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      aria-label="Hour range start"
                    />
                    to
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={hourRangeEnd}
                      onChange={(e) => setHourRangeEnd(Number(e.target.value))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      aria-label="Hour range end"
                    />
                  </div>
                )}
                {hourMode === "custom" && (
                  <input
                    type="text"
                    value={hourCustom}
                    onChange={(e) => setHourCustom(e.target.value)}
                    placeholder="9-17"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    aria-label="Custom hour field"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weekdays</label>
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      disabled={weekdayMode === "custom"}
                      onClick={() =>
                        setWeekdaySelections((prev) => {
                          const next = [...prev];
                          next[day.value] = !next[day.value];
                          return next;
                        })
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                        weekdaySelections[day.value] && weekdayMode !== "custom"
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white text-slate-600 ring-slate-200"
                      } ${weekdayMode === "custom" ? "opacity-50" : "hover:-translate-y-0.5"}`}
                      aria-label={`Toggle ${day.label}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                {weekdayMode === "custom" ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={weekdayCustom}
                      onChange={(e) => setWeekdayCustom(e.target.value)}
                      placeholder="1-5"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      aria-label="Custom weekday field"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setWeekdayMode("toggle");
                        setWeekdaySelections(Array.from({ length: 7 }, () => true));
                      }}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    >
                      Use toggles
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setWeekdaySelections(Array.from({ length: 7 }, () => true))}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    >
                      Every day
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWeekdaySelections([false, true, true, true, true, true, false])
                      }
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    >
                      Weekdays
                    </button>
                  </div>
                )}
            <p className="text-xs text-slate-500">Minute/hour/weekday changes sync back to the raw cron input.</p>
          </div>
          </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Summary</p>
            <p className="text-sm text-slate-700">{summary}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Human readable</p>
            <p className="text-sm text-slate-700">{humanReadable || "Enter a valid cron expression to see a readable schedule."}</p>
          </div>
          <button
            onClick={handleParse}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Validate cron"
          >
            Validate
          </button>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <button
              onClick={handleCopyShare}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy share link"
            >
              <Link2 className="h-4 w-4" />
              Copy share link
            </button>
            <span className="text-xs text-slate-500">{shareStatus}</span>
          </div>
          {diagnostic ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-semibold">Invalid {diagnostic.fieldLabel.toLowerCase()} token</p>
              <p>
                Token: <span className="font-mono">{diagnostic.token}</span>
              </p>
              <p>Allowed: {diagnostic.allowed}</p>
              <p>Suggestion: {diagnostic.suggestion}</p>
              <p className="font-mono">
                {diagnostic.expression.split(diagnostic.token).reduce((acc, part, index, arr) => {
                  acc.push(part);
                  if (index < arr.length - 1) {
                    acc.push(`[${diagnostic.token}]`);
                  }
                  return acc;
                }, [] as string[]).join("")}
              </p>
            </div>
          ) : null}
          {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="runs-heading">
              Next run times
            </p>
            <button
              onClick={() => {
                if (!runs.length) return;
                navigator.clipboard
                  .writeText(runs.join("\n"))
                  .catch((err) => console.error("Copy failed", err));
              }}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!runs.length}
              aria-label="Copy run times"
            >
              <Check className="h-4 w-4" /> Copy
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4" role="region" aria-labelledby="runs-heading">
            {runs.length ? (
              <ul className="space-y-2 text-sm leading-relaxed text-slate-100">
                {runs.map((r, idx) => (
                  <li key={idx} className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                    {idx + 1}. {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-200">Run times will appear here after validation.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Preview calendar</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadIcs}
                disabled={!runDates.length}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Download .ics
              </button>
              <button
                onClick={handleCopyIso}
                disabled={!runDates.length}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Copy ISO timestamps
              </button>
              <button
                onClick={handleCopyUnix}
                disabled={!runDates.length}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                Copy Unix timestamps
              </button>
              <span className="text-xs text-slate-500">{exportStatus}</span>
            </div>
          </div>
          <CalendarPreview runDates={runDates} timezone={timezone} />
        </div>
        <div className="rounded-2xl bg-slate-50/80 p-5 text-sm text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">Calendar notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Dates are highlighted for the currently previewed run times.</li>
            <li>Exported timestamps are UTC-based for consistent sharing.</li>
            <li>Update the cron or timezone and re-run Validate to refresh.</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Choose a dialect, then enter the matching cron expression.</li>
          <li>Select a timezone for previews; adjust how many run times to show.</li>
          <li>Validate to see upcoming run times. Copy them for logs or tests.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>Validation runs locally in your browser; no cron strings are uploaded.</p>
          <p>Safety caps are applied to avoid long-running calculations on complex expressions.</p>
          <p>Quartz/AWS previews accept standard numeric fields; special tokens like ?, L, W, and # are not supported yet.</p>
        </div>
      </div>
    </main>
  );
}
