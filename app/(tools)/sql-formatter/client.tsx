"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { type KeywordCase } from "sql-formatter";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const dialects = ["sql", "mysql", "postgresql", "sqlite", "mariadb"] as const;
type Dialect = (typeof dialects)[number];
type CommaStyle = "leading" | "trailing";
type IndentMode = "spaces" | "tabs";
type OutputPreset = "readable" | "compact" | "team" | "custom";

type PersistedState = {
  input: string;
  dialect: Dialect;
  indent: number;
  indentMode: IndentMode;
  keywordCase: KeywordCase;
  linesBetweenStatements: number;
  commaStyle: CommaStyle;
  minify: boolean;
  wrap: boolean;
  outputPreset: OutputPreset;
  autoFormat: boolean;
  formatOnPaste: boolean;
  output: string;
};
type FormatResult = {
  durationMs: number;
  inputChars: number;
};

const presetOptions: Record<
  Exclude<OutputPreset, "custom">,
  {
    label: string;
    keywordCase: KeywordCase;
    indentSize: number;
    indentMode: IndentMode;
    linesBetweenStatements: number;
    commaStyle: CommaStyle;
    minify: boolean;
    softWrap: boolean;
  }
> = {
  readable: {
    label: "Readable",
    keywordCase: "preserve",
    indentSize: 2,
    indentMode: "spaces",
    linesBetweenStatements: 1,
    commaStyle: "trailing",
    minify: false,
    softWrap: false,
  },
  compact: {
    label: "Compact",
    keywordCase: "upper",
    indentSize: 2,
    indentMode: "spaces",
    linesBetweenStatements: 0,
    commaStyle: "trailing",
    minify: false,
    softWrap: false,
  },
  team: {
    label: "Team Style",
    keywordCase: "lower",
    indentSize: 4,
    indentMode: "spaces",
    linesBetweenStatements: 1,
    commaStyle: "leading",
    minify: false,
    softWrap: false,
  },
};

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
const highlightSql = (source: string) => {
  const escaped = escapeHtml(source);
  const withStrings = escaped.replace(/'([^'\\]|\\.)*'/g, '<span class="text-amber-200">$&</span>');
  const withKeywords = withStrings.replace(
    /\b(SELECT|INSERT|INTO|VALUES|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|TABLE|VIEW|INDEX|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AND|OR|NOT|NULL|TRUE|FALSE|WITH|AS|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END)\b/gi,
    '<span class="text-violet-300">$1</span>'
  );
  return withKeywords.replace(/\b-?\d+(?:\.\d+)?\b/g, '<span class="text-sky-200">$&</span>');
};

const STORAGE_KEY = "sql-formatter-state-v1";
const AUTO_FORMAT_DELAY = 400;
const FORMAT_STATUS_DELAY = 150;

export default function SqlFormatterClient() {
  const [input, setInput] = useState("select * from users where id = 42 and status = 'active';");
  const [dialect, setDialect] = useState<Dialect>("sql");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatStatus, setFormatStatus] = useState("");
  const [formatStats, setFormatStats] = useState<FormatResult | null>(null);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [indent, setIndent] = useState(presetOptions.readable.indentSize);
  const [indentMode, setIndentMode] = useState<IndentMode>(presetOptions.readable.indentMode);
  const [keywordCase, setKeywordCase] = useState<KeywordCase>(presetOptions.readable.keywordCase);
  const [linesBetweenStatements, setLinesBetweenStatements] = useState(presetOptions.readable.linesBetweenStatements);
  const [commaStyle, setCommaStyle] = useState<CommaStyle>(presetOptions.readable.commaStyle);
  const [minify, setMinify] = useState(presetOptions.readable.minify);
  const [wrap, setWrap] = useState(presetOptions.readable.softWrap);
  const [outputPreset, setOutputPreset] = useState<OutputPreset>("readable");
  const [autoFormat, setAutoFormat] = useState(false);
  const [formatOnPaste, setFormatOnPaste] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const statusTimerRef = useRef<number | null>(null);
  const MAX_LEN = 50000;

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./sql-formatter.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type !== "result") return;
      if (message.requestId !== requestIdRef.current) return;
      setIsFormatting(false);
      setFormatStatus("");
      stopStatusTimer();
      if (message.error) {
        setOutput("");
        setFormatStats(null);
        setError("Unable to format this SQL. Check syntax or choose a different dialect.");
        return;
      }
      setOutput(message.output);
      setFormatStats({ durationMs: message.durationMs, inputChars: message.inputChars });
      setError("");
    };
    worker.onerror = (event) => {
      console.error("SQL worker error", event);
      setIsFormatting(false);
      setFormatStatus("");
      stopStatusTimer();
      setError("Unable to format this SQL. Check syntax or choose a different dialect.");
    };
    workerRef.current = worker;
    return worker;
  };

  const stopStatusTimer = () => {
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  };

  const requestFormat = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setError("");
      setOutput("");
      setFormatStats(null);
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setError("SQL is too large to format. Please shorten or split the query.");
      setOutput("");
      setFormatStats(null);
      setIsFormatting(false);
      return;
    }
    if (isFormatting) {
      workerRef.current?.terminate();
      workerRef.current = null;
    }
    const worker = ensureWorker();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsFormatting(true);
    setFormatStatus("");
    setFormatStats(null);
    stopStatusTimer();
    statusTimerRef.current = window.setTimeout(() => {
      setFormatStatus("Formatting...");
      statusTimerRef.current = null;
    }, FORMAT_STATUS_DELAY);
    setError("");
    worker.postMessage({
      type: "format",
      requestId,
      payload: {
        input: rawInput,
        dialect,
        indent,
        indentMode,
        keywordCase,
        linesBetweenStatements,
        commaStyle,
        minify,
      },
    });
  };

  const handleFormat = () => requestFormat(input);

  const handleCopy = async (value: string, setCopiedState: (next: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 1200);
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

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Partial<PersistedState>;
      if (parsed.input !== undefined) setInput(parsed.input);
      if (parsed.dialect) setDialect(parsed.dialect);
      if (typeof parsed.indent === "number") setIndent(parsed.indent);
      if (parsed.indentMode) setIndentMode(parsed.indentMode);
      if (parsed.keywordCase) setKeywordCase(parsed.keywordCase);
      if (typeof parsed.linesBetweenStatements === "number") setLinesBetweenStatements(parsed.linesBetweenStatements);
      if (parsed.commaStyle) setCommaStyle(parsed.commaStyle);
      if (typeof parsed.minify === "boolean") setMinify(parsed.minify);
      if (typeof parsed.wrap === "boolean") setWrap(parsed.wrap);
      if (parsed.outputPreset) setOutputPreset(parsed.outputPreset);
      if (typeof parsed.autoFormat === "boolean") setAutoFormat(parsed.autoFormat);
      if (typeof parsed.formatOnPaste === "boolean") setFormatOnPaste(parsed.formatOnPaste);
      if (typeof parsed.output === "string") setOutput(parsed.output);
    } catch (err) {
      console.error("Failed to restore formatter state", err);
    }
  }, []);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      stopStatusTimer();
    },
    []
  );

  useEffect(() => {
    const payload: PersistedState = {
      input,
      dialect,
      indent,
      indentMode,
      keywordCase,
      linesBetweenStatements,
      commaStyle,
      minify,
      wrap,
      outputPreset,
      autoFormat,
      formatOnPaste,
      output,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    input,
    dialect,
    indent,
    indentMode,
    keywordCase,
    linesBetweenStatements,
    commaStyle,
    minify,
    wrap,
    outputPreset,
    autoFormat,
    formatOnPaste,
    output,
  ]);

  useEffect(() => {
    if (!autoFormat) return;
    if (!input.trim()) {
      setOutput("");
      setError("");
      setFormatStats(null);
      return;
    }
    const timer = window.setTimeout(() => {
      requestFormat(input);
    }, AUTO_FORMAT_DELAY);
    return () => window.clearTimeout(timer);
  }, [autoFormat, input, dialect, indent, indentMode, keywordCase, linesBetweenStatements, commaStyle, minify]);

  const highlightedLines = useMemo(() => {
    if (!output) return [];
    const highlighted = highlightSql(output);
    return highlighted.split("\n").map((line) => (line.length ? line : "&nbsp;"));
  }, [output]);

  const resetFormattingState = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    stopStatusTimer();
    setIsFormatting(false);
    setFormatStatus("");
    requestIdRef.current += 1;
  };

  const clearState = () => {
    localStorage.removeItem(STORAGE_KEY);
    resetFormattingState();
    setInput("select * from users where id = 42 and status = 'active';");
    setOutput("");
    setError("");
    setCopiedInput(false);
    setCopiedOutput(false);
    setOutputPreset("readable");
    setKeywordCase(presetOptions.readable.keywordCase);
    setIndent(presetOptions.readable.indentSize);
    setIndentMode(presetOptions.readable.indentMode);
    setLinesBetweenStatements(presetOptions.readable.linesBetweenStatements);
    setCommaStyle(presetOptions.readable.commaStyle);
    setMinify(presetOptions.readable.minify);
    setWrap(presetOptions.readable.softWrap);
    setAutoFormat(false);
    setFormatOnPaste(false);
    setFormatStats(null);
  };

  const cancelFormat = () => {
    if (!isFormatting) return;
    resetFormattingState();
    setFormatStatus("Canceled");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {error || (isFormatting ? "Formatting SQL" : output ? "SQL formatted" : "Ready")}
        {copiedInput || copiedOutput ? "Copied" : ""}
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
                checked={minify}
                onChange={(e) => {
                  setMinify(e.target.checked);
                  setOutputPreset("custom");
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Minify SQL"
              />
              Minify SQL
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
            <button
              onClick={handleFormat}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              aria-label="Format SQL"
            >
              Format
            </button>
            <button
              onClick={() => {
                resetFormattingState();
                setInput("select * from users where id = 42 and status = 'active';");
                setOutput("");
                setError("");
                setCopiedInput(false);
                setCopiedOutput(false);
                setOutputPreset("readable");
                setKeywordCase(presetOptions.readable.keywordCase);
                setIndent(presetOptions.readable.indentSize);
                setIndentMode(presetOptions.readable.indentMode);
                setLinesBetweenStatements(presetOptions.readable.linesBetweenStatements);
                setCommaStyle(presetOptions.readable.commaStyle);
                setMinify(presetOptions.readable.minify);
                setWrap(presetOptions.readable.softWrap);
              }}
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
            className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
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
                  setCopiedInput(false);
                  setCopiedOutput(false);
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
            <button
              onClick={() => handleCopy(input, setCopiedInput)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy input SQL"
            >
              {copiedInput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedInput ? "Copied input" : "Copy Input"}
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
                onClick={() => handleCopy(output, setCopiedOutput)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy formatted SQL"
              >
                {copiedOutput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedOutput ? "Copied output" : "Copy Output"}
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
          </div>
          <div
            className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-label="Formatted SQL output"
          >
            {output ? (
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
            ) : (
              <pre className="text-sm text-slate-400">
                {isFormatting ? "Formatting..." : "Formatted SQL will appear here."}
              </pre>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste SQL, pick a dialect, and apply a preset or customize case/indent/comma style.</li>
          <li>Adjust line spacing, minify, or use soft wrap for easier review.</li>
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
