"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

export default function UuidClient() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [format, setFormat] = useState<"lower-dash" | "upper-dash" | "lower-nodash" | "upper-nodash">("lower-dash");
  const [separator, setSeparator] = useState<"newline" | "comma" | "json" | "csv" | "sql">("newline");
  const [copiedSingle, setCopiedSingle] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clipboardSupported = typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;

  const formatUuid = (value: string) => {
    const dashed = format === "lower-dash" || format === "upper-dash";
    const upper = format === "upper-dash" || format === "upper-nodash";
    let next = dashed ? value : value.replace(/-/g, "");
    if (upper) {
      next = next.toUpperCase();
    } else {
      next = next.toLowerCase();
    }
    return next;
  };

  const formattedUuids = useMemo(() => uuids.map((value) => formatUuid(value)), [uuids, format]);

  const outputText = useMemo(() => {
    if (!formattedUuids.length) {
      return "";
    }
    if (separator === "comma") {
      return formattedUuids.join(", ");
    }
    if (separator === "json") {
      return JSON.stringify(formattedUuids, null, 2);
    }
    if (separator === "csv") {
      return ["uuid", ...formattedUuids].join("\n");
    }
    if (separator === "sql") {
      const values = formattedUuids.map((value) => `('${value}')`).join(",\n  ");
      return `INSERT INTO your_table (uuid) VALUES\n  ${values};`;
    }
    return formattedUuids.join("\n");
  }, [formattedUuids, separator]);

  const downloadMeta = useMemo(() => {
    if (separator === "json") {
      return { extension: "json", mime: "application/json" };
    }
    if (separator === "csv") {
      return { extension: "csv", mime: "text/csv" };
    }
    if (separator === "sql") {
      return { extension: "sql", mime: "text/plain" };
    }
    return { extension: "txt", mime: "text/plain" };
  }, [separator]);

  const pushToast = (message: string, tone: "success" | "error") => {
    setToast({ message, tone });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 1400);
  };

  const generate = (nextCount?: number) => {
    const safeCount = Number.isFinite(nextCount) ? (nextCount as number) : count;
    const total = Math.min(Math.max(Number.isFinite(safeCount) ? safeCount : 5, 1), 50);
    const list = Array.from({ length: total }, () => crypto.randomUUID());
    setUuids(list);
    setError("");
    setCopiedSingle(null);
    pushToast(`Generated ${total} UUID${total === 1 ? "" : "s"}`, "success");
  };

  const handleCopy = async () => {
    try {
      if (!clipboardSupported) {
        pushToast("Clipboard unavailable. Use Ctrl+C.", "error");
        return;
      }
      await navigator.clipboard.writeText(outputText || formattedUuids.join("\n"));
      pushToast("Copied all UUIDs", "success");
    } catch (err) {
      console.error("Copy failed", err);
      pushToast("Copy failed. Try Ctrl+C.", "error");
    }
  };

  const handleCopySingle = async (value: string) => {
    try {
      if (!clipboardSupported) {
        pushToast("Clipboard unavailable. Use Ctrl+C.", "error");
        return;
      }
      await navigator.clipboard.writeText(value);
      setCopiedSingle(value);
      pushToast("Copied UUID", "success");
    } catch (err) {
      console.error("Copy failed", err);
      pushToast("Copy failed. Try Ctrl+C.", "error");
    }
  };

  const handleDownload = () => {
    if (!formattedUuids.length) return;
    const content = outputText || formattedUuids.join("\n");
    const blob = new Blob([content], { type: downloadMeta.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uuids.${downloadMeta.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSample = () => {
    setCount(5);
    setUuids([
      "2c2e5bfe-7a6f-4d3e-9cb7-8f9c6c4a53c1",
      "1b4d9c72-3e9a-4c1d-8f93-7c2a4f1d5b6e",
      "f7a8c2d1-5e3b-4c8d-9f2a-6b1c3e4d7a8b",
      "9d3f6b7c-2a1e-4c5d-8f9a-7b6c4d3e2f1a",
      "6c4b7a9d-3e2f-4c1a-8b5d-7f9a2c3d6e1b",
    ]);
    setError("");
    setCopiedSingle(null);
    pushToast("Sample loaded", "success");
  };

  useEffect(() => {
    if (!autoGenerate || uuids.length) {
      return;
    }
    const timer = setTimeout(() => {
      generate();
    }, 200);
    return () => clearTimeout(timer);
  }, [autoGenerate, uuids.length]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {toast?.message ?? ""} {error}
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
              UUID Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">UUID Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate random v4 UUIDs for APIs, testing, or database keys. Copy or download multiple IDs instantly.
        </p>
        <p className="text-sm text-slate-600">Runs fully in your browser; nothing is uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">How many?</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(event) => {
                const val = Number(event.target.value);
                if (Number.isNaN(val)) {
                  setError("Please enter a number between 1 and 50.");
                } else if (val < 1 || val > 50) {
                  setError("Enter a count between 1 and 50.");
                  setCount(val);
                } else {
                  setError("");
                  setCount(val);
                }
              }}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <button
            onClick={generate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Generate
          </button>
          <button
            onClick={() => {
              setCount(1);
              generate(1);
            }}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Generate 1
          </button>
          <button
            onClick={() => {
              setCount(50);
              generate(50);
            }}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Generate max (50)
          </button>
          <button
            onClick={handleSample}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Sample
          </button>
          <button
            onClick={() => {
              setUuids([]);
              setCopiedSingle(null);
              setToast(null);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-medium text-slate-900">Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as typeof format)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="lower-dash">Lowercase with dashes</option>
              <option value="upper-dash">Uppercase with dashes</option>
              <option value="lower-nodash">Lowercase no dashes</option>
              <option value="upper-nodash">Uppercase no dashes</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-medium text-slate-900">Output</span>
            <select
              value={separator}
              onChange={(event) => setSeparator(event.target.value as typeof separator)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="newline">Newline</option>
              <option value="comma">Comma + space</option>
              <option value="json">JSON array</option>
              <option value="csv">CSV column</option>
              <option value="sql">SQL INSERT snippet</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(event) => setAutoGenerate(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Auto-generate on load
          </label>
        </div>
        {error && (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="uuids-label">
            UUIDs
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!formattedUuids.length}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!formattedUuids.length || !clipboardSupported}
            >
              <Clipboard className="h-4 w-4" />
              {!clipboardSupported ? "Use Ctrl+C" : "Copy all"}
            </button>
            {toast ? (
              <span
                className={`text-xs font-medium ${
                  toast.tone === "success" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {toast.message}
              </span>
            ) : null}
          </div>
        </div>
        <div className="max-h-[360px] overflow-auto p-4 text-sm leading-relaxed text-slate-100" role="region" aria-labelledby="uuids-label">
          {formattedUuids.length ? (
            <ul className="space-y-2">
              {formattedUuids.map((value, index) => (
                <li key={`${value}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(value)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-left transition hover:bg-slate-950"
                  >
                    <span className="break-all font-mono text-xs text-slate-100">{value}</span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                      {copiedSingle === value ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                      Copy
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            "Generated UUIDs will appear here."
          )}
          {formattedUuids.length ? (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Output preview</div>
              <pre className="whitespace-pre-wrap break-words font-mono text-xs text-slate-100">{outputText}</pre>
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Are these UUIDs generated locally?</summary>
            <p className="mt-2 text-slate-700">Yes. Generation happens in your browser using the built-in crypto API; nothing is sent to a server.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I generate uppercase or compact UUIDs?</summary>
            <p className="mt-2 text-slate-700">Use the toggles for uppercase and removing dashes to match your required format.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is there a limit?</summary>
            <p className="mt-2 text-slate-700">You can generate up to 50 at once for quick copying or download.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
