"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "sql-formatter";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const dialects = ["sql", "mysql", "postgresql", "sqlite", "mariadb"] as const;
type Dialect = (typeof dialects)[number];

export default function SqlFormatterClient() {
  const [input, setInput] = useState("select * from users where id = 42 and status = 'active';");
  const [dialect, setDialect] = useState<Dialect>("sql");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [indent, setIndent] = useState(2);
  const [compact, setCompact] = useState(false);
  const [wrap, setWrap] = useState(false);
  const MAX_LEN = 50000;

  const handleFormat = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Enter SQL to format.");
      setOutput("");
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setError("SQL is too large to format. Please shorten or split the query.");
      setOutput("");
      return;
    }
    try {
      const formatted = format(trimmed, {
        language: dialect,
        tabWidth: indent,
        keywordCase: compact ? "upper" : "preserve",
      });
      setOutput(formatted);
      setError("");
    } catch (err) {
      console.error("SQL format error", err);
      setError("Unable to format this SQL. Check syntax or choose a different dialect.");
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

  const samples: Record<string, string> = {
    select: "SELECT id, name, email FROM users WHERE status = 'active' ORDER BY created_at DESC;",
    insert: "INSERT INTO orders (user_id, total, currency) VALUES (42, 199.99, 'USD');",
    join: "SELECT u.id, u.name, o.id AS order_id, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.total > 100;",
    cte: "WITH recent_orders AS (SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days') SELECT user_id, COUNT(*) FROM recent_orders GROUP BY user_id;",
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {error || (output ? "SQL formatted" : "Ready")}
        {copied ? "Copied" : ""}
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
              SQL Formatter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Select SQL dialect"
            >
              {dialects.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              Indent
              <input
                type="number"
                min={1}
                max={8}
                value={indent}
                onChange={(e) => setIndent(Number(e.target.value) || 2)}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Indent size"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={compact}
                onChange={(e) => setCompact(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Compact output"
              />
              Compact
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wrap}
                onChange={(e) => setWrap(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Wrap lines"
              />
              Wrap lines
            </label>
            <button
              onClick={handleFormat}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              aria-label="Format SQL"
            >
              Format
            </button>
            <button
              onClick={() => {
                setInput("select * from users where id = 42 and status = 'active';");
                setOutput("");
                setError("");
                setCopied(false);
                setCopiedInput(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
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
            aria-label="SQL input"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            {Object.entries(samples).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setInput(value);
                  setError("");
                  setOutput("");
                  setCopied(false);
                  setCopiedInput(false);
                }}
                className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label={`Load ${key} sample`}
              >
                Sample: {key}
              </button>
            ))}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(input);
                  setCopiedInput(true);
                  setTimeout(() => setCopiedInput(false), 1200);
                } catch (err) {
                  console.error("Copy failed", err);
                }
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy input SQL"
            >
              {copiedInput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedInput ? "Copied input" : "Copy input"}
            </button>
          </div>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: choose dialect for best results. {dialect === "postgresql" ? "CTEs and `RETURNING` are supported." : null}{" "}
              {dialect === "mysql" ? "MySQL keywords are recognized; use backticks for identifiers." : null}
            </p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Formatted SQL</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!output && !input}
              aria-label="Copy formatted SQL"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => {
                if (!output) return;
                const blob = new Blob([output], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "formatted.sql";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!output}
              aria-label="Download formatted SQL"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
          <pre
            className={`flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100 ${wrap ? "whitespace-pre-wrap" : "whitespace-pre"}`}
            role="region"
            aria-label="Formatted SQL output"
          >
            {output || "Formatted SQL will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste SQL, pick a dialect, and adjust indent/compact/wrap as needed.</li>
          <li>Format the query, then copy or download the formatted output.</li>
          <li>Use samples to test common patterns (select, insert, join, CTE).</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does formatting run locally?</strong> Yes. All formatting happens in your browser.</p>
          <p><strong>Which dialects are supported?</strong> SQL, MySQL, PostgreSQL, SQLite, and MariaDB via `sql-formatter`.</p>
          <p><strong>Can I download results?</strong> Yes. Download the formatted SQL or copy it directly.</p>
        </div>
      </div>
    </main>
  );
}
