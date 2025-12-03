"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";

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

const formatDate = (d: Date) =>
  `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 8)} (local)`;

const computeNextRuns = (expr: string, count = 5) => {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { error: "Cron must have 5 fields: m h dom mon dow", runs: [] };

  const [minField, hourField, domField, monField, dowField] = parts;
  const minutes = parseField(minField, 0, 59);
  const hours = parseField(hourField, 0, 23);
  const dom = parseField(domField, 1, 31);
  const months = parseField(monField, 1, 12);
  const dow = parseField(dowField, 0, 6); // 0=Sunday
  if (!minutes || !hours || !dom || !months || !dow) {
    return { error: "Invalid field values.", runs: [] };
  }

  const runs: string[] = [];
  const now = new Date();
  let cursor = new Date(now.getTime() + 60_000); // start at next minute
  let attempts = 0;
  while (runs.length < count && attempts < 200000) {
    if (
      minutes.has(cursor.getMinutes()) &&
      hours.has(cursor.getHours()) &&
      months.has(cursor.getMonth() + 1) &&
      dom.has(cursor.getDate()) &&
      dow.has(cursor.getDay())
    ) {
      runs.push(formatDate(cursor));
    }
    cursor = new Date(cursor.getTime() + 60_000);
    attempts += 1;
  }

  if (!runs.length) return { error: "No occurrences found soon. Check the expression.", runs: [] };
  return { error: "", runs };
};

export default function CronParserClient() {
  const [expr, setExpr] = useState("*/5 * * * *");
  const [runs, setRuns] = useState<string[]>([]);
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return "Cron must have 5 fields.";
    const [m, h, dom, mon, dow] = parts;
    return [describeField(m, "Minute"), describeField(h, "Hour"), describeField(dom, "Day"), describeField(mon, "Month"), describeField(dow, "Weekday")].join(" • ");
  }, [expr]);

  const handleParse = () => {
    const result = computeNextRuns(expr, 6);
    setError(result.error);
    setRuns(result.runs);
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Cron Parser</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Validate 5-field cron expressions and view upcoming run times. Uses local time zone.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
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
          >
            Parse
          </button>
          <button
            onClick={() => {
              setExpr("*/5 * * * *");
              setRuns([]);
              setError("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        <p className="text-sm text-slate-600">{summary}</p>
        {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : null}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Next runs</div>
        <div className="divide-y divide-slate-800">
          {runs.length ? (
            runs.map((r, idx) => (
              <div key={`${r}-${idx}`} className="px-4 py-3 text-sm text-slate-100">
                {r}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-300">Parse to view upcoming times.</div>
          )}
        </div>
      </div>
    </main>
  );
}
