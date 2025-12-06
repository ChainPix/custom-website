"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

const algorithms = ["SHA-256", "SHA-1"] as const;
const MAX_CHARS = 100_000;

async function hashText(text: string, algorithm: (typeof algorithms)[number]) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function HashGeneratorClient() {
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState<(typeof algorithms)[number]>("SHA-256");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isHashing, setIsHashing] = useState(false);
  const [autoHash, setAutoHash] = useState(false);

  const runHash = async (text: string, alg: (typeof algorithms)[number]) => {
    if (!text.trim()) {
      setError("Enter text to hash.");
      setStatus("Waiting for input");
      return;
    }
    if (text.length > MAX_CHARS) {
      setError(`Input is too large (${text.length} chars). Please stay under ${MAX_CHARS.toLocaleString()} characters.`);
      setStatus("Input too large");
      return;
    }
    setError("");
    setStatus("Hashing…");
    setIsHashing(true);
    try {
      const digest = await hashText(text, alg);
      setOutput(digest);
      setStatus("Hash generated");
    } catch (err) {
      console.error("Hash error", err);
      setError("Hashing failed in this browser. Web Crypto may be blocked or unsupported.");
      setOutput("");
      setStatus("Error");
    } finally {
      setIsHashing(false);
    }
  };

  const handleHash = async () => {
    await runHash(input, algorithm);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hash-${algorithm.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSample = () => {
    const sample = "Hash this sample text for quick verification.";
    setInput(sample);
    setError("");
    setStatus("Sample loaded");
    setCopied(false);
    if (autoHash) {
      runHash(sample, algorithm);
    }
  };

  useEffect(() => {
    if (!autoHash) return;
    if (!input.trim() || input.length > MAX_CHARS || isHashing) return;
    runHash(input, algorithm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, algorithm, autoHash]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Hash Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Hash text with SHA-256 or SHA-1 directly in your browser. Copy the result instantly.
        </p>
        <p className="text-sm text-slate-600">Runs locally with Web Crypto; inputs are never uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Algorithm</span>
            <select
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as (typeof algorithms)[number])}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {algorithms.map((alg) => (
                <option key={alg} value={alg}>
                  {alg}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={handleHash}
            disabled={isHashing}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isHashing ? "Hashing..." : "Generate hash"}
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
              setInput("");
              setOutput("");
              setError("");
              setStatus("Cleared");
              }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoHash}
              onChange={(event) => setAutoHash(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Auto-hash as you type
          </label>
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste text to hash"
        />
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: Hashing runs locally using Web Crypto. Keep input under {MAX_CHARS.toLocaleString()} characters for best performance.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="hash-output-label">
            Hash
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre
          className="min-h-[140px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
          role="region"
          aria-labelledby="hash-output-label"
        >
          {output || "Hash output will appear here."}
        </pre>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is hashing done locally?</summary>
            <p className="mt-2 text-slate-700">
              Yes. We use the browser&apos;s Web Crypto API, so your text never leaves the page.
            </p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Which algorithms are supported?</summary>
            <p className="mt-2 text-slate-700">SHA-256 and SHA-1. Copy or download the output as needed.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is there a size limit?</summary>
            <p className="mt-2 text-slate-700">
              Keep input under {MAX_CHARS.toLocaleString()} characters for best performance. Larger inputs may be blocked.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
