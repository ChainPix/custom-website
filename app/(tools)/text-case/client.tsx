"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clipboard, Check, Download, Eye, EyeOff, RefreshCcw, Sparkles } from "lucide-react";

type CaseType = "camel" | "pascal" | "snake" | "kebab" | "title" | "upper" | "lower" | "sentence" | "capitalized";

const toWords = (text: string) =>
  text
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

const converters: Record<CaseType, (text: string) => string> = {
  camel: (text) => {
    const words = toWords(text.toLowerCase());
    return words
      .map((w, idx) => (idx === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join("");
  },
  pascal: (text) => {
    const words = toWords(text.toLowerCase());
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  },
  snake: (text) => toWords(text).join("_").toLowerCase(),
  kebab: (text) => toWords(text).join("-").toLowerCase(),
  title: (text) =>
    toWords(text)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  upper: (text) => text.toUpperCase(),
  lower: (text) => text.toLowerCase(),
  sentence: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  },
  capitalized: (text) =>
    toWords(text)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" "),
};

const LARGE_THRESHOLD = 50000;

export default function TextCaseClient() {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CaseType>("camel");
  const [copiedKey, setCopiedKey] = useState<CaseType | null>(null);
  const [trimInput, setTrimInput] = useState(true);
  const [warning, setWarning] = useState("");
  const [status, setStatus] = useState("Ready");
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const outputs = useMemo(() => {
    const text = trimInput ? input.trim() : input;
    const entries = Object.entries(converters) as Array<[CaseType, (t: string) => string]>;
    return entries.map(([key, fn]) => [key, fn(text)] as const);
  }, [input, trimInput]);

  const chars = input.length;
  const lines = input ? input.split("\n").length : 0;

  if (warning && chars < LARGE_THRESHOLD) {
    setWarning("");
  }
  if (!warning && chars >= LARGE_THRESHOLD) {
    setWarning(`Large input detected (${chars.toLocaleString()} chars, ${lines.toLocaleString()} lines). Conversions may take a moment.`);
  }

  const handleCopy = async (text: string, key: CaseType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopySelected = () => {
    const entry = outputs.find(([key]) => key === selected);
    if (!entry) return;
    handleCopy(entry[1], selected);
  };

  const handleCopyAll = async () => {
    const text = outputs.map(([key, value]) => `${key}: ${value}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied all");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    const text = outputs.map(([key, value]) => `${key}: ${value}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "text-cases.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Text Case Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text to camelCase, PascalCase, snake_case, kebab-case, Title Case, upper, or lower
          instantly.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="case-select">
            <span className="font-semibold text-slate-900">Case</span>
            <select
              id="case-select"
              value={selected}
              onChange={(event) => setSelected(event.target.value as CaseType)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="camel">camelCase</option>
              <option value="pascal">PascalCase</option>
              <option value="snake">snake_case</option>
              <option value="kebab">kebab-case</option>
              <option value="title">Title Case</option>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="sentence">Sentence case</option>
              <option value="capitalized">Capitalized Words</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={trimInput}
              onChange={(e) => setTrimInput(e.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Trim whitespace
          </label>
          <button
            onClick={() => setInput("")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={() => {
              setInput("convert THIS_sample-text to Multiple Cases easily");
              setStatus("Sample loaded");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Load sample
          </button>
        </div>
        <textarea
          className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste text to convert"
          aria-label="Text input"
        />
        {warning ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {warning}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: use this for variable names, headings, and quick case formatting.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(showOnlySelected ? outputs.filter(([key]) => key === selected) : outputs).map(([key, value]) => (
          <div
            key={key}
            className={`rounded-2xl ${
              key === selected ? "bg-slate-900 text-white ring-slate-800" : "bg-white text-slate-900 ring-slate-200"
            } shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/50 px-4 py-3">
              <p className="text-sm font-semibold capitalize">{key.replace("-", " ")}</p>
              <button
                onClick={() => handleCopy(value, key)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  key === selected
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-slate-900 text-white hover:-translate-y-0.5"
                }`}
              >
                {copiedKey === key ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedKey === key ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className={`min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed ${
                key === selected ? "text-slate-100" : "text-slate-900"
              }`}
              role="region"
              aria-label={`${key} output`}
              tabIndex={0}
            >
              {value || "Converted text will appear here."}
            </pre>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <button
          onClick={handleCopySelected}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          Copy selected
        </button>
        <button
          onClick={handleCopyAll}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          Copy all
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          <Download className="h-4 w-4" />
          Download outputs
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={(e) => setShowOnlySelected(e.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          Show only selected case
        </label>
      </div>
    </main>
  );
}
