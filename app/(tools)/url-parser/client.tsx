"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clipboard, Check, Download, RefreshCcw } from "lucide-react";

type Parsed = {
  url?: URL;
  error?: string;
};

function parseUrl(value: string): Parsed {
  try {
    const url = new URL(value);
    return { url };
  } catch {
    return { error: "Invalid URL" };
  }
}

export default function UrlParserClient() {
  const [input, setInput] = useState("https://example.com/path?foo=bar&count=2#hash");
  const [copied, setCopied] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const [showDecoded, setShowDecoded] = useState(true);
  const MAX_LEN = 5000;

  const parsed = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setWarning("Enter a URL to parse.");
      return { error: "No URL provided" };
    }
    if (trimmed.length > MAX_LEN) {
      setWarning(`URL is very long (>${MAX_LEN} chars); parsing skipped.`);
      return { error: "URL too long" };
    }
    const result = parseUrl(trimmed);
    if (result.url) {
      if (!["http:", "https:"].includes(result.url.protocol)) {
        setWarning("Non-http/https scheme detected; some links may be unsupported.");
      } else {
        setWarning("");
      }
    } else {
      setWarning("Invalid URL. Use an absolute URL starting with http(s)://");
    }
    return result;
  }, [input]);

  const params = useMemo(() => {
    if (!parsed.url) return [];
    const entries: Array<{ key: string; value: string; rawKey: string; rawValue: string }> = [];
    parsed.url.searchParams.forEach((value, key) =>
      entries.push({
        key,
        value,
        rawKey: encodeURIComponent(key),
        rawValue: encodeURIComponent(value),
      }),
    );
    return entries;
  }, [parsed]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const downloadParams = (format: "json" | "csv") => {
    if (!params.length) return;
    const data =
      format === "json"
        ? JSON.stringify(
            params.map((p) => ({
              key: showDecoded ? p.key : p.rawKey,
              value: showDecoded ? p.value : p.rawValue,
            })),
            null,
            2,
          )
        : (() => {
            const header = "key,value";
            const rows = params.map((p) => {
              const key = showDecoded ? p.key : p.rawKey;
              const val = showDecoded ? p.value : p.rawValue;
              const safe = String(val).replace(/"/g, '""');
              return `"${key}","${safe}"`;
            });
            return [header, ...rows].join("\n");
          })();
    const blob = new Blob([data], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "json" ? "params.json" : "params.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const samples: Record<string, string> = {
    basic: "https://example.com/path?foo=bar&count=2#hash",
    auth: "https://user:pass@sub.domain.com:8080/api/v1/resource?token=abc123#section",
    port: "http://localhost:3000/dashboard?view=stats&sort=desc",
    multi: "https://shop.com/products?category=books&category=fiction&q=best%20sellers&ref=nav",
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {warning || (parsed.url ? "Parsed successfully" : "Waiting for a valid URL")}
        {copied ? `Copied ${copied}` : ""}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">URL Parser</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Break down URLs into protocol, host, path, search params, and hash. Validate and copy parts quickly.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setInput("https://example.com/path?foo=bar&count=2#hash");
              setCopied(null);
              setWarning("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          {Object.entries(samples).map(([key, value]) => (
            <button
              key={key}
              onClick={() => {
                setInput(value);
                setCopied(null);
                setWarning("");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Sample: {key}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="https://example.com/path?foo=bar#hash"
          aria-label="URL input"
        />
        <div className="text-sm">
          {parsed.error ? (
            <p className="font-medium text-amber-600">{warning || parsed.error}</p>
          ) : (
            <p className="text-slate-600">URL is valid. Parsed details below.</p>
          )}
          {warning && !parsed.error ? <p className="text-amber-600">{warning}</p> : null}
        </div>
      </div>

      {parsed.url ? (
        <div className="grid gap-4 lg:grid-cols-2" role="region" aria-label="Parsed URL details">
          <div className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            {[
              { label: "Origin", value: parsed.url.origin, key: "origin" },
              { label: "Protocol", value: parsed.url.protocol, key: "protocol" },
              { label: "Username", value: parsed.url.username || "(none)", key: "username" },
              { label: "Password", value: parsed.url.password ? "•••" : "(none)", key: "password" },
              { label: "Host", value: parsed.url.host, key: "host" },
              { label: "Port", value: parsed.url.port || "(none)", key: "port" },
              { label: "Pathname", value: parsed.url.pathname || "/", key: "pathname" },
              { label: "Fragment", value: parsed.url.hash || "(none)", key: "hash" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-900 break-all">{item.value}</p>
                </div>
                <button
                  onClick={() => handleCopy(item.value, item.key)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label={`Copy ${item.label.toLowerCase()}`}
            >
              {copied === item.key ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            </button>
          </div>
            ))}
          </div>

          <div className="space-y-2 rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold">Query Params</p>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={showDecoded}
                  onChange={(e) => setShowDecoded(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-400 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
                  aria-label="Toggle decoded view"
                />
                Show decoded
              </label>
              <button
                onClick={() => handleCopy(params.map((p) => `${showDecoded ? p.key : p.rawKey}=${showDecoded ? p.value : p.rawValue}`).join("&"), "query")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!params.length}
                aria-label="Copy query string"
              >
                {copied === "query" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "query" ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => downloadParams("json")}
                className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!params.length}
                aria-label="Download params JSON"
              >
                <Download className="h-4 w-4" /> JSON
              </button>
              <button
                onClick={() => downloadParams("csv")}
                className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!params.length}
                aria-label="Download params CSV"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
            <div className="max-h-[260px] overflow-auto divide-y divide-slate-800">
              {params.length ? (
                params.map((p, idx) => {
                  const key = showDecoded ? p.key : p.rawKey;
                  const val = showDecoded ? p.value : p.rawValue;
                  return (
                    <div key={`${p.key}-${idx}`} className="px-4 py-3 text-sm leading-relaxed text-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold break-all">{key}</span>
                          <span className="text-slate-300">: {val || "(empty)"}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(`${key}=${val}`, `param-${idx}`)}
                          className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                          aria-label={`Copy param ${key}`}
                        >
                          {copied === `param-${idx}` ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-sm text-slate-300">No query params.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
