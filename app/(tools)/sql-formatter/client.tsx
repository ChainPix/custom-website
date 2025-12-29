"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { type KeywordCase } from "sql-formatter";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
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
  checkSemicolon: boolean;
  explainMode: boolean;
  outputView: OutputView;
  shareCompression: boolean;
};
type FormatPayload = {
  input: string;
  dialect: Dialect;
  indent: number;
  indentMode: IndentMode;
  keywordCase: KeywordCase;
  linesBetweenStatements: number;
  commaStyle: CommaStyle;
  minify: boolean;
};
type FormatResult = {
  durationMs: number;
  inputChars: number;
};
type OutputView = "formatted" | "diff";
type DiffLine = {
  type: "same" | "add" | "remove";
  leftText: string;
  rightText: string;
  leftLine?: number;
  rightLine?: number;
};
type DialectSuggestion = {
  dialect: Dialect;
  reason: string;
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

const STORAGE_KEY = "sql-formatter-state-v1";
const AUTO_FORMAT_DELAY = 400;
const FORMAT_STATUS_DELAY = 150;
const MAX_SHARE_LENGTH = 6000;

const encodeSharePayload = (payload: object, compress: boolean) => {
  const json = JSON.stringify(payload);
  if (compress) {
    return `c:${compressToEncodedURIComponent(json)}`;
  }
  return `p:${btoa(unescape(encodeURIComponent(json)))}`;
};

const decodeSharePayload = (payload: string) => {
  if (payload.startsWith("c:")) {
    const decoded = decompressFromEncodedURIComponent(payload.slice(2));
    if (!decoded) throw new Error("Invalid compressed payload");
    return JSON.parse(decoded);
  }
  if (payload.startsWith("p:")) {
    const json = decodeURIComponent(escape(atob(payload.slice(2))));
    return JSON.parse(json);
  }
  const fallback = decompressFromEncodedURIComponent(payload);
  if (fallback) return JSON.parse(fallback);
  const json = decodeURIComponent(escape(atob(payload)));
  return JSON.parse(json);
};

const detectDialectSuggestion = (sql: string): DialectSuggestion | null => {
  const normalized = sql.trim();
  if (!normalized) return null;
  const candidates: DialectSuggestion[] = [];
  const add = (dialect: Dialect, reason: string) => candidates.push({ dialect, reason });

  if (/`[^`]+`/.test(normalized) || /\bAUTO_INCREMENT\b/i.test(normalized) || /\bENGINE\s*=\s*\w+/i.test(normalized)) {
    add("mysql", "MySQL-style identifiers or AUTO_INCREMENT");
  }
  if (/\bRETURNING\b/i.test(normalized) || /\bILIKE\b/i.test(normalized) || /::\s*\w+/.test(normalized)) {
    add("postgresql", "PostgreSQL-specific syntax (RETURNING/ILIKE/::)");
  }
  if (/\bPRAGMA\b/i.test(normalized) || /\bAUTOINCREMENT\b/i.test(normalized)) {
    add("sqlite", "SQLite PRAGMA/AUTOINCREMENT");
  }
  if (/\bLIMIT\s+\d+\s*,\s*\d+/.test(normalized)) {
    add("mysql", "MySQL LIMIT offset, count");
  }

  return candidates[0] ?? null;
};

const lintSql = (sql: string, checkSemicolon: boolean) => {
  const hints: string[] = [];
  const trimmed = sql.trim();
  if (!trimmed) return hints;

  let parenBalance = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    const next = trimmed[i + 1];
    if (!inDouble && char === "'") {
      if (inSingle && next === "'") {
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && char === '"') {
      if (inDouble && next === '"') {
        i += 1;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (char === "(") parenBalance += 1;
    if (char === ")") parenBalance -= 1;
  }

  if (parenBalance !== 0) {
    hints.push("Unbalanced parentheses detected.");
  }
  if (inSingle) {
    hints.push("Unclosed single quote string.");
  }
  if (inDouble) {
    hints.push("Unclosed double quote identifier.");
  }
  if (checkSemicolon && !trimmed.endsWith(";")) {
    hints.push("Missing trailing semicolon.");
  }
  return hints;
};

const buildLineDiff = (leftText: string, rightText: string): DiffLine[] => {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const table = Array.from({ length: leftLines.length + 1 }, () => new Array(rightLines.length + 1).fill(0));

  for (let i = 1; i <= leftLines.length; i += 1) {
    for (let j = 1; j <= rightLines.length; j += 1) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = leftLines.length;
  let j = rightLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      diff.push({ type: "same", leftText: leftLines[i - 1], rightText: rightLines[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      diff.push({ type: "add", leftText: "", rightText: rightLines[j - 1] });
      j -= 1;
    } else {
      diff.push({ type: "remove", leftText: leftLines[i - 1], rightText: "" });
      i -= 1;
    }
  }

  diff.reverse();
  let leftLine = 1;
  let rightLine = 1;
  return diff.map((line) => {
    const next = { ...line };
    if (line.type === "same" || line.type === "remove") {
      next.leftLine = leftLine;
      leftLine += 1;
    }
    if (line.type === "same" || line.type === "add") {
      next.rightLine = rightLine;
      rightLine += 1;
    }
    return next;
  });
};

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
  const [shareStatus, setShareStatus] = useState("");
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
  const [checkSemicolon, setCheckSemicolon] = useState(false);
  const [explainMode, setExplainMode] = useState(false);
  const [outputView, setOutputView] = useState<OutputView>("formatted");
  const [shareCompression, setShareCompression] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const statusTimerRef = useRef<number | null>(null);
  const shareAppliedRef = useRef(false);
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

  const requestFormat = (rawInput: string, override?: Partial<FormatPayload>) => {
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
    const payload: FormatPayload = {
      input: rawInput,
      dialect: override?.dialect ?? dialect,
      indent: override?.indent ?? indent,
      indentMode: override?.indentMode ?? indentMode,
      keywordCase: override?.keywordCase ?? keywordCase,
      linesBetweenStatements: override?.linesBetweenStatements ?? linesBetweenStatements,
      commaStyle: override?.commaStyle ?? commaStyle,
      minify: override?.minify ?? minify,
    };
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
      payload,
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

  const suggestedDialect = useMemo(() => detectDialectSuggestion(input), [input]);
  const lintHints = useMemo(() => lintSql(input, checkSemicolon), [input, checkSemicolon]);
  const diffLines = useMemo(() => (output ? buildLineDiff(input, output) : []), [input, output]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("share");
    if (!shared) return;
    try {
      const decoded = decodeSharePayload(shared) as Partial<PersistedState & FormatPayload>;
      shareAppliedRef.current = true;
      resetFormattingState();
      if (decoded.input !== undefined) setInput(decoded.input);
      if (decoded.dialect) setDialect(decoded.dialect);
      if (typeof decoded.indent === "number") setIndent(decoded.indent);
      if (decoded.indentMode) setIndentMode(decoded.indentMode);
      if (decoded.keywordCase) setKeywordCase(decoded.keywordCase);
      if (typeof decoded.linesBetweenStatements === "number") setLinesBetweenStatements(decoded.linesBetweenStatements);
      if (decoded.commaStyle) setCommaStyle(decoded.commaStyle);
      if (typeof decoded.minify === "boolean") setMinify(decoded.minify);
      if (typeof decoded.wrap === "boolean") setWrap(decoded.wrap);
      if (decoded.outputPreset) setOutputPreset(decoded.outputPreset);
      if (typeof decoded.autoFormat === "boolean") setAutoFormat(decoded.autoFormat);
      if (typeof decoded.formatOnPaste === "boolean") setFormatOnPaste(decoded.formatOnPaste);
      if (typeof decoded.checkSemicolon === "boolean") setCheckSemicolon(decoded.checkSemicolon);
      if (typeof decoded.explainMode === "boolean") setExplainMode(decoded.explainMode);
      if (decoded.outputView) setOutputView(decoded.outputView);
      if (typeof decoded.shareCompression === "boolean") setShareCompression(decoded.shareCompression);
      if (decoded.input) {
        window.setTimeout(() => {
          requestFormat(decoded.input, decoded);
        }, 0);
      }
    } catch (err) {
      console.error("Share decode failed", err);
      setShareStatus("Share link invalid.");
    }
  }, []);

  useEffect(() => {
    if (shareAppliedRef.current) return;
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
      if (typeof parsed.checkSemicolon === "boolean") setCheckSemicolon(parsed.checkSemicolon);
      if (typeof parsed.explainMode === "boolean") setExplainMode(parsed.explainMode);
      if (parsed.outputView) setOutputView(parsed.outputView);
      if (typeof parsed.shareCompression === "boolean") setShareCompression(parsed.shareCompression);
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
      checkSemicolon,
      explainMode,
      outputView,
      shareCompression,
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
    checkSemicolon,
    explainMode,
    outputView,
    shareCompression,
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
    const highlighted = highlightSql(output, explainMode);
    return highlighted.split("\n").map((line) => (line.length ? line : "&nbsp;"));
  }, [output, explainMode]);

  const highlightLine = (line: string) => highlightSql(line, explainMode) || "&nbsp;";

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
    setCheckSemicolon(false);
    setExplainMode(false);
    setOutputView("formatted");
    setShareCompression(true);
    setFormatStats(null);
  };

  const cancelFormat = () => {
    if (!isFormatting) return;
    resetFormattingState();
    setFormatStatus("Canceled");
    setFormatStats(null);
  };

  const handleShareLink = async () => {
    if (!input.trim()) {
      setShareStatus("Add SQL before sharing.");
      return;
    }
    const payload: Omit<PersistedState, "output"> & FormatPayload = {
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
      checkSemicolon,
      explainMode,
      outputView,
      shareCompression,
    };
    const encoded = encodeSharePayload(payload, shareCompression);
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    if (url.length > MAX_SHARE_LENGTH) {
      setShareStatus("Share link too long. Try compression or shorten SQL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Share link copied.");
    } catch (err) {
      console.error("Share link failed", err);
      setShareStatus("Share link failed.");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {error || (isFormatting ? "Formatting SQL" : output ? "SQL formatted" : "Ready")}
        {copiedInput || copiedOutput ? "Copied" : ""}
        {shareStatus ? shareStatus : ""}
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
                setCheckSemicolon(false);
                setExplainMode(false);
                setOutputView("formatted");
                setShareCompression(true);
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
