"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clipboard, Check, RefreshCcw } from "lucide-react";

type Picker = {
  minutes: string;
  hours: string;
  dom: string;
  mon: string;
  dow: string;
};

const defaultPicker: Picker = {
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

  const cron = useMemo(
    () => `${picker.minutes} ${picker.hours} ${picker.dom} ${picker.mon} ${picker.dow}`,
    [picker],
  );

  const summary = useMemo(
    () =>
      [
        describeField(picker.minutes, "Minute"),
        describeField(picker.hours, "Hour"),
        describeField(picker.dom, "Day of month"),
        describeField(picker.mon, "Month"),
        describeField(picker.dow, "Weekday"),
      ].join(" • "),
    [picker],
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

  return (
    <main className="space-y-8">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Minutes
            <input
              type="text"
              value={picker.minutes}
              onChange={(event) => update("minutes", event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="*/5 or 0"
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
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPicker(defaultPicker);
              setCopied(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy cron"}
          </button>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-800 ring-1 ring-slate-200">
          <p className="font-semibold text-slate-900">Cron</p>
          <p className="font-mono text-sm text-slate-700">{cron}</p>
          <p className="mt-2 text-slate-700">{summary}</p>
        </div>
      </div>
    </main>
  );
}
