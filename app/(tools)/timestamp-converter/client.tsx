"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  formatConversionMath,
  formatDate,
  formatRelative,
  parseLocalDateTime,
  parseTimestamp,
  unitLabels,
  type FormatStyle,
  type TimestampUnit,
  type TimestampUnitMode,
  type TimeZoneMode,
} from "./convert";

export default function TimestampConverterClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialNow = useMemo(() => new Date(), []);
  const tsInputRef = useRef<HTMLInputElement | null>(null);
  const [tsInput, setTsInput] = useState(`${Math.floor(initialNow.getTime() / 1000)}`);
  const [dateInput, setDateInput] = useState(() => initialNow.toISOString().slice(0, 16));
  const [unitMode, setUnitMode] = useState<TimestampUnitMode>("auto");
  const [timeZoneMode, setTimeZoneMode] = useState<TimeZoneMode>("local");
  const [customTimeZone, setCustomTimeZone] = useState("UTC");
  const [viewMode, setViewMode] = useState<"single" | "batch">("single");
  const [batchInput, setBatchInput] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready");
  const [copied, setCopied] = useState({ date: false, seconds: false, ms: false });
  const copyTimeoutsRef = useRef<{ date: number | null; seconds: number | null; ms: number | null }>({
    date: null,
    seconds: null,
    ms: null,
  });
  const [format, setFormat] = useState<FormatStyle>("iso");
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const didInitFromQueryRef = useRef(false);
  const lastQueryRef = useRef("");

  const parsed = parseTimestamp(tsInput, unitMode);
  const parsedUnit = parsed.unit;
  const warning = parsed.warning;

  const customTimeZoneError = (() => {
    if (timeZoneMode !== "custom") return "";
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: customTimeZone }).format(new Date());
      return "";
    } catch {
      return "Invalid time zone. Use IANA format like America/New_York.";
    }
  })();

  useEffect(() => {
    if (statusMessage === "Ready") return;
    const timeoutId = window.setTimeout(() => setStatusMessage("Ready"), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    return () => {
      Object.values(copyTimeoutsRef.current).forEach((timeoutId) => {
        if (timeoutId) window.clearTimeout(timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    if (didInitFromQueryRef.current) return;
    const tsParam = searchParams.get("ts");
    const unitParam = searchParams.get("unit");
    const tzParam = searchParams.get("tz");
    const fmtParam = searchParams.get("fmt");
    const viewParam = searchParams.get("view");

    if (tsParam) setTsInput(tsParam);
    if (unitParam && ["auto", "s", "ms", "us", "ns"].includes(unitParam)) {
      setUnitMode(unitParam as TimestampUnitMode);
    }
    if (tzParam) {
      if (tzParam.toLowerCase() === "utc") {
        setTimeZoneMode("utc");
      } else if (tzParam.toLowerCase() === "local") {
        setTimeZoneMode("local");
      } else {
        setTimeZoneMode("custom");
        setCustomTimeZone(tzParam);
      }
    }
    if (fmtParam && ["iso", "locale"].includes(fmtParam)) {
      setFormat(fmtParam as "iso" | "locale");
    }
    if (viewParam && ["single", "batch"].includes(viewParam)) {
      setViewMode(viewParam as "single" | "batch");
    }
    didInitFromQueryRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tsInput.trim()) params.set("ts", tsInput.trim());
    params.set("unit", unitMode);
    params.set("fmt", format);
    params.set("view", viewMode);
    const tzValue =
      timeZoneMode === "utc" ? "UTC" : timeZoneMode === "local" ? "local" : customTimeZone.trim() || "UTC";
    params.set("tz", tzValue);
    const nextQuery = params.toString();
    if (nextQuery === lastQueryRef.current) return;
    lastQueryRef.current = nextQuery;
    router.replace(`${pathname}?${nextQuery}`);
  }, [tsInput, unitMode, format, viewMode, timeZoneMode, customTimeZone, router, pathname]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("timestamp-converter-history");
      if (!stored) return;
      const parsed = JSON.parse(stored) as RecentConversion[];
      if (Array.isArray(parsed)) {
        setRecentConversions(parsed);
      }
    } catch {
      setRecentConversions([]);
    }
  }, []);

  const markCopied = (key: "date" | "seconds" | "ms") => {
    setCopied((prev) => ({ ...prev, [key]: true }));
    const existing = copyTimeoutsRef.current[key];
    if (existing) window.clearTimeout(existing);
    copyTimeoutsRef.current[key] = window.setTimeout(() => {
      setCopied((prev) => ({ ...prev, [key]: false }));
      copyTimeoutsRef.current[key] = null;
    }, 1500);
  };

  const safeCopy = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage(successMessage);
      return true;
    } catch {
      setStatusMessage("Clipboard blocked. Select and copy.");
      return false;
    }
  };

  const downloadText = (fileName: string, content: string, mimeType = "text/plain") => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const setTimestampFromMs = (ms: number) => {
    const targetUnit = unitMode === "auto" ? "s" : unitMode;
    if (targetUnit === "s") setTsInput(`${Math.floor(ms / 1000)}`);
    if (targetUnit === "ms") setTsInput(`${Math.floor(ms)}`);
    if (targetUnit === "us") setTsInput(`${Math.floor(ms)}000`);
    if (targetUnit === "ns") setTsInput(`${Math.floor(ms)}000000`);
  };

  const presets = [
    {
      id: "now",
      label: "Now",
      action: () => setTimestampFromMs(Date.now()),
    },
    {
      id: "epoch",
      label: "Epoch (0)",
      action: () => setTsInput("0"),
    },
    {
      id: "start-today-local",
      label: "Start of today (local)",
      action: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        setTimestampFromMs(d.getTime());
      },
    },
    {
      id: "start-today-utc",
      label: "Start of today (UTC)",
      action: () => {
        const d = new Date();
        const utcMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        setTimestampFromMs(utcMs);
      },
    },
    {
      id: "plus-1m",
      label: "Now + 1 minute",
      action: () => setTimestampFromMs(Date.now() + 60_000),
    },
    {
      id: "plus-1h",
      label: "Now + 1 hour",
      action: () => setTimestampFromMs(Date.now() + 3_600_000),
    },
    {
      id: "plus-1d",
      label: "Now + 1 day",
      action: () => setTimestampFromMs(Date.now() + 86_400_000),
    },
    {
      id: "minus-1d",
      label: "Now - 1 day",
      action: () => setTimestampFromMs(Date.now() - 86_400_000),
    },
  ];

  const tsResult = {
    error: parsed.error,
    date: parsed.date,
    msValue: parsed.msValue,
  };

  const primaryOutput = (() => {
    if (!tsResult.date) return "";
    return formatDate(tsResult.date, { timeZoneMode, customTimeZone, style: format });
  })();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen((prev) => !prev);
        return;
      }

      if (event.key === "/" && !isTypingField) {
        event.preventDefault();
        tsInputRef.current?.focus();
        return;
      }

      if (event.key === "Enter" && !isTypingField && primaryOutput && !isPaletteOpen) {
        event.preventDefault();
        void safeCopy(primaryOutput, "Copied date").then((ok) => {
          if (ok) markCopied("date");
        });
      }

      if (event.key === "Escape" && isPaletteOpen) {
        setIsPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaletteOpen, primaryOutput]);

  useEffect(() => {
    if (!tsInput.trim() || tsResult.error) return;
    const timeoutId = window.setTimeout(() => {
      const entry: RecentConversion = {
        id: `${tsInput.trim()}-${parsedUnit}-${format}-${timeZoneMode}-${customTimeZone}`,
        timestamp: tsInput.trim(),
        unit: parsedUnit,
        timeZone: timeZoneMode === "custom" ? customTimeZone : timeZoneMode === "utc" ? "UTC" : "local",
        format,
        createdAt: Date.now(),
      };
      setRecentConversions((prev) => {
        const next = [entry, ...prev.filter((item) => item.id !== entry.id)].slice(0, 6);
        window.localStorage.setItem("timestamp-converter-history", JSON.stringify(next));
        return next;
      });
    }, 600);
    return () => window.clearTimeout(timeoutId);
  }, [tsInput, parsedUnit, format, timeZoneMode, customTimeZone, tsResult.error]);

  const dateResult = (() => {
    if (!dateInput) return { error: "Enter a date/time", tsSec: "", tsMs: "" };
    const d = parseLocalDateTime(dateInput);
    if (!d) return { error: "Invalid date", tsSec: "", tsMs: "" };
    return {
      error: "",
      tsSec: Math.floor(d.getTime() / 1000).toString(),
      tsMs: d.getTime().toString(),
    };
  })();

  const dateExports = (() => {
    if (!dateResult.tsSec || !dateResult.tsMs) return [];
    return [
      { id: "seconds", label: "Unix seconds", fileName: "timestamp-seconds.txt", value: dateResult.tsSec },
      { id: "ms", label: "Unix milliseconds", fileName: "timestamp-ms.txt", value: dateResult.tsMs },
      { id: "us", label: "Unix microseconds", fileName: "timestamp-us.txt", value: `${dateResult.tsMs}000` },
      { id: "ns", label: "Unix nanoseconds", fileName: "timestamp-ns.txt", value: `${dateResult.tsMs}000000` },
    ];
  })();

  const relative = tsResult.date ? formatRelative(tsResult.date) : "";

  const batchRows = (() => {
    const lines = batchInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.map((line, index) => {
      const parsedLine = parseTimestamp(line, unitMode);
      const unit = parsedLine.unit;
      if (parsedLine.error || !parsedLine.date) {
        return {
          id: `${index}-${line}`,
          input: line,
          unit,
          iso: "Invalid",
          local: "Invalid",
          relative: "Invalid",
          error: parsedLine.error || "Invalid timestamp",
        };
      }
      const date = parsedLine.date;
      return {
        id: `${index}-${line}`,
        input: line,
        unit,
        iso: date.toISOString(),
        local: date.toLocaleString(),
        relative: formatRelative(date),
        error: "",
      };
    });
  })();

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {statusMessage} {warning} {customTimeZoneError} {tsResult.error} {dateResult.error}
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
              Timestamp Converter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Timestamp Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert between Unix timestamps and readable dates. Toggle seconds or milliseconds and see
          local time context.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setViewMode("single")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            viewMode === "single"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => setViewMode("batch")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            viewMode === "batch"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Batch
        </button>
      </div>

      {viewMode === "single" ? (
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Timestamp to date">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Timestamp → Date</p>
            <button
              onClick={() => {
                const nowMs = Date.now();
                const nextUnit = unitMode === "auto" ? "s" : unitMode;
                if (nextUnit === "s") setTsInput(`${Math.floor(nowMs / 1000)}`);
                if (nextUnit === "ms") setTsInput(`${nowMs}`);
                if (nextUnit === "us") setTsInput(`${nowMs}000`);
                if (nextUnit === "ns") setTsInput(`${nowMs}000000`);
                setStatusMessage("Loaded current time");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Set timestamp to current time"
            >
              <RefreshCcw className="h-4 w-4" />
              Now
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={tsInput}
              onChange={(event) => setTsInput(event.target.value)}
              ref={tsInputRef}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Unix timestamp (seconds or ms)"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              Unit
              <select
                value={unitMode}
                onChange={(e) => setUnitMode(e.target.value as TimestampUnitMode)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="auto">Auto</option>
                <option value="s">Seconds</option>
                <option value="ms">Milliseconds</option>
                <option value="us">Microseconds</option>
                <option value="ns">Nanoseconds</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "iso" | "locale")}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="iso">ISO</option>
                <option value="locale">Locale</option>
              </select>
            </label>
            <div className="flex w-full flex-wrap items-center gap-2 text-xs text-slate-700">
              <label className="flex flex-wrap items-center gap-2">
                Time Zone
                <select
                  value={timeZoneMode}
                  onChange={(e) => setTimeZoneMode(e.target.value as TimeZoneMode)}
                  className="min-w-[90px] max-w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="local">Local</option>
                  <option value="utc">UTC</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {timeZoneMode === "custom" ? (
                <input
                  type="text"
                  value={customTimeZone}
                  onChange={(event) => setCustomTimeZone(event.target.value)}
                  className="min-w-[160px] rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="America/New_York"
                  aria-label="Custom time zone"
                />
              ) : null}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Interpreting input as {unitLabels[parsedUnit]}.
          </p>
          {tsResult.error ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              {tsResult.error}
            </p>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</p>
              <div className="mt-1 space-y-1 text-sm text-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">Local time</span>
                  <span>
                    {tsResult.date
                      ? formatDate(tsResult.date, { timeZoneMode: "local", customTimeZone, style: format })
                      : "N/A"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">UTC time</span>
                  <span>
                    {tsResult.date
                      ? formatDate(tsResult.date, { timeZoneMode: "utc", customTimeZone, style: format })
                      : "N/A"}
                  </span>
                </div>
                {timeZoneMode === "custom" ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">Custom time</span>
                    <span>
                      {customTimeZoneError
                        ? "Invalid time zone"
                        : tsResult.date
                          ? formatDate(tsResult.date, { timeZoneMode: "custom", customTimeZone, style: format })
                          : "N/A"}
                    </span>
                  </div>
                ) : null}
              </div>
              {relative ? <p className="text-xs text-slate-600">{relative}</p> : null}
              <p className="text-xs text-slate-500">
                Parsed as: {unitLabels[parsedUnit]}{" "}
                {unitMode === "auto" ? `(auto: ${parsed.unitReason})` : "(manual)"}
              </p>
              {tsResult.msValue !== null ? (
                <p className="text-xs text-slate-500">
                  Conversion: {formatConversionMath(Number(tsInput.trim()), parsedUnit, tsResult.msValue)}
                </p>
              ) : null}
              {customTimeZoneError ? (
                <p className="text-xs font-medium text-amber-700" role="alert">
                  {customTimeZoneError}
                </p>
              ) : null}
              {warning ? (
                <p className="mt-1 text-xs font-medium text-amber-700" role="alert">
                  {warning}
                </p>
              ) : null}
              {tsResult.msValue !== null ? (
                <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                  <div className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                    <span className="font-semibold">Unix (seconds):</span>{" "}
                    {Math.trunc(tsResult.msValue / 1000)}
                  </div>
                  <div className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">
                    <span className="font-semibold">Unix (ms):</span> {Math.trunc(tsResult.msValue)}
                  </div>
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!tsResult.date) return;
                    void safeCopy(primaryOutput, "Copied date").then((ok) => {
                      if (ok) markCopied("date");
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  {copied.date ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                  Copy
                </button>
                <div className="inline-flex items-center gap-2">
                  <select
                    className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                    defaultValue="timestamp-date.txt"
                    aria-label="Export date"
                    onChange={(event) => {
                      if (!primaryOutput) return;
                      downloadText(event.target.value, primaryOutput);
                      setStatusMessage("Downloaded date");
                    }}
                  >
                    <option value="timestamp-date.txt">Export date</option>
                    <option value="timestamp-date.txt">Text file</option>
                  </select>
                  <Download className="h-3 w-3 text-slate-500" aria-hidden />
                </div>
              </div>
              {recentConversions.length ? (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recent</p>
                  <div className="mt-2 grid gap-2 text-xs">
                    {recentConversions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTsInput(item.timestamp);
                          setUnitMode(item.unit);
                          setFormat(item.format);
                          if (item.timeZone === "UTC") {
                            setTimeZoneMode("utc");
                          } else if (item.timeZone === "local") {
                            setTimeZoneMode("local");
                          } else {
                            setTimeZoneMode("custom");
                            setCustomTimeZone(item.timeZone);
                          }
                          setViewMode("single");
                          setStatusMessage("Loaded recent conversion");
                        }}
                        className="flex items-center justify-between rounded-lg bg-white px-2 py-2 text-left text-xs text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                      >
                        <span className="font-semibold text-slate-900">{item.timestamp}</span>
                        <span className="text-[11px] text-slate-500">
                          {unitLabels[item.unit]} • {item.timeZone} • {item.format.toUpperCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Date to timestamp">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Date → Timestamp</p>
            <button
              onClick={() => setDateInput(new Date().toISOString().slice(0, 16))}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Set date to current time"
            >
              <RefreshCcw className="h-4 w-4" />
              Now
            </button>
          </div>
          <input
            type="datetime-local"
            value={dateInput}
            onChange={(event) => setDateInput(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <p className="text-xs text-slate-500">Interpreted as local time.</p>
          {dateResult.error ? (
            <p className="text-sm font-medium text-amber-600">{dateResult.error}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (seconds)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{dateResult.tsSec}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      void safeCopy(dateResult.tsSec, "Copied seconds").then((ok) => {
                        if (ok) markCopied("seconds");
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copied.seconds ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                    Copy
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (ms)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{dateResult.tsMs}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      void safeCopy(dateResult.tsMs, "Copied ms").then((ok) => {
                        if (ok) markCopied("ms");
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copied.ms ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                    Copy
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (µs)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{`${dateResult.tsMs}000`}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unix (ns)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{`${dateResult.tsMs}000000`}</p>
              </div>
              {dateExports.length ? (
                <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Export</p>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                      defaultValue={dateExports[0]?.fileName}
                      aria-label="Export timestamp"
                      onChange={(event) => {
                        const selected = dateExports.find((item) => item.fileName === event.target.value);
                        if (!selected) return;
                        downloadText(selected.fileName, selected.value);
                        setStatusMessage(`Downloaded ${selected.label.toLowerCase()}`);
                      }}
                    >
                      {dateExports.map((item) => (
                        <option key={item.id} value={item.fileName}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <Download className="h-3 w-3 text-slate-500" aria-hidden />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      ) : (
        <section className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Batch mode</h2>
              <p className="text-xs text-slate-600">One timestamp per line. Auto-detection honors the selected unit mode.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const headers = ["timestamp", "unit", "iso", "local", "relative", "error"];
                const rows = batchRows.map((row) => [
                  row.input,
                  row.unit,
                  row.iso,
                  row.local,
                  row.relative,
                  row.error,
                ]);
                const csv = [headers, ...rows]
                  .map((row) =>
                    row
                      .map((cell) => {
                        const value = String(cell ?? "");
                        return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
                      })
                      .join(","),
                  )
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "timestamp-batch.csv";
                link.click();
                URL.revokeObjectURL(url);
                setStatusMessage("Downloaded batch CSV");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              disabled={batchRows.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          <textarea
            value={batchInput}
            onChange={(event) => setBatchInput(event.target.value)}
            className="min-h-[160px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="1700000000\n1700000000000\n-1234567890"
          />

          <div className="overflow-auto rounded-xl ring-1 ring-slate-200">
            <table className="min-w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">ISO (UTC)</th>
                  <th className="px-3 py-2">Local</th>
                  <th className="px-3 py-2">Relative</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-slate-500" colSpan={6}>
                      Paste timestamps to see results.
                    </td>
                  </tr>
                ) : (
                  batchRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-medium text-slate-900">{row.input}</td>
                      <td className="px-3 py-2">{unitLabels[row.unit]}</td>
                      <td className="px-3 py-2">{row.iso}</td>
                      <td className="px-3 py-2">{row.local}</td>
                      <td className="px-3 py-2">{row.relative}</td>
                      <td className="px-3 py-2 text-amber-700">{row.error}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <article className="space-y-8">
        <section className="rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">How to use the timestamp converter</h2>
          <ol className="mt-3 space-y-3 text-sm text-slate-700">
            <li>
              Paste a Unix timestamp or switch to Batch mode for multiple lines. Auto-detect chooses seconds, milliseconds,
              microseconds, or nanoseconds based on length.
            </li>
            <li>
              Pick a time zone to see local time, UTC time, and an optional custom zone side by side.
            </li>
            <li>
              Copy the primary output or export conversions for sharing and debugging.
            </li>
          </ol>
        </section>

        <section className="rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">Common use cases</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Log analysis",
                body: "Convert timestamps from app logs in seconds, ms, µs, or ns into readable dates.",
              },
              {
                title: "API debugging",
                body: "Inspect JWT expirations or OAuth timestamps in UTC and local time.",
              },
              {
                title: "Data pipelines",
                body: "Validate ETL exports and ensure epoch units match expected precision.",
              },
              {
                title: "Support & incident timelines",
                body: "Translate alert timestamps quickly to compare with human timelines.",
              },
              {
                title: "Batch conversions",
                body: "Paste multiple values and export CSV for spreadsheets or tickets.",
              },
              {
                title: "Pre-1970 dates",
                body: "Handle negative timestamps for historical data and archives.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">FAQ & privacy</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>
              <strong className="font-semibold text-slate-900">Private by design:</strong> conversions run locally in your
              browser. No timestamps are uploaded.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">History storage:</strong> recent conversions are saved in
              localStorage only, so they never leave your device.
            </p>
            <p>
              <strong className="font-semibold text-slate-900">Accuracy notes:</strong> JavaScript Date supports roughly
              ±100 million days. Extremely large values show a warning.
            </p>
          </div>
        </section>
      </article>

      {isPaletteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.55)] ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Command palette</p>
                <p className="text-xs text-slate-600">Quick presets for timestamps</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                Esc
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    preset.action();
                    setIsPaletteOpen(false);
                    setStatusMessage(`Applied: ${preset.label}`);
                  }}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <span className="font-medium">{preset.label}</span>
                  <span className="text-xs text-slate-500">Enter</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
type RecentConversion = {
  id: string;
  timestamp: string;
  unit: TimestampUnit;
  timeZone: string;
  format: "iso" | "locale";
  createdAt: number;
};
