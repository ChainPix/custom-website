"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clipboard, Check, RefreshCcw } from "lucide-react";

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
  const [copied, setCopied] = useState<"query" | null>(null);

  const parsed = useMemo(() => parseUrl(input), [input]);

  const params = useMemo(() => {
    if (!parsed.url) return [];
    const entries: Array<{ key: string; value: string }> = [];
    parsed.url.searchParams.forEach((value, key) => entries.push({ key, value }));
    return entries;
  }, [parsed]);

  const handleCopy = async (text: string, key: "query") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
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
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="https://example.com/path?foo=bar#hash"
        />
        {parsed.error ? (
          <p className="text-sm font-medium text-amber-600">{parsed.error}</p>
        ) : (
          <p className="text-sm text-slate-600">URL is valid. Parsed details below.</p>
        )}
      </div>

      {parsed.url ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Protocol</p>
            <p className="text-sm font-semibold text-slate-900">{parsed.url.protocol}</p>

            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Host</p>
            <p className="text-sm font-semibold text-slate-900">{parsed.url.host}</p>

            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pathname</p>
            <p className="text-sm font-semibold text-slate-900">{parsed.url.pathname}</p>

            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Hash</p>
            <p className="text-sm font-semibold text-slate-900">{parsed.url.hash || "(none)"}</p>
          </div>

          <div className="space-y-2 rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold">Query Params</p>
              <button
                onClick={() =>
                  handleCopy(
                    params.map((p) => `${p.key}=${p.value}`).join("&"),
                    "query",
                  )
                }
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!params.length}
              >
                {copied === "query" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "query" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="max-h-[220px] overflow-auto divide-y divide-slate-800">
              {params.length ? (
                params.map((p, idx) => (
                  <div key={`${p.key}-${idx}`} className="px-4 py-3 text-sm leading-relaxed text-slate-100">
                    <span className="font-semibold">{p.key}</span>: {p.value || "(empty)"}
                  </div>
                ))
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
