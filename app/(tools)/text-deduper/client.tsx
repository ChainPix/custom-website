"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Options = {
  caseInsensitive: boolean;
  trimLines: boolean;
};

const defaultText = "Apple\nbanana\napple \nOrange\nBANANA\norange\norange";

export default function TextDeduperClient() {
  const [input, setInput] = useState(defaultText);
  const [options, setOptions] = useState<Options>({ caseInsensitive: true, trimLines: true });
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const lines = input.split(/\r?\n/);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const line of lines) {
      const normalized = options.trimLines ? line.trim() : line;
      const key = options.caseInsensitive ? normalized.toLowerCase() : normalized;
      if (normalized === "") continue;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(normalized);
      }
    }
    return result.join("\n");
  }, [input, options]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
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
        <h1 className="text-3xl font-semibold text-slate-900">Text Deduper</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Remove duplicate lines with case-insensitive and trim options. Keep order and copy the cleaned result.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900"
                checked={options.caseInsensitive}
                onChange={() =>
                  setOptions((prev) => ({ ...prev, caseInsensitive: !prev.caseInsensitive }))
                }
              />
              Case insensitive
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-900"
                checked={options.trimLines}
                onChange={() => setOptions((prev) => ({ ...prev, trimLines: !prev.trimLines }))}
              />
              Trim lines
            </label>
            <button
              onClick={() => {
                setInput(defaultText);
                setOptions({ caseInsensitive: true, trimLines: true });
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          <textarea
            className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste text with duplicate lines"
          />
          <p className="text-sm text-slate-600">Duplicates removed: {Math.max(input.split(/\r?\n/).length - output.split(/\r?\n/).filter(Boolean).length, 0)}</p>
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Deduped text</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {output || "Result will appear here."}
          </pre>
        </div>
      </div>
    </main>
  );
}
