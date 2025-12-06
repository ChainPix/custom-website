"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

export default function UuidClient() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [uppercase, setUppercase] = useState(false);
  const [withDashes, setWithDashes] = useState(true);

  const generate = () => {
    const total = Math.min(Math.max(Number.isFinite(count) ? count : 5, 1), 50);
    const list = Array.from({ length: total }, () => {
      let uuid = crypto.randomUUID();
      if (!withDashes) {
        uuid = uuid.replace(/-/g, "");
      }
      return uppercase ? uuid.toUpperCase() : uuid;
    });
    setUuids(list);
    setCopied(false);
    setError("");
    setStatus("Generated");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(uuids.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!uuids.length) return;
    const blob = new Blob([uuids.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "uuids.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSample = () => {
    setCount(5);
    setUppercase(false);
    setWithDashes(true);
    setUuids([
      "2c2e5bfe-7a6f-4d3e-9cb7-8f9c6c4a53c1",
      "1b4d9c72-3e9a-4c1d-8f93-7c2a4f1d5b6e",
      "f7a8c2d1-5e3b-4c8d-9f2a-6b1c3e4d7a8b",
      "9d3f6b7c-2a1e-4c5d-8f9a-7b6c4d3e2f1a",
      "6c4b7a9d-3e2f-4c1a-8b5d-7f9a2c3d6e1b",
    ]);
    setError("");
    setStatus("Sample loaded");
    setCopied(false);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
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
            onClick={handleSample}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Sample
          </button>
          <button
            onClick={() => {
              setUuids([]);
              setCopied(false);
              setStatus("Cleared");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Uppercase
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={withDashes}
              onChange={(e) => setWithDashes(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Include dashes
          </label>
        </div>
        {error && (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="uuids-label">
            UUIDs
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!uuids.length}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!uuids.length}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy all"}
            </button>
          </div>
        </div>
        <pre
          className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
          role="region"
          aria-labelledby="uuids-label"
        >
          {uuids.length ? uuids.join("\n") : "Generated UUIDs will appear here."}
        </pre>
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
