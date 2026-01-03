"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  decode: boolean;
  mode: "arrays" | "first" | "last";
  sort: boolean;
  pretty: boolean;
  keyMode: "flat" | "nested";
  inferTypes: boolean;
  plusAsSpace: boolean;
};

type ParsedValue = string | number | boolean | null | ParsedValue[] | { [key: string]: ParsedValue };
type DiffResult = {
  added: Record<string, string>;
  removed: Record<string, string>;
  changed: Record<string, { from: string; to: string }>;
};

const defaultQuery = "name=Jane&name=John&role=engineer&team=platform&offset=10";
const defaultDiffQuery = "name=Jane&role=engineer&team=platform&offset=10";
const lengthWarningLimit = 5000;

const encodeForDisplay = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");

const parseKeyParts = (key: string) => {
  const parts: string[] = [];
  const pattern = /([^[\]]+)|\[(.*?)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(key))) {
    if (match[1]) {
      parts.push(match[1]);
    } else {
      parts.push(match[2] ?? "");
    }
  }
  return parts.length ? parts : [key];
};

const isArrayToken = (part: string) => part === "" || /^\d+$/.test(part);

const applyDuplicateMode = (existing: ParsedValue | undefined, next: ParsedValue, mode: Options["mode"]) => {
  if (existing === undefined) return next;
  if (mode === "first") return existing;
  if (mode === "last") return next;
  if (Array.isArray(existing)) return [...existing, next];
  return [existing, next];
};

const setNestedValue = (
  root: Record<string, ParsedValue>,
  parts: string[],
  value: ParsedValue,
  mode: Options["mode"],
) => {
  let current: ParsedValue = root;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    const nextPart = parts[i + 1];

    if (Array.isArray(current)) {
      if (isLast) {
        if (part === "") {
          if (mode === "first" && current.length) return;
          if (mode === "last" && current.length) {
            current[current.length - 1] = value;
          } else {
            current.push(value);
          }
        } else {
          const index = Number(part);
          current[index] = applyDuplicateMode(current[index] as ParsedValue | undefined, value, mode);
        }
        return;
      }

      const index = part === "" ? current.length : Number(part);
      const existing = current[index];
      if (!existing || typeof existing === "string") {
        current[index] = isArrayToken(nextPart) ? [] : {};
      }
      current = current[index] as ParsedValue;
      continue;
    }

    const container = current as Record<string, ParsedValue>;
    if (isLast) {
      container[part] = applyDuplicateMode(container[part], value, mode);
      return;
    }

    const existing = container[part];
    if (!existing || typeof existing === "string") {
      container[part] = isArrayToken(nextPart) ? [] : {};
    }
    current = container[part] as ParsedValue;
  }
};

const formatValueForSearch = (value: ParsedValue) =>
  typeof value === "string" ? value : JSON.stringify(value);

const extractQueryString = (input: string) => {
  const trimmed = input.trim();
  const idx = trimmed.indexOf("?");
  if (idx === -1) return { base: "", query: trimmed };
  return { base: trimmed.slice(0, idx), query: trimmed.slice(idx + 1) };
};

const normalizeQueryString = (
  input: string,
  opts: Pick<Options, "plusAsSpace">,
  actions: {
    removeTracking?: boolean;
    sortKeys?: boolean;
    removeEmpty?: boolean;
    dedupeValues?: boolean;
  },
) => {
  const { base, query } = extractQueryString(input);
  if (!query) return input;
  const qs = opts.plusAsSpace ? query : query.replace(/\+/g, "%2B");
  const params = new URLSearchParams(qs);
  const entries = Array.from(params.entries()).filter(([key, value]) => {
    if (actions.removeTracking) {
      if (key.startsWith("utm_")) return false;
      if (["gclid", "fbclid", "igshid", "mc_cid", "mc_eid", "msclkid"].includes(key)) return false;
    }
    if (actions.removeEmpty && value === "") return false;
    return true;
  });

  let normalized = entries;
  if (actions.dedupeValues) {
    const seen = new Map<string, Set<string>>();
    normalized = normalized.filter(([key, value]) => {
      const existing = seen.get(key) ?? new Set<string>();
      if (existing.has(value)) return false;
      existing.add(value);
      seen.set(key, existing);
      return true;
    });
  }

  if (actions.sortKeys) {
    normalized = [...normalized].sort(([aKey, aValue], [bKey, bValue]) => {
      const keyCompare = aKey.localeCompare(bKey);
      return keyCompare === 0 ? aValue.localeCompare(bValue) : keyCompare;
    });
  }

  const nextParams = new URLSearchParams();
  normalized.forEach(([key, value]) => nextParams.append(key, value));
  const nextQuery = opts.plusAsSpace ? nextParams.toString() : nextParams.toString().replace(/\+/g, "%2B");
  if (!nextQuery) return base || "";
  return base ? `${base}?${nextQuery}` : nextQuery;
};

const inferType = (value: string): ParsedValue => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^[+-]?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return value;
};

const stableStringify = (value: ParsedValue): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, ParsedValue>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
};

const flattenParsed = (value: ParsedValue, prefix = ""): Record<string, string> => {
  if (value === null || typeof value !== "object") {
    return { [prefix]: stableStringify(value) };
  }
  if (Array.isArray(value)) {
    return value.reduce<Record<string, string>>((acc, item, index) => {
      const nextPrefix = `${prefix}[${index}]`;
      return { ...acc, ...flattenParsed(item, nextPrefix) };
    }, {});
  }
  const record = value as Record<string, ParsedValue>;
  return Object.keys(record).sort().reduce<Record<string, string>>((acc, key) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return { ...acc, ...flattenParsed(record[key], nextPrefix) };
  }, {});
};

const diffParsed = (left: ParsedValue, right: ParsedValue): DiffResult => {
  const flatLeft = flattenParsed(left);
  const flatRight = flattenParsed(right);
  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};

  Object.keys(flatRight).forEach((key) => {
    if (!(key in flatLeft)) {
      added[key] = flatRight[key];
    } else if (flatLeft[key] !== flatRight[key]) {
      changed[key] = { from: flatLeft[key], to: flatRight[key] };
    }
  });

  Object.keys(flatLeft).forEach((key) => {
    if (!(key in flatRight)) {
      removed[key] = flatLeft[key];
    }
  });

  return { added, removed, changed };
};

function parseQuery(input: string, opts: Options) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a URL or query string.");
  const { query } = extractQueryString(trimmed);
  const qs = opts.plusAsSpace ? query : query.replace(/\+/g, "%2B");
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(qs);
  } catch {
    throw new Error("Invalid percent-encoding or malformed query string.");
  }
  const result: Record<string, ParsedValue> = {};
  params.forEach((value, key) => {
    const rawParts = parseKeyParts(key);
    const parts = opts.decode
      ? rawParts
      : rawParts.map((part) => (part === "" ? "" : encodeForDisplay(part)));
    const displayKey = opts.decode ? key : encodeForDisplay(key);
    const displayValue = opts.decode ? value : encodeForDisplay(value);
    const finalValue = opts.inferTypes && opts.decode ? inferType(value) : displayValue;
    if (opts.keyMode === "nested" && parts.length > 1) {
      setNestedValue(result, parts, finalValue, opts.mode);
      return;
    }
    result[displayKey] = applyDuplicateMode(result[displayKey], finalValue, opts.mode);
  });
  const sorted = opts.sort
    ? Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)))
    : result;
  return sorted;
}

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
  const [viewMode, setViewMode] = useState<"single" | "diff">("single");
  const [parsed, setParsed] = useState<Record<string, ParsedValue> | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [filter, setFilter] = useState("");
  const [filterMode, setFilterMode] = useState<"text" | "regex">("text");

  const status = useMemo(() => {
    if (error) return error;
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
    if (!input.trim()) return "";
    return input.trim().length > lengthWarningLimit
      ? "Large input detected; parsing may be slower on this device."
      : "";
  }, [diffInput, input, viewMode]);

  const output = useMemo(() => {
    if (viewMode === "diff") {
      if (!diffResult) return "";
      return options.pretty ? JSON.stringify(diffResult, null, 2) : JSON.stringify(diffResult);
    }
    if (!parsed) return "";
    return options.pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
  }, [diffResult, parsed, options.pretty, viewMode]);

  const handleParse = () => {
    try {
      if (viewMode === "diff") {
        const left = parseQuery(input, options);
        const right = parseQuery(diffInput, options);
        setDiffResult(diffParsed(left, right));
        setParsed(null);
        setError("");
        return;
      }
      const parsedSingle = parseQuery(input, options);
      setParsed(parsedSingle);
      setDiffResult(null);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Unable to parse query string.");
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
        setCopyError("Clipboard blocked. Use your browser menu to copy.");
        setTimeout(() => setCopyError(""), 2000);
      }
    }
  };

  const downloadJson = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRaw = () => {
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
    if (!parsed || viewMode === "diff") return [];
    const entries = Object.entries(parsed);
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

  const copyTable = async () => {
    if (!filteredEntries.length) return;
    const lines = filteredEntries.map(([k, v]) => `${k}: ${formatValueForSearch(v)}`);
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
    setError("");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""} {copiedInput ? "Copied input" : ""}
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
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.decode}
                onChange={() => setOptions((prev) => ({ ...prev, decode: !prev.decode }))}
                aria-label="Decode percent-encoding"
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
                disabled={!options.decode}
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
                setError("");
                setCopied(false);
                setCopiedInput(false);
                setFilter("");
                setFilterMode("text");
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
          ) : (
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
                setError("");
                setParsed(null);
                setDiffResult(null);
                setCopied(false);
                setCopiedInput(false);
                setFilter("");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              Sample
            </button>
            <button
              onClick={() => handleCopy(input, setCopiedInput)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Copy input"
            >
              {copiedInput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedInput ? "Copied input" : "Copy input"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <button
              onClick={handleParse}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:opacity-50"
              aria-label="Parse query to JSON"
              disabled={!input.trim() || (viewMode === "diff" && !diffInput.trim())}
            >
              Parse
            </button>
            {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}
          </div>
          {!error && lengthWarning ? <p className="text-xs text-amber-600">{lengthWarning}</p> : null}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="query-json-heading">
              {viewMode === "diff" ? "Diff Output" : "JSON Output"}
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
                disabled={!output}
                aria-label="Download JSON"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-300">
            {viewMode === "single" ? (
              <div className="flex flex-wrap items-center gap-2">
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
              <span className="text-slate-400">Filter disabled in diff mode.</span>
            )}
            <span>{status}</span>
          </div>
          <pre
            className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap"
            role="region"
            aria-labelledby="query-json-heading"
          >
            {output ? (
              viewMode === "single" && filter.trim()
                ? JSON.stringify(Object.fromEntries(filteredEntries), null, 2)
                : output
            ) : (
              "Parsed JSON will appear here."
            )}
          </pre>
          <div className="flex items-center gap-2 border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
            <button
              onClick={copyTable}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!filteredEntries.length || viewMode === "diff"}
              aria-label="Copy key/value table"
            >
              <Clipboard className="h-4 w-4" />
              Copy key/value list
            </button>
            <button
              onClick={downloadRaw}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
              disabled={!input.trim()}
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
