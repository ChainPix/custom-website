"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type ValidationStats = {
  beforeChars: number;
  afterChars: number;
  beforeLines: number;
  afterLines: number;
};

type ErrorLocation = {
  line: number;
  column: number;
  offset: number | null;
};

type DuplicateKey = {
  key: string;
  line: number;
  column: number;
};

type ValidationResult = {
  formatted: string;
  parseError: string;
  warningMsg: string;
  stats: ValidationStats | null;
  errorLocation: ErrorLocation | null;
  parsed: unknown | null;
  duplicateKeys: DuplicateKey[];
};

export default function JsonValidatorClient() {
  const [input, setInput] = useState("{\n  \"hello\": \"world\"\n}");
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [trimInput, setTrimInput] = useState(true);
  const [json5Mode, setJson5Mode] = useState(false);
  const [bigIntMode, setBigIntMode] = useState(false);
  const [autoValidate, setAutoValidate] = useState(true);
  const [lastValidatedInput, setLastValidatedInput] = useState(input);
  const lastValidatedInputRef = useRef(lastValidatedInput);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    formatted: "",
    parseError: "Enter JSON to validate.",
    warningMsg: "",
    stats: null,
    errorLocation: null,
    parsed: null,
    duplicateKeys: [],
  });
  const [isValidating, setIsValidating] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [schemaInput, setSchemaInput] = useState("{\n  \"type\": \"object\",\n  \"required\": [\"hello\"],\n  \"properties\": {\n    \"hello\": { \"type\": \"string\" }\n  }\n}");
  const [schemaStatus, setSchemaStatus] = useState<null | { valid: boolean; errors: Array<{ path: string; message: string }> }>(null);
  const [queryInput, setQueryInput] = useState("$.hello");
  const [queryResult, setQueryResult] = useState<null | { output: string; count: number }>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const latestRequestIdRef = useRef(0);
  const ajvRef = useRef<null | { validate: (schema: object, data: unknown) => { valid: boolean; errors: Array<{ path: string; message: string }> } }>(null);

  const countNewlines = (text: string) => {
    let count = 0;
    for (let i = 0; i < text.length; i += 1) {
      if (text.charCodeAt(i) === 10) count += 1;
    }
    return count;
  };

  const stringifyJSON = (value: unknown, pretty: boolean) => {
    const indent = pretty ? "  " : "";
    const newline = pretty ? "\n" : "";
    const space = pretty ? " " : "";

    const stringifyValue = (val: unknown, level: number): string => {
      if (val === null) return "null";
      if (typeof val === "string") return JSON.stringify(val);
      if (typeof val === "number") return Number.isFinite(val) ? String(val) : "null";
      if (typeof val === "boolean") return val ? "true" : "false";
      if (typeof val === "bigint") return val.toString();

      if (Array.isArray(val)) {
        if (val.length === 0) return "[]";
        const entries = val.map((entry) => stringifyValue(entry, level + 1));
        if (!pretty) return `[${entries.join(",")}]`;
        const padding = indent.repeat(level + 1);
        return `[${newline}${padding}${entries.join(`,${newline}${padding}`)}${newline}${indent.repeat(level)}]`;
      }

      if (typeof val === "object") {
        const obj = val as Record<string, unknown>;
        const keys = Object.keys(obj);
        if (keys.length === 0) return "{}";
        const padding = indent.repeat(level + 1);
        const pieces = keys.map((key) => {
          const renderedKey = JSON.stringify(key);
          const renderedValue = stringifyValue(obj[key], level + 1);
          return `${renderedKey}:${space}${renderedValue}`;
        });
        if (!pretty) return `{${pieces.join(",")}}`;
        return `{${newline}${padding}${pieces.join(`,${newline}${padding}`)}${newline}${indent.repeat(level)}}`;
      }

      return "null";
    };

    return stringifyValue(value, 0);
  };

  const sortKeysDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((item) => sortKeysDeep(item));
    if (value !== null && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, sortKeysDeep(val)] as const);
      return Object.fromEntries(entries);
    }
    return value;
  };

  const removeNullsDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((item) => removeNullsDeep(item)).filter((item) => item !== null);
    if (value !== null && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, val]) => val !== null)
        .map(([key, val]) => [key, removeNullsDeep(val)] as const);
      return Object.fromEntries(entries);
    }
    return value;
  };

  const dedupeArraysDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      const seen = new Set<string>();
      const deduped: unknown[] = [];
      for (const entry of value) {
        const normalized = stringifyJSON(sortKeysDeep(entry), false);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        deduped.push(dedupeArraysDeep(entry));
      }
      return deduped;
    }
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, dedupeArraysDeep(val)] as const),
      );
    }
    return value;
  };

  const camelToSnake = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  const snakeToCamel = (value: string) => value.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

  const convertKeysDeep = (value: unknown, converter: (key: string) => string): unknown => {
    if (Array.isArray(value)) return value.map((item) => convertKeysDeep(item, converter));
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => [converter(key), convertKeysDeep(val, converter)]),
      );
    }
    return value;
  };

  const applyTransform = (action: "sort" | "removeNulls" | "dedupeArrays" | "camelToSnake" | "snakeToCamel" | "minify" | "canonicalize") => {
    if (!validationResult.parsed) {
      setActionStatus("Validate first");
      return;
    }
    let transformed: unknown = validationResult.parsed;
    if (action === "sort") transformed = sortKeysDeep(transformed);
    if (action === "removeNulls") transformed = removeNullsDeep(transformed);
    if (action === "dedupeArrays") transformed = dedupeArraysDeep(transformed);
    if (action === "camelToSnake") transformed = convertKeysDeep(transformed, camelToSnake);
    if (action === "snakeToCamel") transformed = convertKeysDeep(transformed, snakeToCamel);
    if (action === "canonicalize") transformed = sortKeysDeep(transformed);
    const output = stringifyJSON(transformed, action !== "minify");
    setInput(output);
    setLastValidatedInput(output);
    setActionStatus("Applied");
  };

  const tokenizePath = (path: string) => {
    const tokens: Array<{ type: "prop" | "index" | "wildcard"; value?: string | number }> = [];
    let i = 0;
    const trimmed = path.trim();
    if (!trimmed) return { tokens, error: "Enter a JSONPath expression." };
    if (trimmed[i] === "$") i += 1;
    while (i < trimmed.length) {
      const char = trimmed[i];
      if (char === ".") {
        i += 1;
        let start = i;
        while (i < trimmed.length && /[A-Za-z0-9_$]/.test(trimmed[i])) i += 1;
        if (start === i) return { tokens, error: "Invalid JSONPath: expected property name." };
        tokens.push({ type: "prop", value: trimmed.slice(start, i) });
        continue;
      }
      if (char === "[") {
        const closeIndex = trimmed.indexOf("]", i);
        if (closeIndex === -1) return { tokens, error: "Invalid JSONPath: missing closing bracket." };
        const content = trimmed.slice(i + 1, closeIndex).trim();
        if (content === "*") {
          tokens.push({ type: "wildcard" });
        } else if ((content.startsWith("\"") && content.endsWith("\"")) || (content.startsWith("'") && content.endsWith("'"))) {
          tokens.push({ type: "prop", value: content.slice(1, -1) });
        } else if (/^-?\d+$/.test(content)) {
          tokens.push({ type: "index", value: Number(content) });
        } else {
          return { tokens, error: "Invalid JSONPath bracket selector." };
        }
        i = closeIndex + 1;
        continue;
      }
      if (/\s/.test(char)) {
        i += 1;
        continue;
      }
      return { tokens, error: `Unexpected token '${char}' in JSONPath.` };
    }
    return { tokens, error: "" };
  };

  const runQuery = () => {
    if (!validationResult.parsed) {
      setQueryResult({ output: "Validate JSON before querying.", count: 0 });
      return;
    }
    const { tokens, error } = tokenizePath(queryInput);
    if (error) {
      setQueryResult({ output: error, count: 0 });
      return;
    }
    let current: unknown[] = [validationResult.parsed];
    for (const token of tokens) {
      const next: unknown[] = [];
      for (const value of current) {
        if (token.type === "prop" && value !== null && typeof value === "object" && !Array.isArray(value)) {
          const record = value as Record<string, unknown>;
          if (token.value && Object.prototype.hasOwnProperty.call(record, token.value as string)) {
            next.push(record[token.value as string]);
          }
        }
        if (token.type === "index" && Array.isArray(value)) {
          const idx = token.value as number;
          if (idx >= 0 && idx < value.length) next.push(value[idx]);
        }
        if (token.type === "wildcard") {
          if (Array.isArray(value)) next.push(...value);
          if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            next.push(...Object.values(value as Record<string, unknown>));
          }
        }
      }
      current = next;
    }
    const output = stringifyJSON(current.length === 1 ? current[0] : current, true);
    setQueryResult({ output, count: current.length });
  };

  const handleSchemaValidate = async () => {
    if (!validationResult.parsed) {
      setSchemaStatus({ valid: false, errors: [{ path: "input", message: "Validate JSON before schema checks." }] });
      return;
    }
    if (!schemaInput.trim()) {
      setSchemaStatus({ valid: false, errors: [{ path: "schema", message: "Paste a JSON Schema first." }] });
      return;
    }
    try {
      let schemaObject: unknown;
      if (json5Mode) {
        const module = await import("json5");
        schemaObject = module.default.parse(schemaInput);
      } else {
        schemaObject = JSON.parse(schemaInput);
      }
      if (!ajvRef.current) {
        const Ajv = (await import("ajv")).default;
        ajvRef.current = {
          validate: (schema: object, data: unknown) => {
            const ajv = new Ajv({ allErrors: true, strict: false });
            const validate = ajv.compile(schema);
            const valid = validate(data);
            const errors = validate.errors?.map((error) => ({
              path: error.instancePath || "root",
              message: error.message || "Validation error",
            })) ?? [];
            return { valid: Boolean(valid), errors };
          },
        };
      }
      const result = ajvRef.current.validate(schemaObject as object, validationResult.parsed);
      setSchemaStatus(result);
    } catch (err) {
      setSchemaStatus({
        valid: false,
        errors: [{ path: "schema", message: err instanceof Error ? err.message : "Invalid schema." }],
      });
    }
  };

  useEffect(() => {
    const worker = new Worker(new URL("./validator.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{ id: number; result: ValidationResult }>) => {
      const { id, result } = event.data;
      if (id !== latestRequestIdRef.current) return;
      const inputText = lastValidatedInputRef.current;
      setValidationResult((prev) => {
        const shouldComputeStats = !result.parseError && result.formatted && result.formatted !== prev.formatted;
        const stats = shouldComputeStats
          ? {
              beforeChars: inputText.length,
              afterChars: result.formatted.length,
              beforeLines: inputText ? countNewlines(inputText) + 1 : 0,
              afterLines: result.formatted ? countNewlines(result.formatted) + 1 : 0,
            }
          : null;
        return { ...result, stats };
      });
      setIsValidating(false);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    lastValidatedInputRef.current = lastValidatedInput;
  }, [lastValidatedInput]);

  useEffect(() => {
    if (!workerRef.current) return;
    const id = requestIdRef.current + 1;
    requestIdRef.current = id;
    latestRequestIdRef.current = id;
    setIsValidating(true);
    workerRef.current.postMessage({
      id,
      input: lastValidatedInput,
      trimInput,
      json5Mode,
      bigIntMode,
    });
  }, [lastValidatedInput, trimInput, json5Mode, bigIntMode]);

  useEffect(() => {
    if (!autoValidate) return;
    const timeoutId = window.setTimeout(() => {
      setLastValidatedInput(input);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [input, autoValidate]);

  const handleValidate = () => {
    setLastValidatedInput(input);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(validationResult.formatted || input);
      setCopied(true);
      setActionStatus("Copied");
      setTimeout(() => {
        setCopied(false);
        setActionStatus("");
      }, 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setActionStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!validationResult.formatted) return;
    const blob = new Blob([validationResult.formatted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "validated.json";
    a.click();
    URL.revokeObjectURL(url);
    setActionStatus("Downloaded");
  };

  const loadSample = (kind: "object" | "array") => {
    const samples = {
      object: '{\n  "name": "ToolStack",\n  "active": true,\n  "items": [1, 2, 3]\n}',
      array: '[\n  {"id":1,"value":"a"},\n  {"id":2,"value":"b"}\n]',
    };
    setInput(samples[kind]);
    setActionStatus("Loaded sample");
  };

  const validationStatus = validationResult.parseError
    ? "Validation failed"
    : validationResult.formatted
      ? "Validation succeeded"
      : "Ready";
  const liveStatus = actionStatus || (isValidating ? "Validating" : validationStatus);
  const errorLocationLabel = validationResult.errorLocation
    ? `Line ${validationResult.errorLocation.line}, column ${validationResult.errorLocation.column}`
    : "";
  const lineHeightPx = 24;
  const paddingX = 12;
  const paddingY = 12;
  const highlightTop = validationResult.errorLocation
    ? paddingY + (validationResult.errorLocation.line - 1) * lineHeightPx - scrollTop
    : 0;

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {liveStatus} {validationResult.warningMsg} {validationResult.parseError}
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
              JSON Validator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JSON Validator & Linter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Validate JSON, see errors with line/column hints, and pretty-print clean output. Runs
          entirely in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleValidate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Validate JSON"
            >
              Validate
            </button>
            <button
              onClick={() => {
                setInput("");
                setLastValidatedInput("");
                setActionStatus("Cleared");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Clear input and output"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={autoValidate}
                onChange={(e) => setAutoValidate(e.target.checked)}
              />
              Auto-validate
            </label>
            <div className="flex flex-wrap gap-2 text-xs text-slate-700">
              <button
                type="button"
                onClick={() => loadSample("object")}
                className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sample object
              </button>
              <button
                type="button"
                onClick={() => loadSample("array")}
                className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sample array
              </button>
            </div>
          </div>
          <div className="relative">
            {validationResult.errorLocation ? (
              <div className="pointer-events-none absolute inset-0 rounded-xl">
                <div
                  className="absolute left-3 right-3 rounded-md bg-amber-100/80"
                  style={{ top: highlightTop, height: lineHeightPx }}
                />
                <div
                  className="absolute w-0.5 bg-amber-500"
                  style={{
                    top: highlightTop,
                    left: `calc(${validationResult.errorLocation.column - 1}ch + ${paddingX}px)`,
                    height: lineHeightPx,
                  }}
                />
              </div>
            ) : null}
            <textarea
              className="h-[240px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-mono text-sm leading-6 text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
              spellCheck={false}
              aria-label="JSON input"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={trimInput}
                onChange={(e) => setTrimInput(e.target.checked)}
              />
              Trim input before parsing
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={json5Mode}
                onChange={(e) => setJson5Mode(e.target.checked)}
              />
              JSON5 mode
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={bigIntMode}
                onChange={(e) => setBigIntMode(e.target.checked)}
              />
              Big-int mode
            </label>
            {validationResult.warningMsg ? (
              <span className="font-medium text-amber-700" role="alert">
                {validationResult.warningMsg}
              </span>
            ) : null}
          </div>
          {validationResult.parseError ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              Error: {validationResult.parseError} {errorLocationLabel ? `(${errorLocationLabel})` : ""}
            </p>
          ) : (
            <p className="text-sm text-slate-600">Tip: Paste API responses or config files to check validity.</p>
          )}
          {validationResult.duplicateKeys.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">Duplicate keys detected</p>
              <ul className="mt-1 space-y-0.5">
                {validationResult.duplicateKeys.slice(0, 5).map((dup, index) => (
                  <li key={`${dup.key}-${index}`}>
                    {dup.key} (line {dup.line}, col {dup.column})
                  </li>
                ))}
              </ul>
              {validationResult.duplicateKeys.length > 5 ? (
                <p className="mt-1 text-amber-700">+{validationResult.duplicateKeys.length - 5} more duplicates</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-label="Validated JSON output"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Output</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!validationResult.formatted && !input}
                aria-label="Copy JSON"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!validationResult.formatted}
                aria-label="Download formatted JSON"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {validationResult.formatted || (validationResult.parseError ? "Fix errors to see formatted JSON." : "Validated JSON will appear here.")}
          </pre>
        </div>
      </div>

      {validationResult.stats ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <span>Before: {validationResult.stats.beforeChars.toLocaleString()} chars / {validationResult.stats.beforeLines} lines</span>
          <span>After: {validationResult.stats.afterChars.toLocaleString()} chars / {validationResult.stats.afterLines} lines</span>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Developer tools</h2>
          <span className="text-xs text-slate-500">Schema, JSONPath, and key utilities</span>
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">JSON Schema validation</h3>
              <button
                type="button"
                onClick={() => setSchemaStatus(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Clear status
              </button>
            </div>
            <textarea
              className="h-[180px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={schemaInput}
              onChange={(event) => setSchemaInput(event.target.value)}
              spellCheck={false}
              aria-label="JSON schema input"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSchemaValidate}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5"
              >
                Validate schema
              </button>
              <span className="text-xs text-slate-500">Uses current JSON input as data.</span>
            </div>
            {schemaStatus ? (
              schemaStatus.valid ? (
                <p className="text-xs font-semibold text-emerald-700">Schema valid.</p>
              ) : (
                <div className="text-xs text-amber-700">
                  <p className="font-semibold">Schema errors:</p>
                  <ul className="mt-1 space-y-0.5">
                    {schemaStatus.errors.map((error, index) => (
                      <li key={`${error.path}-${index}`}>
                        {error.path}: {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : null}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">JSONPath / jq-style query</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[220px] flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                aria-label="JSONPath query"
                placeholder="$.items[*].id"
              />
              <button
                type="button"
                onClick={runQuery}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-0.5"
              >
                Run query
              </button>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
              {queryResult ? (
                <>
                  <p className="mb-2 font-semibold">Matches: {queryResult.count}</p>
                  <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                    {queryResult.output}
                  </pre>
                </>
              ) : (
                <p className="text-slate-500">Run a query to see matching values.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Key tools & transforms</h3>
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            <button
              type="button"
              onClick={() => applyTransform("sort")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Sort keys
            </button>
            <button
              type="button"
              onClick={() => applyTransform("removeNulls")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Remove nulls
            </button>
            <button
              type="button"
              onClick={() => applyTransform("dedupeArrays")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Dedupe arrays
            </button>
            <button
              type="button"
              onClick={() => applyTransform("camelToSnake")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              camelCase → snake_case
            </button>
            <button
              type="button"
              onClick={() => applyTransform("snakeToCamel")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              snake_case → camelCase
            </button>
            <button
              type="button"
              onClick={() => applyTransform("minify")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Minify
            </button>
            <button
              type="button"
              onClick={() => applyTransform("canonicalize")}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Canonicalize
            </button>
          </div>
          <p className="text-xs text-slate-500">Transforms apply to the last validated JSON and replace the input.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste JSON and click Validate (or leave auto-validate on).</li>
          <li>Toggle trim/JSON5 if your input includes trailing commas/comments.</li>
          <li>Copy or download the formatted output; review before/after size.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser; no data is uploaded.</p>
          <p><strong>JSON5?</strong> Enable the toggle for JSON5 features (comments, trailing commas).</p>
          <p><strong>Schema validation?</strong> Planned: you&apos;ll paste a JSON Schema to validate structure and types.</p>
        </div>
      </div>
    </main>
  );
}
