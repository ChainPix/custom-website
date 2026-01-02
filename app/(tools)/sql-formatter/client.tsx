"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { type KeywordCase } from "sql-formatter";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import { dialects, type CommaStyle, type Dialect, type IndentMode } from "./formatter-utils";
import { presetOptions, useSqlFormatter, type OutputPreset } from "./use-sql-formatter";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
const explainTooltips: Record<string, string> = {
  SELECT: "Selects columns in the result.",
  FROM: "Defines the source table.",
  WHERE: "Filters rows before grouping.",
  JOIN: "Combines rows from related tables.",
  ON: "Join condition between tables.",
  GROUP: "Groups rows for aggregation.",
  HAVING: "Filters groups after aggregation.",
  ORDER: "Sorts the final result.",
  WITH: "CTE (common table expression).",
  OVER: "Window function context.",
};

const highlightSql = (source: string, explainMode = false) => {
  const escaped = escapeHtml(source);
  const withStrings = escaped.replace(/'([^'\\]|\\.)*'/g, '<span class="text-amber-200">$&</span>');
  const withKeywords = withStrings.replace(
    /\b(SELECT|INSERT|INTO|VALUES|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|TABLE|VIEW|INDEX|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AND|OR|NOT|NULL|TRUE|FALSE|WITH|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|OVER)\b/gi,
    (match) => {
      const key = match.toUpperCase();
      const tooltip = explainTooltips[key];
      const explainClass = tooltip && explainMode ? "rounded bg-slate-700/40 px-1 text-slate-100" : "";
      const titleAttr = tooltip && explainMode ? ` title="${tooltip}"` : "";
      return `<span class="text-violet-300 ${explainClass}"${titleAttr}>${match}</span>`;
    }
  );
  return withKeywords.replace(/\b-?\d+(?:\.\d+)?\b/g, '<span class="text-sky-200">$&</span>');
};

const samples: Record<string, string> = {
  select: "SELECT id, name, email FROM users WHERE status = 'active' ORDER BY created_at DESC;",
  insert: "INSERT INTO orders (user_id, total, currency) VALUES (42, 199.99, 'USD');",
  join: "SELECT u.id, u.name, o.id AS order_id, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.total > 100;",
  cte: "WITH recent_orders AS (SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days') SELECT user_id, COUNT(*) FROM recent_orders GROUP BY user_id;",
};

export default function SqlFormatterClient() {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    input,
    setInput,
    dialect,
    setDialect,
    output,
    setOutput,
    error,
    errorDetails,
    setError,
    isFormatting,
    formatStatus,
    formatStats,
    copiedInput,
    copiedOutput,
    shareStatus,
    indent,
    setIndent,
    indentMode,
    setIndentMode,
    keywordCase,
    setKeywordCase,
    linesBetweenStatements,
    setLinesBetweenStatements,
    commaStyle,
    setCommaStyle,
    minify,
    setMinify,
    wrap,
    setWrap,
    outputPreset,
    setOutputPreset,
    autoFormat,
    setAutoFormat,
    formatOnPaste,
    setFormatOnPaste,
    checkSemicolon,
    setCheckSemicolon,
    explainMode,
    setExplainMode,
    outputView,
    setOutputView,
    shareCompression,
    setShareCompression,
    formatMultiple,
    setFormatMultiple,
    formatMode,
    setFormatMode,
    dropActive,
    suggestedDialect,
    lintHints,
    statements,
    diffLines,
    errorSuggestion,
    requestFormat,
    handleFormat,
    handleCopyInput,
    handleCopyOutput,
    handleCopyMarkdown,
    handleDownload,
    handleShareLink,
    cancelFormat,
    clearState,
    resetDefaults,
    resetFormattingState,
    handleImportFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  } = useSqlFormatter();

  const highlightedLines = useMemo(() => {
    if (!output) return [];
    const highlighted = highlightSql(output, explainMode);
    return highlighted.split("\n").map((line) => (line.length ? line : "&nbsp;"));
  }, [output, explainMode]);

  const highlightLine = (line: string) => highlightSql(line, explainMode) || "&nbsp;";
  const liveMessage = useMemo(() => {
    const status = isFormatting ? "Formatting SQL" : output ? "SQL formatted" : "Ready";
    return [error, status, copiedInput || copiedOutput ? "Copied" : "", shareStatus].filter(Boolean).join(". ");
  }, [copiedInput, copiedOutput, error, isFormatting, output, shareStatus]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
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
            {suggestedDialect && suggestedDialect.dialect !== dialect ? (
              <button
                onClick={() => setDialect(suggestedDialect.dialect)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label={`Use suggested dialect ${suggestedDialect.dialect}`}
              >
                Suggested: {suggestedDialect.dialect} ({suggestedDialect.reason})
              </button>
            ) : null}
            <div className="flex items-center rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <button
                type="button"
                onClick={() => setFormatMode("prettify")}
                className={`rounded-full px-3 py-1 transition ${
                  formatMode === "prettify" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
                aria-pressed={formatMode === "prettify"}
              >
                Prettify
              </button>
              <button
                type="button"
                onClick={() => setFormatMode("minify")}
                className={`rounded-full px-3 py-1 transition ${
                  formatMode === "minify" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                }`}
                aria-pressed={formatMode === "minify"}
              >
                Minify
              </button>
            </div>
            <label className="flex items-center gap-2">
              Output preset
              <select
                value={outputPreset}
                onChange={(event) => {
                  const preset = event.target.value as OutputPreset;
                  setOutputPreset(preset);
                  if (preset === "custom") return;
                  const selected = presetOptions[preset];
                  setKeywordCase(selected.keywordCase);
                  setIndent(selected.indentSize);
                  setIndentMode(selected.indentMode);
                  setLinesBetweenStatements(selected.linesBetweenStatements);
                  setCommaStyle(selected.commaStyle);
                  setMinify(selected.minify);
                  setWrap(selected.softWrap);
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Output preset"
              >
                {Object.entries(presetOptions).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Keyword case
              <select
                value={keywordCase}
                onChange={(event) => {
                  setKeywordCase(event.target.value as KeywordCase);
                  setOutputPreset("custom");
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Keyword case"
              >
                <option value="preserve">Preserve</option>
                <option value="upper">UPPER</option>
                <option value="lower">lower</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Comma style
              <select
                value={commaStyle}
                onChange={(event) => {
                  setCommaStyle(event.target.value as CommaStyle);
                  setOutputPreset("custom");
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Comma style"
              >
                <option value="trailing">Trailing</option>
                <option value="leading">Leading</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Indent style
              <select
                value={indentMode}
                onChange={(event) => {
                  setIndentMode(event.target.value as IndentMode);
                  setOutputPreset("custom");
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Indent style"
              >
                <option value="spaces">Spaces</option>
                <option value="tabs">Tabs</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Indent
              <input
                type="number"
                min={1}
                max={8}
                value={indent}
                onChange={(e) => {
                  setIndent(Number(e.target.value) || 2);
                  setOutputPreset("custom");
                }}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Indent size"
              />
            </label>
            <label className="flex items-center gap-2">
              Lines between
              <input
                type="number"
                min={0}
                max={4}
                value={linesBetweenStatements}
                onChange={(e) => {
                  setLinesBetweenStatements(Number(e.target.value) || 0);
                  setOutputPreset("custom");
                }}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                aria-label="Lines between statements"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wrap}
                onChange={(e) => {
                  setWrap(e.target.checked);
                  setOutputPreset("custom");
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Soft wrap (view only)"
              />
              Soft wrap (view only)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formatMultiple}
                onChange={(e) => setFormatMultiple(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Format multiple statements"
              />
              Format multiple statements
            </label>
            <button
              onClick={handleFormat}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              aria-label="Format SQL"
            >
              Format
            </button>
            <button
              onClick={resetDefaults}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={clearState}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Clear saved state"
            >
              Clear
            </button>
          </div>
          <textarea
            className={`h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
              dropActive ? "ring-2 ring-slate-300" : ""
            }`}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            placeholder="Paste SQL to format"
            aria-label="SQL input"
            ref={inputRef}
            onPaste={() => {
              if (!formatOnPaste) return;
              window.setTimeout(() => {
                const nextValue = inputRef.current?.value ?? input;
                requestFormat(nextValue);
              }, 0);
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            {Object.entries(samples).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  resetFormattingState();
                  setInput(value);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label={`Load ${key} sample`}
              >
                Sample: {key}
              </button>
            ))}
            <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={autoFormat}
                onChange={(e) => setAutoFormat(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Auto-format while typing"
              />
              Auto-format
            </label>
            <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={formatOnPaste}
                onChange={(e) => setFormatOnPaste(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Format on paste"
              />
              Format on paste
            </label>
            <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <input
                type="file"
                accept=".sql,.txt"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleImportFile(file);
                  event.target.value = "";
                }}
                aria-label="Import SQL file"
              />
              Import .sql
            </label>
            <button
              onClick={handleCopyInput}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy input SQL"
            >
              {copiedInput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedInput ? "Copied input" : "Copy Input"}
            </button>
            <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <input
                type="checkbox"
                checked={shareCompression}
                onChange={(e) => setShareCompression(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Compress share link"
              />
              Compress
            </label>
            <button
              onClick={handleShareLink}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy shareable link"
            >
              Share link
            </button>
            {shareStatus ? <span className="text-xs text-slate-500">{shareStatus}</span> : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-900">Lint hints</p>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={checkSemicolon}
                  onChange={(e) => setCheckSemicolon(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  aria-label="Check for missing semicolon"
                />
                Check semicolon
              </label>
            </div>
            {lintHints.length ? (
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {lintHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-500">No obvious issues detected.</p>
            )}
            {formatMultiple ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-600">
                  Statement splitter: {statements.length} detected
                </summary>
                <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-[11px] text-slate-500">
                  {statements.map((statement, idx) => (
                    <li key={`${idx}-${statement.length}`}>
                      {idx + 1}. {statement.slice(0, 120)}
                      {statement.length > 120 ? "…" : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
          {error ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-amber-600">{error}</p>
              {errorSuggestion && suggestedDialect ? (
                <button
                  onClick={() => setDialect(suggestedDialect.dialect)}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 transition hover:-translate-y-0.5"
                  aria-label={`Try dialect ${suggestedDialect.dialect}`}
                >
                  {errorSuggestion}
                </button>
              ) : null}
              {errorDetails ? (
                <details className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <summary className="cursor-pointer font-medium text-slate-700">Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-slate-700">{errorDetails}</pre>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: choose dialect for best results. {dialect === "postgresql" ? "CTEs and `RETURNING` are supported." : null}{" "}
              {dialect === "mysql" ? "MySQL keywords are recognized; use backticks for identifiers." : null}
            </p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Formatted SQL</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                {formatStats ? (
                  <>
                    <span>Formatted in {formatStats.durationMs}ms</span>
                    <span>Input chars: {formatStats.inputChars.toLocaleString()}</span>
                  </>
                ) : (
                  <span>Input chars: {input.length.toLocaleString()}</span>
                )}
                {formatStatus ? <span className="text-slate-200">{formatStatus}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOutputView("formatted")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  outputView === "formatted" ? "bg-white/20 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                aria-label="View formatted output"
              >
                Output
              </button>
              <button
                onClick={() => setOutputView("diff")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  outputView === "diff" ? "bg-white/20 text-white" : "bg-white/10 text-slate-200 hover:bg-white/20"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label="View diff"
                disabled={!output}
              >
                Diff
              </button>
              <label className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={explainMode}
                  onChange={(e) => setExplainMode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-400 text-slate-100 focus:ring-slate-400"
                  aria-label="Explain mode"
                />
                Explain
              </label>
              {isFormatting ? (
                <button
                  onClick={cancelFormat}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  aria-label="Cancel formatting"
                >
                  Cancel
                </button>
              ) : null}
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy formatted SQL"
              >
                {copiedOutput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedOutput ? "Copied output" : "Copy Output"}
              </button>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy output as Markdown code block"
              >
                Copy Markdown
              </button>
              <button
                onClick={() => handleDownload("sql")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download formatted SQL"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              <button
                onClick={() => handleDownload("txt")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download formatted text"
              >
                <Download className="h-4 w-4" /> TXT
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-label="Formatted SQL output"
          >
            {output && outputView === "formatted" ? (
              <div className="grid grid-cols-[auto_1fr] gap-x-4">
                <div className="text-right text-xs text-slate-500">
                  {highlightedLines.map((_, idx) => (
                    <div key={`line-${idx}`} className="select-none">
                      {idx + 1}
                    </div>
                  ))}
                </div>
                <div className="text-slate-100">
                  {highlightedLines.map((line, idx) => (
                    <div
                      key={`code-${idx}`}
                      className={wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"}
                      dangerouslySetInnerHTML={{ __html: line }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {output && outputView === "diff" ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Input</p>
                    <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                      {diffLines.map((line, idx) => (
                        <div key={`left-${idx}`} className="contents">
                          <div
                            className={`text-right text-slate-500 ${line.type === "remove" ? "text-rose-300" : ""}`}
                          >
                            {line.leftLine ?? ""}
                          </div>
                          <div
                            className={`${
                              line.type === "remove" ? "bg-rose-500/15 text-rose-100" : "text-slate-100"
                            } ${wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}
                            dangerouslySetInnerHTML={{
                              __html: line.leftText ? highlightLine(line.leftText) : "&nbsp;",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Output</p>
                    <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-xs">
                      {diffLines.map((line, idx) => (
                        <div key={`right-${idx}`} className="contents">
                          <div
                            className={`text-right text-slate-500 ${line.type === "add" ? "text-emerald-300" : ""}`}
                          >
                            {line.rightLine ?? ""}
                          </div>
                          <div
                            className={`${
                              line.type === "add" ? "bg-emerald-500/15 text-emerald-100" : "text-slate-100"
                            } ${wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"}`}
                            dangerouslySetInnerHTML={{
                              __html: line.rightText ? highlightLine(line.rightText) : "&nbsp;",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {!output ? (
              <pre className="text-sm text-slate-400">
                {isFormatting ? "Formatting..." : "Formatted SQL will appear here."}
              </pre>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste SQL, pick a dialect, and choose Prettify or Minify (Cmd/Ctrl+Enter formats).</li>
          <li>Enable multi-statement formatting to split and format batches.</li>
          <li>Export as SQL/TXT, or copy output as Markdown (Cmd/Ctrl+Shift+C).</li>
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
