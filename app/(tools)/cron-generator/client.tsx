"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clipboard, Check, Download, RefreshCcw } from "lucide-react";

type Picker = {
  seconds: string;
  minutes: string;
  hours: string;
  dom: string;
  mon: string;
  dow: string;
};

const defaultPicker: Picker = {
  seconds: "0",
  minutes: "0",
  hours: "0",
  dom: "*",
  mon: "*",
  dow: "*",
};

const describeField = (field: string, label: string) => {
  if (field === "*") return `${label}: any`;
  if (field.includes("/")) return `${label}: every ${field.split("/")[1]} starting at ${field.split("/")[0]}`;
  if (field.includes(",")) return `${label}: ${field}`;
  return `${label}: ${field}`;
};

export default function CronGeneratorClient() {
  const [picker, setPicker] = useState<Picker>(defaultPicker);
  const [copied, setCopied] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [useSeconds, setUseSeconds] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [useUtc, setUseUtc] = useState(false);
  const MAX_LEN = 80;

  const cron = useMemo(() => {
    const base = `${picker.minutes} ${picker.hours} ${picker.dom} ${picker.mon} ${picker.dow}`;
    return useSeconds ? `${picker.seconds} ${base}` : base;
  }, [picker, useSeconds]);

  const summary = useMemo(
    () =>
      [
        useSeconds ? describeField(picker.seconds, "Second") : null,
        describeField(picker.minutes, "Minute"),
        describeField(picker.hours, "Hour"),
        describeField(picker.dom, "Day of month"),
        describeField(picker.mon, "Month"),
        describeField(picker.dow, "Weekday"),
      ]
        .filter(Boolean)
        .join(" • "),
    [picker, useSeconds],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cron);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const update = (key: keyof Picker, value: string) => {
    setPicker((prev) => ({ ...prev, [key]: value || "*" }));
    setCopied(false);
  };

  const presets: Record<string, { picker: Picker; useSeconds?: boolean }> = {
    "Every 5m": { picker: { ...picker, seconds: "0", minutes: "*/5", hours: "*", dom: "*", mon: "*", dow: "*" } },
    Hourly: { picker: { ...picker, seconds: "0", minutes: "0", hours: "*", dom: "*", mon: "*", dow: "*" } },
    "Daily 2am": { picker: { ...picker, seconds: "0", minutes: "0", hours: "2", dom: "*", mon: "*", dow: "*" } },
    "Weekdays 9-5": { picker: { ...picker, seconds: "0", minutes: "0", hours: "9-17", dom: "*", mon: "*", dow: "1-5" } },
    "First of month": { picker: { ...picker, seconds: "0", minutes: "0", hours: "0", dom: "1", mon: "*", dow: "*" } },
  };

  const parseField = (expr: string, min: number, max: number) => {
    const values = new Set<number>();
    const parts = expr.split(",");
    parts.forEach((part) => {
      const item = part.trim();
      if (!item) return;
      const [rangePart, stepPart] = item.split("/");
      const step = stepPart ? Math.max(1, Number(stepPart)) : 1;
      const applyRange = (start: number, end: number) => {
        for (let i = start; i <= end; i += step) values.add(i);
      };
      if (rangePart === "*") {
        applyRange(min, max);
      } else if (rangePart.includes("-")) {
        const [a, b] = rangePart.split("-").map(Number);
        if (Number.isFinite(a) && Number.isFinite(b) && a <= b) {
          applyRange(Math.max(min, a), Math.min(max, b));
        }
      } else {
        const num = Number(rangePart);
        if (Number.isFinite(num) && num >= min && num <= max) {
          applyRange(num, num);
        }
      }
    });
    return [...values].sort((a, b) => a - b);
  };

  const matchesCron = (date: Date) => {
    const sec = date.getUTCSeconds();
    const min = date.getUTCMinutes();
    const hr = date.getUTCHours();
    const dom = date.getUTCDate();
    const mon = date.getUTCMonth() + 1;
    const dow = date.getUTCDay();

    const secondsOk = useSeconds ? parseField(picker.seconds, 0, 59).includes(sec) : true;
    const minutesOk = parseField(picker.minutes, 0, 59).includes(min);
    const hoursOk = parseField(picker.hours, 0, 23).includes(hr);
    const domOk = parseField(picker.dom, 1, 31).includes(dom);
    const monOk = parseField(picker.mon, 1, 12).includes(mon);
    const dowOk = parseField(picker.dow, 0, 6).includes(dow);
    return secondsOk && minutesOk && hoursOk && domOk && monOk && dowOk;
  };

  const nextRuns = useMemo(() => {
    if (errors.length) return [];
    const runs: string[] = [];
    let cursor = new Date();
    cursor.setSeconds(cursor.getSeconds() + 1);
    let iterations = 0;
    const stepMs = useSeconds ? 1000 : 60000;
    while (runs.length < 5 && iterations < 5000) {
      if (matchesCron(cursor)) {
        runs.push(
          useUtc
            ? cursor.toLocaleString("en-US", { timeZone: "UTC", hour12: false })
            : cursor.toLocaleString(),
        );
      }
      cursor = new Date(cursor.getTime() + stepMs);
      iterations++;
    }
    return runs;
  }, [cron, errors.length, useSeconds, useUtc, picker]);

  const downloadJson = () => {
    const data = {
      cron,
      useSeconds,
      fields: picker,
      summary,
      timezone: useUtc ? "UTC" : "Local",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cron-expression.json";
    a.click();
    URL.revokeObjectURL(url);
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

  useMemo(() => {
    const errs: string[] = [];
    const allowed = /^[0-9*/,\-]+$/;
    const fields: Array<{ key: keyof Picker; label: string }> = [
      ...(useSeconds ? [{ key: "seconds" as const, label: "Seconds" }] : []),
      { key: "minutes", label: "Minutes" },
      { key: "hours", label: "Hours" },
      { key: "dom", label: "Day of month" },
      { key: "mon", label: "Month" },
      { key: "dow", label: "Day of week" },
    ];
    const asString = fields.map((f) => picker[f.key]).join(" ");
    if (asString.trim().length === 0) {
      errs.push("Enter values for all cron fields.");
    }
    if (asString.length > MAX_LEN) {
      errs.push("Expression is too long; check ranges and lists.");
    }
    fields.forEach((f) => {
      const val = picker[f.key].trim();
      if (!val) {
        errs.push(`${f.label} cannot be empty.`);
      } else if (!allowed.test(val)) {
        errs.push(`${f.label} has invalid characters. Use numbers, *, /, -, , only.`);
      }
    });
    setErrors(errs);
  }, [picker, useSeconds]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {errors.length ? `Errors: ${errors.join(", ")}` : "Cron ready"}
        {copied ? "Cron copied" : ""}
        {copiedSummary ? "Summary copied" : ""}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Cron Expression Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Build 5-field cron expressions with simple pickers. Copy the cron string and read the human-friendly summary.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useSeconds}
              onChange={(e) => setUseSeconds(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Toggle seconds field"
            />
            Include seconds (6-field cron)
          </label>
          {errors.length > 0 ? <span className="text-amber-600 font-medium">Resolve errors before copying.</span> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useSeconds ? (
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Seconds
              <input
                type="text"
              value={picker.seconds}
              onChange={(event) => update("seconds", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="0 or */10"
              aria-label="Seconds field"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Minutes
            <input
              type="text"
              value={picker.minutes}
              onChange={(event) => update("minutes", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="*/5 or 0"
              aria-label="Minutes field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Hours
            <input
              type="text"
              value={picker.hours}
              onChange={(event) => update("hours", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="* or 0 or 9-17"
              aria-label="Hours field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Day of month
            <input
              type="text"
              value={picker.dom}
              onChange={(event) => update("dom", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="* or 1,15"
              aria-label="Day of month field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Month
            <input
              type="text"
              value={picker.mon}
              onChange={(event) => update("mon", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="* or 1-12"
              aria-label="Month field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Day of week
            <input
              type="text"
              value={picker.dow}
              onChange={(event) => update("dow", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="* or 0-6"
              aria-label="Day of week field"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPicker(defaultPicker);
              setCopied(false);
              setCopiedSummary(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset cron inputs"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          {Object.entries(presets).map(([label, preset]) => (
            <button
              key={label}
              onClick={() => {
                setPicker(preset.picker);
                setUseSeconds(Boolean(preset.useSeconds));
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
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useUtc}
                onChange={(e) => setUseUtc(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Toggle UTC for next runs"
              />
              Show next runs in UTC
            </label>
            {nextRuns.length ? <span className="text-slate-600">Upcoming runs ({useUtc ? "UTC" : "Local"})</span> : null}
          </div>
          {nextRuns.length ? (
            <ul className="mt-2 space-y-1 text-slate-700">
              {nextRuns.map((r) => (
                <li key={r} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-1 ring-1 ring-slate-200">
                  <span className="text-sm">{r}</span>
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
            <li>Set the cron fields or choose a preset; optionally enable seconds.</li>
            <li>Resolve any validation warnings, then copy the cron or summary, or download JSON.</li>
            <li>Review the next run times in local or UTC.</li>
          </ol>
          <div className="mt-3 space-y-1 text-xs text-slate-700">
            <p className="font-semibold text-slate-900">FAQ & privacy</p>
            <p><strong>Local only?</strong> Yes. Everything runs in your browser.</p>
            <p><strong>Seconds support?</strong> Toggle the 6-field option.</p>
            <p><strong>Timezone?</strong> Switch between local and UTC for previews.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
