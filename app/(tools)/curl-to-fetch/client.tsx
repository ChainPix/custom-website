"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import {
  buildSnippet,
  parseCurl,
  type Options,
  type OutputTarget,
  type ParseResult,
  type ResponseMode,
  type SnippetLanguage,
  type SnippetVariant,
} from "./parser";

const sampleGet =
  `curl "https://api.example.com/users?limit=5" \\\n` +
  `  -H "Authorization: Bearer sk_test_123" \\\n` +
  `  -H "Accept: application/json"`;

const samplePost =
  `curl -X POST "https://api.example.com/items" \\\n` +
  `  -H "Content-Type: application/json" \\\n` +
  `  -d '{"name":"Sample","active":true}'`;

const sampleMultipart =
  `curl -X POST "https://api.example.com/upload" \\\n` +
  `  -F "title=Launch Plan" \\\n` +
  `  -F "file=@./report.pdf"`;

const sampleBasicAuth =
  `curl -u "demo:secret" "https://api.example.com/private" \\\n` +
  `  -H "Accept: application/json"`;

const sampleGetQuery =
  `curl -G "https://api.example.com/search" \\\n` +
  `  --data-urlencode "q=api docs" \\\n` +
  `  --data-urlencode "limit=10"`;

const sampleCookies =
  `curl "https://api.example.com/session" \\\n` +
  `  -H "Accept: text/html" \\\n` +
  `  --cookie "session=abc123; theme=light"`;

const sampleFileBody =
  `curl -X POST "https://api.example.com/import" \\\n` +
  `  -H "Content-Type: application/json" \\\n` +
  `  --data @payload.json`;

function isSensitiveKey(key: string) {
  return /(api[_-]?key|token|secret|signature|auth|access[_-]?key)/i.test(key);
}

function redactUrl(rawUrl: string) {
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl);
    const url = new URL(hasScheme ? rawUrl : `http://${rawUrl}`);
    const params = new URLSearchParams(url.search);
    for (const key of params.keys()) {
      if (isSensitiveKey(key)) {
        params.set(key, "REDACTED");
      }
    }
    const search = params.toString();
    url.search = search ? `?${search}` : "";
    const sanitized = hasScheme ? url.toString() : url.toString().replace(/^http:\/\//, "");
    return sanitized;
  } catch {
    return rawUrl;
  }
}

function redactParsed(parsed: ParseResult) {
  return {
    ...parsed,
    url: redactUrl(parsed.url),
    headers: parsed.headers.map((header) => {
      if (header.name.toLowerCase() === "authorization" || header.name.toLowerCase() === "cookie") {
        return { ...header, value: "REDACTED" };
      }
      return header;
    }),
  };
}

export default function CurlToFetchClient() {
  const [input, setInput] = useState(samplePost);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState<Options>({
    wrapAsync: true,
    prettyOptions: true,
    target: "fetch-browser",
    responseMode: "auto",
    typescript: false,
    useSatisfies: false,
  });
  const [ignored, setIgnored] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsedPreview, setParsedPreview] = useState<ParseResult | null>(null);
  const [redactSecrets, setRedactSecrets] = useState(true);

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Converted successfully";
    return "Awaiting input";
  }, [error, output]);

  const runConvert = () => {
    setError("");
    setCopied(false);
    try {
      const parsed = parseCurl(input);
      const snippet = buildSnippet(parsed, options, "standard");
      setOutput(snippet);
      setIgnored(parsed.ignored);
      setWarnings(parsed.warnings);
      setParsedPreview(parsed);
    } catch (err: any) {
      setOutput("");
      setError(err?.message || "Unable to convert. Please check your cURL command.");
      setIgnored([]);
      setWarnings([]);
      setParsedPreview(null);
    }
  };

  const handleConvert = () => {
    runConvert();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      runConvert();
    }, 400);
    return () => clearTimeout(timeout);
  }, [input, options]);

  const handleCopy = async (variant: SnippetVariant, languageOverride?: SnippetLanguage) => {
    if (!output) return;
    try {
      const parsed = parseCurl(input);
      const snippet = buildSnippet(parsed, options, variant, languageOverride);
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      setError((err as Error)?.message || "Unable to convert. Please check your cURL command.");
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const extension =
      options.target === "python-requests"
        ? "py"
        : options.target === "go-http"
          ? "go"
          : options.typescript
            ? "ts"
            : "js";
    a.download = `snippet.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const preview = parsedPreview ? (redactSecrets ? redactParsed(parsedPreview) : parsedPreview) : null;
  const impactfulWarnings = warnings.filter((warning) =>
    /-G|--get|--request-target|cookie jar|compressed/i.test(warning)
  );

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
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
              cURL to Fetch
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">cURL → fetch</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Transform a cURL command into a JavaScript fetch snippet. Runs locally for quick API testing and code migration.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Samples:</span>
              <button
                onClick={() => {
                  setInput(samplePost);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load POST sample"
              >
                POST JSON
              </button>
              <button
                onClick={() => {
                  setInput(sampleGet);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load GET sample"
              >
                GET with headers
              </button>
              <button
                onClick={() => {
                  setInput(sampleMultipart);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load multipart sample"
              >
                Multipart
              </button>
              <button
                onClick={() => {
                  setInput(sampleBasicAuth);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load basic auth sample"
              >
                Basic auth
              </button>
              <button
                onClick={() => {
                  setInput(sampleGetQuery);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load query params sample"
              >
                Query + -G
              </button>
              <button
                onClick={() => {
                  setInput(sampleCookies);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load cookies sample"
              >
                Cookies
              </button>
              <button
                onClick={() => {
                  setInput(sampleFileBody);
                  setError("");
                  setOutput("");
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Load file body sample"
              >
                File body
              </button>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.wrapAsync}
                onChange={() => setOptions((p) => ({ ...p, wrapAsync: !p.wrapAsync }))}
                aria-label="Wrap in async function"
              />
              Wrap in async
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.prettyOptions}
                onChange={() => setOptions((p) => ({ ...p, prettyOptions: !p.prettyOptions }))}
                aria-label="Pretty-print fetch options"
              />
              Pretty options
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Target:</span>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                value={options.target}
                onChange={(event) => {
                  const target = event.target.value as OutputTarget;
                  setOptions((p) => ({
                    ...p,
                    target,
                    typescript:
                      target === "python-requests" || target === "go-http" ? false : p.typescript,
                    useSatisfies:
                      target === "python-requests" || target === "go-http" ? false : p.useSatisfies,
                  }));
                }}
                aria-label="Output target"
              >
                <option value="fetch-browser">fetch (browser)</option>
                <option value="fetch-node">fetch (Node 18+)</option>
                <option value="axios">axios</option>
                <option value="python-requests">Python requests</option>
                <option value="go-http">Go http.NewRequest</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Response:</span>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                value={options.responseMode}
                onChange={(event) =>
                  setOptions((p) => ({
                    ...p,
                    responseMode: event.target.value as ResponseMode,
                  }))
                }
                aria-label="Response parsing"
                disabled={options.target === "axios" || options.target === "python-requests" || options.target === "go-http"}
              >
                <option value="auto">Auto</option>
                <option value="json">JSON</option>
                <option value="text">Text</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.typescript}
                onChange={() => setOptions((p) => ({ ...p, typescript: !p.typescript }))}
                aria-label="TypeScript output"
                disabled={options.target === "python-requests" || options.target === "go-http"}
              />
              TypeScript output
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={options.useSatisfies}
                onChange={() => setOptions((p) => ({ ...p, useSatisfies: !p.useSatisfies }))}
                aria-label="Use satisfies RequestInit"
                disabled={!options.typescript || options.target === "python-requests" || options.target === "go-http"}
              />
              Use satisfies
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={redactSecrets}
                onChange={() => setRedactSecrets((value) => !value)}
                aria-label="Redact secrets"
              />
              Redact secrets
            </label>
            <button
              onClick={() => {
                setInput(samplePost);
                setOptions({
                  wrapAsync: true,
                  prettyOptions: true,
                  target: "fetch-browser",
                  responseMode: "auto",
                  typescript: false,
                  useSatisfies: false,
                });
                setOutput("");
                setError("");
                setCopied(false);
                setRedactSecrets(true);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset inputs"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <textarea
            className="h-[180px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='e.g., curl -X POST "https://api.example.com" -H "Content-Type: application/json" -d "{\"name\":\"Sample\"}"'
            spellCheck={false}
            aria-label="cURL command input"
          />
          <button
            onClick={handleConvert}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Convert to fetch"
          >
            Convert to fetch
          </button>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <div className="space-y-1 text-sm text-slate-600">
              <p>{status}</p>
              {ignored.length > 0 ? (
                <p className="text-xs font-medium text-amber-700">
                  Ignored {ignored.length} flag{ignored.length > 1 ? "s" : ""}: {ignored.join(", ")}
                </p>
              ) : null}
              {warnings.length > 0 ? (
                <p className="text-xs font-medium text-amber-700">Notes: {warnings.join(" | ")}</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold" id="output-heading">
                {options.target === "fetch-browser"
                  ? "fetch (browser)"
                  : options.target === "fetch-node"
                    ? "fetch (Node 18+)"
                    : options.target === "axios"
                      ? "axios"
                      : options.target === "python-requests"
                        ? "Python requests"
                        : "Go http.NewRequest"}{" "}
                snippet
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleCopy("standard", "js")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  disabled={!output}
                  aria-label="Copy as JavaScript"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  JS
                </button>
                <button
                  onClick={() => handleCopy("standard", "ts")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  disabled={!output || options.target === "python-requests" || options.target === "go-http"}
                  aria-label="Copy as TypeScript"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  TS
                </button>
                <button
                  onClick={() => handleCopy("minimal")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  disabled={!output}
                  aria-label="Copy minimal snippet"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  Minimal
                </button>
                <button
                  onClick={() => handleCopy("production")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  disabled={!output}
                  aria-label="Copy production snippet"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  Production
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                  disabled={!output}
                  aria-label="Download fetch snippet"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
              </div>
            </div>
            <pre
              className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="output-heading"
            >
              {output || "Your fetch snippet will appear here after conversion."}
            </pre>
          </div>

          <div className="flex h-full flex-col rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Parsed</p>
              {preview ? (
                <span className="text-xs font-medium text-slate-500">
                  {preview.method} · {preview.headers.length} header{preview.headers.length !== 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            {preview ? (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">URL</p>
                  <p className="break-words text-slate-900">{preview.url}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Headers</p>
                  {preview.headers.length ? (
                    <div className="mt-1 space-y-1">
                      {preview.headers.map((header, idx) => (
                        <p key={`${header.name}-${idx}`} className="break-words">
                          <span className="font-semibold text-slate-900">{header.name}:</span> {header.value}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">None</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Body</p>
                  <p className="text-slate-900">
                    {preview.body
                      ? preview.body.length > 240
                        ? `${preview.body.slice(0, 240)}…`
                        : preview.body
                      : preview.dataFile
                        ? `@${preview.dataFile}`
                        : preview.form?.length
                          ? `${preview.form.length} form fields`
                          : preview.urlEncoded?.length
                            ? `${preview.urlEncoded.length} url-encoded fields`
                            : "None"}
                  </p>
                </div>
                {impactfulWarnings.length ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {impactfulWarnings.join(" ")}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Run conversion to preview parsed details.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste a full cURL command, including URL and any -X/-H/-d flags.</li>
          <li>Toggle wrapping/pretty options if needed, then click Convert.</li>
          <li>Copy or download the generated fetch snippet for your app or tests.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>Processing happens locally in your browser. Unsupported flags are ignored safely.</p>
          <p>Keep Content-Type aligned with your body format (e.g., application/json for JSON payloads).</p>
        </div>
      </div>
    </main>
  );
}
