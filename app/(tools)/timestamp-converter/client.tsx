"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const formatIsoLocal = (d: Date) => {
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const hours = String(Math.floor(absMin / 60)).padStart(2, "0");
  const minutes = String(absMin % 60).padStart(2, "0");
  const base = d.toISOString().replace("Z", "");
  return `${base}${sign}${hours}:${minutes}`;
};

const formatDate = (d: Date, showUtc: boolean, format: "iso" | "locale") => {
  if (format === "iso") {
    return showUtc ? `${d.toISOString()} (UTC)` : `${formatIsoLocal(d)} (local)`;
  }
  if (showUtc) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(d);
  }
  return d.toLocaleString();
};

export default function TimestampConverterClient() {
  const initialNow = useMemo(() => new Date(), []);
  const [tsInput, setTsInput] = useState(`${Math.floor(initialNow.getTime() / 1000)}`);
  const [dateInput, setDateInput] = useState(() => initialNow.toISOString().slice(0, 16));
  const [useMs, setUseMs] = useState(false);
  const [useUtc, setUseUtc] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [format, setFormat] = useState<"iso" | "locale">("iso");

  const warning = useMemo(() => {
    const raw = Number(tsInput.trim());
    if (!tsInput.trim() || Number.isNaN(raw)) return "";
    if (Math.abs(raw) > 1e13 && !useMs) {
      return "Value looks like milliseconds. Toggle ms if needed.";
    }
    if (Math.abs(raw) > 1e15) {
      return "Very large value; date may be invalid.";
    }
    return "";
  }, [tsInput, useMs]);

  useEffect(() => {
    if (status === "Ready") return;
    const timeoutId = window.setTimeout(() => setStatus("Ready"), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const tsResult = useMemo(() => {
    const raw = Number(tsInput.trim());
    if (!tsInput.trim()) return { error: "Enter a timestamp", date: null as Date | null };
    if (Number.isNaN(raw)) return { error: "Invalid timestamp", date: null as Date | null };
    const ms = useMs ? raw : raw * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return { error: "Invalid timestamp", date: null };
    return { error: "", date: d };
  }, [tsInput, useMs]);

  const dateResult = useMemo(() => {
    if (!dateInput) return { error: "Enter a date/time", tsSec: "", tsMs: "" };
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return { error: "Invalid date", tsSec: "", tsMs: "" };
    return {
      error: "",
      tsSec: Math.floor(d.getTime() / 1000).toString(),
      tsMs: d.getTime().toString(),
    };
  }, [dateInput]);

  const relative = useMemo(() => {
    const base = new Date();
    const target = tsResult.date;
    if (!target) return "";
    const diffMs = target.getTime() - base.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (Math.abs(diffMin) < 1) return "Now";
    return diffMin > 0 ? `In ${diffMin} minute(s)` : `${Math.abs(diffMin)} minute(s) ago`;
  }, [tsResult.date]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {tsResult.error} {dateResult.error}
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

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Timestamp to date">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Timestamp → Date</p>
            <button
              onClick={() => {
                setTsInput(`${Math.floor(Date.now() / 1000)}`);
                setUseMs(false);
                setStatus("Loaded current time");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Set timestamp to current time"
            >
              <RefreshCcw className="h-4 w-4" />
              Now
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={tsInput}
              onChange={(event) => setTsInput(event.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Unix timestamp (seconds or ms)"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900"
                checked={useMs}
                onChange={() => setUseMs((prev) => !prev)}
              />
              Milliseconds
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900"
                checked={useUtc}
                onChange={() => setUseUtc((prev) => !prev)}
              />
              UTC Output
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
          </div>
          {tsResult.error ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              {tsResult.error}
            </p>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {tsResult.date ? formatDate(tsResult.date, useUtc, format) : "N/A"}
              </p>
              {relative ? <p className="text-xs text-slate-600">{relative}</p> : null}
              {warning ? (
                <p className="mt-1 text-xs font-medium text-amber-700" role="alert">
                  {warning}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!tsResult.date) return;
                    navigator.clipboard.writeText(formatDate(tsResult.date, useUtc, format));
                    setStatus("Copied date");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  {status === "Copied date" ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!tsResult.date) return;
                    const blob = new Blob(
                      [formatDate(tsResult.date, useUtc, format)],
                      { type: "text/plain" },
                    );
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "timestamp-date.txt";
                    link.click();
                    URL.revokeObjectURL(url);
                    setStatus("Downloaded date");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
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
                      navigator.clipboard.writeText(dateResult.tsSec);
                      setStatus("Copied seconds");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {status === "Copied seconds" ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([dateResult.tsSec], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "timestamp-seconds.txt";
                      link.click();
                      URL.revokeObjectURL(url);
                      setStatus("Downloaded seconds");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    <Download className="h-3 w-3" />
                    Download
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
                      navigator.clipboard.writeText(dateResult.tsMs);
                      setStatus("Copied ms");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {status === "Copied ms" ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([dateResult.tsMs], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "timestamp-ms.txt";
                      link.click();
                      URL.revokeObjectURL(url);
                      setStatus("Downloaded ms");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
