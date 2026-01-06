"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import {
  buildQueryString,
  diffParsed,
  normalizeQueryString,
  parseQuery,
  toPathRows,
  type DiffResult,
  type Options,
  type ParsedValue,
} from "@/lib/queryToJson";

type ParseError = {
  message: string;
  index?: number;
  snippet?: string;
};

const defaultQuery = "name=Jane&name=John&role=engineer&team=platform&offset=10";
const defaultDiffQuery = "name=Jane&role=engineer&team=platform&offset=10";
const lengthWarningLimit = 5000;
const maxInputLength = 100000;
const hugeInputLimit = 20000;

const formatValueForSearch = (value: ParsedValue) =>
  typeof value === "string" ? value : JSON.stringify(value);

const buildSnippet = (input: string, index: number) => {
  const start = Math.max(0, index - 12);
  const end = Math.min(input.length, index + 12);
  const snippet = input.slice(start, end);
  const marker = " ".repeat(index - start) + "^";
  return `${snippet}\n${marker}`;
};

const buildTypeDefinition = (value: ParsedValue, name = "QueryData") => {
  const isIdentifier = (key: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
  const indent = (depth: number) => "  ".repeat(depth);

  const typeForValue = (val: ParsedValue, depth: number): string => {
    if (val === null) return "null";
    if (typeof val === "string") return "string";
    if (typeof val === "number") return "number";
    if (typeof val === "boolean") return "boolean";
    if (Array.isArray(val)) {
      if (val.length === 0) return "unknown[]";
      const types = Array.from(new Set(val.map((item) => typeForValue(item, depth + 1)))).sort();
      return types.length === 1 ? `${types[0]}[]` : `(${types.join(" | ")})[]`;
    }
    const record = val as Record<string, ParsedValue>;
    const keys = Object.keys(record).sort();
    if (!keys.length) return "{}";
    const lines = keys.map((key) => {
      const keyName = isIdentifier(key) ? key : JSON.stringify(key);
      return `${indent(depth + 1)}${keyName}: ${typeForValue(record[key], depth + 1)};`;
    });
    return `{\n${lines.join("\n")}\n${indent(depth)}}`;
  };

  return `export type ${name} = ${typeForValue(value, 0)};`;
};

const buildPostmanEnvironment = (parsed: ParsedValue, name: string) => {
  const rows = toPathRows(parsed);
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    values: rows.map((row) => ({
      key: row.path,
      value: row.value,
      type: "default",
      enabled: true,
    })),
    _postman_variable_scope: "environment",
    _postman_exported_at: now,
    _postman_exported_using: "QueryToJson",
  };
};

const encodeShareState = (state: {
  input: string;
  diffInput: string;
  options: Options;
  viewMode: "single" | "diff" | "reverse";
  outputView: "json" | "table" | "query" | "paths";
  filter: string;
  filterMode: "text" | "regex";
}) => `#q=${encodeURIComponent(JSON.stringify(state))}`;

const decodeShareState = (hash: string) => {
  if (!hash.startsWith("#q=")) return null;
  try {
    return JSON.parse(decodeURIComponent(hash.slice(3)));
  } catch {
    return null;
  }
};

const encodeQueryComponent = (value: string, plusAsSpace: boolean) => {
  const encoded = encodeURIComponent(value);
  return plusAsSpace ? encoded.replace(/%20/g, "+") : encoded;
};

const buildFlatQueryString = (rows: Array<{ key: string; value: string }>, plusAsSpace: boolean) =>
  rows
    .map((row) => `${encodeQueryComponent(row.key, plusAsSpace)}=${encodeQueryComponent(row.value, plusAsSpace)}`)
    .join("&");
export default function QueryToJsonClient() {
  const [input, setInput] = useState(defaultQuery);
  const [diffInput, setDiffInput] = useState(defaultDiffQuery);
  const [options, setOptions] = useState<Options>({
    decode: true,
    mode: "arrays",
    sort: false,
    pretty: true,
    keyMode: "nested",
    inferTypes: false,
    plusAsSpace: true,
  });
  const [viewMode, setViewMode] = useState<"single" | "diff" | "reverse">("single");
  const [parsed, setParsed] = useState<ParsedValue | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<ParseError | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedTypes, setCopiedTypes] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState<"text" | "regex">("text");
  const [outputView, setOutputView] = useState<"json" | "table" | "query" | "paths">("json");

  const status = useMemo(() => {
    if (error) return error.message;
    if (copyError) return copyError;
    if (diffResult) return "Diff ready";
    if (parsed) return "Parsed successfully";
    return "Awaiting input";
  }, [copyError, error, parsed, diffResult]);

  const lengthWarning = useMemo(() => {
    if (viewMode === "diff") {
      const leftSize = input.trim().length;
      const rightSize = diffInput.trim().length;
      return leftSize > lengthWarningLimit || rightSize > lengthWarningLimit
        ? "Large input detected; parsing may be slower on this device."
        : "";
    }
    if (viewMode === "reverse") {
      const size = input.trim().length;
      return size > lengthWarningLimit ? "Large input detected; parsing may be slower on this device." : "";
    }
    if (!input.trim()) return "";
    return input.trim().length > lengthWarningLimit
      ? "Large input detected; parsing may be slower on this device."
      : "";
  }, [diffInput, input, viewMode]);

  const hugeInputWarning = useMemo(() => {
    const size = viewMode === "diff" ? Math.max(input.trim().length, diffInput.trim().length) : input.trim().length;
    return size > hugeInputLimit ? "Pretty output is disabled for very large inputs." : "";
  }, [diffInput, input, viewMode]);

  const reconstructedQuery = useMemo(() => {
    if (!parsed || viewMode === "diff") return "";
    if (options.keyMode === "flat") {
      const rows = toPathRows(parsed).map((row) => ({ key: row.path, value: row.value }));
      return buildFlatQueryString(rows, options.plusAsSpace);
    }
    return buildQueryString(parsed, options.plusAsSpace);
  }, [options.keyMode, options.plusAsSpace, parsed, viewMode]);

  const output = useMemo(() => {
    if (viewMode === "diff") {
      if (!diffResult) return "";
      return options.pretty ? JSON.stringify(diffResult, null, 2) : JSON.stringify(diffResult);
    }
    if (viewMode === "reverse") {
      if (!reconstructedQuery) return "";
      return reconstructedQuery;
    }
    if (!parsed) return "";
    return options.pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
  }, [diffResult, parsed, options.pretty, reconstructedQuery, viewMode]);

  const handleParse = () => {
    try {
      if (viewMode === "diff") {
        const leftSize = input.trim().length;
        const rightSize = diffInput.trim().length;
        if (leftSize > maxInputLength || rightSize > maxInputLength) {
          throw new Error("Input too long. Please keep each query under 100k characters.");
        }
      } else if (input.trim().length > maxInputLength) {
        throw new Error("Input too long. Please keep the payload under 100k characters.");
      }
      if (viewMode === "diff") {
        const left = parseQuery(input, options);
        const right = parseQuery(diffInput, options);
        setDiffResult(diffParsed(left, right));
        setParsed(null);
        setError(null);
        return;
      }
      if (viewMode === "reverse") {
        const trimmed = input.trim();
        if (!trimmed) throw new Error("Enter JSON to convert.");
        const jsonValue = JSON.parse(trimmed) as ParsedValue;
        if (jsonValue === null || (typeof jsonValue !== "object" && !Array.isArray(jsonValue))) {
          throw new Error("JSON must be an object or array.");
        }
        setParsed(jsonValue);
        setDiffResult(null);
        setError(null);
        return;
      }
      const parsedSingle = parseQuery(input, options);
      setParsed(parsedSingle);
      setDiffResult(null);
      setError(null);
    } catch (err: any) {
      const meta = err?.meta as ParseError | undefined;
      if (meta && !meta.message) {
        meta.message = err?.message || "Unable to parse query string.";
      }
      if (meta?.index !== undefined && !meta.snippet) {
        meta.snippet = buildSnippet(input.trim(), meta.index);
      }
      setError(
        meta ?? {
          message: err?.message || "Unable to parse query string.",
        },
      );
      setParsed(null);
      setDiffResult(null);
    }
  };

  const handleCopy = async (text: string, setFlag: (v: boolean) => void) => {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 1200);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const fallbackOk = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (fallbackOk) {
        setFlag(true);
        setTimeout(() => setFlag(false), 1200);
      } else {
        console.error("Copy failed", err);
        setCopyError("Copy failed — press Ctrl/Cmd+C.");
        setTimeout(() => setCopyError(""), 2000);
      }
    }
  };

  const downloadJson = () => {
    if (!output || viewMode === "reverse") return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRaw = () => {
    if (viewMode === "reverse") {
      if (!output) return;
      const blob = new Blob([output], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "query.txt";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const trimmed = input.trim();
    if (!trimmed) return;
    const qs = trimmed.includes("?") ? trimmed.slice(trimmed.indexOf("?") + 1) : trimmed;
    const blob = new Blob([qs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEntries = useMemo(() => {
    if (!parsed || viewMode !== "single" || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const entries = Object.entries(parsed as Record<string, ParsedValue>);
    if (!filter.trim()) return entries;
    const f = filter.toLowerCase();
    if (filterMode === "regex") {
      let regex: RegExp;
      try {
        regex = new RegExp(filter, "i");
      } catch {
        return [];
      }
      return entries.filter(([k, v]) => regex.test(k) || regex.test(formatValueForSearch(v)));
    }
    return entries.filter(([k, v]) => {
      if (k.toLowerCase().includes(f)) return true;
      return formatValueForSearch(v).toLowerCase().includes(f);
    });
  }, [parsed, filter, filterMode, viewMode]);

  const filterError = useMemo(() => {
    if (filterMode !== "regex" || !filter.trim()) return "";
    try {
      new RegExp(filter, "i");
      return "";
    } catch {
      return "Invalid regex pattern.";
    }
  }, [filter, filterMode]);

  const tableRows = useMemo(() => {
    if (!parsed || viewMode !== "single") return [];
    const rows = toPathRows(parsed).map(({ path, value }) => ({
      key: path,
      value,
    }));
    if (!filter.trim()) return rows;
    if (filterMode === "regex") {
      let regex: RegExp;
      try {
        regex = new RegExp(filter, "i");
      } catch {
        return [];
      }
      return rows.filter((row) => regex.test(row.key) || regex.test(row.value));
    }
    const f = filter.toLowerCase();
    return rows.filter((row) => row.key.toLowerCase().includes(f) || row.value.toLowerCase().includes(f));
  }, [filter, filterMode, parsed, viewMode]);

  const pathRows = useMemo(() => {
    if (!parsed || viewMode !== "single") return [];
    const rows = toPathRows(parsed);
    if (!filter.trim()) return rows;
    if (filterMode === "regex") {
      let regex: RegExp;
      try {
        regex = new RegExp(filter, "i");
      } catch {
        return [];
      }
      return rows.filter((row) => regex.test(row.path) || regex.test(row.value));
    }
    const f = filter.toLowerCase();
    return rows.filter((row) => row.path.toLowerCase().includes(f) || row.value.toLowerCase().includes(f));
  }, [filter, filterMode, parsed, viewMode]);

  const copyTable = async () => {
    if (!tableRows.length) return;
    const lines = tableRows.map((row) => `${row.key}: ${row.value}`);
    await handleCopy(lines.join("\n"), setCopied);
  };

  const applyNormalize = (actions: {
    removeTracking?: boolean;
    sortKeys?: boolean;
    removeEmpty?: boolean;
    dedupeValues?: boolean;
  }) => {
    const next = normalizeQueryString(input, options, actions);
    setInput(next);
    setParsed(null);
    setDiffResult(null);
    setError(null);
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const state = {
      input,
      diffInput,
      options,
      viewMode,
      outputView,
      filter,
      filterMode,
    };
    const hash = encodeShareState(state);
    window.history.replaceState(null, "", hash);
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    await handleCopy(url, setCopiedShare);
  };

  const useCurrentUrl = () => {
    if (typeof window === "undefined") return;
    const href = window.location.href.split("#")[0];
    setInput(href);
    setViewMode("single");
    setParsed(null);
    setDiffResult(null);
    setError(null);
  };

  const downloadPostman = () => {
    if (!parsed || viewMode !== "single") return;
    const payload = JSON.stringify(buildPostmanEnvironment(parsed, "QueryToJson"), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "postman-environment.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyTypes = async () => {
    if (!parsed || viewMode !== "single") return;
    const types = buildTypeDefinition(parsed);
    await handleCopy(types, setCopiedTypes);
  };

  useEffect(() => {
    if (!hugeInputWarning) return;
    setOptions((prev) => (prev.pretty ? { ...prev, pretty: false } : prev));
  }, [hugeInputWarning]);

  useEffect(() => {
    if (viewMode === "reverse") {
      setOutputView("query");
      setFilter("");
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const decoded = decodeShareState(window.location.hash);
    if (!decoded) return;
    setInput(decoded.input ?? defaultQuery);
    setDiffInput(decoded.diffInput ?? defaultDiffQuery);
    setOptions((prev) => ({ ...prev, ...(decoded.options ?? {}) }));
    setViewMode(decoded.viewMode ?? "single");
    setOutputView(decoded.outputView ?? "json");
    setFilter(decoded.filter ?? "");
    setFilterMode(decoded.filterMode ?? "text");
  }, []);

  useEffect(() => {
    if (viewMode === "diff") {
      if (!input.trim() || !diffInput.trim()) return;
    } else if (!input.trim()) {
      return;
    }
    const timeout = setTimeout(() => {
      handleParse();
    }, 320);
    return () => clearTimeout(timeout);
  }, [diffInput, input, options, viewMode]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""} {copiedInput ? "Copied input" : ""} {copiedShare ? "Copied share link" : ""}{" "}
        {copiedTypes ? "Copied types" : ""}
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
              Query to JSON
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Query String → JSON</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Paste a full URL or query string and convert query parameters into structured JSON. Runs entirely in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-medium text-slate-700">Mode:</span>
            <button
              type="button"
              onClick={() => setViewMode("single")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                viewMode === "single"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-200 hover:-translate-y-0.5"
              }`}
              aria-pressed={viewMode === "single"}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setViewMode("diff")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                viewMode === "diff"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-200 hover:-translate-y-0.5"
              }`}
              aria-pressed={viewMode === "diff"}
            >
              Diff
            </button>
            <button
              type="button"
              onClick={() => setViewMode("reverse")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                viewMode === "reverse"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-200 hover:-translate-y-0.5"
              }`}
              aria-pressed={viewMode === "reverse"}
            >
              Reverse
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.decode}
                onChange={() => setOptions((prev) => ({ ...prev, decode: !prev.decode }))}
                aria-label="Decode percent-encoding"
                disabled={viewMode === "reverse"}
              />
              Decode
            </label>
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              Keep duplicates as:
              <select
                value={options.mode}
                onChange={(e) => setOptions((prev) => ({ ...prev, mode: e.target.value as Options["mode"] }))}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Duplicate key handling"
                disabled={viewMode === "reverse"}
              >
                <option value="arrays">Arrays (all values)</option>
                <option value="first">First value only</option>
                <option value="last">Last value</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs sm:text-sm">
              Keys:
              <select
                value={options.keyMode}
                onChange={(e) => setOptions((prev) => ({ ...prev, keyMode: e.target.value as Options["keyMode"] }))}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Key parsing mode"
              >
                <option value="flat">Flat keys</option>
                <option value="nested">Nested (bracket syntax)</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.sort}
                onChange={() => setOptions((prev) => ({ ...prev, sort: !prev.sort }))}
                aria-label="Sort keys"
                disabled={viewMode === "reverse"}
              />
              Sort keys
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.pretty}
                onChange={() => setOptions((prev) => ({ ...prev, pretty: !prev.pretty }))}
                aria-label="Pretty JSON"
                disabled={viewMode === "reverse" || !!hugeInputWarning}
              />
              Pretty JSON
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.inferTypes}
                onChange={() => setOptions((prev) => ({ ...prev, inferTypes: !prev.inferTypes }))}
                aria-label="Type inference"
                disabled={!options.decode || viewMode === "reverse"}
              />
              Type inference
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.plusAsSpace}
                onChange={() => setOptions((prev) => ({ ...prev, plusAsSpace: !prev.plusAsSpace }))}
                aria-label="Treat plus as space"
              />
              Treat + as space
            </label>
            <button
              onClick={() => {
                setInput(defaultQuery);
                setDiffInput(defaultDiffQuery);
                setOptions({
                  decode: true,
                  mode: "arrays",
                  sort: false,
                  pretty: true,
                  keyMode: "nested",
                  inferTypes: false,
                  plusAsSpace: true,
                });
                setViewMode("single");
                setParsed(null);
                setDiffResult(null);
                setError(null);
                setCopied(false);
                setCopiedInput(false);
                setCopiedShare(false);
                setCopiedTypes(false);
                setFilter("");
                setFilterMode("text");
                setOutputView("json");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset inputs"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          {viewMode === "single" ? (
            <textarea
              className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste a full URL or query string (e.g., https://example.com?foo=1&bar=2)"
              aria-label="Query string input"
            />
          ) : viewMode === "diff" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Query A</span>
                <textarea
                  className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste the first URL or query string"
                  aria-label="First query input"
                />
              </label>
              <label className="space-y-1 text-sm text-slate-700">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Query B</span>
                <textarea
                  className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={diffInput}
                  onChange={(event) => setDiffInput(event.target.value)}
                  placeholder="Paste the second URL or query string"
                  aria-label="Second query input"
                />
              </label>
            </div>
          ) : (
            <textarea
              className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder='Paste JSON to convert (e.g., {"user":{"name":"Jane"}})'
              aria-label="JSON input"
            />
          )}
          {viewMode === "single" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Normalize:</span>
              <button
                type="button"
                onClick={() => applyNormalize({ removeTracking: true })}
                className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Remove tracking params
              </button>
              <button
                type="button"
                onClick={() => applyNormalize({ sortKeys: true })}
                className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sort keys + stable output
              </button>
              <button
                type="button"
                onClick={() => applyNormalize({ removeEmpty: true })}
                className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Remove empty values
              </button>
              <button
                type="button"
                onClick={() => applyNormalize({ dedupeValues: true })}
                className="rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Deduplicate array values
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <button
              onClick={() => {
                setInput(defaultQuery);
                setDiffInput(defaultDiffQuery);
                setError(null);
                setParsed(null);
                setDiffResult(null);
                setCopied(false);
                setCopiedInput(false);
                setCopiedShare(false);
                setCopiedTypes(false);
                setFilter("");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Sample
            </button>
            {viewMode === "single" ? (
              <button
                onClick={useCurrentUrl}
                className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                Use current URL
              </button>
            ) : null}
            <button
              onClick={() => handleCopy(input, setCopiedInput)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy input"
            >
              {copiedInput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedInput ? "Copied input" : "Copy input"}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy shareable link"
            >
              {copiedShare ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedShare ? "Copied link" : "Share link"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <button
              onClick={handleParse}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-50"
              aria-label="Parse query to JSON"
              disabled={!input.trim() || (viewMode === "diff" && !diffInput.trim())}
            >
              {viewMode === "reverse" ? "Convert" : "Parse"}
            </button>
            {error ? (
              <p className="text-sm font-medium text-amber-600">{error.message}</p>
            ) : (
              <p className="text-sm text-slate-600">{status}</p>
            )}
          </div>
          {!error && lengthWarning ? <p className="text-xs text-amber-600">{lengthWarning}</p> : null}
          {!error && hugeInputWarning ? <p className="text-xs text-amber-600">{hugeInputWarning}</p> : null}
          {error?.snippet ? (
            <pre className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {error.snippet}
            </pre>
          ) : null}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="query-json-heading">
              {viewMode === "diff" ? "Diff Output" : viewMode === "reverse" ? "Query Output" : "JSON Output"}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(output, setCopied)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy JSON"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={downloadJson}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output || viewMode === "reverse"}
                aria-label="Download JSON"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              <button
                onClick={copyTypes}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!parsed || viewMode !== "single"}
                aria-label="Copy TypeScript types"
              >
                {copiedTypes ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copiedTypes ? "Types copied" : "TS types"}
              </button>
              <button
                onClick={downloadPostman}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!parsed || viewMode !== "single"}
                aria-label="Download Postman environment"
              >
                <Download className="h-4 w-4" /> Postman
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-300">
            {viewMode === "single" ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 text-[11px]">
                  {(["json", "table", "query", "paths"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setOutputView(tab)}
                      className={`rounded-full px-2 py-1 transition ${
                        outputView === tab ? "bg-white/20 text-white" : "text-slate-300 hover:text-white"
                      }`}
                      aria-pressed={outputView === tab}
                    >
                      {tab === "json" ? "JSON" : tab === "table" ? "Table" : tab === "query" ? "Query" : "Paths"}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2">
                  <span className="text-slate-200">Filter</span>
                  <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder={filterMode === "regex" ? "e.g. ^utm_|platform" : "e.g. name or platform"}
                    aria-label="Filter keys and values"
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-600 text-slate-200 focus:ring-slate-500"
                    checked={filterMode === "regex"}
                    onChange={() => setFilterMode((prev) => (prev === "regex" ? "text" : "regex"))}
                    aria-label="Use regex filter"
                  />
                  Regex
                </label>
                {filterError ? <span className="text-amber-300">{filterError}</span> : null}
              </div>
            ) : (
              <span className="text-slate-400">Filter disabled in diff/reverse mode.</span>
            )}
            <span>{status}</span>
          </div>
          {viewMode === "single" && outputView === "paths" ? (
            <div
              className="flex-1 overflow-auto p-4 text-sm text-slate-100"
              role="region"
              aria-labelledby="query-json-heading"
            >
              {pathRows.length ? (
                <div className="flex flex-col gap-2">
                  {pathRows.map((row) => (
                    <button
                      key={`${row.path}-${row.value}`}
                      type="button"
                      onClick={() => handleCopy(row.path, setCopied)}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                      aria-label={`Copy path ${row.path}`}
                    >
                      <span className="text-slate-100">{row.path}</span>
                      <span className="text-xs text-slate-300">{row.value}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">Path view will appear here.</p>
              )}
            </div>
          ) : (
            <pre
              className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap"
              role="region"
              aria-labelledby="query-json-heading"
            >
              {output ? (
                viewMode === "single" && outputView === "table" ? (
                  tableRows.length ? (
                    tableRows.map((row) => `${row.key}: ${row.value}`).join("\n")
                  ) : (
                    "No matches for current filter."
                  )
                ) : viewMode === "single" && outputView === "query" ? (
                  reconstructedQuery || "Reconstructed query will appear here."
                ) : viewMode === "single" && filter.trim() ? (
                  JSON.stringify(Object.fromEntries(filteredEntries), null, 2)
                ) : (
                  output
                )
              ) : viewMode === "diff" ? (
                "Diff output will appear here."
              ) : viewMode === "reverse" ? (
                "Query output will appear here."
              ) : (
                "Parsed JSON will appear here."
              )}
            </pre>
          )}
          <div className="flex items-center gap-2 border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
            <button
              onClick={copyTable}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={viewMode !== "single" || outputView !== "table" || !tableRows.length}
              aria-label="Copy key/value table"
            >
              <Clipboard className="h-4 w-4" />
              Copy table
            </button>
            {viewMode === "single" && outputView === "paths" ? (
              <button
                onClick={async () => {
                  if (!pathRows.length) return;
                  await handleCopy(pathRows.map((row) => row.path).join("\n"), setCopied);
                }}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                aria-label="Copy paths"
                disabled={!pathRows.length}
              >
                <Clipboard className="h-4 w-4" />
                Copy paths
              </button>
            ) : null}
            <button
              onClick={downloadRaw}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={
                viewMode === "diff"
                  ? !input.trim() || !diffInput.trim()
                  : viewMode === "reverse"
                    ? !output
                    : !input.trim()
              }
              aria-label="Download raw query"
            >
              <Download className="h-4 w-4" /> Raw query
            </button>
            <span className="text-slate-400">{copied ? "Copied output" : copiedInput ? "Copied input" : ""}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste a full URL or query string and choose options (decode, arrays for duplicate keys, sort keys).</li>
          <li>Click Parse to view JSON; copy or download the result.</li>
          <li>Use the sample to see how duplicates become arrays when enabled.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Parsing happens in your browser.</p>
          <p><strong>Full URL or query string?</strong> Both work; the tool extracts the part after `?` automatically.</p>
          <p><strong>Duplicate keys?</strong> Keep the first value or group into arrays using the toggle.</p>
        </div>
      </div>
    </main>
  );
}
