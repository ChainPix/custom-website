"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, RefreshCcw } from "lucide-react";
import { parseExpression } from "cron-parser";

const describeField = (field: string, label: string) => {
  if (field === "*") return `${label}: any`;
  return `${label}: ${field}`;
};

const pad = (value: number) => String(value).padStart(2, "0");

const formatDate = (d: Date, useUtc: boolean) => {
  if (useUtc) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(
      d.getUTCMinutes()
    )}:${pad(d.getUTCSeconds())} (UTC)`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())} (local)`;
};

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
  try {
    const iterator = parseExpression(expr, {
      currentDate: new Date(),
      tz: useUtc ? "UTC" : undefined,
    });
    const runs: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const next = iterator.next();
      const nextDate = typeof next?.toDate === "function" ? next.toDate() : next;
      if (!(nextDate instanceof Date)) {
        return { error: "Unable to compute next run time.", runs: [] };
      }
      runs.push(formatDate(nextDate, useUtc));
    }
    return runs.length ? { error: "", runs } : { error: "No occurrences found soon. Check the expression.", runs: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid cron expression.";
    return { error: message, runs: [] };
  }
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
