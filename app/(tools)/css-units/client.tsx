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
  const [rootFont, setRootFont] = useState("16");
  const [elementFont, setElementFont] = useState("16");
  const [vw, setVw] = useState("1440");
  const [vh, setVh] = useState("900");
  const [copiedResult, setCopiedResult] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [precision, setPrecision] = useState("4");
  const [touched, setTouched] = useState<{
    value?: boolean;
    root?: boolean;
    element?: boolean;
    vw?: boolean;
    vh?: boolean;
  }>({});

  const convertToPx = (
    val: number,
    unit: Unit,
    rootBase: number,
    elementBase: number,
    vwVal: number,
    vhVal: number,
  ) => {
    switch (unit) {
      case "px":
        return val;
      case "rem":
        return val * rootBase;
      case "em":
        return val * elementBase;
      case "vw":
        return (val / 100) * vwVal;
      case "vh":
        return (val / 100) * vhVal;
      default:
        return val;
    }
  };

  const convertFromPx = (
    px: number,
    unit: Unit,
    rootBase: number,
    elementBase: number,
    vwVal: number,
    vhVal: number,
  ) => {
    switch (unit) {
      case "px":
        return px;
      case "rem":
        return px / rootBase;
      case "em":
        return px / elementBase;
      case "vw":
        return (px / vwVal) * 100;
      case "vh":
        return (px / vhVal) * 100;
      default:
        return px;
    }
  };

  const { result, fieldErrors, status } = useMemo(() => {
    const derivedFieldErrors: { value?: string; root?: string; element?: string; vw?: string; vh?: string } = {};
    const parseNumber = (raw: string) => Number(raw.replace(/,/g, ""));
    const valNum = parseNumber(value);
    const rootBase = parseNumber(rootFont);
    const elementBase = parseNumber(elementFont);
    const vwNum = parseNumber(vw);
    const vhNum = parseNumber(vh);
    if (Number.isNaN(valNum)) derivedFieldErrors.value = "Enter a numeric value.";
    if (Number.isNaN(rootBase) || rootBase <= 0) derivedFieldErrors.root = "Root font must be positive.";
    if (Number.isNaN(elementBase) || elementBase <= 0) derivedFieldErrors.element = "Element font must be positive.";
    if (Number.isNaN(vwNum) || vwNum <= 0) derivedFieldErrors.vw = "Viewport width must be positive.";
    if (Number.isNaN(vhNum) || vhNum <= 0) derivedFieldErrors.vh = "Viewport height must be positive.";
    if (valNum > 1_000_000) derivedFieldErrors.value = "Value is too large; please reduce.";
    if (vwNum > 10_000 || vhNum > 10_000) {
      derivedFieldErrors.vw = "Viewport seems too large.";
      derivedFieldErrors.vh = "Viewport seems too large.";
    }
    const hasErrors = Object.keys(derivedFieldErrors).length > 0;
    const anyTouched = Object.values(touched).some(Boolean);
    if (hasErrors) {
      return {
        result: "",
        fieldErrors: derivedFieldErrors,
        status: anyTouched ? "Resolve the highlighted fields." : "Ready",
      };
    }
    const px = convertToPx(valNum, from, rootBase, elementBase, vwNum, vhNum);
    const converted = convertFromPx(px, to, rootBase, elementBase, vwNum, vhNum);
    const prec = Math.min(Math.max(Number(precision) || 0, 0), 8);
    const factor = prec ? converted.toFixed(prec) : String(converted);
    return {
      result: factor.replace(/\.?0+$/, ""),
      fieldErrors: derivedFieldErrors,
      status: "Ready",
    };
  }, [value, from, to, rootFont, elementFont, vw, vh, precision, touched]);

  const showValueError = touched.value && fieldErrors.value;
  const showRootError = touched.root && fieldErrors.root;
  const showElementError = touched.element && fieldErrors.element;
  const showVwError = touched.vw && fieldErrors.vw;
  const showVhError = touched.vh && fieldErrors.vh;
  const showBannerError = Object.keys(fieldErrors).length > 0 && Object.values(touched).some(Boolean);

  const handleCopy = async (text: string, type: "result" | "snippet") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === "result") {
        setCopiedResult(true);
        setTimeout(() => setCopiedResult(false), 1200);
      } else {
        setCopiedSnippet(true);
        setTimeout(() => setCopiedSnippet(false), 1200);
      }
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copiedResult ? "Copied result" : ""} {copiedSnippet ? "Copied snippet" : ""}
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
              CSS Units
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, value: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Input value"
              />
              {showValueError ? <span className="text-xs text-amber-600">{fieldErrors.value}</span> : <span className="text-xs text-slate-500">Number to convert</span>}
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
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <button
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Swap units"
            >
              ↔ Swap
            </button>
            <span className="text-xs text-slate-500">Swap from/to units instantly.</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-sm text-slate-700">
            <label className="flex flex-col gap-1">
              Root font size (rem)
              <input
                type="text"
                inputMode="decimal"
                value={rootFont}
                onChange={(e) => setRootFont(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, root: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Root font size"
              />
              {showRootError ? <span className="text-xs text-amber-600">{fieldErrors.root}</span> : <span className="text-xs text-slate-500">Usually 16px</span>}
            </label>
            <label className="flex flex-col gap-1">
              Element font size (em)
              <input
                type="text"
                inputMode="decimal"
                value={elementFont}
                onChange={(e) => setElementFont(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, element: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Element font size"
              />
              {showElementError ? (
                <span className="text-xs text-amber-600">{fieldErrors.element}</span>
              ) : (
                <span className="text-xs text-slate-500">Matches element context</span>
              )}
            </label>
            <label className="flex flex-col gap-1">
              Viewport width (px)
              <input
                type="text"
                inputMode="decimal"
                value={vw}
                onChange={(e) => setVw(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, vw: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Viewport width"
              />
              {showVwError ? <span className="text-xs text-amber-600">{fieldErrors.vw}</span> : <span className="text-xs text-slate-500">e.g., 1440</span>}
            </label>
            <label className="flex flex-col gap-1">
              Viewport height (px)
              <input
                type="text"
                inputMode="decimal"
                value={vh}
                onChange={(e) => setVh(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, vh: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Viewport height"
              />
              {showVhError ? <span className="text-xs text-amber-600">{fieldErrors.vh}</span> : <span className="text-xs text-slate-500">e.g., 900</span>}
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
                setRootFont("16");
                setElementFont("16");
                setVw("1440");
                setVh("900");
                setPrecision("4");
                setTouched({});
                setCopiedResult(false);
                setCopiedSnippet(false);
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
                  setTouched((prev) => ({ ...prev, vw: false, vh: false }));
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
          {showBannerError ? (
            <p className="text-sm font-medium text-amber-600">Resolve the highlighted fields.</p>
          ) : null}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Result</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleCopy(result, "result")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!result}
                aria-label="Copy just number"
              >
                {copiedResult ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedResult ? "Copied" : "Copy number"}
              </button>
              <button
                onClick={() => handleCopy(result ? `${result}${to}` : "", "result")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!result}
                aria-label="Copy with unit"
              >
                {copiedResult ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedResult ? "Copied" : "Copy with unit"}
              </button>
              <button
                onClick={() => handleCopy(result ? `font-size: ${result}${to};` : "", "snippet")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!result}
                aria-label="Copy CSS snippet"
              >
                {copiedSnippet ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedSnippet ? "Snippet copied" : "CSS snippet"}
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 text-sm leading-relaxed">
            {result ? (
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  {value || 0} {from} = {result} {to}
                </p>
                <p className="text-slate-300 text-xs">
                  Root: {rootFont}px · Element: {elementFont}px · Viewport: {vw}px × {vh}px
                </p>
                <p className="text-slate-300 text-xs">
                  Reverse: {result} {to} ={" "}
                  {convertFromPx(
                    convertToPx(
                      Number(result),
                      to,
                      Number(rootFont) || 16,
                      Number(elementFont) || 16,
                      Number(vw) || 1440,
                      Number(vh) || 900,
                    ),
                    from,
                    Number(rootFont) || 16,
                    Number(elementFont) || 16,
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
          <li>Set root font size for rem and element font size for em; adjust viewport for vw/vh.</li>
          <li>Copy the result or reset to defaults to start over.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. All calculations happen in your browser.</p>
          <p><strong>Which units are supported?</strong> px, rem, em, vw, vh.</p>
          <p><strong>What’s the difference between rem and em?</strong> rem uses the root font size; em uses the element font size.</p>
          <p><strong>How do vw/vh work?</strong> Values are based on the viewport width/height you set (default 1440×900).</p>
        </div>
      </div>
    </main>
  );
}
