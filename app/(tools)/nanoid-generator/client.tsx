"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, Info, RefreshCcw } from "lucide-react";

const defaultAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const hexAlphabet = "0123456789abcdef";
const lowerAlphabet = "abcdefghijklmnopqrstuvwxyz";
const alnumAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

type GenerationMode = "nanoid" | "simple";

function randomNanoId(size: number, alphabet: string, mode: GenerationMode) {
  if (mode === "simple") {
    const arr = new Uint8Array(size);
    crypto.getRandomValues(arr);
    const chars = [];
    for (let i = 0; i < size; i += 1) {
      chars.push(alphabet[arr[i] % alphabet.length] ?? "");
    }
    return chars.join("");
  }

  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / alphabet.length);
  let id = "";
  while (id.length < size) {
    const bytes = new Uint8Array(step);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < step && id.length < size; i += 1) {
      const index = bytes[i] & mask;
      if (index < alphabet.length) id += alphabet[index];
    }
  }
  return id;
}

export default function NanoIdClient() {
  const [length, setLength] = useState(10);
  const [alphabet, setAlphabet] = useState(defaultAlphabet);
  const [count, setCount] = useState(5);
  const [ids, setIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("nanoid");

  const alphabetIssues = useMemo(() => {
    if (alphabet.trim().length < 2) return "Alphabet must have at least 2 non-space characters.";
    if (!alphabet || alphabet.length < 2) return "Alphabet must have at least 2 characters.";
    return "";
  }, [alphabet]);

  const isAlphabetValid = !alphabetIssues;

  const generate = () => {
    const safeLength = Math.min(Math.max(length, 4), 32);
    const safeCount = Math.min(Math.max(count, 1), 50);
    const alpha = isAlphabetValid ? alphabet : defaultAlphabet;
    const set = new Set<string>();
    const list: string[] = [];
    while (list.length < safeCount) {
      const id = randomNanoId(safeLength, alpha, generationMode);
      if (uniqueOnly && set.has(id)) continue;
      set.add(id);
      list.push(id);
      if (!uniqueOnly) continue;
      if (list.length >= safeCount) break;
      if (set.size > 10_000) break; // safety
    }
    setIds(list);
    setCopied(false);
    setStatus(
      `Generated ${list.length} IDs (len ${safeLength}, ${generationMode === "nanoid" ? "NanoID compatible" : "simple"}${
        uniqueOnly ? ", unique" : ""
      })${
        !isAlphabetValid ? " (default alphabet used)" : ""
      }`
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!ids.length) return;
    const blob = new Blob([ids.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nanoid-list.txt";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status}
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
              Nanoid Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
              aria-label="NanoID length"
            />
            {(length < 4 || length > 32) && (
              <p className="text-xs font-medium text-amber-600">Clamped to 4–32 when generating.</p>
            )}
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
              aria-label="Number of IDs to generate"
            />
            {(count < 1 || count > 50) && (
              <p className="text-xs font-medium text-amber-600">Clamped to 1–50 when generating.</p>
            )}
          </label>
          <div className="flex flex-col gap-1 text-sm text-slate-700">
            Alphabet
            <textarea
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={alphabet}
              onChange={(event) => setAlphabet(event.target.value || defaultAlphabet)}
              rows={2}
              aria-label="Custom alphabet"
            />
            {alphabetIssues ? (
              <p className="text-xs font-medium text-amber-600">{alphabetIssues}</p>
            ) : (
              <p className="text-xs text-slate-500">Default is URL-safe; customize as needed.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span className="flex items-center gap-1 font-semibold text-slate-900">
            <Info className="h-4 w-4" /> Presets:
          </span>
          <button
            onClick={() => setAlphabet(defaultAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use URL-safe alphabet"
          >
            URL-safe
          </button>
          <button
            onClick={() => setAlphabet(hexAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use hex alphabet"
          >
            Hex
          </button>
          <button
            onClick={() => setAlphabet(lowerAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use lowercase alphabet"
          >
            Lowercase
          </button>
          <button
            onClick={() => setAlphabet(alnumAlphabet)}
            className="rounded-full bg-slate-100 px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Use letters and digits alphabet"
          >
            Letters+Digits
          </button>
          <span className="mx-2 text-slate-400">|</span>
          <button
            onClick={() => setLength(10)}
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Set length 10"
          >
            Len 10
          </button>
          <button
            onClick={() => setLength(16)}
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Set length 16"
          >
            Len 16
          </button>
          <button
            onClick={() => setLength(21)}
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Set length 21"
          >
            Len 21
          </button>
        </div>
        <fieldset className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <legend className="text-xs font-semibold text-slate-900">Generation mode</legend>
          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5">
            <input
              type="radio"
              name="generation-mode"
              value="nanoid"
              checked={generationMode === "nanoid"}
              onChange={() => setGenerationMode("nanoid")}
              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            NanoID compatible
          </label>
          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1 font-medium ring-1 ring-slate-200 transition hover:-translate-y-0.5">
            <input
              type="radio"
              name="generation-mode"
              value="simple"
              checked={generationMode === "simple"}
              onChange={() => setGenerationMode("simple")}
              className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Simple mode
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            aria-label="Generate NanoIDs"
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
              setStatus("Reset to defaults");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset NanoID settings"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={uniqueOnly}
              onChange={(event) => setUniqueOnly(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Unique IDs only
          </label>
          {uniqueOnly ? (
            <p className="text-xs font-medium text-amber-600">
              Uniqueness is best-effort; small alphabets or short lengths increase collision risk.
            </p>
          ) : null}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!ids.length}
            aria-label="Copy generated IDs"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!ids.length}
            aria-label="Download generated IDs as text"
          >
            <Download className="h-4 w-4" />
            Save .txt
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="nanoid-output-heading"
      >
        <div id="nanoid-output-heading" className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          Generated IDs
        </div>
        <pre className="max-h-[240px] overflow-auto p-4 text-sm leading-relaxed text-slate-100" aria-live="polite">
          {ids.length ? ids.join("\n") : "IDs will appear here after generation."}
        </pre>
      <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-300">
          Length: {Math.min(Math.max(length, 4), 32)} · Count: {Math.min(Math.max(count, 1), 50)} · Mode:{" "}
          {generationMode === "nanoid" ? "NanoID compatible" : "Simple"} · Alphabet:{" "}
          {isAlphabetValid ? `${alphabet.length} chars` : "default (invalid custom)"}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick length (4–32) and count (1–50); choose an alphabet or use presets.</li>
          <li>Enable “Unique IDs only” for best-effort uniqueness (more reliable with larger alphabets and lengths).</li>
          <li>Generate, then copy or save the list as a .txt file.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. IDs are generated with Web Crypto in your browser.</p>
          <p><strong>When do collisions happen?</strong> Short lengths or tiny alphabets can collide; increase length/alphabet size or use “Unique IDs only.”</p>
          <p><strong>Why NanoID?</strong> Short, URL-safe IDs with good collision resistance for slugs, tokens, and references.</p>
        </div>
      </div>
  </main>
);
}
