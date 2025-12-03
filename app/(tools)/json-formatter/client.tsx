"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clipboard, Sparkles } from "lucide-react";

const defaultJson = `{
  "name": "FastFormat",
  "type": "online tool",
  "features": ["json formatter", "resume analyzer", "pdf to text"],
  "fast": true
}`;

export default function JsonFormatterClient() {
  const [input, setInput] = useState(defaultJson);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    handleFormat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormat = () => {
    setError("");
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.error("Failed to format JSON", err);
      setOutput("");
      setError("Invalid JSON. Ensure keys and strings use quotes.");
    }
  };

  const handleMinify = () => {
    setError("");
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (err) {
      console.error("Failed to minify JSON", err);
      setOutput("");
      setError("Invalid JSON. Ensure keys and strings use quotes.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output || input);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Unable to copy", err);
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">JSON Formatter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Format or minify JSON instantly. Paste your JSON to get clean, readable output. No
          sign-ups, no limits.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFormat}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Format
            </button>
            <button
              onClick={handleMinify}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Minify
            </button>
            <button
              onClick={() => setInput("")}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Clear
            </button>
          </div>
          <textarea
            className="h-[280px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            spellCheck={false}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='Paste JSON here e.g. {"hello":"world"}'
          />
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: clean API responses, configs, and logs.</p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Output</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4" /> Copy
                </>
              )}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {output || "Formatted JSON will appear here."}
          </pre>
        </div>
      </div>
    </main>
  );
}
