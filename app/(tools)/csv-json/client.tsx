"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, Loader2, RefreshCcw, Sparkles, Upload } from "lucide-react";

type Mode = "csv-to-json" | "json-to-csv";
type Delimiter = "," | ";" | "\t" | "|";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const MAX_ROWS = 20000;

const splitCsvLine = (line: string, delimiter: Delimiter = ",") => {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i] ?? "";

    if (char === '"') {
      // Handle escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1; // Skip next quote
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
};

function csvToJson(
  csv: string,
  delimiter: Delimiter = ",",
  hasHeaders = true,
  strict = false,
  trimWhitespace = true,
  stripQuotes = false,
) {
  const rawRows = csv.split(/\r?\n/);
  const rows = rawRows
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  if (!rows.length) throw new Error("No rows found after trimming empty lines.");

  const headers = hasHeaders
    ? splitCsvLine(rows[0], delimiter).map((h) => (trimWhitespace ? h.trim() : h))
    : Array.from({ length: splitCsvLine(rows[0], delimiter).length }, (_, i) => `col_${i + 1}`);

  const dataRows = hasHeaders ? rows.slice(1) : rows;

  return dataRows.map((row) => {
    const cols = splitCsvLine(row, delimiter).map((c) => {
      const trimmed = trimWhitespace ? c.trim() : c;
      const stripped = stripQuotes && /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
      return stripped;
    });
    if (strict && cols.length !== headers.length) {
      const rowIndex = rawRows.findIndex((r) => r.trim() === row) + 1 || 0;
      throw new Error(
        `Row ${rowIndex || "?"} has ${cols.length} columns, expected ${headers.length}. Check uneven delimiters or quotes.`,
      );
    }
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header || `col_${idx + 1}`] = cols[idx] ?? "";
    });
    return obj;
  });
}

function jsonToCsv(jsonStr: string, delimiter: Delimiter = ",", includeHeaders = true) {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error("JSON should be an array of objects.");
  const data = parsed as Array<Record<string, unknown>>;

  if (!data.length) return "";
  if (data.length > MAX_ROWS) {
    throw new Error(`Too many rows (${data.length.toLocaleString()}). Please limit to ${MAX_ROWS.toLocaleString()} rows.`);
  }

  const headers = Array.from(
    data.reduce((set: Set<string>, item) => {
      Object.keys(item || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  const escapeCsvValue = (val: string) => {
    const needsQuotes = val.includes(delimiter) || val.includes('"') || val.includes('\n') || val.includes('\r');
    if (needsQuotes) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = data.map((item) =>
    headers
      .map((h) => {
        const raw = item?.[h];
        const val = raw === undefined || raw === null ? "" : String(raw);
        return escapeCsvValue(val);
      })
      .join(delimiter),
  );

  if (includeHeaders) {
    const headerLine = headers.map(h => escapeCsvValue(h)).join(delimiter);
    return [headerLine, ...lines].join("\n");
  }

  return lines.join("\n");
}

export default function CsvJsonClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("csv-to-json");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [hasHeaders, setHasHeaders] = useState(true);
  const [jsonIndent, setJsonIndent] = useState(2);
  const [autoConvert, setAutoConvert] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [strict, setStrict] = useState(false);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [stripQuotes, setStripQuotes] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    const bytes = new Blob([input]).size;
    const trimmed = input.trim();
    const lines = trimmed ? trimmed.split('\n').length : 0;
    const chars = input.length;
    return { bytes, lines, chars };
  }, [input]);

  const detectedInfo = useMemo(() => {
    if (!input.trim() || mode !== "csv-to-json") return null;
    try {
      const rows = input.split(/\r?\n/).filter((r) => r.trim().length > 0);
      const headerCols = hasHeaders ? splitCsvLine(rows[0] ?? "", delimiter).length : 0;
      const dataCount = hasHeaders ? Math.max(rows.length - 1, 0) : rows.length;
      return { headerCols, dataCount };
    } catch {
      return null;
    }
  }, [input, mode, hasHeaders, delimiter]);

  // Check input size and warn if too large
  useEffect(() => {
    if (stats.bytes > MAX_SIZE_BYTES) {
      setWarning(`Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit of 10MB.`);
      return;
    }
    if (stats.lines > 5000) {
      setWarning(`Large input detected (${stats.lines.toLocaleString()} lines). Conversion may take a few seconds.`);
      return;
    }
    if (stats.bytes > 1024 * 1024) {
      setWarning(`Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB).`);
      return;
    }
    setWarning("");
  }, [stats.bytes, stats.lines]);

  // Auto-convert when input changes
  useEffect(() => {
    if (autoConvert && input.trim()) {
      handleConvert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode, delimiter, hasHeaders, jsonIndent, autoConvert]);

  const getBetterErrorMessage = (err: unknown, conversionMode: Mode): string => {
    if (err instanceof Error) {
      if (conversionMode === "json-to-csv") {
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
        return `CSV parsing error: ${err.message}`;
      }
    }
    return `Invalid ${conversionMode === "csv-to-json" ? "CSV" : "JSON"} input.`;
  };

  const handleConvert = async () => {
    if (!input.trim()) {
      setError("");
      setOutput("");
      setStatus("Ready");
      return;
    }

    if (stats.lines > MAX_ROWS) {
      setError(`Too many rows (${stats.lines.toLocaleString()}). Please limit input to ${MAX_ROWS.toLocaleString()} rows or less.`);
      setStatus("Row limit exceeded");
      return;
    }

    setIsProcessing(true);
    setError("");
    setStatus("Converting...");

    // Use setTimeout to allow UI to update with loading state
    await new Promise(resolve => setTimeout(resolve, 0));
    if (stats.lines > 5000) {
      // Allow an extra tick for very large inputs
      setStatus("Processing large input…");
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    try {
      if (mode === "csv-to-json") {
        const result = csvToJson(input, delimiter, hasHeaders, strict, trimWhitespace, stripQuotes);
        setOutput(JSON.stringify(result, null, jsonIndent));
      } else {
        setOutput(jsonToCsv(input, delimiter, hasHeaders));
      }
      setStatus("Done");
    } catch (err) {
      console.error("Conversion error", err);
      setOutput("");
      setError(getBetterErrorMessage(err, mode));
      setStatus("Error");
    } finally {
      setIsProcessing(false);
    }
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
    setStatus("Uploading...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;

      // For large files, use setTimeout to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));

      setInput(content);
      setIsUploading(false);
      setStatus("File loaded");
    };
    reader.onerror = () => {
      setError("Failed to read file. Please try again.");
      setIsUploading(false);
      setStatus("Upload error");
    };
    reader.readAsText(file);

    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  const handleDownload = () => {
    if (!output) return;

    try {
      const extension = mode === "csv-to-json" ? "json" : "csv";
      const mimeType = mode === "csv-to-json" ? "application/json" : "text/csv";
      const blob = new Blob([output], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("Downloaded");
    } catch (err) {
      console.error("Failed to download", err);
      setError("Unable to download file. Please try copying the output instead.");
      setStatus("Download failed");
    }
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setError("Unable to copy. Please select and copy manually.");
      setStatus("Copy failed");
    }
  };

  const handleCopyInput = async () => {
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input);
      setStatus("Input copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const getDelimiterDisplay = (delim: Delimiter) => {
    switch (delim) {
      case "\t": return "Tab";
      case ",": return "Comma";
      case ";": return "Semicolon";
      case "|": return "Pipe";
      default: return delim;
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">CSV ⇄ JSON Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert CSV to JSON or JSON to CSV in your browser. Paste data, convert, and copy.
        </p>
        <p className="text-sm text-slate-600">Runs fully in your browser; files are not uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
          <button
            onClick={() => {
              const sample = `name,role,team\nAda,Engineer,ML\nLin,Designer,UX\nKai,PM,Product`;
              setInput(sample);
              setStatus("Loaded sample CSV");
              setError("");
              if (autoConvert) handleConvert();
            }}
            className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            type="button"
          >
            Load sample CSV
          </button>
          <button
            onClick={() => {
              const sample = JSON.stringify(
                [
                  { name: "Ada", role: "Engineer", team: "ML" },
                  { name: "Lin", role: "Designer", team: "UX" },
                  { name: "Kai", role: "PM", team: "Product" },
                ],
                null,
                2,
              );
              setInput(sample);
              setStatus("Loaded sample JSON");
              setError("");
              if (autoConvert) handleConvert();
            }}
            className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            type="button"
          >
            Load sample JSON
          </button>
          <button
            onClick={handleCopyInput}
            className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={!input}
          >
            Copy input
          </button>
          <button
            onClick={() => {
              setOutput("");
              setStatus("Output cleared");
            }}
            className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={!output}
          >
            Clear output
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Direction</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Conversion direction"
            >
              <option value="csv-to-json">CSV → JSON</option>
              <option value="json-to-csv">JSON → CSV</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Convert between CSV and JSON"
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
              accept=".csv,.json,text/csv,application/json,text/plain"
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
              setStatus("Cleared");
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
            <label htmlFor="delimiter" className="text-xs font-medium text-slate-600">
              Delimiter:
            </label>
            <select
              id="delimiter"
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value as Delimiter)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value=",">{getDelimiterDisplay(",")}</option>
              <option value=";">{getDelimiterDisplay(";")}</option>
              <option value={"\t"}>{getDelimiterDisplay("\t")}</option>
              <option value="|">{getDelimiterDisplay("|")}</option>
            </select>
          </div>
          {mode === "csv-to-json" && (
            <div className="flex items-center gap-2">
              <label htmlFor="json-indent" className="text-xs font-medium text-slate-600">
                JSON Indent:
              </label>
              <select
                id="json-indent"
                value={jsonIndent}
                onChange={(e) => setJsonIndent(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            {mode === "csv-to-json" ? "First row is header" : "Include header row"}
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
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Strict (consistent columns)
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={trimWhitespace}
              onChange={(e) => setTrimWhitespace(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Trim whitespace
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={stripQuotes}
              onChange={(e) => setStripQuotes(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Strip wrapping quotes
          </label>
        </div>

        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste CSV rows or JSON array depending on direction"
          spellCheck={false}
          aria-label={`Input ${mode === "csv-to-json" ? "CSV" : "JSON"}`}
        />

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines · {(stats.bytes / 1024).toFixed(2)} KB</span>
          {detectedInfo && (
            <span className="text-slate-600">
              {hasHeaders ? `Headers: ${detectedInfo.headerCols} ·` : null} Rows: {detectedInfo.dataCount.toLocaleString()}
            </span>
          )}
        </div>

        {warning && (
          <p className="text-sm font-medium text-blue-600">{warning}</p>
        )}
        {error ? (
          <p className="text-sm font-medium text-amber-600">{error}</p>
        ) : !warning && (
          <p className="text-sm text-slate-600">
            Tip: For JSON → CSV, provide an array of objects. Supports various delimiters.
          </p>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="output-label">Output</p>
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
        <pre
          className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
          role="region"
          aria-labelledby="output-label"
          tabIndex={0}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Converting...</span>
            </div>
          ) : (
            output || "Converted output will appear here."
          )}
        </pre>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Select direction (CSV → JSON or JSON → CSV) and set delimiter/header options.</li>
          <li>Paste data or load a file; use trim/strip/strict toggles if your CSV needs cleanup.</li>
          <li>Press Convert or enable Auto-convert; copy/download results or clear output as needed.</li>
          <li>For JSON → CSV, provide an array of objects; for CSV → JSON, ensure consistent columns for strict mode.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is my data uploaded?</summary>
            <p className="mt-2 text-slate-700">No. Conversion happens locally in your browser; files are not sent to a server.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">What delimiters are supported?</summary>
            <p className="mt-2 text-slate-700">Comma, semicolon, tab, and pipe. You can also strip wrapping quotes and trim whitespace.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Any size limits?</summary>
            <p className="mt-2 text-slate-700">The tool warns on very large inputs and enforces a soft limit of 20,000 rows for reliability.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
