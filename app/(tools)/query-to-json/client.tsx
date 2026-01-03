"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  decode: boolean;
  mode: "arrays" | "first" | "last";
  sort: boolean;
  pretty: boolean;
};

const defaultQuery = "name=Jane&name=John&role=engineer&team=platform&offset=10";

const encodeForDisplay = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");

function parseQuery(input: string, opts: Options) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a URL or query string.");
  if (trimmed.length > 5000) throw new Error("Input too long. Please shorten the query string.");
  const qs = trimmed.includes("?") ? trimmed.slice(trimmed.indexOf("?") + 1) : trimmed;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(qs);
  } catch {
    throw new Error("Invalid percent-encoding or malformed query string.");
  }
  const result: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    const k = opts.decode ? key : encodeForDisplay(key);
    const v = opts.decode ? value : encodeForDisplay(value);
    if (opts.mode === "arrays") {
      if (!result[k]) result[k] = [];
      (result[k] as string[]).push(v);
    } else if (opts.mode === "first") {
      if (!(k in result)) {
        result[k] = v;
      }
    } else {
      result[k] = v;
    }
  });
  const sorted = opts.sort
    ? Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)))
    : result;
  return sorted;
}

export default function QueryToJsonClient() {
  const [input, setInput] = useState(defaultQuery);
  const [options, setOptions] = useState<Options>({ decode: true, mode: "arrays", sort: false, pretty: true });
  const [parsed, setParsed] = useState<Record<string, string | string[]> | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [filter, setFilter] = useState("");

  const status = useMemo(() => {
    if (error) return error;
    if (parsed) return "Parsed successfully";
    return "Awaiting input";
  }, [error, parsed]);

  const output = useMemo(() => {
    if (!parsed) return "";
    return options.pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
  }, [parsed, options.pretty]);

  const handleParse = () => {
    try {
      const parsed = parseQuery(input, options);
      setParsed(parsed);
      setError("");
    } catch (err: any) {
      setError(err?.message || "Unable to parse query string.");
      setParsed(null);
    }
  };

  const handleCopy = async (text: string, setFlag: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
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
    if (!parsed) return [];
    const entries = Object.entries(parsed);
    if (!filter.trim()) return entries;
    const f = filter.toLowerCase();
    return entries.filter(([k]) => k.toLowerCase().includes(f));
  }, [parsed, filter]);

  const copyTable = async () => {
    if (!filteredEntries.length) return;
    const lines = filteredEntries.map(([k, v]) => (Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${v}`));
    await handleCopy(lines.join("\n"), setCopied);
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
            <button
              onClick={() => {
                setInput(defaultQuery);
                setOptions({ decode: true, mode: "arrays", sort: false, pretty: true });
                setParsed(null);
                setError("");
                setCopied(false);
                setCopiedInput(false);
                setFilter("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset inputs"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          <textarea
            className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste a full URL or query string (e.g., https://example.com?foo=1&bar=2)"
            aria-label="Query string input"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <button
              onClick={() => {
                setInput(defaultQuery);
                setError("");
                setParsed(null);
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
              disabled={!input.trim()}
            >
              Parse
            </button>
            {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="query-json-heading">
              JSON Output
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
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span className="text-slate-200">Filter keys</span>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="e.g. name"
                  aria-label="Filter keys"
                />
              </label>
            </div>
            <span>{status}</span>
          </div>
          <pre
            className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap"
            role="region"
            aria-labelledby="query-json-heading"
          >
            {output ? (
              filter.trim()
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
              disabled={!filteredEntries.length}
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
