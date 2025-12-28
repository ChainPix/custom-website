"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type TimestampUnit = "s" | "ms" | "us" | "ns";
type TimestampUnitMode = TimestampUnit | "auto";

const unitLabels: Record<TimestampUnit, string> = {
  s: "seconds",
  ms: "milliseconds",
  us: "microseconds",
  ns: "nanoseconds",
};

const formatIsoLocal = (d: Date) => {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const hours = String(Math.floor(absMin / 60)).padStart(2, "0");
  const minutes = String(absMin % 60).padStart(2, "0");
  const base = d.toISOString().replace("Z", "");
  return `${base}${sign}${hours}:${minutes}`;
};

const formatDate = (d: Date, showUtc: boolean, format: "iso" | "locale") => {
  if (format === "iso") {
    return showUtc ? `${d.toISOString()} (UTC)` : `${formatIsoLocal(d)} (local)`;
  }
  if (showUtc) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(d);
  }
  return d.toLocaleString();
};

const detectUnit = (value: string, mode: TimestampUnitMode) => {
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

const unitToMs = (raw: number, unit: TimestampUnit) => {
  if (unit === "s") return raw * 1000;
  if (unit === "ms") return raw;
  if (unit === "us") return raw / 1000;
  return raw / 1_000_000;
};

const formatConversionMath = (raw: number, unit: TimestampUnit, ms: number) => {
  if (unit === "s") return `${raw} × 1000 = ${ms}`;
  if (unit === "ms") return `${raw} × 1 = ${ms}`;
  if (unit === "us") return `${raw} ÷ 1000 = ${ms}`;
  return `${raw} ÷ 1000000 = ${ms}`;
};

const parseLocalDateTime = (value: string) => {
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

export default function TimestampConverterClient() {
  const initialNow = useMemo(() => new Date(), []);
  const [tsInput, setTsInput] = useState(`${Math.floor(initialNow.getTime() / 1000)}`);
  const [dateInput, setDateInput] = useState(() => initialNow.toISOString().slice(0, 16));
  const [unitMode, setUnitMode] = useState<TimestampUnitMode>("auto");
  const [useUtc, setUseUtc] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [copied, setCopied] = useState({ date: false, seconds: false, ms: false });
  const copyTimeoutsRef = useRef<{ date: number | null; seconds: number | null; ms: number | null }>({
    date: null,
    seconds: null,
    ms: null,
  });
  const [format, setFormat] = useState<"iso" | "locale">("iso");

  const parsedUnitInfo = detectUnit(tsInput, unitMode);
  const parsedUnit = parsedUnitInfo.unit;

  const warning = (() => {
    const trimmed = tsInput.trim();
    if (!trimmed) return "";
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return "";
    const raw = Number(trimmed);
    if (!Number.isFinite(raw)) return "Value too large to parse.";
    const digits = trimmed.replace(/^-/, "").replace(/\D/g, "");
    const len = digits.length;
    if (unitMode !== "auto") {
      if (len === 13 && unitMode === "s") return "Length looks like milliseconds; override if intentional.";
      if (len === 10 && unitMode === "ms") return "Length looks like seconds; override if intentional.";
      if (len === 16 && unitMode !== "us") return "Length looks like microseconds; override if intentional.";
      if (len === 19 && unitMode !== "ns") return "Length looks like nanoseconds; override if intentional.";
    } else if (![10, 13, 16, 19].includes(len)) {
      return "Non-standard length; auto-detection used. Override if needed.";
    }
    const ms = unitToMs(raw, parsedUnit);
    if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) {
      return "Value is outside JavaScript Date range.";
    }
    return "";
  })();

  useEffect(() => {
    if (statusMessage === "Ready") return;
    const timeoutId = window.setTimeout(() => setStatusMessage("Ready"), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    return () => {
      Object.values(copyTimeoutsRef.current).forEach((timeoutId) => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
    };
  }, []);

  const markCopied = (key: "date" | "seconds" | "ms") => {
    setCopied((prev) => ({ ...prev, [key]: true }));
    const existing = copyTimeoutsRef.current[key];
    if (existing) window.clearTimeout(existing);
    copyTimeoutsRef.current[key] = window.setTimeout(() => {
      setCopied((prev) => ({ ...prev, [key]: false }));
      copyTimeoutsRef.current[key] = null;
    }, 1500);
  };

  const tsResult = (() => {
    const trimmed = tsInput.trim();
    const raw = Number(trimmed);
    if (!trimmed) return { error: "Enter a timestamp", date: null as Date | null, msValue: null as number | null };
    if (Number.isNaN(raw)) return { error: "Invalid timestamp", date: null as Date | null, msValue: null };
    const ms = unitToMs(raw, parsedUnit);
    if (!Number.isFinite(ms)) return { error: "Invalid timestamp", date: null, msValue: null };
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return { error: "Invalid timestamp", date: null, msValue: null };
    return { error: "", date: d, msValue: ms };
  })();

  const dateResult = (() => {
    if (!dateInput) return { error: "Enter a date/time", tsSec: "", tsMs: "" };
    const d = parseLocalDateTime(dateInput);
    if (!d) return { error: "Invalid date", tsSec: "", tsMs: "" };
    return {
      error: "",
      tsSec: Math.floor(d.getTime() / 1000).toString(),
      tsMs: d.getTime().toString(),
    };
  })();

  const relative = (() => {
    const base = new Date();
    const target = tsResult.date;
    if (!target) return "";
    const diffMs = target.getTime() - base.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (Math.abs(diffMin) < 1) return "Now";
    return diffMin > 0 ? `In ${diffMin} minute(s)` : `${Math.abs(diffMin)} minute(s) ago`;
  })();

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {statusMessage} {warning} {tsResult.error} {dateResult.error}
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
              Timestamp Converter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Timestamp Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert between Unix timestamps and readable dates. Toggle seconds or milliseconds and see
          local time context.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Timestamp to date">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Timestamp → Date</p>
            <button
              onClick={() => {
                const nowMs = Date.now();
                const nextUnit = unitMode === "auto" ? "s" : unitMode;
                if (nextUnit === "s") setTsInput(`${Math.floor(nowMs / 1000)}`);
                if (nextUnit === "ms") setTsInput(`${nowMs}`);
                if (nextUnit === "us") setTsInput(`${nowMs}000`);
                if (nextUnit === "ns") setTsInput(`${nowMs}000000`);
                setStatusMessage("Loaded current time");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Set timestamp to current time"
            >
              <RefreshCcw className="h-4 w-4" />
              Now
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={tsInput}
              onChange={(event) => setTsInput(event.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Unix timestamp (seconds or ms)"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              Unit
              <select
                value={unitMode}
                onChange={(e) => setUnitMode(e.target.value as TimestampUnitMode)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="auto">Auto</option>
                <option value="s">Seconds</option>
                <option value="ms">Milliseconds</option>
                <option value="us">Microseconds</option>
                <option value="ns">Nanoseconds</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900"
                checked={useUtc}
                onChange={() => setUseUtc((prev) => !prev)}
              />
              UTC Output
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "iso" | "locale")}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="iso">ISO</option>
                <option value="locale">Locale</option>
              </select>
            </label>
          </div>
          {tsResult.error ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              {tsResult.error}
            </p>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tsResult.date ? formatDate(tsResult.date, useUtc, format) : "N/A"}
              </p>
              {relative ? <p className="text-xs text-slate-600">{relative}</p> : null}
              <p className="text-xs text-slate-500">
                Parsed as: {unitLabels[parsedUnit]}{" "}
                {unitMode === "auto" ? `(auto: ${parsedUnitInfo.reason})` : "(manual)"}
              </p>
              {tsResult.msValue !== null ? (
                <p className="text-xs text-slate-500">
                  Conversion: {formatConversionMath(Number(tsInput.trim()), parsedUnit, tsResult.msValue)}
                </p>
              ) : null}
              {warning ? (
                <p className="mt-1 text-xs font-medium text-amber-700" role="alert">
                  {warning}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!tsResult.date) return;
                    navigator.clipboard.writeText(formatDate(tsResult.date, useUtc, format));
                    markCopied("date");
                    setStatusMessage("Copied date");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  {copied.date ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!tsResult.date) return;
                    const blob = new Blob(
                      [formatDate(tsResult.date, useUtc, format)],
                      { type: "text/plain" },
                    );
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "timestamp-date.txt";
                    link.click();
                    URL.revokeObjectURL(url);
                    setStatusMessage("Downloaded date");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Date to timestamp">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Date → Timestamp</p>
            <button
              onClick={() => setDateInput(new Date().toISOString().slice(0, 16))}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Set date to current time"
            >
              <RefreshCcw className="h-4 w-4" />
              Now
            </button>
          </div>
          <input
            type="datetime-local"
            value={dateInput}
            onChange={(event) => setDateInput(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <p className="text-xs text-slate-500">Interpreted as local time.</p>
          {dateResult.error ? (
            <p className="text-sm font-medium text-amber-600">{dateResult.error}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (seconds)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{dateResult.tsSec}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(dateResult.tsSec);
                      markCopied("seconds");
                      setStatusMessage("Copied seconds");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copied.seconds ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([dateResult.tsSec], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "timestamp-seconds.txt";
                      link.click();
                      URL.revokeObjectURL(url);
                      setStatusMessage("Downloaded seconds");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (ms)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{dateResult.tsMs}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(dateResult.tsMs);
                      markCopied("ms");
                      setStatusMessage("Copied ms");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copied.ms ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([dateResult.tsMs], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "timestamp-ms.txt";
                      link.click();
                      URL.revokeObjectURL(url);
                      setStatusMessage("Downloaded ms");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (µs)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{`${dateResult.tsMs}000`}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (ns)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{`${dateResult.tsMs}000000`}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
