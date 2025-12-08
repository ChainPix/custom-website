"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Unit = "px" | "rem" | "em" | "vw" | "vh";

const units: Unit[] = ["px", "rem", "em", "vw", "vh"];
const presets = {
  Mobile: { vw: "390", vh: "844" },
  Tablet: { vw: "768", vh: "1024" },
  Desktop: { vw: "1440", vh: "900" },
};

export default function CssUnitsClient() {
  const [value, setValue] = useState("16");
  const [from, setFrom] = useState<Unit>("px");
  const [to, setTo] = useState<Unit>("rem");
  const [baseFont, setBaseFont] = useState("16");
  const [vw, setVw] = useState("1440");
  const [vh, setVh] = useState("900");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [precision, setPrecision] = useState("4");
  const [fieldErrors, setFieldErrors] = useState<{ value?: string; base?: string; vw?: string; vh?: string }>({});

  const status = useMemo(() => {
    if (error) return error;
    return "Ready";
  }, [error]);

  const convertToPx = (val: number, unit: Unit, base: number, vwVal: number, vhVal: number) => {
    switch (unit) {
      case "px":
        return val;
      case "rem":
      case "em":
        return val * base;
      case "vw":
        return (val / 100) * vwVal;
      case "vh":
        return (val / 100) * vhVal;
      default:
        return val;
    }
  };

  const convertFromPx = (px: number, unit: Unit, base: number, vwVal: number, vhVal: number) => {
    switch (unit) {
      case "px":
        return px;
      case "rem":
      case "em":
        return px / base;
      case "vw":
        return (px / vwVal) * 100;
      case "vh":
        return (px / vhVal) * 100;
      default:
        return px;
    }
  };

  const result = useMemo(() => {
    setError("");
    const nextFieldErrors: typeof fieldErrors = {};
    const valNum = Number(value);
    const base = Number(baseFont);
    const vwNum = Number(vw);
    const vhNum = Number(vh);
    if (Number.isNaN(valNum)) nextFieldErrors.value = "Enter a numeric value.";
    if (Number.isNaN(base) || base <= 0) nextFieldErrors.base = "Base font must be positive.";
    if (Number.isNaN(vwNum) || vwNum <= 0) nextFieldErrors.vw = "Viewport width must be positive.";
    if (Number.isNaN(vhNum) || vhNum <= 0) nextFieldErrors.vh = "Viewport height must be positive.";
    if (valNum > 1_000_000) nextFieldErrors.value = "Value is too large; please reduce.";
    if (vwNum > 10_000 || vhNum > 10_000) {
      nextFieldErrors.vw = "Viewport seems too large.";
      nextFieldErrors.vh = "Viewport seems too large.";
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      setError("Resolve the highlighted fields.");
      return "";
    }
    const px = convertToPx(valNum, from, base, vwNum, vhNum);
    const converted = convertFromPx(px, to, base, vwNum, vhNum);
    const prec = Math.min(Math.max(Number(precision) || 0, 0), 8);
    const factor = prec ? converted.toFixed(prec) : String(converted);
    return factor.replace(/\.?0+$/, "");
  }, [value, from, to, baseFont, vw, vh, precision]);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied result" : ""}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">CSS Units Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert between px, rem, em, vw, and vh using your base font size and viewport dimensions. Runs locally in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Value
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Input value"
              />
              {fieldErrors.value ? <span className="text-xs text-amber-600">{fieldErrors.value}</span> : <span className="text-xs text-slate-500">Number to convert</span>}
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
              <label className="flex flex-col gap-1">
                From
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value as Unit)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="From unit"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                To
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value as Unit)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="To unit"
                >
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-sm text-slate-700">
            <label className="flex flex-col gap-1">
              Base font size (px)
              <input
                type="text"
                value={baseFont}
                onChange={(e) => setBaseFont(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Base font size"
              />
              {fieldErrors.base ? <span className="text-xs text-amber-600">{fieldErrors.base}</span> : <span className="text-xs text-slate-500">16px is common</span>}
            </label>
            <label className="flex flex-col gap-1">
              Viewport width (px)
              <input
                type="text"
                value={vw}
                onChange={(e) => setVw(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Viewport width"
              />
              {fieldErrors.vw ? <span className="text-xs text-amber-600">{fieldErrors.vw}</span> : <span className="text-xs text-slate-500">e.g., 1440</span>}
            </label>
            <label className="flex flex-col gap-1">
              Viewport height (px)
              <input
                type="text"
                value={vh}
                onChange={(e) => setVh(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Viewport height"
              />
              {fieldErrors.vh ? <span className="text-xs text-amber-600">{fieldErrors.vh}</span> : <span className="text-xs text-slate-500">e.g., 900</span>}
            </label>
            <label className="flex flex-col gap-1">
              Precision (digits)
              <input
                type="number"
                min={0}
                max={8}
                value={precision}
                onChange={(e) => setPrecision(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Rounding precision"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setValue("16");
                setFrom("px");
                setTo("rem");
                setBaseFont("16");
                setVw("1440");
                setVh("900");
                setPrecision("4");
                setError("");
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Reset defaults"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            {Object.entries(presets).map(([label, preset]) => (
              <button
                key={label}
                onClick={() => {
                  setVw(preset.vw);
                  setVh(preset.vh);
                  setError("");
                }}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label={`Set ${label} viewport`}
              >
                {label}
              </button>
            ))}
            <p className="text-xs text-slate-600">
              Tip: Adjust base font size for rem/em; update viewport for vw/vh accuracy.
            </p>
          </div>
          {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : null}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Result</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!result}
              aria-label="Copy result"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={async () => {
                if (!result) return;
                const snippet = `font-size: ${result}${to};`;
                try {
                  await navigator.clipboard.writeText(snippet);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch (err) {
                  console.error("Copy failed", err);
                }
              }}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!result}
              aria-label="Copy CSS snippet"
            >
              <Clipboard className="h-4 w-4" />
              CSS snippet
            </button>
          </div>
          <div className="flex-1 p-4 text-sm leading-relaxed">
            {result ? (
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  {value || 0} {from} = {result} {to}
                </p>
                <p className="text-slate-300 text-xs">
                  Base: {baseFont}px · Viewport: {vw}px × {vh}px
                </p>
                <p className="text-slate-300 text-xs">
                  Reverse: {result} {to} ={" "}
                  {convertFromPx(
                    convertToPx(Number(result), to, Number(baseFont) || 16, Number(vw) || 1440, Number(vh) || 900),
                    from,
                    Number(baseFont) || 16,
                    Number(vw) || 1440,
                    Number(vh) || 900,
                  )
                    .toFixed(Math.min(Math.max(Number(precision) || 0, 0), 8))
                    .replace(/\.?0+$/, "")}{" "}
                  {from}
                </p>
              </div>
            ) : (
              <p className="text-slate-300">Converted value will appear here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a value and choose from/to units.</li>
          <li>Adjust base font size for rem/em and viewport width/height for vw/vh.</li>
          <li>Copy the result or reset to defaults to start over.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. All calculations happen in your browser.</p>
          <p><strong>Which units are supported?</strong> px, rem, em, vw, vh.</p>
          <p><strong>How do vw/vh work?</strong> Values are based on the viewport width/height you set (default 1440×900).</p>
        </div>
      </div>
    </main>
  );
}
