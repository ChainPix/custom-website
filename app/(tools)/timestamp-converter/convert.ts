/**
 * Pure timestamp parsing/formatting logic for the timestamp-converter tool.
 * Extracted from client.tsx for unit testing (tests/unit/timestamp-converter.spec.ts).
 */

export type TimestampUnit = "s" | "ms" | "us" | "ns";
export type TimestampUnitMode = TimestampUnit | "auto";
export type TimeZoneMode = "local" | "utc" | "custom";
export type FormatStyle = "iso" | "locale";

export const unitLabels: Record<TimestampUnit, string> = {
  s: "seconds",
  ms: "milliseconds",
  us: "microseconds",
  ns: "nanoseconds",
};

export const formatIsoLocal = (d: Date) => {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const hours = String(Math.floor(absMin / 60)).padStart(2, "0");
  const minutes = String(absMin % 60).padStart(2, "0");
  const base = d.toISOString().replace("Z", "");
  return `${base}${sign}${hours}:${minutes}`;
};

export const formatWithTimeZone = (d: Date, timeZone: string, format: FormatStyle) => {
  if (format === "iso") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
    return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:${pick("second")} (${timeZone})`;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium", timeZone }).format(d);
};

export const formatDate = (
  d: Date,
  options: { timeZoneMode: TimeZoneMode; customTimeZone: string; style: FormatStyle },
) => {
  const { timeZoneMode, customTimeZone, style } = options;
  if (timeZoneMode === "utc") {
    return style === "iso" ? `${d.toISOString()} (UTC)` : formatWithTimeZone(d, "UTC", style);
  }
  if (timeZoneMode === "custom") {
    return formatWithTimeZone(d, customTimeZone, style);
  }
  return style === "iso" ? `${formatIsoLocal(d)} (local)` : d.toLocaleString();
};

export const detectUnit = (value: string, mode: TimestampUnitMode) => {
  if (mode !== "auto") return { unit: mode, reason: "manual" as const };
  const trimmed = value.trim();
  const digits = trimmed.replace(/^-/, "");
  const len = digits.length;
  if (len === 10) return { unit: "s" as const, reason: "length" as const };
  if (len === 13) return { unit: "ms" as const, reason: "length" as const };
  if (len === 16) return { unit: "us" as const, reason: "length" as const };
  if (len === 19) return { unit: "ns" as const, reason: "length" as const };
  const raw = Number(trimmed);
  const abs = Math.abs(raw);
  if (!Number.isFinite(abs)) return { unit: "ms" as const, reason: "default" as const };
  if (abs >= 1e18) return { unit: "ns" as const, reason: "magnitude" as const };
  if (abs >= 1e15) return { unit: "us" as const, reason: "magnitude" as const };
  if (abs >= 1e12) return { unit: "ms" as const, reason: "magnitude" as const };
  return { unit: "s" as const, reason: "magnitude" as const };
};

export const unitToMs = (raw: number, unit: TimestampUnit) => {
  if (unit === "s") return raw * 1000;
  if (unit === "ms") return raw;
  if (unit === "us") return raw / 1000;
  return raw / 1_000_000;
};

export const parseTimestamp = (input: string, unitMode: TimestampUnitMode) => {
  const trimmed = input.trim();
  const unitInfo = detectUnit(trimmed, unitMode);
  const unit = unitInfo.unit;
  if (!trimmed) {
    return { date: null, msValue: null, error: "Enter a timestamp", warning: "", unit, unitReason: unitInfo.reason };
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { date: null, msValue: null, error: "Invalid timestamp", warning: "", unit, unitReason: unitInfo.reason };
  }
  const raw = Number(trimmed);
  if (!Number.isFinite(raw)) {
    return {
      date: null,
      msValue: null,
      error: "Invalid timestamp",
      warning: "Value too large to parse.",
      unit,
      unitReason: unitInfo.reason,
    };
  }

  const digits = trimmed.replace(/^-/, "").replace(/\D/g, "");
  const len = digits.length;
  let warning = "";
  if (unitMode !== "auto") {
    if (len === 13 && unitMode === "s") warning = "Length looks like milliseconds; override if intentional.";
    if (len === 10 && unitMode === "ms") warning = "Length looks like seconds; override if intentional.";
    if (len === 16 && unitMode !== "us") warning = "Length looks like microseconds; override if intentional.";
    if (len === 19 && unitMode !== "ns") warning = "Length looks like nanoseconds; override if intentional.";
  } else if (len && ![10, 13, 16, 19].includes(len)) {
    warning = "Non-standard length; auto-detection used. Override if needed.";
  }

  const ms = unitToMs(raw, unit);
  if (!Number.isFinite(ms)) {
    return { date: null, msValue: null, error: "Invalid timestamp", warning, unit, unitReason: unitInfo.reason };
  }
  if (Math.abs(ms) > 8.64e15) {
    warning = warning || "Value is outside JavaScript Date range.";
  }
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return { date: null, msValue: null, error: "Invalid timestamp", warning, unit, unitReason: unitInfo.reason };
  }
  return { date, msValue: ms, error: "", warning, unit, unitReason: unitInfo.reason };
};

export const formatConversionMath = (raw: number, unit: TimestampUnit, ms: number) => {
  if (unit === "s") return `${raw} × 1000 = ${ms}`;
  if (unit === "ms") return `${raw} × 1 = ${ms}`;
  if (unit === "us") return `${raw} ÷ 1000 = ${ms}`;
  return `${raw} ÷ 1000000 = ${ms}`;
};

export const formatRelative = (target: Date) => {
  const base = new Date();
  const diffMs = target.getTime() - base.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 1) return "Now";
  return diffMin > 0 ? `In ${diffMin} minute(s)` : `${Math.abs(diffMin)} minute(s) ago`;
};

export const parseLocalDateTime = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [datePart, timePart] = trimmed.split("T");
  if (!datePart || !timePart) return null;
  const [yearStr, monthStr, dayStr] = datePart.split("-");
  const [hourStr, minuteStr, secondStr = "0"] = timePart.split(":");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);
  if ([year, month, day, hour, minute, second].some((part) => Number.isNaN(part))) return null;
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};
