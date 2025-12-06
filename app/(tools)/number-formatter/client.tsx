"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  locale: string;
  style: "decimal" | "currency";
  currency: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  useGrouping: boolean;
  notation: "standard" | "compact" | "scientific";
  roundingMode:
    | "halfExpand"
    | "halfCeil"
    | "halfFloor"
    | "halfEven"
    | "ceil"
    | "floor"
    | "expand"
    | "trunc";
};

const defaultOptions: Options = {
  locale: "en-US",
  style: "decimal",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  useGrouping: true,
  notation: "standard",
  roundingMode: "halfExpand",
};

export default function NumberFormatterClient() {
  const [input, setInput] = useState("1234567.89");
  const [opts, setOpts] = useState<Options>(defaultOptions);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [cleanInput, setCleanInput] = useState(true);

  const { formatted, error, warningMsg } = useMemo(() => {
    const raw = cleanInput ? input.replace(/,/g, "").trim() : input;
    const value = Number(raw);
    if (!input.trim()) return { formatted: "", error: "Enter a number to format.", warningMsg: "" };
    if (Number.isNaN(value)) return { formatted: "", error: "Invalid number.", warningMsg: "" };
    const warningNote = Math.abs(value) > 1e15 ? "Large number; rounding may occur in some locales." : "";
    if (opts.minimumFractionDigits > opts.maximumFractionDigits) {
      return { formatted: "", error: "Minimum fraction digits cannot exceed maximum.", warningMsg: warningNote };
    }
    try {
      const formatter = new Intl.NumberFormat(opts.locale, {
        style: opts.style,
        currency: opts.currency,
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits,
        useGrouping: opts.useGrouping,
        notation: opts.notation,
        roundingMode: opts.roundingMode as Intl.NumberFormatOptions["roundingMode"],
      });
      const result = formatter.format(value);
      return { formatted: result, error: "", warningMsg: warningNote };
    } catch (err) {
      console.error("Format error", err);
      return { formatted: "", error: "Check locale/currency code.", warningMsg: warningNote };
    }
  }, [input, opts]);

  useEffect(() => {
    setWarning(warningMsg);
  }, [warningMsg]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!formatted) return;
    const blob = new Blob([formatted], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "formatted-number.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const loadSampleValue = (value: string, preset?: Partial<Options>) => {
    setInput(value);
    if (preset) {
      setOpts((prev) => ({ ...prev, ...preset }));
    }
    setStatus("Loaded sample");
  };

  const applyPreset = (preset: "us" | "de" | "jp") => {
    if (preset === "us") setOpts((prev) => ({ ...prev, locale: "en-US", currency: "USD" }));
    if (preset === "de") setOpts((prev) => ({ ...prev, locale: "de-DE", currency: "EUR" }));
    if (preset === "jp") setOpts((prev) => ({ ...prev, locale: "ja-JP", currency: "JPY" }));
    setStatus("Applied locale/currency preset");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {error}
      </div>
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

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Number input and options">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Enter number e.g. 1234567.89"
            aria-label="Number input"
          />
          <button
            onClick={() => {
              setInput("1234567.89");
              setOpts(defaultOptions);
              setCopied(false);
              setStatus("Reset to defaults");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset to defaults"
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
                  maximumFractionDigits: Math.max(
                    Number(event.target.value),
                    prev.maximumFractionDigits,
                  ),
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
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Grouping
            <select
              value={opts.useGrouping ? "on" : "off"}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, useGrouping: event.target.value === "on" }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Notation
            <select
              value={opts.notation}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, notation: event.target.value as Options["notation"] }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
              <option value="scientific">Scientific</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Rounding mode
            <select
              value={opts.roundingMode}
              onChange={(event) =>
                setOpts((prev) => ({ ...prev, roundingMode: event.target.value as Options["roundingMode"] }))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="halfExpand">Half expand</option>
              <option value="halfCeil">Half ceil</option>
              <option value="halfFloor">Half floor</option>
              <option value="halfEven">Half even</option>
              <option value="ceil">Ceil</option>
              <option value="floor">Floor</option>
              <option value="expand">Expand</option>
              <option value="trunc">Truncate</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              checked={cleanInput}
              onChange={(e) => setCleanInput(e.target.checked)}
            />
            Clean input (trim & strip commas)
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadSampleValue("1234567.89")}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load sample 1,234,567.89"
            >
              Sample: 1,234,567.89
            </button>
            <button
              type="button"
              onClick={() => loadSampleValue("0.1234")}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load sample 0.1234"
            >
              Sample: 0.1234
            </button>
            <button
              type="button"
              onClick={() => loadSampleValue("9876543210", { notation: "compact" })}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load large number sample"
            >
              Sample: Large number
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Locale/Currency presets:</span>
            <button
              type="button"
              onClick={() => applyPreset("us")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Apply US locale and USD currency"
            >
              US / USD
            </button>
            <button
              type="button"
              onClick={() => applyPreset("de")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Apply German locale and Euro"
            >
              DE / EUR
            </button>
            <button
              type="button"
              onClick={() => applyPreset("jp")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Apply Japan locale and Yen"
            >
              JP / JPY
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800" role="region" aria-label="Formatted output">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Formatted number</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!formatted}
              aria-label="Copy formatted number"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!formatted}
              aria-label="Download formatted number"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
        <div className="p-4 text-lg font-semibold text-slate-50">
          {error ? <span className="text-amber-300">{error}</span> : formatted}
          {warning ? <div className="mt-2 text-sm font-medium text-amber-300">{warning}</div> : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter or paste a number and choose a style (decimal or currency) and locale.</li>
          <li>Adjust grouping, notation, rounding, and fraction digits to fit your use case.</li>
          <li>Copy or download the formatted value for reuse.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser; no data is sent to a server.</p>
          <p><strong>Invalid locale/currency?</strong> Check that your locale (e.g., en-US) and currency code (e.g., USD) are valid ISO codes.</p>
          <p><strong>Large numbers?</strong> Very large values may round depending on locale; a warning will appear.</p>
        </div>
      </div>
    </main>
  );
}
