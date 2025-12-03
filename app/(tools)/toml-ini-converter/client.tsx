"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ini from "ini";
import toml from "toml";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Mode = "toml" | "ini";

export default function TomlIniClient() {
  const [input, setInput] = useState('[db]\nhost="localhost"\nport=5432');
  const [mode, setMode] = useState<Mode>("toml");
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      const parsed = mode === "toml" ? toml.parse(input) : ini.parse(input);
      return { output: JSON.stringify(parsed, null, 2), error: "" };
    } catch (err) {
      console.error("Parse error", err);
      return { output: "", error: "Invalid input for the selected format." };
    }
  }, [input, mode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.output);
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
        <h1 className="text-3xl font-semibold text-slate-900">TOML/INI → JSON Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert TOML or INI configuration text into JSON. Validate and copy formatted output.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="toml">TOML</option>
              <option value="ini">INI</option>
            </select>
            <button
              onClick={() => {
                setMode("toml");
                setInput('[db]\nhost="localhost"\nport=5432');
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
            spellCheck={false}
            placeholder="Paste TOML or INI content"
          />
          {result.error ? (
            <p className="text-sm font-medium text-amber-600">{result.error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: Runs locally—great for quick config conversions.
            </p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">JSON Output</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!result.output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {result.output || "Converted JSON will appear here."}
          </pre>
        </div>
      </div>
    </main>
  );
}
