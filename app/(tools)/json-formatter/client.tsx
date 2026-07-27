"use client";

import Link from "next/link";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  escapeString,
  generateJSONSchema,
  parseWithBetterError,
  unescapeString,
  validateJSONSchema,
  type TreeNode,
} from "@/lib/json-utils";
import { DiffPanel } from "./components/DiffPanel";
import { EscapePanel } from "./components/EscapePanel";
import { Editors } from "./components/Editors";
import { OptionsBar } from "./components/OptionsBar";
import { QueryPanel } from "./components/QueryPanel";
import { SchemaPanel } from "./components/SchemaPanel";
import { Toolbar } from "./components/Toolbar";
import { useJsonProcessor } from "./hooks/useJsonProcessor";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

const defaultJson = `{
  "name": "FastFormat",
  "type": "online tool",
  "features": ["json formatter", "resume analyzer", "pdf to text"],
  "fast": true
}`;

const defaultOutput = `{
  "name": "FastFormat",
  "type": "online tool",
  "features": [
    "json formatter",
    "resume analyzer",
    "pdf to text"
  ],
  "fast": true
}`;

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const HISTORY_KEY = "json-formatter-history-v1";
const HISTORY_LIMIT = 10;
const SHARE_WARNING_LENGTH = 2000;

type HistoryEntry = {
  id: string;
  value: string;
  createdAt: number;
};

type ValidationResult = {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
};

export default function JsonFormatterClient() {
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEscapeTools, setShowEscapeTools] = useState(false);
  const [showSchemaValidator, setShowSchemaValidator] = useState(false);
  const [schemaInput, setSchemaInput] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [viewMode, setViewMode] = useState<"formatted" | "tree">("formatted");
  const [showQueryPanel, setShowQueryPanel] = useState(false);
  const [showDiffPanel, setShowDiffPanel] = useState(false);
  const [queryInput, setQueryInput] = useState("$.");
  const [queryResult, setQueryResult] = useState("");
  const [queryCount, setQueryCount] = useState(0);
  const [queryError, setQueryError] = useState("");
  const [schemaHighlightPointer, setSchemaHighlightPointer] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [shareWarning, setShareWarning] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const historyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const schemaTemplates = useMemo(
    () => [
      {
        label: "Basic object",
        value: `{\n  \"$schema\": \"https://json-schema.org/draft/2020-12/schema\",\n  \"type\": \"object\",\n  \"properties\": {\n    \"id\": { \"type\": \"string\" },\n    \"name\": { \"type\": \"string\" }\n  },\n  \"required\": [\"id\", \"name\"]\n}`,
      },
      {
        label: "Array of objects",
        value: `{\n  \"$schema\": \"https://json-schema.org/draft/2020-12/schema\",\n  \"type\": \"array\",\n  \"items\": {\n    \"type\": \"object\",\n    \"properties\": {\n      \"id\": { \"type\": \"string\" },\n      \"value\": { \"type\": \"number\" }\n    },\n    \"required\": [\"id\", \"value\"]\n  }\n}`,
      },
      {
        label: "API response",
        value: `{\n  \"$schema\": \"https://json-schema.org/draft/2020-12/schema\",\n  \"type\": \"object\",\n  \"properties\": {\n    \"data\": { \"type\": \"array\" },\n    \"meta\": { \"type\": \"object\" },\n    \"error\": { \"type\": [\"object\", \"null\"] }\n  },\n  \"required\": [\"data\"]\n}`,
      },
    ],
    [],
  );

  const {
    input,
    updateInput,
    output,
    error,
    setError,
    errorLocation,
    setErrorLocation,
    warning,
    stats,
    indentSize,
    setIndentSize,
    sortKeys,
    setSortKeys,
    sortScope,
    setSortScope,
    useJSON5,
    setUseJSON5,
    formatOnPaste,
    setFormatOnPaste,
    formatOnType,
    setFormatOnType,
    preserveNumberFormat,
    setPreserveNumberFormat,
    isProcessing,
    treeNodes,
    selectedPath,
    selectedPointer,
    selectedValue,
    handleNodeClick,
    handleFormat: runFormat,
    handleMinify: runMinify,
    clearAll,
    parsedData,
    analysis,
  } = useJsonProcessor({
    defaultInput: defaultJson,
    defaultOutput,
    maxSizeBytes: MAX_SIZE_BYTES,
    shouldBuildTree: viewMode === "tree",
  });

  const handleFormat = useCallback(async () => {
    setValidationResult(null);
    setSchemaHighlightPointer("");
    await runFormat();
  }, [runFormat, setSchemaHighlightPointer, setValidationResult]);

  const handleMinify = useCallback(async () => {
    setValidationResult(null);
    setSchemaHighlightPointer("");
    await runMinify();
  }, [runMinify, setSchemaHighlightPointer, setValidationResult]);

  const handleClear = useCallback(() => {
    clearAll();
    setValidationResult(null);
    setSchemaHighlightPointer("");
  }, [clearAll, setSchemaHighlightPointer, setValidationResult]);

  const handlePasteInput = useCallback(
    (value: string) => {
      setValidationResult(null);
      setSchemaHighlightPointer("");
      updateInput(value, "paste");
    },
    [setSchemaHighlightPointer, setValidationResult, updateInput],
  );

  const handleEscape = useCallback(() => {
    try {
      const escaped = escapeString(input);
      setSchemaHighlightPointer("");
      updateInput(escaped, "program");
      setError("");
    } catch {
      setError("Failed to escape string");
    }
  }, [input, setError, setSchemaHighlightPointer, updateInput]);

  const handleUnescape = useCallback(() => {
    try {
      const unescaped = unescapeString(input);
      setSchemaHighlightPointer("");
      updateInput(unescaped, "program");
      setError("");
    } catch {
      setError("Failed to unescape string");
    }
  }, [input, setError, setSchemaHighlightPointer, updateInput]);

  const schemaVersion = useMemo(() => {
    if (!schemaInput.trim()) return "";
    const parsed = parseWithBetterError(schemaInput, false);
    if (parsed.error || !parsed.parsed || typeof parsed.parsed !== "object") {
      return "";
    }
    const schemaValue = (parsed.parsed as Record<string, unknown>).$schema;
    return typeof schemaValue === "string" ? schemaValue : "";
  }, [schemaInput]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as HistoryEntry[];
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash.startsWith("#json=")) return;
    const payload = window.location.hash.slice(6);
    if (!payload) return;
    const decoded = decompressFromEncodedURIComponent(payload);
    if (!decoded) {
      setError("Share link could not be decoded.");
      return;
    }
    updateInput(decoded, "program");
  }, [setError, updateInput]);

  useEffect(() => {
    if (historyTimerRef.current) {
      clearTimeout(historyTimerRef.current);
    }
    if (!input.trim()) return;
    historyTimerRef.current = setTimeout(() => {
      setHistory((prev) => {
        const id = `${Date.now()}`;
        const next = [
          { id, value: input, createdAt: Date.now() },
          ...prev.filter((entry) => entry.value !== input),
        ].slice(0, HISTORY_LIMIT);
        if (typeof window !== "undefined") {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        }
        return next;
      });
    }, 600);
    return () => {
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current);
      }
    };
  }, [input]);

  useEffect(() => {
    setShareStatus("");
  }, [input]);

  const handleValidate = useCallback(async () => {
    setError("");
    setValidationResult(null);
    setSchemaHighlightPointer("");

    if (!schemaInput.trim()) {
      setError("Please enter a JSON Schema to validate against");
      return;
    }

    try {
      const dataResult = parseWithBetterError(input, useJSON5);
      if (dataResult.error) {
        setError(dataResult.error);
        setErrorLocation(dataResult.errorLocation ?? null);
        return;
      }

      const schemaResult = parseWithBetterError(schemaInput, false);
      if (schemaResult.error) {
        setError(`Invalid schema: ${schemaResult.error}`);
        setErrorLocation(null);
        return;
      }

      setErrorLocation(null);
      const result = validateJSONSchema(dataResult.parsed, schemaResult.parsed);
      setValidationResult(result);
    } catch (err) {
      setError("Validation failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setErrorLocation(null);
    }
  }, [input, schemaInput, setError, setErrorLocation, setSchemaHighlightPointer, useJSON5]);

  const handleTemplateSelect = useCallback(
    (value: string) => {
      if (!value) return;
      setSchemaInput(value);
      setValidationResult(null);
      setSchemaHighlightPointer("");
    },
    [setSchemaHighlightPointer, setSchemaInput],
  );

  const handleGenerateSchema = useCallback(() => {
    const result = parseWithBetterError(input, useJSON5);
    if (result.error) {
      setError(result.error);
      return;
    }
    const schema = generateJSONSchema(result.parsed);
    setSchemaInput(JSON.stringify(schema, null, 2));
    setValidationResult(null);
    setSchemaHighlightPointer("");
  }, [input, setError, setSchemaHighlightPointer, setSchemaInput, setValidationResult, useJSON5]);

  const handleSelectSchemaError = useCallback(
    (path: string) => {
      const normalized = path === "root" ? "" : path;
      if (normalized && !normalized.startsWith("/")) {
        setSchemaHighlightPointer("");
        return;
      }
      setSchemaHighlightPointer(normalized);
      setViewMode("tree");
    },
    [setSchemaHighlightPointer, setViewMode],
  );

  const handleTreeNodeClick = useCallback(
    (node: TreeNode) => {
      handleNodeClick(node);
      setSchemaHighlightPointer("");
    },
    [handleNodeClick, setSchemaHighlightPointer],
  );

  const handleDropFile = useCallback(
    async (file: File) => {
      const validTypes = ["application/json", "text/plain", "text/json", "application/vnd.api+json"];
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".json")) {
        setError("Unsupported file type. Please upload a .json or plain text file.");
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB.`);
        return;
      }

      setIsUploading(true);
      setError("");
      setValidationResult(null);
      setSchemaHighlightPointer("");
      const reader = new FileReader();
      reader.onload = async (eventResult) => {
        const content = eventResult.target?.result as string;
        await new Promise((resolve) => setTimeout(resolve, 0));
        updateInput(content, "program");
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
        setIsUploading(false);
      };
      reader.readAsText(file);
    },
    [setError, setSchemaHighlightPointer, setValidationResult, updateInput],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await handleDropFile(file);

      event.target.value = "";
    },
    [handleDropFile],
  );

  const handleDownload = useCallback(() => {
    if (!output) return;

    try {
      const blob = new Blob([output], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "formatted.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download", err);
      setError("Unable to download file. Please try copying the output instead.");
    }
  }, [output, setError]);

  const handleCopy = useCallback(async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Unable to copy", err);
      setError("Unable to copy. Please select and copy manually.");
    }
  }, [output, setError]);

  const handleCopyPath = useCallback(async () => {
    if (!selectedPath) return;
    try {
      await navigator.clipboard.writeText(selectedPath);
    } catch (err) {
      console.error("Unable to copy path", err);
      setError("Unable to copy path. Please select and copy manually.");
    }
  }, [selectedPath, setError]);

  const handleCopyPointer = useCallback(async () => {
    if (!selectedPointer) return;
    try {
      await navigator.clipboard.writeText(selectedPointer);
    } catch (err) {
      console.error("Unable to copy pointer", err);
      setError("Unable to copy pointer. Please select and copy manually.");
    }
  }, [selectedPointer, setError]);

  const handleCopyValue = useCallback(async () => {
    if (selectedValue === null || selectedValue === undefined) return;
    try {
      const valueText =
        typeof selectedValue === "string"
          ? selectedValue
          : JSON.stringify(selectedValue, null, 2);
      await navigator.clipboard.writeText(valueText);
    } catch (err) {
      console.error("Unable to copy value", err);
      setError("Unable to copy value. Please select and copy manually.");
    }
  }, [selectedValue, setError]);

  const tokenizePath = useCallback((path: string) => {
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
        } else if (/^-?\\d+$/.test(content)) {
          tokens.push({ type: "index", value: Number(content) });
        } else {
          return { tokens, error: "Invalid JSONPath bracket selector." };
        }
        i = closeIndex + 1;
        continue;
      }
      if (/\\s/.test(char)) {
        i += 1;
        continue;
      }
      return { tokens, error: `Unexpected token '${char}' in JSONPath.` };
    }
    return { tokens, error: "" };
  }, []);

  const handleRunQuery = useCallback(() => {
    let source = parsedData;
    if (!source) {
      const parsed = parseWithBetterError(input, useJSON5);
      if (!parsed.parsed || parsed.error) {
        setQueryError(parsed.error || "Format JSON before querying.");
        setQueryResult("");
        setQueryCount(0);
        return;
      }
      source = parsed.parsed;
    }
    const { tokens, error } = tokenizePath(queryInput);
    if (error) {
      setQueryError(error);
      setQueryResult("");
      setQueryCount(0);
      return;
    }
    let current: unknown[] = [source];
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
    setQueryError("");
    setQueryCount(current.length);
    setQueryResult(JSON.stringify(current.length === 1 ? current[0] : current, null, 2));
  }, [input, parsedData, queryInput, tokenizePath, useJSON5]);

  const handleCopyQueryResult = useCallback(async () => {
    if (!queryResult) return;
    try {
      await navigator.clipboard.writeText(queryResult);
    } catch (err) {
      console.error("Unable to copy query result", err);
      setError("Unable to copy query result. Please select and copy manually.");
    }
  }, [queryResult, setError]);

  const handleFixJson5 = useCallback(() => {
    const result = parseWithBetterError(input, true);
    if (result.error) {
      setError(result.error);
      setErrorLocation(result.errorLocation ?? null);
      return;
    }
    const fixed = JSON.stringify(result.parsed, null, indentSize);
    updateInput(fixed, "program");
    setError("");
    setErrorLocation(null);
    setValidationResult(null);
    setSchemaHighlightPointer("");
  }, [indentSize, input, setError, setErrorLocation, setSchemaHighlightPointer, setValidationResult, updateInput]);

  const handleShareLink = useCallback(async () => {
    if (!input) return;
    const compressed = compressToEncodedURIComponent(input);
    const hash = `#json=${compressed}`;
    const shareUrl = `${window.location.origin}${window.location.pathname}${hash}`;
    setShareWarning(shareUrl.length > SHARE_WARNING_LENGTH ? "Share link is quite long and may not work everywhere." : "");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("Share link copied.");
    } catch (err) {
      console.error("Unable to copy share link", err);
      setShareStatus("Share link ready. Copy it from the address bar.");
    }
    window.location.hash = hash;
  }, [input]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  const handleHistorySelect = useCallback(
    (value: string) => {
      const entry = history.find((item) => item.id === value);
      if (!entry) return;
      updateInput(entry.value, "program");
      setValidationResult(null);
      setSchemaHighlightPointer("");
    },
    [history, setSchemaHighlightPointer, setValidationResult, updateInput],
  );

  const handleSampleSelect = useCallback(
    (value: string) => {
      if (!value) return;
      updateInput(value, "program");
      setValidationResult(null);
      setSchemaHighlightPointer("");
    },
    [setSchemaHighlightPointer, setValidationResult, updateInput],
  );

  const samples = useMemo(
    () => [
      {
        label: "API response",
        value: `{\n  \"data\": [\n    { \"id\": \"usr_01\", \"name\": \"Ada\", \"role\": \"admin\" },\n    { \"id\": \"usr_02\", \"name\": \"Linus\", \"role\": \"member\" }\n  ],\n  \"meta\": { \"count\": 2, \"page\": 1 }\n}`,
      },
      {
        label: "Config file",
        value: `{\n  \"app\": \"FastFormat\",\n  \"env\": \"production\",\n  \"features\": {\n    \"jsonFormatter\": true,\n    \"schemaValidation\": true\n  },\n  \"limits\": { \"maxPayloadMb\": 10 }\n}`,
      },
      {
        label: "OpenAPI snippet",
        value: `{\n  \"openapi\": \"3.1.0\",\n  \"info\": { \"title\": \"FastFormat API\", \"version\": \"1.0.0\" },\n  \"paths\": {\n    \"/users\": {\n      \"get\": {\n        \"responses\": {\n          \"200\": {\n            \"description\": \"ok\",\n            \"content\": { \"application/json\": { \"schema\": { \"type\": \"array\" } } }\n          }\n        }\n      }\n    }\n  }\n}`,
      },
    ],
    [],
  );

  useKeyboardShortcuts({
    onFormat: handleFormat,
    onMinify: handleMinify,
    onClear: handleClear,
    onCopy: handleCopy,
    canCopy: Boolean(output),
  });

  const statusMessage = isProcessing
    ? "Formatting JSON..."
    : error
      ? `Error: ${error}`
      : validationResult
        ? validationResult.valid
          ? "Validation succeeded"
          : "Validation failed"
        : "Ready";

  return (
    <main className="space-y-8">
      <div role="status" aria-live="polite" className="sr-only" suppressHydrationWarning>
        {statusMessage}
      </div>
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol
          className="flex items-center gap-2 text-slate-600"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link
              href="/"
              itemProp="item"
              className="underline underline-offset-4 transition hover:text-slate-900"
            >
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name" className="font-medium text-slate-900">
              JSON Formatter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JSON Formatter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Format or minify JSON instantly. Paste your JSON to get clean, readable output. Runs
          locally in your browser. Handles up to 10MB.
        </p>
      </header>

      <Editors
        input={input}
        output={output}
        error={error}
        errorLocation={errorLocation}
        warning={warning}
        stats={stats}
        isProcessing={isProcessing}
        copied={copied}
        treeNodes={treeNodes}
        selectedPath={selectedPath}
        selectedPointer={selectedPointer}
        highlightPointer={schemaHighlightPointer}
        duplicateKeyPointers={analysis.duplicateKeyPointers}
        hasComments={analysis.hasComments}
        hasTrailingCommas={analysis.hasTrailingCommas}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        controls={
          <>
            <Toolbar
              isProcessing={isProcessing}
              isUploading={isUploading}
              showEscapeTools={showEscapeTools}
              showSchemaValidator={showSchemaValidator}
              showQueryPanel={showQueryPanel}
              showDiffPanel={showDiffPanel}
              onFormat={handleFormat}
              onMinify={handleMinify}
              onClear={handleClear}
              onUpload={handleFileUpload}
              onToggleEscapeTools={() => setShowEscapeTools((current) => !current)}
              onToggleSchemaValidator={() => setShowSchemaValidator((current) => !current)}
              onToggleQueryPanel={() => setShowQueryPanel((current) => !current)}
              onToggleDiffPanel={() => setShowDiffPanel((current) => !current)}
            />

            {showEscapeTools && <EscapePanel onEscape={handleEscape} onUnescape={handleUnescape} />}

            {showSchemaValidator && (
              <SchemaPanel
                schemaInput={schemaInput}
                schemaVersion={schemaVersion}
                templates={schemaTemplates}
                onSchemaChange={setSchemaInput}
                onValidate={handleValidate}
                onTemplateSelect={handleTemplateSelect}
                onGenerateSchema={handleGenerateSchema}
                onSelectError={handleSelectSchemaError}
                validationResult={validationResult}
              />
            )}

            {showQueryPanel && (
              <QueryPanel
                queryInput={queryInput}
                queryResult={queryResult}
                queryCount={queryCount}
                queryError={queryError}
                onQueryChange={setQueryInput}
                onRunQuery={handleRunQuery}
                onCopyResult={handleCopyQueryResult}
              />
            )}

            <OptionsBar
              indentSize={indentSize}
              sortKeys={sortKeys}
              sortScope={sortScope}
              useJSON5={useJSON5}
              formatOnPaste={formatOnPaste}
              formatOnType={formatOnType}
              preserveNumberFormat={preserveNumberFormat}
              onIndentChange={setIndentSize}
              onSortKeysChange={setSortKeys}
              onSortScopeChange={setSortScope}
              onJSON5Change={setUseJSON5}
              onFormatOnPasteChange={setFormatOnPaste}
              onFormatOnTypeChange={setFormatOnType}
              onPreserveNumberFormatChange={setPreserveNumberFormat}
            />

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              <button
                onClick={handleShareLink}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Share link
              </button>
              <select
                value=""
                onChange={(event) => handleHistorySelect(event.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="" disabled>
                  Load history
                </option>
                {history.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.value.split("\n")[0].slice(0, 40) || "Untitled input"}
                  </option>
                ))}
              </select>
              <button
                onClick={handleClearHistory}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Clear history
              </button>
              <select
                value=""
                onChange={(event) => handleSampleSelect(event.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="" disabled>
                  Load sample
                </option>
                {samples.map((sample) => (
                  <option key={sample.label} value={sample.value}>
                    {sample.label}
                  </option>
                ))}
              </select>
              {shareStatus && <span className="text-xs text-slate-500">{shareStatus}</span>}
              {shareWarning && <span className="text-xs text-amber-600">{shareWarning}</span>}
            </div>
          </>
        }
        onInputChange={(value) => updateInput(value, "type")}
        onPasteValue={handlePasteInput}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onCopyPath={handleCopyPath}
        onCopyPointer={handleCopyPointer}
        onCopyValue={handleCopyValue}
        onFixJson5={handleFixJson5}
        onDropFile={handleDropFile}
        onNodeClick={handleTreeNodeClick}
      />

      {showDiffPanel && <DiffPanel useJSON5={useJSON5} sortKeys={sortKeys} />}
    </main>
  );
}
