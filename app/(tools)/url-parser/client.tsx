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
              URL Parser
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Free Online URL Parser & Decoder
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-slate-700">
          Parse and decode URLs instantly in your browser. Extract{" "}
          <strong className="font-semibold text-slate-900">protocol</strong>,{" "}
          <strong className="font-semibold text-slate-900">hostname</strong>,{" "}
          <strong className="font-semibold text-slate-900">path</strong>,{" "}
          <strong className="font-semibold text-slate-900">query parameters</strong>, and{" "}
          <strong className="font-semibold text-slate-900">fragments</strong>. Export to JSON or CSV.{" "}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            100% Private
          </span>{" "}
          – All processing happens locally; no data is sent to servers.
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
        <article className="grid gap-4 lg:grid-cols-2" role="region" aria-label="Parsed URL details">
          <section
            className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
            aria-labelledby="url-components-heading"
          >
            <h2 id="url-components-heading" className="sr-only">
              URL Components
            </h2>
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
          </section>

          <section
            className="space-y-2 rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
            aria-labelledby="query-params-heading"
          >
            <h2 id="query-params-heading" className="sr-only">
              Query Parameters
            </h2>
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
          </section>
        </article>
      ) : null}

      {/* SEO-Rich Content Section */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">What is a URL Parser?</h2>
          <p className="text-base leading-relaxed text-slate-700">
            A <strong>URL parser</strong> (Uniform Resource Locator parser) is a developer tool that breaks down web
            addresses into their individual components. This free online URL decoder helps you understand the structure
            of any URL by extracting the <strong>protocol</strong> (http/https), <strong>hostname</strong> (domain
            name), <strong>port number</strong>, <strong>path</strong>, <strong>query string parameters</strong>, and{" "}
            <strong>URL fragments</strong> (hash).
          </p>
          <p className="text-base leading-relaxed text-slate-700">
            Our browser-based URL parser is essential for developers debugging API endpoints, analyzing tracking URLs,
            inspecting OAuth redirect URLs, and testing deep links. Unlike other tools that send your data to servers,
            this tool runs entirely in your browser using JavaScript's native URL API, ensuring complete privacy and
            security.
          </p>
        </div>

        <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900 mt-6">Key Features</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "Real-time URL parsing as you type",
              "Decode URL-encoded characters automatically",
              "Copy individual URL components with one click",
              "Export query parameters to JSON or CSV",
              "Toggle between decoded and raw (encoded) views",
              "Handle authentication URLs with usernames/passwords",
              "Support for duplicate query parameters",
              "100% client-side processing – no server uploads",
              "Works with http, https, and custom URL schemes",
              "Validate URL structure and format",
              "Parse URLs up to 5,000 characters",
              "Free with no limitations or sign-up required",
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Common Use Cases</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">API Development</h3>
              <p className="text-sm text-slate-700">
                Debug REST API endpoints, validate request URLs, and inspect query parameters during development and
                testing.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">Analytics & Marketing</h3>
              <p className="text-sm text-slate-700">
                Extract UTM parameters and tracking codes from campaign URLs to analyze marketing performance.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">OAuth & Authentication</h3>
              <p className="text-sm text-slate-700">
                Parse OAuth redirect URLs to extract authorization codes, access tokens, and state parameters.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">Mobile Deep Links</h3>
              <p className="text-sm text-slate-700">
                Analyze custom URL schemes and deep links for mobile applications to understand routing parameters.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Understanding URL Components</h2>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <code className="block overflow-x-auto text-sm text-slate-800">
                https://user:pass@api.example.com:8080/v1/users?status=active&sort=name#results
              </code>
            </div>
            <dl className="grid gap-3 text-sm">
              {[
                {
                  term: "Protocol",
                  definition: "https: — The communication protocol (http, https, ftp, etc.)",
                },
                {
                  term: "Username",
                  definition: "user — Optional authentication username",
                },
                {
                  term: "Password",
                  definition: "pass — Optional authentication password",
                },
                {
                  term: "Hostname",
                  definition: "api.example.com — The domain name or IP address",
                },
                {
                  term: "Port",
                  definition: "8080 — The port number (defaults to 80 for http, 443 for https)",
                },
                {
                  term: "Path",
                  definition: "/v1/users — The resource path on the server",
                },
                {
                  term: "Query String",
                  definition: "?status=active&sort=name — Key-value pairs for filtering/parameters",
                },
                {
                  term: "Fragment/Hash",
                  definition: "#results — Client-side anchor for navigation within the page",
                },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <dt className="min-w-[120px] font-semibold text-slate-900">{item.term}:</dt>
                  <dd className="text-slate-700">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Why Use Our URL Parser?</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 ring-1 ring-blue-200">
              <h3 className="font-semibold text-blue-900">🔒 Privacy First</h3>
              <p className="text-sm text-blue-800">
                All processing happens locally in your browser. Your URLs never leave your device and are never sent to
                any server.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-200">
              <h3 className="font-semibold text-emerald-900">⚡ Lightning Fast</h3>
              <p className="text-sm text-emerald-800">
                Real-time parsing with instant results as you type. No waiting, no loading delays, just immediate
                feedback.
              </p>
            </div>
            <div className="space-y-2 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-4 ring-1 ring-purple-200">
              <h3 className="font-semibold text-purple-900">💯 Completely Free</h3>
              <p className="text-sm text-purple-800">
                No sign-up required, no limitations, no ads. Parse unlimited URLs without any restrictions or payments.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 mt-6">Frequently Asked Questions</h2>
          <details className="group rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 marker:text-slate-400">
              How does URL encoding/decoding work?
            </summary>
            <p className="mt-2 text-sm text-slate-700">
              URL encoding converts special characters into a format that can be transmitted over the internet. For
              example, spaces become %20, and & becomes %26. Our tool automatically decodes these characters so you can
              see both the human-readable (decoded) and URL-safe (encoded) versions using the toggle switch.
            </p>
          </details>
          <details className="group rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 marker:text-slate-400">
              Can I use this for REST API testing?
            </summary>
            <p className="mt-2 text-sm text-slate-700">
              Absolutely! This tool is perfect for REST API development. Parse API endpoint URLs to verify query
              parameters, extract authentication tokens, validate URL structure, and debug routing issues. You can
              export query parameters as JSON for use in your API documentation or tests.
            </p>
          </details>
          <details className="group rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-semibold text-slate-900 marker:text-slate-400">
              What's the difference between a path and a query string?
            </summary>
            <p className="mt-2 text-sm text-slate-700">
              The <strong>path</strong> (e.g., /api/v1/users) specifies the resource location on the server, while the{" "}
              <strong>query string</strong> (e.g., ?status=active&sort=name) passes parameters to filter or modify that
              resource. Paths are part of the URL structure, whereas query strings are optional key-value pairs that
              start after the ? character.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
