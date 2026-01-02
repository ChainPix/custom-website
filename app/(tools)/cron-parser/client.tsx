"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clipboard, Download, RefreshCcw } from "lucide-react";

type FieldSet = Set<number>;

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

const describeField = (field: string, label: string) => {
  if (field === "*") return `${label}: any`;
  return `${label}: ${field}`;
};

const formatDate = (d: Date, useUtc: boolean) => {
  if (useUtc) {
    return `${d.toISOString().replace("T", " ").slice(0, 19)} (UTC)`;
  }
  const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${localDate} ${d.toTimeString().slice(0, 8)} (local)`;
};

const nextValue = (values: number[], current: number) => {
  for (const value of values) {
    if (value >= current) return { value, wrapped: false };
  }
  return { value: values[0], wrapped: true };
};

const computeNextRuns = (expr: string, count = 5, includeSeconds = false, useUtc = false) => {
  const parts = expr.trim().split(/\s+/);
  if (includeSeconds ? parts.length !== 6 : parts.length !== 5) {
    return { error: includeSeconds ? "Cron must have 6 fields: s m h dom mon dow" : "Cron must have 5 fields: m h dom mon dow", runs: [] };
  }

  const [secField, minField, hourField, domField, monField, dowField] = includeSeconds
    ? parts
    : ["0", ...parts];

  const seconds = parseField(secField, 0, 59);
  if (!seconds) return { error: "Invalid seconds field.", runs: [] };
  const minutes = parseField(minField, 0, 59);
  if (!minutes) return { error: "Invalid minutes field.", runs: [] };
  const hours = parseField(hourField, 0, 23);
  if (!hours) return { error: "Invalid hours field.", runs: [] };
  const dom = parseField(domField, 1, 31);
  if (!dom) return { error: "Invalid day-of-month field.", runs: [] };
  const months = parseField(monField, 1, 12);
  if (!months) return { error: "Invalid month field.", runs: [] };
  const dow = parseField(dowField, 0, 6); // 0=Sunday
  if (!dow) return { error: "Invalid day-of-week field.", runs: [] };

  const secondsList = [...seconds].sort((a, b) => a - b);
  const minutesList = [...minutes].sort((a, b) => a - b);
  const hoursList = [...hours].sort((a, b) => a - b);
  const monthsList = [...months].sort((a, b) => a - b);
  const minSecond = secondsList[0];
  const minMinute = minutesList[0];
  const minHour = hoursList[0];
  const minMonth = monthsList[0];

  const getSeconds = useUtc ? (d: Date) => d.getUTCSeconds() : (d: Date) => d.getSeconds();
  const getMinutes = useUtc ? (d: Date) => d.getUTCMinutes() : (d: Date) => d.getMinutes();
  const getHours = useUtc ? (d: Date) => d.getUTCHours() : (d: Date) => d.getHours();
  const getMonth = useUtc ? (d: Date) => d.getUTCMonth() : (d: Date) => d.getMonth();
  const getDate = useUtc ? (d: Date) => d.getUTCDate() : (d: Date) => d.getDate();
  const getDay = useUtc ? (d: Date) => d.getUTCDay() : (d: Date) => d.getDay();
  const getYear = useUtc ? (d: Date) => d.getUTCFullYear() : (d: Date) => d.getFullYear();
  const setSeconds = useUtc ? (d: Date, value: number) => d.setUTCSeconds(value) : (d: Date, value: number) => d.setSeconds(value);
  const setMinutes = useUtc ? (d: Date, value: number) => d.setUTCMinutes(value) : (d: Date, value: number) => d.setMinutes(value);
  const setHours = useUtc ? (d: Date, value: number) => d.setUTCHours(value) : (d: Date, value: number) => d.setHours(value);
  const setDate = useUtc ? (d: Date, value: number) => d.setUTCDate(value) : (d: Date, value: number) => d.setDate(value);
  const setMonth = useUtc ? (d: Date, value: number) => d.setUTCMonth(value) : (d: Date, value: number) => d.setMonth(value);
  const setYear = useUtc ? (d: Date, value: number) => d.setUTCFullYear(value) : (d: Date, value: number) => d.setFullYear(value);

  const stepMs = includeSeconds ? 1000 : 60_000;
  const attemptsCap = includeSeconds ? 400_000 : 200_000;
  const runs: string[] = [];
  const now = new Date();
  let cursor = new Date(now.getTime() + stepMs); // start at next tick
  if (!includeSeconds) setSeconds(cursor, 0);
  let attempts = 0;
  while (runs.length < count && attempts < attemptsCap) {
    const month = getMonth(cursor) + 1;
    if (!months.has(month)) {
      const { value, wrapped } = nextValue(monthsList, month);
      if (wrapped) setYear(cursor, getYear(cursor) + 1);
      setMonth(cursor, value - 1);
      setDate(cursor, 1);
      setHours(cursor, minHour);
      setMinutes(cursor, minMinute);
      setSeconds(cursor, minSecond);
      attempts += 1;
      continue;
    }

    if (!dom.has(getDate(cursor)) || !dow.has(getDay(cursor))) {
      setDate(cursor, getDate(cursor) + 1);
      setHours(cursor, minHour);
      setMinutes(cursor, minMinute);
      setSeconds(cursor, minSecond);
      attempts += 1;
      continue;
    }

    const hour = getHours(cursor);
    if (!hours.has(hour)) {
      const { value, wrapped } = nextValue(hoursList, hour);
      if (wrapped) {
        setDate(cursor, getDate(cursor) + 1);
      }
      setHours(cursor, value);
      setMinutes(cursor, minMinute);
      setSeconds(cursor, minSecond);
      attempts += 1;
      continue;
    }

    const minute = getMinutes(cursor);
    if (!minutes.has(minute)) {
      const { value, wrapped } = nextValue(minutesList, minute);
      if (wrapped) {
        setHours(cursor, hour + 1);
        setMinutes(cursor, minMinute);
      } else {
        setMinutes(cursor, value);
      }
      setSeconds(cursor, minSecond);
      attempts += 1;
      continue;
    }

    const second = getSeconds(cursor);
    if (!seconds.has(second)) {
      const { value, wrapped } = nextValue(secondsList, second);
      if (wrapped) {
        setMinutes(cursor, minute + 1);
        setSeconds(cursor, minSecond);
      } else {
        setSeconds(cursor, value);
      }
      attempts += 1;
      continue;
    }

    runs.push(formatDate(cursor, useUtc));
    if (includeSeconds) {
      setSeconds(cursor, getSeconds(cursor) + 1);
    } else {
      setMinutes(cursor, getMinutes(cursor) + 1);
      setSeconds(cursor, minSecond);
    }
    attempts += 1;
  }

  if (!runs.length) {
    return {
      error: attempts >= attemptsCap
        ? "No occurrences found before safety limit. Check the expression."
        : "No occurrences found soon. Check the expression.",
      runs: [],
    };
  }
  return { error: "", runs };
};

export default function CronParserClient() {
  const [expr, setExpr] = useState("*/5 * * * *");
  const [runs, setRuns] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [useSeconds, setUseSeconds] = useState(false);
  const [useUtc, setUseUtc] = useState(false);

  const summary = useMemo(() => {
    const parts = expr.trim().split(/\s+/);
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
  }, [expr, useSeconds]);

  const handleParse = () => {
    const result = computeNextRuns(expr, 6, useSeconds, useUtc);
    setError(result.error);
    setRuns(result.runs);
    setStatus(result.error ? "Parse failed" : "Parsed");
    if (!result.error && warning) setWarning(warning);
  };

  const handleSecondsToggle = (checked: boolean) => {
    setUseSeconds(checked);
    const parts = expr.trim().split(/\s+/);
    if (checked && parts.length === 5) {
      setExpr(`0 ${expr.trim()}`);
    } else if (!checked && parts.length === 6) {
      setExpr(parts.slice(1).join(" "));
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {error}
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
          Validate 5-field cron expressions and view upcoming run times. Uses your local time zone.
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
            className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="*/5 * * * *"
            spellCheck={false}
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
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={useSeconds}
              onChange={(e) => handleSecondsToggle(e.target.checked)}
            />
            6-field (include seconds)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={useUtc}
              onChange={(e) => setUseUtc(e.target.checked)}
            />
            UTC times
          </label>
          {warning ? (
            <span className="font-medium text-amber-700" role="alert">
              {warning}
            </span>
          ) : null}
        </div>
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
        <p className="text-sm text-slate-600">{summary}</p>
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
        <div className="divide-y divide-slate-800">
          {runs.length ? (
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
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a 5-field cron (or enable seconds for 6-field) and click Parse.</li>
          <li>Use presets (to be added) or copy/download the next run times for reference.</li>
          <li>Switch UTC on/off to view times in your preferred timezone.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser.</p>
          <p><strong>Supported format?</strong> Standard numeric cron with ranges/steps; optional 6th field for seconds. Day-of-week accepts 0-6 (Sun=0) or 7 (Sun).</p>
          <p><strong>Timezone?</strong> Times shown in local by default; toggle UTC if needed.</p>
        </div>
      </div>
    </main>
  );
}
