"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type ParseResult = {
  url: string;
  method: string;
  headers: Array<{ name: string; value: string }>;
  body?: string;
  dataFile?: string;
  form?: Array<{ name: string; value: string; isFile: boolean }>;
  urlEncoded?: Array<{ name: string; value: string; isFile: boolean }>;
  ignored: string[];
  warnings: string[];
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
  const normalized = command.replace(/\\\r?\n/g, " ").replace(/\^\r?\n/g, " ");
  const flush = () => {
    if (current) {
      tokens.push(current);
      current = "";
    }
  };

  const readAnsiEscape = (input: string, start: number) => {
    const code = input[start];
    if (!code) return { value: "", offset: 0 };
    if (code === "n") return { value: "\n", offset: 1 };
    if (code === "r") return { value: "\r", offset: 1 };
    if (code === "t") return { value: "\t", offset: 1 };
    if (code === "b") return { value: "\b", offset: 1 };
    if (code === "f") return { value: "\f", offset: 1 };
    if (code === "v") return { value: "\v", offset: 1 };
    if (code === "\\") return { value: "\\", offset: 1 };
    if (code === "'") return { value: "'", offset: 1 };
    if (code === '"') return { value: '"', offset: 1 };
    if (code === "x") {
      const hex = input.slice(start + 1, start + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        return { value: String.fromCharCode(parseInt(hex, 16)), offset: 3 };
      }
    }
    if (code === "u") {
      const hex = input.slice(start + 1, start + 5);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        return { value: String.fromCharCode(parseInt(hex, 16)), offset: 5 };
      }
    }
    return { value: code, offset: 1 };
  };

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === "$" && next === "'") {
      i += 2;
      for (; i < normalized.length; i++) {
        const inner = normalized[i];
        if (inner === "'") break;
        if (inner === "\\") {
          const parsed = readAnsiEscape(normalized, i + 1);
          current += parsed.value;
          i += parsed.offset;
          continue;
        }
        current += inner;
      }
      continue;
    }

    if (char === "'") {
      i += 1;
      for (; i < normalized.length; i++) {
        if (normalized[i] === "'") break;
        current += normalized[i];
      }
      continue;
    }

    if (char === '"') {
      i += 1;
      for (; i < normalized.length; i++) {
        const inner = normalized[i];
        const lookahead = normalized[i + 1];
        if (inner === '"') {
          if (lookahead === '"') {
            current += '"';
            i += 1;
            continue;
          }
          break;
        }
        if (inner === "\\" && lookahead) {
          current += lookahead;
          i += 1;
          continue;
        }
        if (inner === "^" && lookahead) {
          current += lookahead;
          i += 1;
          continue;
        }
        current += inner;
      }
      continue;
    }

    if (char === "\\") {
      if (next) {
        current += next;
        i += 1;
      }
      continue;
    }

    if (char === "^") {
      if (next) {
        current += next;
        i += 1;
      }
      continue;
    }

    if (/\s/.test(char)) {
      flush();
      continue;
    }

    current += char;
  }

  flush();
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
  const headers: Array<{ name: string; value: string }> = [];
  let body: string | undefined;
  let dataFile: string | undefined;
  const form: Array<{ name: string; value: string; isFile: boolean }> = [];
  const urlEncoded: Array<{ name: string; value: string; isFile: boolean }> = [];
  const ignored: string[] = [];
  const warnings: string[] = [];

  const addHeader = (value: string) => {
    const lines = value.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const splitIndex = line.indexOf(":");
      if (splitIndex === -1) {
        warnings.push(`Header "${line}" is missing ":".`);
        continue;
      }
      const name = line.slice(0, splitIndex).trim();
      const headerValue = line.slice(splitIndex + 1).trim();
      if (name) {
        headers.push({ name, value: headerValue });
      }
    }
  };

  const appendForm = (value: string) => {
    const splitIndex = value.indexOf("=");
    if (splitIndex === -1) {
      warnings.push(`Form field "${value}" is missing "=".`);
      return;
    }
    const name = value.slice(0, splitIndex);
    let fieldValue = value.slice(splitIndex + 1);
    let isFile = false;
    if (fieldValue.startsWith("@@")) {
      fieldValue = fieldValue.slice(1);
    } else if (fieldValue.startsWith("@")) {
      isFile = true;
      fieldValue = fieldValue.slice(1);
      warnings.push(`Form file "${name}" uses @${fieldValue}; replace placeholder with a Blob/File.`);
    }
    form.push({ name, value: fieldValue, isFile });
  };

  const appendUrlEncoded = (value: string) => {
    const splitIndex = value.indexOf("=");
    const name = splitIndex === -1 ? value : value.slice(0, splitIndex);
    let fieldValue = splitIndex === -1 ? "" : value.slice(splitIndex + 1);
    let isFile = false;
    if (fieldValue.startsWith("@@")) {
      fieldValue = fieldValue.slice(1);
    } else if (fieldValue.startsWith("@")) {
      isFile = true;
      fieldValue = fieldValue.slice(1);
      warnings.push(`URL-encoded data "${name}" uses @${fieldValue}; replace placeholder with file contents.`);
    }
    urlEncoded.push({ name, value: fieldValue, isFile });
  };

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
        addHeader(next);
        i++;
      }
      continue;
    }
    if (t === "-b" || t === "--cookie") {
      if (next) {
        if (next.startsWith("@") && !next.startsWith("@@")) {
          const cookieFile = next.slice(1);
          warnings.push(`Cookie file @${cookieFile} detected; replace with "name=value" pairs.`);
        } else {
          const cookieValue = next.startsWith("@@") ? next.slice(1) : next;
          addHeader(`Cookie: ${cookieValue}`);
        }
        i++;
      }
      continue;
    }
    if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      if (next !== undefined) {
        if (next.startsWith("@") && !next.startsWith("@@")) {
          dataFile = next.slice(1);
          warnings.push(`Body uses @${dataFile}; replace placeholder with file contents.`);
        } else {
          const normalized = next.startsWith("@@") ? next.slice(1) : next;
          body = body ? `${body}&${normalized}` : normalized;
        }
        method = method || "POST";
        i++;
      }
      continue;
    }
    if (t === "--data-urlencode") {
      if (next !== undefined) {
        appendUrlEncoded(next);
        method = method || "POST";
        i++;
      }
      continue;
    }
    if (t === "-F" || t === "--form" || t === "--form-string") {
      if (next !== undefined) {
        appendForm(next);
        method = method || "POST";
        i++;
      }
      continue;
    }
    if (t === "-u" || t === "--user") {
      if (next) {
        try {
          headers.push({ name: "Authorization", value: `Basic ${btoa(next)}` });
        } catch {
          headers.push({ name: "Authorization", value: `Basic ${next}` });
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
    method: method || (body || dataFile || form.length || urlEncoded.length ? "POST" : "GET"),
    headers,
    body,
    dataFile,
    form: form.length ? form : undefined,
    urlEncoded: urlEncoded.length ? urlEncoded : undefined,
    ignored,
    warnings,
  };
}

function getHeaderValue(headers: Array<{ name: string; value: string }>, name: string) {
  const target = name.toLowerCase();
  for (let i = headers.length - 1; i >= 0; i -= 1) {
    if (headers[i].name.toLowerCase() === target) return headers[i].value;
  }
  return "";
}

function isJsonContentType(headers: Array<{ name: string; value: string }>) {
  const contentType = getHeaderValue(headers, "content-type");
  return /application\/json|\+json/i.test(contentType);
}

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function indentMultiline(value: string, spaces: number) {
  const pad = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line, idx) => (idx === 0 ? line : `${pad}${line}`))
    .join("\n");
}

function buildFetchSnippet(parsed: ParseResult, opts: Options) {
  const optionsLines: string[] = [];
  const preLines: string[] = [];
  if (parsed.method && parsed.method !== "GET") {
    optionsLines.push(`method: "${parsed.method}"`);
  }
  if (parsed.headers.length) {
    preLines.push("const headers = new Headers();");
    for (const header of parsed.headers) {
      preLines.push(`headers.append(${JSON.stringify(header.name)}, ${JSON.stringify(header.value)});`);
    }
    optionsLines.push("headers: headers");
  }
  if (parsed.form?.length) {
    preLines.push("const formData = new FormData();");
    for (const field of parsed.form) {
      if (field.isFile) {
        preLines.push(
          `formData.append(${JSON.stringify(field.name)}, new Blob([]), ${JSON.stringify(field.value)});`
        );
      } else {
        preLines.push(`formData.append(${JSON.stringify(field.name)}, ${JSON.stringify(field.value)});`);
      }
    }
    optionsLines.push("body: formData");
  } else if (parsed.urlEncoded?.length) {
    preLines.push("const formBody = new URLSearchParams();");
    for (const field of parsed.urlEncoded) {
      const value = field.isFile ? "REPLACE_WITH_FILE_CONTENTS" : field.value;
      preLines.push(`formBody.append(${JSON.stringify(field.name)}, ${JSON.stringify(value)});`);
    }
    optionsLines.push("body: formBody");
  } else if (parsed.dataFile) {
    preLines.push(`const body = "REPLACE_WITH_FILE_CONTENTS";`);
    optionsLines.push("body: body");
  } else if (parsed.body !== undefined) {
    let bodyValue = JSON.stringify(parsed.body);
    if (isJsonContentType(parsed.headers) && looksLikeJson(parsed.body)) {
      try {
        const parsedJson = JSON.parse(parsed.body);
        const jsonLiteral = JSON.stringify(parsedJson, null, opts.prettyOptions ? 2 : 0);
        bodyValue = `JSON.stringify(${jsonLiteral})`;
      } catch {
        bodyValue = JSON.stringify(parsed.body);
      }
    }
    if (opts.prettyOptions && bodyValue.includes("\n")) {
      bodyValue = indentMultiline(bodyValue, 2);
    }
    optionsLines.push(`body: ${bodyValue}`);
  }

  const optionsBlock = optionsLines.length
    ? `{\n  ${optionsLines.join(",\n  ")}\n}`
    : "{}";
  const compactOptionsBlock = optionsLines.length ? `{ ${optionsLines.join(", ")} }` : "{}";

  const fetchLines = [
    `const response = await fetch("${parsed.url}", ${opts.prettyOptions ? optionsBlock : compactOptionsBlock});`,
    "if (!response.ok) throw new Error(`Request failed: ${response.status}`);",
    "const data = await response.json();",
    "console.log(data);",
  ];

  if (!opts.wrapAsync) {
    return [...preLines, ...fetchLines].join("\n");
  }

  const wrapped = [
    "async function run() {",
    ...preLines.map((l) => `  ${l}`),
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
  const [warnings, setWarnings] = useState<string[]>([]);

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
      setWarnings(parsed.warnings);
    } catch (err: any) {
      setOutput("");
      setError(err?.message || "Unable to convert cURL command.");
      setIgnored([]);
      setWarnings([]);
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
              {warnings.length > 0 ? (
                <p className="text-xs font-medium text-amber-700">Notes: {warnings.join(" | ")}</p>
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
