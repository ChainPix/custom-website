"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type ParseResult = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  ignored: string[];
};

type Options = {
  wrapAsync: boolean;
  prettyOptions: boolean;
};

const sampleGet =
  `curl "https://api.example.com/users?limit=5" \\\n` +
  `  -H "Authorization: Bearer sk_test_123" \\\n` +
  `  -H "Accept: application/json"`;

const samplePost =
  `curl -X POST "https://api.example.com/items" \\\n` +
  `  -H "Content-Type: application/json" \\\n` +
  `  -d '{"name":"Sample","active":true}'`;

function tokenize(command: string) {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escape = false;
  const normalized = command.replace(/\\\n/g, " ");

  for (const char of normalized) {
    if (escape) {
      current += char;
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (inSingle) {
      if (char === "'") {
        inSingle = false;
      } else {
        current += char;
      }
      continue;
    }
    if (inDouble) {
      if (char === '"') {
        inDouble = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'") {
      inSingle = true;
      continue;
    }
    if (char === '"') {
      inDouble = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

function parseCurl(command: string): ParseResult {
  const trimmed = command.trim();
  if (!trimmed) throw new Error("Enter a cURL command.");
  if (trimmed.length > 8000) throw new Error("Command is too long. Please shorten it.");

  const tokens = tokenize(trimmed);
  if (!tokens.length) throw new Error("Nothing to parse.");
  if (tokens[0].toLowerCase() === "curl") tokens.shift();

  let url = "";
  let method: string | undefined;
  const headers: Record<string, string> = {};
  let body: string | undefined;
  const ignored: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    if (t === "--compressed") continue;
    if (t === "-X" || t === "--request" || t === "--method") {
      if (next) {
        method = next.toUpperCase();
        i++;
      }
      continue;
    }
    if (t === "-H" || t === "--header") {
      if (next) {
        const [k, ...rest] = next.split(":");
        if (k && rest.length) {
          headers[k.trim()] = rest.join(":").trim();
        }
        i++;
      }
      continue;
    }
    if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      if (next !== undefined) {
        body = next;
        method = method || "POST";
        i++;
      }
      continue;
    }
    if (t === "-u" || t === "--user") {
      if (next) {
        try {
          headers["Authorization"] = `Basic ${btoa(next)}`;
        } catch {
          headers["Authorization"] = `Basic ${next}`;
        }
        i++;
      }
      continue;
    }
    if (t.startsWith("-")) {
      ignored.push(t);
      continue;
    }
    if (!t.startsWith("-") && !url) {
      url = t;
    }
  }

  if (!url) throw new Error("Could not find a URL in the cURL command.");
  return {
    url,
    method: method || (body ? "POST" : "GET"),
    headers,
    body,
    ignored,
  };
}

function buildFetchSnippet(parsed: ParseResult, opts: Options) {
  const entries = Object.entries(parsed.headers);
  const optionsLines: string[] = [];
  if (parsed.method && parsed.method !== "GET") {
    optionsLines.push(`method: "${parsed.method}"`);
  }
  if (entries.length) {
    const headersStr = JSON.stringify(parsed.headers, null, 2)
      .split("\n")
      .map((line, idx) => (idx === 0 ? line : `  ${line}`))
      .join("\n");
    optionsLines.push(`headers: ${headersStr}`);
  }
  if (parsed.body !== undefined) {
    optionsLines.push(`body: ${JSON.stringify(parsed.body)}`);
  }

  const optionsBlock = optionsLines.length
    ? `{\n  ${optionsLines.join(",\n  ")}\n}`
    : "{}";

  const fetchLines = [
    `const response = await fetch("${parsed.url}", ${opts.prettyOptions ? optionsBlock : optionsBlock.replace(/\s+/g, " ") });`,
    "if (!response.ok) throw new Error(`Request failed: ${response.status}`);",
    "const data = await response.json();",
    "console.log(data);",
  ];

  if (!opts.wrapAsync) {
    return fetchLines.join("\n");
  }

  const wrapped = [
    "async function run() {",
    ...fetchLines.map((l) => `  ${l}`),
    "}",
    "run().catch((err) => console.error(err));",
  ];
  return wrapped.join("\n");
}

export default function CurlToFetchClient() {
  const [input, setInput] = useState(samplePost);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState<Options>({ wrapAsync: true, prettyOptions: true });
  const [ignored, setIgnored] = useState<string[]>([]);

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Converted successfully";
    return "Awaiting input";
  }, [error, output]);

  const handleConvert = () => {
    setError("");
    setCopied(false);
    try {
      const parsed = parseCurl(input);
      const snippet = buildFetchSnippet(parsed, options);
      setOutput(snippet);
      setIgnored(parsed.ignored);
    } catch (err: any) {
      setOutput("");
      setError(err?.message || "Unable to convert cURL command.");
      setIgnored([]);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fetch-snippet.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
      </div>

      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
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
            <button
              onClick={() => {
                setInput(samplePost);
                setOptions({ wrapAsync: true, prettyOptions: true });
                setOutput("");
                setError("");
                setCopied(false);
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
            </div>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="output-heading">
              Fetch snippet
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy fetch snippet"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
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
