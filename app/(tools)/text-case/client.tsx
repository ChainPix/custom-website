"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clipboard, Check, RefreshCcw } from "lucide-react";

type CaseType = "camel" | "pascal" | "snake" | "kebab" | "title" | "upper" | "lower";

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
};

export default function TextCaseClient() {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CaseType>("camel");
  const [copiedKey, setCopiedKey] = useState<CaseType | null>(null);

  const outputs = useMemo(() => {
    const entries = Object.entries(converters) as Array<[CaseType, (t: string) => string]>;
    return entries.map(([key, fn]) => [key, fn(input)] as const);
  }, [input]);

  const handleCopy = async (text: string, key: CaseType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
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
        <h1 className="text-3xl font-semibold text-slate-900">Text Case Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text to camelCase, PascalCase, snake_case, kebab-case, Title Case, upper, or lower
          instantly.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <select
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
          </select>
          <button
            onClick={() => setInput("")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <textarea
          className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste text to convert"
        />
        <p className="text-sm text-slate-600">
          Tip: use this for variable names, headings, and quick case formatting.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {outputs.map(([key, value]) => (
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
            >
              {value || "Converted text will appear here."}
            </pre>
          </div>
        ))}
      </div>
    </main>
  );
}
