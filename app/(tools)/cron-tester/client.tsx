"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

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

    if (rangePart.includes("-")) {
      const [startStr, endStr] = rangePart.split("-");
      const start = Number(startStr);
      const end = Number(endStr);
      if ([start, end].some(Number.isNaN)) return null;
      for (let i = start; i <= end; i += step) {
        if (i < min || i > max) return null;
        set.add(i);
      }
    } else {
      const val = Number(rangePart);
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

const formatDate = (d: Date, useUtc: boolean) =>
  useUtc
    ? `${d.toISOString().replace("T", " ").slice(0, 19)} (UTC)`
    : `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 8)} (local)`;

const normalizeExprForMode = (expression: string, useSeconds: boolean) => {
  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (useSeconds && parts.length === 5) return `0 ${trimmed}`;
  if (!useSeconds && parts.length === 6) return parts.slice(1).join(" ");
  return trimmed;
};

const computeNextRuns = (expr: string, count = 5, includeSeconds = false, useUtc = false) => {
  const parts = expr.trim().split(/\s+/);
  if (includeSeconds ? parts.length !== 6 : parts.length !== 5) {
    return { error: includeSeconds ? "Cron must have 6 fields: s m h dom mon dow" : "Cron must have 5 fields: m h dom mon dow", runs: [] };
  }

  const [secField, minField, hourField, domField, monField, dowField] = includeSeconds ? parts : ["0", ...parts];

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

  const stepMs = includeSeconds ? 1000 : 60_000;
  const attemptsCap = includeSeconds ? 400_000 : 200_000;
  const runs: string[] = [];
  const now = new Date();
  let cursor = new Date(now.getTime() + stepMs);
  let attempts = 0;
  while (runs.length < count && attempts < attemptsCap) {
    if (
      seconds.has(cursor.getSeconds()) &&
      minutes.has(cursor.getMinutes()) &&
      hours.has(cursor.getHours()) &&
      months.has(cursor.getMonth() + 1) &&
      dom.has(cursor.getDate()) &&
      dow.has(cursor.getDay())
    ) {
      runs.push(formatDate(cursor, useUtc));
    }
    cursor = new Date(cursor.getTime() + stepMs);
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

const samples = [
  { label: "Every 5 mins", value: "*/5 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily 2am", value: "0 2 * * *" },
  { label: "Weekdays 9-5", value: "0 9-17 * * 1-5" },
  { label: "First of month", value: "0 6 1 * *" },
];

export default function CronTesterClient() {
  const [expr, setExpr] = useState("*/5 * * * *");
  const [runs, setRuns] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [useSeconds, setUseSeconds] = useState(false);
  const [useUtc, setUseUtc] = useState(false);
  const [count, setCount] = useState(5);

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
    ]
      .filter(Boolean)
      .join(" • ");
  }, [expr, useSeconds]);

  const handleParse = () => {
    const normalized = normalizeExprForMode(expr, useSeconds);
    if (!normalized) {
      setError("Enter a cron expression.");
      setRuns([]);
      setStatus("Parse failed");
      return;
    }
    const safeCount = Math.min(Math.max(count || 5, 1), 20);
    const result = computeNextRuns(normalized, safeCount, useSeconds, useUtc);
    setError(result.error);
    setRuns(result.runs);
    setStatus(result.error ? "Parse failed" : "Parsed");
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
    <main className="space-y-8 mx-auto max-w-5xl px-4">
      <div className="sr-only" aria-live="polite">
        {status} {error}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Cron Expression Tester</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Validate cron syntax and see the next run times. Supports 5-field and 6-field cron with local/UTC toggle.
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
                    setError("");
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
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={useSeconds}
                onChange={(e) => handleSecondsToggle(e.target.checked)}
                aria-label="Use 6-field cron with seconds"
              />
              6-field (seconds)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={useUtc}
                onChange={(e) => setUseUtc(e.target.checked)}
                aria-label="Show times in UTC"
              />
              UTC
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
                setError("");
                setUseSeconds(false);
                setUseUtc(false);
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
            onChange={(event) => setExpr(event.target.value)}
            placeholder="*/5 * * * *"
            aria-label="Cron expression input"
            spellCheck={false}
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Summary</p>
            <p className="text-sm text-slate-700">{summary}</p>
          </div>
          <button
            onClick={handleParse}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Validate cron"
          >
            Validate
          </button>
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

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a cron expression (5-field or enable seconds for 6-field).</li>
          <li>Toggle UTC if you want times in UTC; adjust how many run times to show.</li>
          <li>Validate to see upcoming run times. Copy them for logs or tests.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>Validation runs locally in your browser; no cron strings are uploaded.</p>
          <p>Safety caps are applied to avoid long-running calculations on complex expressions.</p>
        </div>
      </div>
    </main>
  );
}
