"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, Loader2, Sparkles, Upload } from "lucide-react";

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

  const parseWithBetterError = (jsonString: string) => {
    try {
      return { parsed: JSON.parse(jsonString), error: null };
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Try to extract line/column info from error message
        const match = err.message.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1], 10);
          const lines = jsonString.substring(0, position).split('\n');
          const line = lines.length;
          const column = lines[lines.length - 1].length + 1;
          return {
            parsed: null,
            error: `Invalid JSON at line ${line}, column ${column}: ${err.message}`
          };
        }
        return { parsed: null, error: `Invalid JSON: ${err.message}` };
      }
      return { parsed: null, error: "Invalid JSON. Ensure keys and strings use quotes." };
    }
  };

  const handleFormat = async () => {
    setError("");
    setIsProcessing(true);

    // Use setTimeout to allow UI to update with loading state
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const result = parseWithBetterError(input);

      if (result.error) {
        console.error("Failed to format JSON", result.error);
        setOutput("");
        setError(result.error);
        return;
      }

      if (sortKeys) {
        const sorted = sortObjectKeys(result.parsed);
        setOutput(JSON.stringify(sorted, null, indentSize));
      } else {
        setOutput(JSON.stringify(result.parsed, null, indentSize));
      }
    } catch (err) {
      console.error("Failed to stringify JSON", err);
      setOutput("");
      setError("Unable to format JSON. The structure may be too complex.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMinify = async () => {
    setError("");
    setIsProcessing(true);

    // Use setTimeout to allow UI to update with loading state
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const result = parseWithBetterError(input);

      if (result.error) {
        console.error("Failed to minify JSON", result.error);
        setOutput("");
        setError(result.error);
        return;
      }

      if (sortKeys) {
        const sorted = sortObjectKeys(result.parsed);
        setOutput(JSON.stringify(sorted));
      } else {
        setOutput(JSON.stringify(result.parsed));
      }
    } catch (err) {
      console.error("Failed to minify JSON", err);
      setOutput("");
      setError("Unable to minify JSON. The structure may be too complex.");
    } finally {
      setIsProcessing(false);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

  return (
    <main className="space-y-8">
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
          </div>

          <textarea
            className="h-[280px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            spellCheck={false}
            value={input}
            onChange={(event) => setInput(event.target.value)}
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
            <p className="text-sm font-semibold">Output</p>
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
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              output || "Formatted JSON will appear here."
            )}
          </pre>
        </div>
      </div>
    </main>
  );
}
