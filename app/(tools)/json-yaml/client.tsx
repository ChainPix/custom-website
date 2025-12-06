"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import yaml from "js-yaml";
import { Check, Clipboard, Download, Loader2, RefreshCcw, Sparkles, Upload } from "lucide-react";

type Mode = "json-to-yaml" | "yaml-to-json";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export default function JsonYamlClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("json-to-yaml");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [yamlIndent, setYamlIndent] = useState(2);
  const [jsonIndent, setJsonIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);
  const [autoConvert, setAutoConvert] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const autoConvertTimer = useRef<NodeJS.Timeout | null>(null);

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
      setWarning(`Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit of 10MB.`);
    } else if (stats.bytes > 1024 * 1024) {
      setWarning(`Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB).`);
    } else {
      setWarning("");
    }
  }, [stats.bytes]);

  // Auto-convert when input changes
  useEffect(() => {
    if (!autoConvert) {
      return;
    }
    if (autoConvertTimer.current) {
      clearTimeout(autoConvertTimer.current);
    }
    autoConvertTimer.current = setTimeout(() => {
      if (!input.trim()) {
        setOutput("");
        setError("");
        return;
      }
      handleConvert();
    }, 250);
    return () => {
      if (autoConvertTimer.current) {
        clearTimeout(autoConvertTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode, yamlIndent, jsonIndent, sortKeys, autoConvert]);

  const getBetterErrorMessage = (err: unknown, conversionMode: Mode): string => {
    if (err instanceof Error) {
      if (conversionMode === "json-to-yaml") {
        // JSON parsing error
        const match = err.message.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1], 10);
          const lines = input.substring(0, position).split('\n');
          const line = lines.length;
          const column = lines[lines.length - 1].length + 1;
          return `Invalid JSON at line ${line}, column ${column}: ${err.message}`;
        }
        return `Invalid JSON: ${err.message}`;
      } else {
        // YAML parsing error
        const mark = (err as yaml.YAMLException & { mark?: { line: number; column: number } }).mark;
        if (mark && typeof mark.line === "number" && typeof mark.column === "number") {
          return `Invalid YAML at line ${mark.line + 1}, column ${mark.column + 1}: ${err.message}`;
        }
        return `Invalid YAML: ${err.message}`;
      }
    }
    return `Invalid ${conversionMode === "json-to-yaml" ? "JSON" : "YAML"} input.`;
  };

  const tryParseJson = (text: string) => {
    try {
      return { ok: true as const, value: JSON.parse(text) };
    } catch (err) {
      return { ok: false as const, error: getBetterErrorMessage(err, "json-to-yaml") };
    }
  };

  const tryParseYaml = (text: string) => {
    try {
      return { ok: true as const, value: yaml.load(text) };
    } catch (err) {
      return { ok: false as const, error: getBetterErrorMessage(err, "yaml-to-json") };
    }
  };

  const sortObjectKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(item => sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((result: Record<string, unknown>, key) => {
          result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
          return result;
        }, {});
    }
    return obj;
  };

  const handleConvert = async () => {
    if (!input.trim()) {
      setError("");
      setOutput("");
      return;
    }

    setIsProcessing(true);
    setError("");

    // Use setTimeout to allow UI to update with loading state
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      if (mode === "json-to-yaml") {
        const parsed = tryParseJson(input);
        if (!parsed.ok) {
          setError(parsed.error);
          setOutput("");
          return;
        }
        const dataToConvert = sortKeys ? sortObjectKeys(parsed.value) : parsed.value;
        try {
          setOutput(yaml.dump(dataToConvert, {
            indent: yamlIndent,
            lineWidth: -1, // Don't wrap lines
            noRefs: true, // Don't use anchors/references
            sortKeys: sortKeys
          }));
        } catch (dumpErr) {
          setError("Unable to convert to YAML (possible circular references).");
          setOutput("");
          return;
        }
      } else {
        const parsed = tryParseYaml(input);
        if (!parsed.ok) {
          setError(parsed.error);
          setOutput("");
          return;
        }
        if (parsed.value === undefined || parsed.value === null || parsed.value === "") {
          setError("Parsed YAML is empty; please provide valid content.");
          setOutput("");
          return;
        }
        const dataToConvert = sortKeys ? sortObjectKeys(parsed.value) : parsed.value;
        try {
          setOutput(JSON.stringify(dataToConvert, null, jsonIndent));
        } catch (stringifyErr) {
          setError("Unable to convert to JSON. Ensure YAML has no anchors or circular structures.");
          setOutput("");
          return;
        }
      }
    } catch (err) {
      console.error("Conversion error", err);
      setError(getBetterErrorMessage(err, mode));
      setOutput("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = [".json", ".yaml", ".yml"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const validTypes = ["application/json", "text/yaml", "application/x-yaml", "text/plain", "application/yaml"];

    if (!hasValidExt && !validTypes.includes(file.type)) {
      setError("Unsupported file type. Upload JSON, YAML, or YML files.");
      event.target.value = "";
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
      const extension = mode === "json-to-yaml" ? "yml" : "json";
      const mimeType = mode === "json-to-yaml" ? "text/yaml" : "application/json";
      const blob = new Blob([output], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${extension}`;
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
      console.error("Copy failed", err);
      setError("Unable to copy. Please select and copy manually.");
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">JSON ⇄ YAML Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert JSON to YAML or YAML to JSON with validation. Perfect for configs, APIs, and infra
          files.
        </p>
        <div className="text-xs text-slate-500" aria-live="polite">
          {autoConvert ? "Auto-convert enabled" : "Auto-convert disabled"}
        </div>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Direction</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Conversion direction"
            >
              <option value="json-to-yaml">JSON → YAML</option>
              <option value="yaml-to-json">YAML → JSON</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Convert between JSON and YAML"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Convert
              </>
            )}
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
              accept=".json,.yaml,.yml,application/json,text/yaml,text/plain"
              onChange={handleFileUpload}
              disabled={isUploading || isProcessing}
              className="hidden"
              aria-label="Upload file"
            />
          </label>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setError("");
            }}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear all fields"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="indent-size" className="text-xs font-medium text-slate-600">
              {mode === "json-to-yaml" ? "YAML" : "JSON"} Indent:
            </label>
            <select
              id="indent-size"
              value={mode === "json-to-yaml" ? yamlIndent : jsonIndent}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (mode === "json-to-yaml") {
                  setYamlIndent(value);
                } else {
                  setJsonIndent(value);
                }
              }}
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
              checked={autoConvert}
              onChange={(e) => setAutoConvert(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Auto-convert
          </label>
        </div>

        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste JSON or YAML depending on the selected direction"
          spellCheck={false}
          aria-label={`Input ${mode === "json-to-yaml" ? "JSON" : "YAML"}`}
        />

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines · {(stats.bytes / 1024).toFixed(2)} KB</span>
        </div>

        {warning && (
          <p className="text-sm font-medium text-blue-600">{warning}</p>
        )}
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">{error}</p>
        ) : !warning && (
          <p className="text-sm text-slate-600">
            Tip: Validate configs before deploying. This runs entirely in your browser.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Output</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Download converted file"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100" aria-live="polite" aria-busy={isProcessing}>
          {isProcessing ? "Converting..." : output || "Converted output will appear here."}
        </pre>
      </div>
    </main>
  );
}
