"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const defaultAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function randomNanoId(size: number, alphabet: string) {
  const arr = new Uint8Array(size);
  crypto.getRandomValues(arr);
  const chars = [];
  for (let i = 0; i < size; i += 1) {
    chars.push(alphabet[arr[i] % alphabet.length] ?? "");
  }
  return chars.join("");
}

export default function NanoIdClient() {
  const [length, setLength] = useState(10);
  const [alphabet, setAlphabet] = useState(defaultAlphabet);
  const [count, setCount] = useState(5);
  const [ids, setIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const isAlphabetValid = useMemo(() => alphabet.length > 1, [alphabet]);

  const generate = () => {
    const safeLength = Math.min(Math.max(length, 4), 32);
    const safeCount = Math.min(Math.max(count, 1), 50);
    const alpha = isAlphabetValid ? alphabet : defaultAlphabet;
    const list = Array.from({ length: safeCount }, () => randomNanoId(safeLength, alpha));
    setIds(list);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
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
        <h1 className="text-3xl font-semibold text-slate-900">NanoID Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate short, URL-safe IDs with custom length and alphabet. Great for slugs, tokens, and refs.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Length (4–32)
            <input
              type="number"
              min={4}
              max={32}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Count (1–50)
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <div className="flex flex-col gap-1 text-sm text-slate-700">
            Alphabet
            <textarea
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={alphabet}
              onChange={(event) => setAlphabet(event.target.value || defaultAlphabet)}
              rows={2}
            />
            {!isAlphabetValid ? (
              <p className="text-xs font-medium text-amber-600">Alphabet must have at least 2 characters.</p>
            ) : (
              <p className="text-xs text-slate-500">Default is URL-safe; customize as needed.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Generate
          </button>
          <button
            onClick={() => {
              setLength(10);
              setCount(5);
              setAlphabet(defaultAlphabet);
              setIds([]);
              setCopied(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!ids.length}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Generated IDs</div>
        <pre className="max-h-[240px] overflow-auto p-4 text-sm leading-relaxed text-slate-100">
          {ids.length ? ids.join("\n") : "IDs will appear here after generation."}
        </pre>
      </div>
    </main>
  );
}
