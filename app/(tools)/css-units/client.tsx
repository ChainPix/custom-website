"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Lock, RefreshCcw, Unlock } from "lucide-react";
import { convert, convertFromPx, convertToPx, type ConversionContext, type Unit } from "@/lib/cssUnits";

type ConversionSnapshot = {
  key: string;
  value: string;
  from: Unit;
  to: Unit;
  rootFont: string;
  elementFont: string;
  vw: string;
  vh: string;
  percentContext: string;
  dpi: string;
  chRatio: string;
  exRatio: string;
  precision: string;
  timestamp: number;
};

const units: Unit[] = ["px", "rem", "em", "vw", "vh", "vmin", "vmax", "%", "ch", "ex", "pt", "pc", "in", "cm", "mm"];
const outputUnits: Unit[] = ["px", "rem", "em", "vw", "vh", "vmin", "vmax"];
const HISTORY_LIMIT = 10;
const HISTORY_KEY = "css-units-history";
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [precision, setPrecision] = useState("4");
  const [tokenInput, setTokenInput] = useState("");
  const [debouncedTokenInput, setDebouncedTokenInput] = useState(tokenInput);
  const [tokenMode, setTokenMode] = useState<"rem" | "tailwind">("rem");
  const [clampMin, setClampMin] = useState("16");
  const [clampPreferred, setClampPreferred] = useState("24");
  const [clampMax, setClampMax] = useState("40");
  const [clampMode, setClampMode] = useState<"px" | "vw">("px");
  const [clampVw, setClampVw] = useState("2.5");
  const [clampRemOffset, setClampRemOffset] = useState("0.5");
  const [showExplain, setShowExplain] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [history, setHistory] = useState<ConversionSnapshot[]>([]);
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

  const parseNumber = (raw: string) => Number(raw.replace(/,/g, ""));
  const formatWithPrecision = (nextValue: number, precisionValue: string) => {
    const prec = Math.min(Math.max(Number(precisionValue) || 0, 0), 8);
    return nextValue.toFixed(prec).replace(/\.?0+$/, "");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nextValue = params.get("v");
    const nextFrom = params.get("from");
    const nextTo = params.get("to");
    const nextRoot = params.get("root") ?? params.get("base");
    const nextElement = params.get("element");
    const nextVw = params.get("vw");
    const nextVh = params.get("vh");
    const nextPercent = params.get("pct");
    const nextDpi = params.get("dpi");
    const nextCh = params.get("ch");
    const nextEx = params.get("ex");
    const nextPrecision = params.get("p");
    if (nextValue) setValue(nextValue);
    if (nextFrom && units.includes(nextFrom as Unit)) setFrom(nextFrom as Unit);
    if (nextTo && units.includes(nextTo as Unit)) setTo(nextTo as Unit);
    if (nextRoot) setRootFont(nextRoot);
    if (nextElement) setElementFont(nextElement);
    if (nextVw) setVw(nextVw);
    if (nextVh) setVh(nextVh);
    if (nextPercent) setPercentContext(nextPercent);
    if (nextDpi) setDpi(nextDpi);
    if (nextCh) setChRatio(nextCh);
    if (nextEx) setExRatio(nextEx);
    if (nextPrecision) setPrecision(nextPrecision);
    setTouched({});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("v", value);
    params.set("from", from);
    params.set("to", to);
    params.set("base", rootFont);
    params.set("element", elementFont);
    params.set("vw", vw);
    params.set("vh", vh);
    params.set("pct", percentContext);
    params.set("dpi", dpi);
    params.set("ch", chRatio);
    params.set("ex", exRatio);
    params.set("p", precision);
    const nextPath = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextPath);
    setShareUrl(`${window.location.origin}${nextPath}`);
  }, [value, from, to, rootFont, elementFont, vw, vh, percentContext, dpi, chRatio, exRatio, precision]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ConversionSnapshot[];
      if (Array.isArray(parsed)) {
        setHistory(parsed.slice(0, HISTORY_LIMIT));
      }
    } catch {
      window.localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedTokenInput(tokenInput), 250);
    return () => window.clearTimeout(handle);
  }, [tokenInput]);

  const explainToPx = (unit: Unit) => {
    switch (unit) {
      case "px":
        return "px → px: value";
      case "rem":
        return "rem → px: value * rootFont";
      case "em":
        return "em → px: value * elementFont";
      case "vw":
        return "vw → px: (value / 100) * viewportWidth";
      case "vh":
        return "vh → px: (value / 100) * viewportHeight";
      case "vmin":
        return "vmin → px: (value / 100) * min(viewportWidth, viewportHeight)";
      case "vmax":
        return "vmax → px: (value / 100) * max(viewportWidth, viewportHeight)";
      case "%":
        return "% → px: (value / 100) * contextSize";
      case "ch":
        return "ch → px: value * elementFont * chRatio";
      case "ex":
        return "ex → px: value * elementFont * exRatio";
      case "in":
        return "in → px: value * dpi";
      case "pt":
        return "pt → px: (value / 72) * dpi";
      case "pc":
        return "pc → px: (value / 6) * dpi";
      case "cm":
        return "cm → px: (value / 2.54) * dpi";
      case "mm":
        return "mm → px: (value / 25.4) * dpi";
      default:
        return "";
    }
  };

  const explainFromPx = (unit: Unit) => {
    switch (unit) {
      case "px":
        return "px → px: px";
      case "rem":
        return "px → rem: px / rootFont";
      case "em":
        return "px → em: px / elementFont";
      case "vw":
        return "px → vw: (px / viewportWidth) * 100";
      case "vh":
        return "px → vh: (px / viewportHeight) * 100";
      case "vmin":
        return "px → vmin: (px / min(viewportWidth, viewportHeight)) * 100";
      case "vmax":
        return "px → vmax: (px / max(viewportWidth, viewportHeight)) * 100";
      case "%":
        return "px → %: (px / contextSize) * 100";
      case "ch":
        return "px → ch: px / (elementFont * chRatio)";
      case "ex":
        return "px → ex: px / (elementFont * exRatio)";
      case "in":
        return "px → in: px / dpi";
      case "pt":
        return "px → pt: (px / dpi) * 72";
      case "pc":
        return "px → pc: (px / dpi) * 6";
      case "cm":
        return "px → cm: (px / dpi) * 2.54";
      case "mm":
        return "px → mm: (px / dpi) * 25.4";
      default:
        return "";
    }
  };

  const { result, outputValues, fieldErrors, status, numericResult } = useMemo(() => {
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
    const valNum = parseNumber(value);
    const rootBase = parseNumber(rootFont);
    const elementBase = parseNumber(elementFont);
    const vwNum = parseNumber(vw);
    const vhNum = parseNumber(vh);
    const percentBase = parseNumber(percentContext);
    const dpiNum = parseNumber(dpi);
    const chScale = parseNumber(chRatio);
    const exScale = parseNumber(exRatio);
    const ctx: ConversionContext = {
      rootFont: rootBase,
      elementFont: elementBase,
      vw: vwNum,
      vh: vhNum,
      percentContext: percentBase,
      dpi: dpiNum,
      chRatio: chScale,
      exRatio: exScale,
    };
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
        numericResult: null as number | null,
      };
    }
    const px = convertToPx(valNum, from, ctx);
    const converted = convertFromPx(px, to, ctx);
    const outputEntries = outputUnits.map((unit) => [unit, formatWithPrecision(convertFromPx(px, unit, ctx), precision)]);
    return {
      result: formatWithPrecision(converted, precision),
      outputValues: Object.fromEntries(outputEntries) as Record<Unit, string>,
      fieldErrors: derivedFieldErrors,
      status: "Ready",
      numericResult: converted,
    };
  }, [value, from, to, rootFont, elementFont, vw, vh, percentContext, dpi, chRatio, exRatio, precision, touched]);

  useEffect(() => {
    if (!result || Object.keys(fieldErrors).length) return;
    const key = [
      value,
      from,
      to,
      rootFont,
      elementFont,
      vw,
      vh,
      percentContext,
      dpi,
      chRatio,
      exRatio,
      precision,
    ].join("|");
    setHistory((prev) => {
      if (prev[0]?.key === key) return prev;
      const next: ConversionSnapshot[] = [
        {
          key,
          value,
          from,
          to,
          rootFont,
          elementFont,
          vw,
          vh,
          percentContext,
          dpi,
          chRatio,
          exRatio,
          precision,
          timestamp: Date.now(),
        },
        ...prev.filter((item) => item.key !== key),
      ].slice(0, HISTORY_LIMIT);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, [result, fieldErrors, value, from, to, rootFont, elementFont, vw, vh, percentContext, dpi, chRatio, exRatio, precision]);

  const { tokenOutput, tokenErrors, tokenCount } = useMemo(() => {
    if (!debouncedTokenInput.trim()) {
      return { tokenOutput: "", tokenErrors: [] as string[], tokenCount: 0 };
    }
    const errors: string[] = [];
    const rootBase = parseNumber(rootFont) || 16;
    const elementBase = parseNumber(elementFont) || 16;
    const ctx: ConversionContext = {
      rootFont: rootBase,
      elementFont: elementBase,
      vw: 0,
      vh: 0,
      percentContext: 0,
      dpi: 0,
      chRatio: 0.5,
      exRatio: 0.5,
    };
    const formatValue = (nextValue: number) => formatWithPrecision(nextValue, precision);
    const tokenLines = debouncedTokenInput.split("\n");
    const tokens: { name: string; rem: string }[] = [];
    tokenLines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^--([A-Za-z0-9\-_]+)\s*:\s*([^;]+);?$/);
      if (!match) {
        errors.push(`Line ${index + 1}: expected "--token-name: value".`);
        return;
      }
      const name = match[1];
      const rawValue = match[2].trim();
      const valueMatch = rawValue.match(/^(-?\d*\.?\d+)\s*(px|rem|em)?$/i);
      if (!valueMatch) {
        errors.push(`Line ${index + 1}: "${rawValue}" must be a number with px/rem/em.`);
        return;
      }
      const numericValue = Number(valueMatch[1]);
      const unit = (valueMatch[2] || "px").toLowerCase() as Unit;
      const remValue = convert(numericValue, unit, "rem", ctx);
      tokens.push({ name, rem: formatValue(remValue) });
    });
    if (errors.length) {
      return { tokenOutput: "", tokenErrors: errors, tokenCount: 0 };
    }
    if (tokenMode === "tailwind") {
      const lines = tokens.map((token) => `  "${token.name}": "${token.rem}rem",`);
      return {
        tokenOutput: `spacing: {\n${lines.join("\n")}\n}`,
        tokenErrors: [],
        tokenCount: tokens.length,
      };
    }
    const lines = tokens.map((token) => `--${token.name}: ${token.rem}rem;`);
    return { tokenOutput: lines.join("\n"), tokenErrors: [], tokenCount: tokens.length };
  }, [debouncedTokenInput, tokenMode, rootFont, elementFont, precision]);

  const { clampOutput, clampErrors } = useMemo(() => {
    const errors: string[] = [];
    const minVal = parseNumber(clampMin);
    const maxVal = parseNumber(clampMax);
    const prefVal = parseNumber(clampPreferred);
    const vwVal = parseNumber(clampVw);
    const remVal = parseNumber(clampRemOffset);
    if (Number.isNaN(minVal)) errors.push("Min must be a number.");
    if (Number.isNaN(maxVal)) errors.push("Max must be a number.");
    if (Number.isNaN(prefVal) && clampMode === "px") errors.push("Preferred must be a number.");
    if (Number.isNaN(vwVal) && clampMode === "vw") errors.push("VW must be a number.");
    if (Number.isNaN(remVal) && clampMode === "vw") errors.push("Rem offset must be a number.");
    if (!Number.isNaN(minVal) && !Number.isNaN(maxVal) && minVal > maxVal) {
      errors.push("Min must be less than max.");
    }
    if (errors.length) {
      return { clampOutput: "", clampErrors: errors };
    }
    const formatPx = (nextValue: number) => `${nextValue}px`;
    const minOut = formatPx(minVal);
    const maxOut = formatPx(maxVal);
    if (clampMode === "px") {
      return {
        clampOutput: `clamp(${minOut}, ${formatPx(prefVal)}, ${maxOut})`,
        clampErrors: [],
      };
    }
    const preferred = `${vwVal}vw + ${remVal}rem`;
    return {
      clampOutput: `clamp(${minOut}, ${preferred}, ${maxOut})`,
      clampErrors: [],
    };
  }, [clampMin, clampPreferred, clampMax, clampMode, clampVw, clampRemOffset]);

  const safeContext = useMemo<ConversionContext>(
    () => ({
      rootFont: parseNumber(rootFont) || 16,
      elementFont: parseNumber(elementFont) || 16,
      vw: parseNumber(vw) || 1440,
      vh: parseNumber(vh) || 900,
      percentContext: parseNumber(percentContext) || 100,
      dpi: parseNumber(dpi) || 96,
      chRatio: parseNumber(chRatio) || 0.5,
      exRatio: parseNumber(exRatio) || 0.5,
    }),
    [rootFont, elementFont, vw, vh, percentContext, dpi, chRatio, exRatio],
  );

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
  const valueDescribedBy = showValueError ? "value-hint value-error" : "value-hint";
  const rootDescribedBy = showRootError ? "root-hint root-error" : "root-hint";
  const elementDescribedBy = showElementError ? "element-hint element-error" : "element-hint";
  const percentDescribedBy = showPercentError ? "percent-hint percent-error" : "percent-hint";
  const vwDescribedBy = showVwError ? "vw-hint vw-error" : "vw-hint";
  const vhDescribedBy = showVhError ? "vh-hint vh-error" : "vh-hint";
  const dpiDescribedBy = showDpiError ? "dpi-hint dpi-error" : "dpi-hint";
  const chDescribedBy = showChError ? "ch-hint ch-error" : "ch-hint";
  const exDescribedBy = showExError ? "ex-hint ex-error" : "ex-hint";

  const handleCopy = async (text: string, type: "result" | "snippet" | "link") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === "result") {
        setCopiedResult(true);
        setTimeout(() => setCopiedResult(false), 1200);
      } else if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1200);
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
        {status} {copiedResult ? "Copied result" : ""} {copiedSnippet ? "Copied snippet" : ""} {copiedLink ? "Copied link" : ""}
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
                aria-describedby={valueDescribedBy}
                aria-invalid={showValueError ? "true" : undefined}
              />
              {showValueError ? (
                <span id="value-error" className="text-xs text-amber-600">
                  {fieldErrors.value}
                </span>
              ) : null}
              <span id="value-hint" className="text-xs text-slate-500">
                Number to convert
              </span>
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
                aria-describedby={rootDescribedBy}
                aria-invalid={showRootError ? "true" : undefined}
              />
              {showRootError ? (
                <span id="root-error" className="text-xs text-amber-600">
                  {fieldErrors.root}
                </span>
              ) : null}
              <span id="root-hint" className="text-xs text-slate-500">
                Usually 16px
              </span>
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
                aria-describedby={elementDescribedBy}
                aria-invalid={showElementError ? "true" : undefined}
              />
              {showElementError ? (
                <span id="element-error" className="text-xs text-amber-600">
                  {fieldErrors.element}
                </span>
              ) : null}
              <span id="element-hint" className="text-xs text-slate-500">
                Matches element context
              </span>
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
                aria-describedby={percentDescribedBy}
                aria-invalid={showPercentError ? "true" : undefined}
              />
              {showPercentError ? (
                <span id="percent-error" className="text-xs text-amber-600">
                  {fieldErrors.percent}
                </span>
              ) : null}
              <span id="percent-hint" className="text-xs text-slate-500">
                % of what? Set the context
              </span>
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
                aria-describedby={vwDescribedBy}
                aria-invalid={showVwError ? "true" : undefined}
              />
              {showVwError ? (
                <span id="vw-error" className="text-xs text-amber-600">
                  {fieldErrors.vw}
                </span>
              ) : null}
              <span id="vw-hint" className="text-xs text-slate-500">
                e.g., 1440
              </span>
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
                aria-describedby={vhDescribedBy}
                aria-invalid={showVhError ? "true" : undefined}
              />
              {showVhError ? (
                <span id="vh-error" className="text-xs text-amber-600">
                  {fieldErrors.vh}
                </span>
              ) : null}
              <span id="vh-hint" className="text-xs text-slate-500">
                e.g., 900
              </span>
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
                aria-describedby={dpiDescribedBy}
                aria-invalid={showDpiError ? "true" : undefined}
              />
              {showDpiError ? (
                <span id="dpi-error" className="text-xs text-amber-600">
                  {fieldErrors.dpi}
                </span>
              ) : null}
              <span id="dpi-hint" className="text-xs text-slate-500">
                CSS default is 96
              </span>
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
                aria-describedby={chDescribedBy}
                aria-invalid={showChError ? "true" : undefined}
              />
              {showChError ? (
                <span id="ch-error" className="text-xs text-amber-600">
                  {fieldErrors.ch}
                </span>
              ) : null}
              <span id="ch-hint" className="text-xs text-slate-500">
                Approx. width of “0” in em
              </span>
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
                aria-describedby={exDescribedBy}
                aria-invalid={showExError ? "true" : undefined}
              />
              {showExError ? (
                <span id="ex-error" className="text-xs text-amber-600">
                  {fieldErrors.ex}
                </span>
              ) : null}
              <span id="ex-hint" className="text-xs text-slate-500">
                Approx. x-height in em
              </span>
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
                setClampMin("16");
                setClampPreferred("24");
                setClampMax("40");
                setClampMode("px");
                setClampVw("2.5");
                setClampRemOffset("0.5");
                setTouched({});
                setUseViewport(false);
                setViewportLocked(false);
                setCopiedResult(false);
                setCopiedSnippet(false);
                setCopiedLink(false);
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
            <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showExplain}
                onChange={(e) => setShowExplain(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                aria-label="Toggle explain mode"
              />
              Explain mode
            </label>
          </div>
          {showBannerError ? (
            <p className="text-sm font-medium text-amber-600">Resolve the highlighted fields.</p>
          ) : null}
          {history.length ? (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent conversions</p>
              <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                {history.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setValue(item.value);
                      setFrom(item.from);
                      setTo(item.to);
                      setRootFont(item.rootFont);
                      setElementFont(item.elementFont);
                      setVw(item.vw);
                      setVh(item.vh);
                      setPercentContext(item.percentContext);
                      setDpi(item.dpi);
                      setChRatio(item.chRatio);
                      setExRatio(item.exRatio);
                      setPrecision(item.precision);
                      setTouched({});
                      setUseViewport(false);
                      setViewportLocked(false);
                    }}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                    aria-label={`Load ${item.value} ${item.from} to ${item.to}`}
                  >
                    <span>
                      {item.value} {item.from} → {item.to}
                    </span>
                    <span className="text-slate-400">{item.precision}p</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Result</p>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex items-center gap-2 rounded-full bg-white/5 p-1"
                role="group"
                aria-label="Result copy options"
              >
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
              </div>
              <div
                className="flex items-center gap-2 rounded-full bg-white/5 p-1"
                role="group"
                aria-label="Snippet and share actions"
              >
                <button
                  onClick={() => handleCopy(result ? `font-size: ${result}${to};` : "", "snippet")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  disabled={!result}
                  aria-label="Copy CSS snippet"
                >
                  {copiedSnippet ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copiedSnippet ? "Snippet copied" : "CSS snippet"}
                </button>
                <button
                  onClick={() => handleCopy(shareUrl, "link")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  disabled={!shareUrl}
                  aria-label="Copy shareable link"
                >
                  {copiedLink ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copiedLink ? "Link copied" : "Share link"}
                </button>
              </div>
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
                  {numericResult === null ? "0" : formatWithPrecision(convert(numericResult, to, from, safeContext), precision)}{" "}
                  {from}
                </p>
                {showExplain ? (
                  <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-2 text-[11px] text-slate-300">
                    <p className="font-semibold text-slate-200">Formulas</p>
                    <p className="mt-1">{explainToPx(from)}</p>
                    {from === to ? <p>Same unit: no conversion needed.</p> : <p className="mt-1">{explainFromPx(to)}</p>}
                  </div>
                ) : null}
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

      <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Design tokens mode</h2>
            <p className="text-sm text-slate-600">Paste tokens and convert to rem or Tailwind-style spacing.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            Output
            <select
              value={tokenMode}
              onChange={(e) => setTokenMode(e.target.value as "rem" | "tailwind")}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
              aria-label="Token output format"
            >
              <option value="rem">rem tokens</option>
              <option value="tailwind">Tailwind-like scale</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Tokens input
            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="min-h-[140px] rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="--space-1: 4px&#10;--space-2: 8px&#10;--space-3: 12px"
              aria-label="Design tokens input"
            />
            <span className="text-xs text-slate-500">
              Supports px/rem/em values. ch/ex are font-dependent approximations; use in the main converter.
            </span>
          </label>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Output preview</span>
              <span>{tokenCount ? `${tokenCount} tokens` : "No tokens yet"}</span>
            </div>
            {tokenErrors.length ? (
              <ul className="mt-2 space-y-1 text-xs text-amber-600">
                {tokenErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : (
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2 text-xs text-slate-700 shadow-inner">
                {tokenOutput || "Paste tokens to see converted output."}
              </pre>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Clamp helper</h2>
            <p className="text-sm text-slate-600">Generate a responsive clamp() expression quickly.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            Preferred
            <select
              value={clampMode}
              onChange={(e) => setClampMode(e.target.value as "px" | "vw")}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
              aria-label="Clamp preferred mode"
            >
              <option value="px">px</option>
              <option value="vw">vw + rem</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            Min (px)
            <input
              type="text"
              inputMode="decimal"
              value={clampMin}
              onChange={(e) => setClampMin(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Clamp minimum"
            />
          </label>
          {clampMode === "px" ? (
            <label className="flex flex-col gap-1">
              Preferred (px)
              <input
                type="text"
                inputMode="decimal"
                value={clampPreferred}
                onChange={(e) => setClampPreferred(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Clamp preferred px"
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                Preferred (vw)
                <input
                  type="text"
                  inputMode="decimal"
                  value={clampVw}
                  onChange={(e) => setClampVw(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Clamp preferred vw"
                />
              </label>
              <label className="flex flex-col gap-1">
                Preferred (rem offset)
                <input
                  type="text"
                  inputMode="decimal"
                  value={clampRemOffset}
                  onChange={(e) => setClampRemOffset(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Clamp rem offset"
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1">
            Max (px)
            <input
              type="text"
              inputMode="decimal"
              value={clampMax}
              onChange={(e) => setClampMax(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Clamp maximum"
            />
          </label>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</div>
          {clampErrors.length ? (
            <ul className="mt-2 space-y-1 text-xs text-amber-600">
              {clampErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : (
            <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2 text-xs text-slate-700 shadow-inner">
              {clampOutput}
            </pre>
          )}
        </div>
      </section>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a value and choose from/to units.</li>
          <li>Set root font size for rem and element font size for em; adjust viewport and context inputs.</li>
          <li>Review the multi-output table for key units at once.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Examples</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>16px → 1rem (root font 16px)</li>
            <li>24px → 1.5rem (root font 16px)</li>
            <li>8px → 0.5rem (root font 16px)</li>
          </ul>
        </div>
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
