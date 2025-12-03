"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Options = {
  locale: string;
  style: "decimal" | "currency";
  currency: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
};

const defaultOptions: Options = {
  locale: "en-US",
  style: "decimal",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
};

export default function NumberFormatterClient() {
  const [input, setInput] = useState("1234567.89");
  const [opts, setOpts] = useState<Options>(defaultOptions);
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    const value = Number(input.replace(/,/g, ""));
    if (Number.isNaN(value)) return "Invalid number";
    try {
      const formatter = new Intl.NumberFormat(opts.locale, {
        style: opts.style,
        currency: opts.currency,
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits,
      });
      return formatter.format(value);
    } catch (err) {
      console.error("Format error", err);
      return "Invalid formatting options";
    }
  }, [input, opts]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Number Formatter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Format numbers and currencies with locale-aware grouping and decimal control. Runs in your
          browser.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Enter number e.g. 1234567.89"
          />
          <button
            onClick={() => {
              setInput("1234567.89");
              setOpts(defaultOptions);
              setCopied(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Locale
            <input
              type="text"
              value={opts.locale}
              onChange={(event) => setOpts((prev) => ({ ...prev, locale: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="en-US"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Style
            <select
              value={opts.style}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, style: event.target.value as Options["style"] }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="decimal">Decimal</option>
              <option value="currency">Currency</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Currency (when style=currency)
            <input
              type="text"
              value={opts.currency}
              onChange={(event) => setOpts((prev) => ({ ...prev, currency: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="USD"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Min fraction digits
            <input
              type="number"
              min={0}
              max={10}
              value={opts.minimumFractionDigits}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  minimumFractionDigits: Number(event.target.value),
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Max fraction digits
            <input
              type="number"
              min={0}
              max={10}
              value={opts.maximumFractionDigits}
              onChange={(event) =>
                setOpts((prev) => ({
                  ...prev,
                  maximumFractionDigits: Number(event.target.value),
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Formatted number</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!formatted || formatted === "Invalid number"}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="p-4 text-lg font-semibold text-slate-50">{formatted}</div>
      </div>
    </main>
  );
}
