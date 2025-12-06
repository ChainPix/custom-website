"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, Loader2, Sparkles, Upload, Code2, FileJson2, Shield, Wand2 } from "lucide-react";
import { TreeView } from "./TreeView";
import {
  parseWithBetterError,
  sortObjectKeys,
  escapeString,
  unescapeString,
  buildTreeStructure,
  validateJSONSchema,
  getJSONPath,
  type TreeNode,
} from "@/lib/json-utils";

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

export default function JsonFormatterClient() {
  const [input, setInput] = useState(defaultJson);
  const [output, setOutput] = useState(defaultOutput);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [copied, setCopied] = useState(false);
  const [indentSize, setIndentSize] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New feature states
  const [useJSON5, setUseJSON5] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'tree'>('formatted');
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [formatOnPaste, setFormatOnPaste] = useState(false);
  const [showEscapeTools, setShowEscapeTools] = useState(false);
  const [showSchemaValidator, setShowSchemaValidator] = useState(false);
  const [schemaInput, setSchemaInput] = useState("");
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: Array<{ path: string; message: string }> } | null>(null);
  const pasteRun = useRef(0);

  // Stats calculation
  const stats = useMemo(() => {
    const bytes = new Blob([input]).size;
    const lines = input.split('\n').length;
    const chars = input.length;
    return { bytes, lines, chars };
  }, [input]);

  // Check input size and warn if too large
  useEffect(() => {
    if (stats.bytes > MAX_SIZE_BYTES) {
      setWarning(`Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit of 10MB. Performance may be affected.`);
    } else if (stats.bytes > 1024 * 1024) {
      setWarning(`Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB). Processing may take a moment.`);
    } else {
      setWarning("");
    }
  }, [stats.bytes]);


  const handleFormat = async () => {
    setError("");
    setValidationResult(null);
    setIsProcessing(true);

    // Use setTimeout to allow UI to update with loading state
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const result = parseWithBetterError(input, useJSON5);

      if (result.error) {
        console.error("Failed to format JSON", result.error);
        setOutput("");
        setError(result.error);
        setTreeNodes([]);
        return;
      }

      const processedData = sortKeys ? sortObjectKeys(result.parsed) : result.parsed;
      setOutput(JSON.stringify(processedData, null, indentSize));

      // Build tree structure for tree view
      setTreeNodes(buildTreeStructure(processedData));
    } catch (err) {
      console.error("Failed to stringify JSON", err);
      setOutput("");
      setError("Unable to format JSON. The structure may be too complex.");
      setTreeNodes([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMinify = async () => {
    setError("");
    setValidationResult(null);
    setIsProcessing(true);

    // Use setTimeout to allow UI to update with loading state
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const result = parseWithBetterError(input, useJSON5);

      if (result.error) {
        console.error("Failed to minify JSON", result.error);
        setOutput("");
        setError(result.error);
        setTreeNodes([]);
        return;
      }

      const processedData = sortKeys ? sortObjectKeys(result.parsed) : result.parsed;
      setOutput(JSON.stringify(processedData));

      // Build tree structure for tree view
      setTreeNodes(buildTreeStructure(processedData));
    } catch (err) {
      console.error("Failed to minify JSON", err);
      setOutput("");
      setError("Unable to minify JSON. The structure may be too complex.");
      setTreeNodes([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Escape/Unescape handlers
  const handleEscape = () => {
    try {
      const escaped = escapeString(input);
      setInput(escaped);
      setError("");
    } catch (err) {
      setError("Failed to escape string");
    }
  };

  const handleUnescape = () => {
    try {
      const unescaped = unescapeString(input);
      setInput(unescaped);
      setError("");
    } catch (err) {
      setError("Failed to unescape string");
    }
  };

  // JSON Schema validation
  const handleValidate = async () => {
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
        return;
      }

      const schemaResult = parseWithBetterError(schemaInput, false);
      if (schemaResult.error) {
        setError(`Invalid schema: ${schemaResult.error}`);
        return;
      }

      const result = validateJSONSchema(dataResult.parsed, schemaResult.parsed);
      setValidationResult(result);
    } catch (err) {
      setError("Validation failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  // Tree view node click handler
  const handleNodeClick = (path: string[], value: unknown) => {
    const pathString = getJSONPath(value, path);
    setSelectedPath(pathString);
  };

  // Format on paste handler
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!formatOnPaste) return;

    const text = e.clipboardData.getData('text');
    if (!text) return;

    e.preventDefault();
    setError("");
    setValidationResult(null);
    setInput(text);

    const runId = Date.now();
    pasteRun.current = runId;

    // Auto-format after a short delay
    setTimeout(() => {
      if (pasteRun.current !== runId) return;

      const result = parseWithBetterError(text, useJSON5);
      if (result.error) {
        setError(result.error);
        setOutput("");
        setTreeNodes([]);
        return;
      }

      const processedData = sortKeys ? sortObjectKeys(result.parsed) : result.parsed;
      setOutput(JSON.stringify(processedData, null, indentSize));
      setTreeNodes(buildTreeStructure(processedData));
    }, 120);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onload = async (e) => {
      const content = e.target?.result as string;

      // For large files, use setTimeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));

      setInput(content);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
      setIsUploading(false);
    };
    reader.readAsText(file);

    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  const handleDownload = () => {
    if (!output) return;

    try {
      const blob = new Blob([output], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatted.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download", err);
      setError("Unable to download file. Please try copying the output instead.");
    }
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Unable to copy", err);
      setError("Unable to copy. Please select and copy manually.");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === "enter") {
        event.preventDefault();
        handleFormat();
      } else if (key === "m") {
        event.preventDefault();
        handleMinify();
      } else if (key === "k") {
        event.preventDefault();
        setInput("");
        setOutput("");
        setTreeNodes([]);
        setError("");
        setValidationResult(null);
      } else if (key === "c") {
        if (output) {
          event.preventDefault();
          handleCopy();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFormat, handleMinify, output]);

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
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">JSON Formatter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Format or minify JSON instantly. Paste your JSON to get clean, readable output. No
          sign-ups, no limits.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFormat}
              disabled={isProcessing || isUploading}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Format JSON"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Formatting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Format
                </>
              )}
            </button>
            <button
              onClick={handleMinify}
              disabled={isProcessing || isUploading}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Minify JSON"
            >
              {isProcessing ? "Minifying..." : "Minify"}
            </button>
            <label className={`flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${isUploading || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Load File
                </>
              )}
              <input
                type="file"
                accept=".json,application/json,text/plain"
                onChange={handleFileUpload}
                disabled={isUploading || isProcessing}
                className="hidden"
                aria-label="Upload JSON file"
              />
            </label>
            <button
              onClick={() => setInput("")}
              disabled={isProcessing || isUploading}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Clear input"
            >
              Clear
            </button>
          </div>

          {/* Feature Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
            <button
              onClick={() => setShowEscapeTools(!showEscapeTools)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                showEscapeTools
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Escape Tools
            </button>
            <button
              onClick={() => setShowSchemaValidator(!showSchemaValidator)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${
                showSchemaValidator
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Schema Validator
            </button>
          </div>

          {/* Escape/Unescape Tools */}
          {showEscapeTools && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-700">String Escape/Unescape</p>
              <div className="flex gap-2">
                <button
                  onClick={handleEscape}
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  Escape
                </button>
                <button
                  onClick={handleUnescape}
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                >
                  Unescape
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Convert special characters like \n, \t, and Unicode escapes
              </p>
            </div>
          )}

          {/* Schema Validator */}
          {showSchemaValidator && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-700">JSON Schema Validation</p>
              <textarea
                value={schemaInput}
                onChange={(e) => setSchemaInput(e.target.value)}
                placeholder='Paste JSON Schema here e.g. {"type":"object","required":["name"]}'
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button
                onClick={handleValidate}
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Validate Against Schema
              </button>
              {validationResult && (
                <div className={`rounded-lg p-2 text-xs ${validationResult.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {validationResult.valid ? (
                    <p className="font-semibold">✓ Valid JSON - matches schema</p>
                  ) : (
                    <div>
                      <p className="font-semibold mb-1">✗ Validation Errors:</p>
                      <ul className="space-y-1 pl-4 list-disc">
                        {validationResult.errors.map((err, idx) => (
                          <li key={idx}>
                            <span className="font-medium">{err.path || 'root'}:</span> {err.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
            <div className="flex items-center gap-2">
              <label htmlFor="indent-size" className="text-xs font-medium text-slate-600">
                Indent:
              </label>
              <select
                id="indent-size"
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={sortKeys}
                onChange={(e) => setSortKeys(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Sort keys
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={useJSON5}
                onChange={(e) => setUseJSON5(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              JSON5 mode
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={formatOnPaste}
                onChange={(e) => setFormatOnPaste(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Format on paste
            </label>
          </div>

          <textarea
            className="h-[280px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            spellCheck={false}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onPaste={handlePaste}
            placeholder='Paste JSON here e.g. {"hello":"world"}'
            aria-label="JSON input"
          />

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines · {(stats.bytes / 1024).toFixed(2)} KB</span>
          </div>

          {warning && (
            <p className="text-sm font-medium text-blue-600">{warning}</p>
          )}
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : !warning && (
            <p className="text-sm text-slate-600">Tip: clean API responses, configs, and logs.</p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Output</p>
              {output && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode('formatted')}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                      viewMode === 'formatted'
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <FileJson2 className="h-3.5 w-3.5" />
                    Text
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                      viewMode === 'tree'
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Tree
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={!output}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download formatted JSON"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Copy formatted JSON to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="h-4 w-4" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* JSON Path Viewer */}
          {selectedPath && (
            <div className="border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">Path:</span> {selectedPath}
            </div>
          )}

          {isProcessing ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </div>
          ) : output ? (
            viewMode === 'formatted' ? (
              <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
                {output}
              </pre>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                <TreeView nodes={treeNodes} onNodeClick={handleNodeClick} />
              </div>
            )
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Formatted JSON will appear here.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
