"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Check, Clipboard, Plus, RefreshCcw, Share2, Upload, X } from "lucide-react";

type DuplicateKey = {
  key: string;
  line: number;
  column: number;
};

type ValidationError = {
  message: string;
  line?: number;
  col?: number;
  path?: string;
};

type ValidationMeta = {
  type: "object" | "array" | "primitive";
  charsIn: number;
  charsOut: number;
  linesIn: number;
  linesOut: number;
};

type ValidationOutcome = {
  ok: boolean;
  formatted?: string;
  error?: ValidationError;
  meta?: ValidationMeta;
  warning?: string;
};

type ValidationResult = ValidationOutcome & {
  parsed: unknown | null;
  duplicateKeys: DuplicateKey[];
};

type WorkspaceTab = {
  id: string;
  title: string;
  input: string;
  lastValidatedInput: string;
  updatedAt: number;
};

type DiffData = {
  label: string;
  before: string;
  after: string;
};

const REDACT_KEYS = ["password", "token", "apiKey", "apikey", "secret", "accessToken", "refreshToken"];

export default function JsonValidatorClient() {
  const defaultInput = "{\n  \"hello\": \"world\"\n}";
  const [tabs, setTabs] = useState<WorkspaceTab[]>([
    {
      id: "tab-1",
      title: "Untitled 1",
      input: defaultInput,
      lastValidatedInput: defaultInput,
      updatedAt: Date.now(),
    },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [input, setInput] = useState(defaultInput);
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [trimInput, setTrimInput] = useState(true);
  const [json5Mode, setJson5Mode] = useState(false);
  const [bigIntMode, setBigIntMode] = useState(false);
  const [autoValidate, setAutoValidate] = useState(true);
  const [lastValidatedInput, setLastValidatedInput] = useState(input);
  const lastValidatedInputRef = useRef(lastValidatedInput);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    ok: false,
    parsed: null,
    duplicateKeys: [],
  });
  const [isValidating, setIsValidating] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [schemaInput, setSchemaInput] = useState("{\n  \"type\": \"object\",\n  \"required\": [\"hello\"],\n  \"properties\": {\n    \"hello\": { \"type\": \"string\" }\n  }\n}");
  const [schemaStatus, setSchemaStatus] = useState<null | { valid: boolean; errors: Array<{ path: string; message: string }> }>(null);
  const [queryInput, setQueryInput] = useState("$.hello");
  const [queryResult, setQueryResult] = useState<null | { output: string; count: number }>(null);
  const [historyEntries, setHistoryEntries] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [diffMode, setDiffMode] = useState<"off" | "formatted" | "transformed">("off");
  const [formattedDiff, setFormattedDiff] = useState<DiffData | null>(null);
  const [transformedDiff, setTransformedDiff] = useState<DiffData | null>(null);
  const [redactSecrets, setRedactSecrets] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const latestRequestIdRef = useRef(0);
  const ajvRef = useRef<null | { validate: (schema: object, data: unknown) => { valid: boolean; errors: Array<{ path: string; message: string }> } }>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const redactSecretsDeep = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map((item) => redactSecretsDeep(item));
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => {
          const shouldRedact = REDACT_KEYS.includes(key);
          return [key, shouldRedact ? "[REDACTED]" : redactSecretsDeep(val)];
        }),
      );
    }
    return value;
  };

  const getCopyPayload = () => {
    if (!validationResult.formatted) return input;
    if (!redactSecrets || !validationResult.parsed) return validationResult.formatted;
    const redacted = redactSecretsDeep(validationResult.parsed);
    return stringifyJSON(redacted, true);
  };

  const getDownloadPayload = () => {
    if (!validationResult.formatted) return "";
    if (!redactSecrets || !validationResult.parsed) return validationResult.formatted;
    const redacted = redactSecretsDeep(validationResult.parsed);
    return stringifyJSON(redacted, true);
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
    const source = input;
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
    setTransformedDiff({ label: "Input vs transformed", before: source, after: output });
    setDiffMode("transformed");
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
        const start = i;
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

  const createTab = (title: string, seedInput: string) => ({
    id: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    input: seedInput,
    lastValidatedInput: seedInput,
    updatedAt: Date.now(),
  });

  const updateActiveTab = (updates: Partial<WorkspaceTab>) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const hasChanges = Object.entries(updates).some(([key, value]) => (tab as Record<string, unknown>)[key] !== value);
        if (!hasChanges) return tab;
        return { ...tab, ...updates, updatedAt: Date.now() };
      }),
    );
  };

  const handleAddTab = () => {
    const nextIndex = tabs.length + 1;
    const newTab = createTab(`Untitled ${nextIndex}`, "");
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setInput("");
    setLastValidatedInput("");
    setActionStatus("New tab");
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length === 1) return;
    const nextTabs = tabs.filter((tab) => tab.id !== id);
    setTabs(nextTabs);
    if (id === activeTabId) {
      const nextActive = nextTabs[0];
      setActiveTabId(nextActive.id);
      setInput(nextActive.input);
      setLastValidatedInput(nextActive.lastValidatedInput);
    }
  };

  const updateHistory = (value: string) => {
    if (!value.trim()) return;
    setHistoryEntries((prev) => {
      const deduped = prev.filter((entry) => entry !== value);
      const next = [value, ...deduped].slice(0, 20);
      try {
        window.localStorage.setItem("json-validator-history", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const handleHistoryLoad = (value: string) => {
    setInput(value);
    setLastValidatedInput(value);
    setActionStatus("Loaded from history");
  };

  const handleShare = async () => {
    if (!input.trim()) {
      setActionStatus("Nothing to share");
      return;
    }
    try {
      const module = await import("lz-string");
      const source = validationResult.formatted ? getDownloadPayload() : input;
      const compressed = module.compressToEncodedURIComponent(source);
      const url = `${window.location.origin}${window.location.pathname}#json=${compressed}`;
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, "", `#json=${compressed}`);
      setActionStatus("Share link copied");
    } catch (err) {
      console.error("Share failed", err);
      setActionStatus("Share failed");
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setActionStatus("Clipboard empty");
        return;
      }
      setInput(text);
      setLastValidatedInput(text);
      setActionStatus("Pasted from clipboard");
    } catch (err) {
      console.error("Clipboard read failed", err);
      setActionStatus("Clipboard blocked");
    }
  };

  const handleFile = async (file: File) => {
    const content = await file.text();
    setInput(content);
    setLastValidatedInput(content);
    setActionStatus(`Loaded ${file.name}`);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleFile(file);
  };

  const handleToggleDiff = () => {
    if (diffMode === "off") {
      if (formattedDiff) {
        setDiffMode("formatted");
      } else if (transformedDiff) {
        setDiffMode("transformed");
      }
      return;
    }
    setDiffMode("off");
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isEditable = Boolean(
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable),
      );

      if (key === "enter") {
        event.preventDefault();
        handleValidate();
      }

      if (key === "s") {
        event.preventDefault();
        handleDownload();
      }

      if (key === "c") {
        if (isEditable) {
          const selection = window.getSelection();
          if (selection && selection.toString()) return;
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            const start = target.selectionStart ?? 0;
            const end = target.selectionEnd ?? 0;
            if (start !== end) return;
          }
        }
        event.preventDefault();
        handleCopyOutput();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  useEffect(() => {
    const active = tabs.find((tab) => tab.id === activeTabId);
    if (!active) return;
    setInput(active.input);
    setLastValidatedInput(active.lastValidatedInput);
    setFormattedDiff(null);
    setTransformedDiff(null);
    setDiffMode("off");
    setSchemaStatus(null);
    setQueryResult(null);
  }, [activeTabId]);

  useEffect(() => {
    updateActiveTab({ input });
  }, [input]);

  useEffect(() => {
    updateActiveTab({ lastValidatedInput });
  }, [lastValidatedInput]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("json-validator-history");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setHistoryEntries(parsed.slice(0, 20));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#json=")) return;
    const payload = hash.slice(6);
    if (!payload) return;
    const loadShared = async () => {
      try {
        const module = await import("lz-string");
        const decoded = module.decompressFromEncodedURIComponent(payload);
        if (decoded) {
          setInput(decoded);
          setLastValidatedInput(decoded);
          setActionStatus("Loaded shared JSON");
        }
      } catch {
        setActionStatus("Share link invalid");
      }
    };
    void loadShared();
  }, []);

  useEffect(() => {
    const worker = new Worker(new URL("./validator.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<{ id: number; payload: ValidationResult }>) => {
      const { id, payload } = event.data;
      if (id !== latestRequestIdRef.current) return;
      const inputText = lastValidatedInputRef.current;
      setValidationResult(() => {
        if (payload.ok && payload.formatted) {
          setFormattedDiff({ label: "Input vs formatted", before: inputText, after: payload.formatted });
          setDiffMode((prev) => (prev === "off" || prev === "formatted" ? "formatted" : prev));
          updateHistory(inputText);
        } else {
          setFormattedDiff(null);
          setDiffMode((prev) => (prev === "formatted" ? "off" : prev));
        }
        return payload;
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
      await navigator.clipboard.writeText(getCopyPayload());
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

  const handleCopyOutput = async () => {
    if (!validationResult.formatted) {
      setActionStatus("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(getDownloadPayload());
      setCopied(true);
      setActionStatus("Copied output");
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
    if (!validationResult.formatted) {
      setActionStatus("Nothing to download");
      return;
    }
    const payload = getDownloadPayload();
    const blob = new Blob([payload], { type: "application/json" });
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

  const hasContent = Boolean(input.trim());
  const rootTypeLabel = validationResult.meta?.type === "object"
    ? "Object"
    : validationResult.meta?.type === "array"
      ? "Array"
      : validationResult.meta?.type === "primitive"
        ? "Value"
        : "";
  const validationStatus = !hasContent
    ? "No content yet"
    : validationResult.error
      ? "Invalid JSON"
      : validationResult.formatted
        ? `Valid JSON (${rootTypeLabel || "Value"})`
        : "Ready";
  const liveStatus = actionStatus || (isValidating ? "Validating" : validationStatus);
  const activeDiff = diffMode === "formatted" ? formattedDiff : diffMode === "transformed" ? transformedDiff : null;
  const errorLocationLabel = validationResult.error?.line
    ? `Line ${validationResult.error.line}, column ${validationResult.error.col}`
    : "";
  const lineHeightPx = 24;
  const paddingX = 12;
  const paddingY = 12;
  const highlightTop = validationResult.error?.line
    ? paddingY + (validationResult.error.line - 1) * lineHeightPx - scrollTop
    : 0;

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {liveStatus} {validationResult.warning} {validationResult.error?.message}
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">JSON Validator & Linter</h1>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            Local-only guarantee
          </span>
        </div>
        <p className="max-w-3xl text-base text-slate-700">
          Validate JSON, see errors with line/column hints when available, and pretty-print clean output. Runs
          entirely in your browser.
        </p>
        <p className="text-xs text-slate-500">
          Technical note: all parsing, validation, and transformations run in your browser (including the Web Worker); no network requests are made.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div key={tab.id} className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${isActive ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
                  <button type="button" onClick={() => setActiveTabId(tab.id)} className="focus:outline-none">
                    {tab.title}
                  </button>
                  {tabs.length > 1 ? (
                    <button type="button" onClick={() => handleCloseTab(tab.id)} aria-label={`Close ${tab.title}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddTab}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New tab
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleValidate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Validate JSON"
            >
              Validate
            </button>
            <button
              onClick={handlePasteFromClipboard}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Paste JSON from clipboard"
            >
              <Clipboard className="h-4 w-4" />
              Paste
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Upload JSON file"
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              onClick={() => {
                setInput("");
                setLastValidatedInput("");
                setFormattedDiff(null);
                setTransformedDiff(null);
                setDiffMode("off");
                setCopied(false);
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
          <div
            className="relative"
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            {dragActive ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/80 text-sm font-semibold text-slate-700">
                Drop a JSON file to load
              </div>
            ) : null}
            {validationResult.error?.line ? (
              <div className="pointer-events-none absolute inset-0 rounded-xl">
                <div
                  className="absolute left-3 right-3 rounded-md bg-amber-100/80"
                  style={{ top: highlightTop, height: lineHeightPx }}
                />
                <div
                  className="absolute w-0.5 bg-amber-500"
                  style={{
                    top: highlightTop,
                    left: `calc(${(validationResult.error.col ?? 1) - 1}ch + ${paddingX}px)`,
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={redactSecrets}
                onChange={(e) => setRedactSecrets(e.target.checked)}
              />
              Redact secrets on copy/download
            </label>
            {validationResult.warning ? (
              <span className="font-medium text-amber-700" role="alert">
                {validationResult.warning}
              </span>
            ) : null}
          </div>
          {validationResult.error ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              Error: {validationResult.error.message} {errorLocationLabel ? `(${errorLocationLabel})` : ""}
            </p>
          ) : hasContent ? (
            <p className="text-sm text-slate-600">Tip: Paste API responses or config files to check validity.</p>
          ) : (
            <p className="text-sm text-slate-500">No content yet. Paste JSON, drop a file, or use the clipboard.</p>
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
                onClick={handleToggleDiff}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!formattedDiff && !transformedDiff}
                aria-label="Toggle diff view"
              >
                {diffMode === "off" ? "Diff view" : "Hide diff"}
              </button>
              {diffMode !== "off" && (formattedDiff || transformedDiff) ? (
                <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 text-[11px]">
                  {formattedDiff ? (
                    <button
                      type="button"
                      onClick={() => setDiffMode("formatted")}
                      className={`rounded-full px-2 py-1 ${diffMode === "formatted" ? "bg-white text-slate-900" : "text-slate-200"}`}
                    >
                      Formatted
                    </button>
                  ) : null}
                  {transformedDiff ? (
                    <button
                      type="button"
                      onClick={() => setDiffMode("transformed")}
                      className={`rounded-full px-2 py-1 ${diffMode === "transformed" ? "bg-white text-slate-900" : "text-slate-200"}`}
                    >
                      Transformed
                    </button>
                  ) : null}
                </div>
              ) : null}
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
              <button
                onClick={handleShare}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!input.trim()}
                aria-label="Copy shareable link"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
          {diffMode !== "off" && activeDiff ? (
            <div className="grid flex-1 gap-4 overflow-auto p-4 text-xs text-slate-100 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-300">Before</p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-100">
                  {activeDiff.before || "Empty"}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-300">After</p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950/50 p-3 text-xs leading-relaxed text-slate-100">
                  {activeDiff.after || "Empty"}
                </pre>
              </div>
            </div>
          ) : (
            <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
              {validationResult.formatted
                || (validationResult.error
                  ? "Fix errors to see formatted JSON."
                  : hasContent
                    ? "Validated JSON will appear here."
                    : "No content yet. Paste JSON to validate.")}
            </pre>
          )}
        </div>
      </div>

      {validationResult.meta ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <span>Before: {validationResult.meta.charsIn.toLocaleString()} chars / {validationResult.meta.linesIn} lines</span>
          <span>After: {validationResult.meta.charsOut.toLocaleString()} chars / {validationResult.meta.linesOut} lines</span>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Workspace history</h2>
          <span className="text-xs text-slate-500">Privacy: local only (stored in your browser).</span>
        </div>
        {historyEntries.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {historyEntries.map((entry, index) => (
              <button
                key={`${index}-${entry.slice(0, 12)}`}
                type="button"
                onClick={() => handleHistoryLoad(entry)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-inner shadow-slate-100 transition hover:border-slate-300"
              >
                <p className="font-semibold text-slate-900">History {index + 1}</p>
                <p className="mt-1 max-h-10 overflow-hidden font-mono text-[11px] text-slate-500">
                  {entry.slice(0, 180)}{entry.length > 180 ? "…" : ""}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No history yet. Validated inputs will appear here.</p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Tip: use the Share button to create a URL fragment for quick sharing without server uploads.
        </p>
      </div>

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
          <p><strong>JSON5?</strong> Enable the toggle for JSON5 features (comments, trailing commas). Output is normalized to strict JSON.</p>
          <p><strong>Schema validation?</strong> Use the Developer tools panel to paste a schema and validate your JSON.</p>
        </div>
      </div>
    </main>
  );
}
