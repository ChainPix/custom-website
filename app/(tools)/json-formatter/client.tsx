"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { escapeString, parseWithBetterError, unescapeString, validateJSONSchema } from "@/lib/json-utils";
import { EscapePanel } from "./components/EscapePanel";
import { Editors } from "./components/Editors";
import { OptionsBar } from "./components/OptionsBar";
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

  const {
    input,
    setInput,
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
    useJSON5,
    setUseJSON5,
    formatOnPaste,
    setFormatOnPaste,
    isProcessing,
    treeNodes,
    selectedPath,
    handleNodeClick,
    handleFormat: runFormat,
    handleMinify: runMinify,
    handlePasteValue,
    clearAll,
  } = useJsonProcessor({
    defaultInput: defaultJson,
    defaultOutput,
    maxSizeBytes: MAX_SIZE_BYTES,
  });

  const handleFormat = useCallback(async () => {
    setValidationResult(null);
    await runFormat();
  }, [runFormat, setValidationResult]);

  const handleMinify = useCallback(async () => {
    setValidationResult(null);
    await runMinify();
  }, [runMinify, setValidationResult]);

  const handleClear = useCallback(() => {
    clearAll();
    setValidationResult(null);
  }, [clearAll, setValidationResult]);

  const handlePasteInput = useCallback(
    (value: string) => {
      setValidationResult(null);
      handlePasteValue(value);
    },
    [handlePasteValue, setValidationResult],
  );

  const handleEscape = useCallback(() => {
    try {
      const escaped = escapeString(input);
      setInput(escaped);
      setError("");
    } catch (err) {
      setError("Failed to escape string");
    }
  }, [input, setError, setInput]);

  const handleUnescape = useCallback(() => {
    try {
      const unescaped = unescapeString(input);
      setInput(unescaped);
      setError("");
    } catch (err) {
      setError("Failed to unescape string");
    }
  }, [input, setError, setInput]);

  const handleValidate = useCallback(async () => {
    setError("");
    setValidationResult(null);

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
  }, [input, schemaInput, setError, setErrorLocation, useJSON5]);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

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

      const reader = new FileReader();
      reader.onload = async (eventResult) => {
        const content = eventResult.target?.result as string;

        await new Promise((resolve) => setTimeout(resolve, 0));

        setInput(content);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
        setIsUploading(false);
      };
      reader.readAsText(file);

      event.target.value = "";
    },
    [setError, setInput],
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
        controls={
          <>
            <Toolbar
              isProcessing={isProcessing}
              isUploading={isUploading}
              showEscapeTools={showEscapeTools}
              showSchemaValidator={showSchemaValidator}
              onFormat={handleFormat}
              onMinify={handleMinify}
              onClear={handleClear}
              onUpload={handleFileUpload}
              onToggleEscapeTools={() => setShowEscapeTools((current) => !current)}
              onToggleSchemaValidator={() => setShowSchemaValidator((current) => !current)}
            />

            {showEscapeTools && <EscapePanel onEscape={handleEscape} onUnescape={handleUnescape} />}

            {showSchemaValidator && (
              <SchemaPanel
                schemaInput={schemaInput}
                onSchemaChange={setSchemaInput}
                onValidate={handleValidate}
                validationResult={validationResult}
              />
            )}

            <OptionsBar
              indentSize={indentSize}
              sortKeys={sortKeys}
              useJSON5={useJSON5}
              formatOnPaste={formatOnPaste}
              onIndentChange={setIndentSize}
              onSortKeysChange={setSortKeys}
              onJSON5Change={setUseJSON5}
              onFormatOnPasteChange={setFormatOnPaste}
            />
          </>
        }
        onInputChange={setInput}
        onPasteValue={handlePasteInput}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onNodeClick={handleNodeClick}
      />
    </main>
  );
}
