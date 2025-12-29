"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Lock, RefreshCcw, Unlock } from "lucide-react";

type Unit = "px" | "rem" | "em" | "vw" | "vh" | "vmin" | "vmax" | "%" | "ch" | "ex" | "pt" | "pc" | "in" | "cm" | "mm";

const units: Unit[] = ["px", "rem", "em", "vw", "vh", "vmin", "vmax", "%", "ch", "ex", "pt", "pc", "in", "cm", "mm"];
const outputUnits: Unit[] = ["px", "rem", "em", "vw", "vh", "vmin", "vmax"];
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
  const [percentContext, setPercentContext] = useState("100");
  const [dpi, setDpi] = useState("96");
  const [chRatio, setChRatio] = useState("0.5");
  const [exRatio, setExRatio] = useState("0.5");
  const [useViewport, setUseViewport] = useState(false);
  const [viewportLocked, setViewportLocked] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [precision, setPrecision] = useState("4");
  const [touched, setTouched] = useState<{
    value?: boolean;
    root?: boolean;
    element?: boolean;
    vw?: boolean;
    vh?: boolean;
    percent?: boolean;
    dpi?: boolean;
    ch?: boolean;
    ex?: boolean;
  }>({});

  const convertToPx = (
    val: number,
    unit: Unit,
    rootBase: number,
    elementBase: number,
    vwVal: number,
    vhVal: number,
    percentBase: number,
    dpiVal: number,
    chScale: number,
    exScale: number,
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
      case "vmin":
        return (val / 100) * Math.min(vwVal, vhVal);
      case "vmax":
        return (val / 100) * Math.max(vwVal, vhVal);
      case "%":
        return (val / 100) * percentBase;
      case "ch":
        return val * elementBase * chScale;
      case "ex":
        return val * elementBase * exScale;
      case "in":
        return val * dpiVal;
      case "pt":
        return (val / 72) * dpiVal;
      case "pc":
        return (val / 6) * dpiVal;
      case "cm":
        return (val / 2.54) * dpiVal;
      case "mm":
        return (val / 25.4) * dpiVal;
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
    percentBase: number,
    dpiVal: number,
    chScale: number,
    exScale: number,
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
      case "vmin":
        return (px / Math.min(vwVal, vhVal)) * 100;
      case "vmax":
        return (px / Math.max(vwVal, vhVal)) * 100;
      case "%":
        return (px / percentBase) * 100;
      case "ch":
        return px / (elementBase * chScale);
      case "ex":
        return px / (elementBase * exScale);
      case "in":
        return px / dpiVal;
      case "pt":
        return (px / dpiVal) * 72;
      case "pc":
        return (px / dpiVal) * 6;
      case "cm":
        return (px / dpiVal) * 2.54;
      case "mm":
        return (px / dpiVal) * 25.4;
      default:
        return px;
    }
  };

  const { result, outputValues, fieldErrors, status } = useMemo(() => {
    const derivedFieldErrors: {
      value?: string;
      root?: string;
      element?: string;
      vw?: string;
      vh?: string;
      percent?: string;
      dpi?: string;
      ch?: string;
      ex?: string;
    } = {};
    const parseNumber = (raw: string) => Number(raw.replace(/,/g, ""));
    const valNum = parseNumber(value);
    const rootBase = parseNumber(rootFont);
    const elementBase = parseNumber(elementFont);
    const vwNum = parseNumber(vw);
    const vhNum = parseNumber(vh);
    const percentBase = parseNumber(percentContext);
    const dpiNum = parseNumber(dpi);
    const chScale = parseNumber(chRatio);
    const exScale = parseNumber(exRatio);
    if (Number.isNaN(valNum)) derivedFieldErrors.value = "Enter a numeric value.";
    if (Number.isNaN(rootBase) || rootBase <= 0) derivedFieldErrors.root = "Root font must be positive.";
    if (Number.isNaN(elementBase) || elementBase <= 0) derivedFieldErrors.element = "Element font must be positive.";
    if (Number.isNaN(vwNum) || vwNum <= 0) derivedFieldErrors.vw = "Viewport width must be positive.";
    if (Number.isNaN(vhNum) || vhNum <= 0) derivedFieldErrors.vh = "Viewport height must be positive.";
    if (Number.isNaN(percentBase) || percentBase <= 0) derivedFieldErrors.percent = "Context must be positive.";
    if (Number.isNaN(dpiNum) || dpiNum <= 0) derivedFieldErrors.dpi = "DPI must be positive.";
    if (Number.isNaN(chScale) || chScale <= 0) derivedFieldErrors.ch = "ch ratio must be positive.";
    if (Number.isNaN(exScale) || exScale <= 0) derivedFieldErrors.ex = "ex ratio must be positive.";
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
        outputValues: {} as Record<Unit, string>,
        fieldErrors: derivedFieldErrors,
        status: anyTouched ? "Resolve the highlighted fields." : "Ready",
      };
    }
    const px = convertToPx(valNum, from, rootBase, elementBase, vwNum, vhNum, percentBase, dpiNum, chScale, exScale);
    const converted = convertFromPx(px, to, rootBase, elementBase, vwNum, vhNum, percentBase, dpiNum, chScale, exScale);
    const prec = Math.min(Math.max(Number(precision) || 0, 0), 8);
    const formatValue = (nextValue: number) => {
      const factor = prec ? nextValue.toFixed(prec) : String(nextValue);
      return factor.replace(/\.?0+$/, "");
    };
    const outputEntries = outputUnits.map((unit) => [
      unit,
      formatValue(convertFromPx(px, unit, rootBase, elementBase, vwNum, vhNum, percentBase, dpiNum, chScale, exScale)),
    ]);
    return {
      result: formatValue(converted),
      outputValues: Object.fromEntries(outputEntries) as Record<Unit, string>,
      fieldErrors: derivedFieldErrors,
      status: "Ready",
    };
  }, [value, from, to, rootFont, elementFont, vw, vh, percentContext, dpi, chRatio, exRatio, precision, touched]);

  const showValueError = touched.value && fieldErrors.value;
  const showRootError = touched.root && fieldErrors.root;
  const showElementError = touched.element && fieldErrors.element;
  const showVwError = touched.vw && fieldErrors.vw;
  const showVhError = touched.vh && fieldErrors.vh;
  const showPercentError = touched.percent && fieldErrors.percent;
  const showDpiError = touched.dpi && fieldErrors.dpi;
  const showChError = touched.ch && fieldErrors.ch;
  const showExError = touched.ex && fieldErrors.ex;
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

  const updateViewport = () => {
    setVw(String(window.innerWidth));
    setVh(String(window.innerHeight));
  };

  useEffect(() => {
    if (!useViewport || viewportLocked) return;
    updateViewport();
    const handleResize = () => updateViewport();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [useViewport, viewportLocked]);

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
          Convert between px, rem, em, vw/vh/vmin/vmax, %, ch/ex, and print units using real context values. See a multi-unit table instantly.
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

          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
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
              % context size (px)
              <input
                type="text"
                inputMode="decimal"
                value={percentContext}
                onChange={(e) => setPercentContext(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, percent: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Percent context size"
              />
              {showPercentError ? (
                <span className="text-xs text-amber-600">{fieldErrors.percent}</span>
              ) : (
                <span className="text-xs text-slate-500">% of what? Set the context</span>
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
                readOnly={useViewport && !viewportLocked}
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
                readOnly={useViewport && !viewportLocked}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Viewport height"
              />
              {showVhError ? <span className="text-xs text-amber-600">{fieldErrors.vh}</span> : <span className="text-xs text-slate-500">e.g., 900</span>}
            </label>
            <label className="flex flex-col gap-1">
              DPI (print units)
              <input
                type="text"
                inputMode="decimal"
                value={dpi}
                onChange={(e) => setDpi(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, dpi: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Print DPI"
              />
              {showDpiError ? <span className="text-xs text-amber-600">{fieldErrors.dpi}</span> : <span className="text-xs text-slate-500">CSS default is 96</span>}
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:col-span-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useViewport}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setUseViewport(next);
                    setViewportLocked(false);
                    if (next) {
                      setTouched((prev) => ({ ...prev, vw: false, vh: false }));
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  aria-label="Use current viewport"
                />
                Use current viewport
              </label>
              <button
                type="button"
                onClick={() => setViewportLocked((prev) => !prev)}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
                disabled={!useViewport}
                aria-label={viewportLocked ? "Unlock viewport values" : "Lock viewport values"}
              >
                {viewportLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                {viewportLocked ? "Locked" : "Live"}
              </button>
            </div>
            <label className="flex flex-col gap-1">
              ch width ratio (em)
              <input
                type="text"
                inputMode="decimal"
                value={chRatio}
                onChange={(e) => setChRatio(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, ch: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="ch width ratio"
              />
              {showChError ? (
                <span className="text-xs text-amber-600">{fieldErrors.ch}</span>
              ) : (
                <span className="text-xs text-slate-500">Approx. width of “0” in em</span>
              )}
            </label>
            <label className="flex flex-col gap-1">
              ex height ratio (em)
              <input
                type="text"
                inputMode="decimal"
                value={exRatio}
                onChange={(e) => setExRatio(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, ex: true }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="ex height ratio"
              />
              {showExError ? (
                <span className="text-xs text-amber-600">{fieldErrors.ex}</span>
              ) : (
                <span className="text-xs text-slate-500">Approx. x-height in em</span>
              )}
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
                setPercentContext("100");
                setDpi("96");
                setChRatio("0.5");
                setExRatio("0.5");
                setPrecision("4");
                setTouched({});
                setUseViewport(false);
                setViewportLocked(false);
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
              Tip: Set % context and DPI for print units; ch/ex are font-dependent approximations.
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
          <div className="flex-1 space-y-4 p-4 text-sm leading-relaxed">
            {result ? (
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  {value || 0} {from} = {result} {to}
                </p>
                <p className="text-slate-300 text-xs">
                  Root: {rootFont}px · Element: {elementFont}px · % context: {percentContext}px · DPI: {dpi}
                </p>
                <p className="text-slate-300 text-xs">
                  Viewport: {vw}px × {vh}px · ch: {chRatio}em · ex: {exRatio}em
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
                      Number(percentContext) || 100,
                      Number(dpi) || 96,
                      Number(chRatio) || 0.5,
                      Number(exRatio) || 0.5,
                    ),
                    from,
                    Number(rootFont) || 16,
                    Number(elementFont) || 16,
                    Number(vw) || 1440,
                    Number(vh) || 900,
                    Number(percentContext) || 100,
                    Number(dpi) || 96,
                    Number(chRatio) || 0.5,
                    Number(exRatio) || 0.5,
                  )
                    .toFixed(Math.min(Math.max(Number(precision) || 0, 0), 8))
                    .replace(/\.?0+$/, "")}{" "}
                  {from}
                </p>
              </div>
            ) : (
              <p className="text-slate-300">Converted value will appear here.</p>
            )}
            {result ? (
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Multi-output</p>
                <div className="mt-3 grid gap-2 text-xs text-slate-200 sm:grid-cols-2">
                  {outputUnits.map((unit) => (
                    <div key={unit} className="flex items-center justify-between rounded-lg bg-slate-900/80 px-2.5 py-2">
                      <span className="text-slate-400">{unit}</span>
                      <span className="font-semibold text-slate-100">{outputValues[unit]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a value and choose from/to units.</li>
          <li>Set root font size for rem and element font size for em; adjust viewport and context inputs.</li>
          <li>Review the multi-output table for key units at once.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. All calculations happen in your browser.</p>
          <p><strong>Which units are supported?</strong> px, rem, em, vw, vh, vmin, vmax, %, ch, ex, pt, pc, in, cm, mm.</p>
          <p><strong>What’s the difference between rem and em?</strong> rem uses the root font size; em uses the element font size.</p>
          <p><strong>How should I set % context?</strong> Use the size the percentage is based on (container width/height).</p>
          <p><strong>Are ch/ex exact?</strong> They are font-dependent; adjust ratios for your font.</p>
          <p><strong>How do vw/vh work?</strong> Values are based on the viewport width/height you set (default 1440×900).</p>
          <p><strong>Why no fr?</strong> Grid fractions need layout context, so they belong in a dedicated grid tool.</p>
        </div>
      </div>
    </main>
  );
}
