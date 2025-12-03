"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "sql-formatter";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const dialects = ["sql", "mysql", "postgresql", "sqlite", "mariadb"] as const;
type Dialect = (typeof dialects)[number];

export default function SqlFormatterClient() {
  const [input, setInput] = useState("select * from users where id = 42 and status = 'active';");
  const [dialect, setDialect] = useState<Dialect>("sql");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleFormat = () => {
    try {
      const formatted = format(input, { language: dialect });
      setOutput(formatted);
      setError("");
    } catch (err) {
      console.error("SQL format error", err);
      setError("Unable to format this SQL. Check syntax or dialect.");
      setOutput("");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output || input);
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
        <h1 className="text-3xl font-semibold text-slate-900">SQL Formatter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Format SQL queries for readability. Choose a dialect and copy cleaned output.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <select
              value={dialect}
              onChange={(event) => setDialect(event.target.value as Dialect)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {dialects.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              onClick={handleFormat}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Format
            </button>
            <button
              onClick={() => {
                setInput("select * from users where id = 42 and status = 'active';");
                setOutput("");
                setError("");
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
            placeholder="Paste SQL to format"
          />
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: choose dialect for best results.</p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Formatted SQL</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output && !input}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {output || "Formatted SQL will appear here."}
          </pre>
        </div>
      </div>
    </main>
  );
}
