"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Check, Clipboard, Download, Loader2, RefreshCcw, Sparkles, Upload } from "lucide-react";

type Mode = "csv-to-json" | "json-to-csv";
type Delimiter = "," | ";" | "\t" | "|" | "auto";
type CsvValue = string | number | boolean | null;
type CsvType = "string" | "number" | "boolean" | "mixed" | "empty";
type BooleanMapping = "true-false" | "yes-no" | "y-n" | "one-zero";
type ColumnType = "auto" | "string" | "number" | "boolean" | "date";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const MAX_ROWS = 20000;
const WORKER_THRESHOLD_BYTES = 250 * 1024;
const WORKER_THRESHOLD_LINES = 2000;

const parseCsvRows = (csv: string, delimiter: Delimiter = ",") => {
  const normalizedCsv = csv.replace(/^\uFEFF/, "");
  const result = Papa.parse<string[]>(normalizedCsv, {
    delimiter: delimiter === "auto" ? undefined : delimiter,
    skipEmptyLines: "greedy",
  });

  if (result.errors.length) {
    const [first] = result.errors;
    const rowInfo = typeof first.row === "number" ? ` (line ${first.row + 1})` : "";
    throw new Error(`${first.message}${rowInfo}`);
  }

  return result.data;
};

const makeUniqueHeaders = (headers: string[]) => {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const raw = header || `col_${index + 1}`;
    const count = seen.get(raw) ?? 0;
    seen.set(raw, count + 1);
    return count === 0 ? raw : `${raw}_${count + 1}`;
  });
};

const getBooleanTokens = (mapping: BooleanMapping) => {
  switch (mapping) {
    case "yes-no":
      return { trueTokens: ["yes"], falseTokens: ["no"] };
    case "y-n":
      return { trueTokens: ["y"], falseTokens: ["n"] };
    case "one-zero":
      return { trueTokens: ["1"], falseTokens: ["0"] };
    default:
      return { trueTokens: ["true"], falseTokens: ["false"] };
  }
};

const parseBoolean = (value: string, mapping: BooleanMapping): boolean | null => {
  const lowered = value.toLowerCase();
  const { trueTokens, falseTokens } = getBooleanTokens(mapping);
  if (trueTokens.includes(lowered)) return true;
  if (falseTokens.includes(lowered)) return false;
  return null;
};

const parseDateString = (value: string): string | null => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
};

const coerceCsvValue = (
  value: string,
  options: {
    inferTypes: boolean;
    emptyAsNull: boolean;
    booleanMapping: BooleanMapping;
    dateParse: boolean;
    columnType?: ColumnType;
  },
): CsvValue => {
  if (options.emptyAsNull && value === "") return null;

  const normalized = value.trim();
  const isTrimmed = normalized === value;
  const columnType = options.columnType ?? "auto";

  if (columnType === "string") return value;
  if (columnType === "number") {
    if (!isTrimmed || !normalized) return value;
    const num = Number(normalized);
    return Number.isNaN(num) ? value : num;
  }
  if (columnType === "boolean") {
    if (!isTrimmed || !normalized) return value;
    const parsed = parseBoolean(normalized, options.booleanMapping);
    return parsed === null ? value : parsed;
  }
  if (columnType === "date") {
    if (!isTrimmed || !normalized) return value;
    const parsed = parseDateString(normalized);
    return parsed ?? value;
  }

  if (!options.inferTypes) return value;
  if (!value) return value;
  if (!isTrimmed) return value;
  const parsedBoolean = parseBoolean(normalized, options.booleanMapping);
  if (parsedBoolean !== null) return parsedBoolean;
  if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalized)) {
    return Number(normalized);
  }
  if (options.dateParse) {
    const parsedDate = parseDateString(normalized);
    if (parsedDate) return parsedDate;
  }
  return value;
};

function csvToJson(
  csv: string,
  delimiter: Delimiter = ",",
  hasHeaders = true,
  strict = false,
  trimWhitespace = true,
  stripQuotes = false,
  inferTypes = true,
  emptyAsNull = false,
  booleanMapping = "true-false" as BooleanMapping,
  dateParse = false,
  columnTypes = {} as Record<string, ColumnType>,
) {
  const parsedRows = parseCsvRows(csv, delimiter);
  const rows = parsedRows.filter((row) => !(row.length === 1 && row[0].trim() === ""));
  if (!rows.length) throw new Error("No rows found after trimming empty lines.");

  if (rows[0]?.[0]?.startsWith("\uFEFF")) {
    rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  }

  const baseHeaders = hasHeaders
    ? rows[0].map((h) => (trimWhitespace ? h.trim() : h))
    : Array.from({ length: rows[0].length }, (_, i) => `col_${i + 1}`);
  const headers = makeUniqueHeaders(baseHeaders);

  const dataRows = hasHeaders ? rows.slice(1) : rows;

  return dataRows.map((row, index) => {
    const cols = row.map((c) => {
      const trimmed = trimWhitespace ? c.trim() : c;
      const stripped = stripQuotes && /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
      return coerceCsvValue(stripped, {
        inferTypes,
        emptyAsNull,
        booleanMapping,
        dateParse,
        columnType: columnTypes[headers[index]] ?? "auto",
      });
    });
    if (strict && cols.length !== headers.length) {
      const rowIndex = hasHeaders ? index + 2 : index + 1;
      throw new Error(
        `Row ${rowIndex} has ${cols.length} columns, expected ${headers.length}. Check uneven delimiters or quotes.`,
      );
    }
    const obj: Record<string, CsvValue> = {};
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

  const resolvedDelimiter = delimiter === "auto" ? "," : delimiter;
  const escapeCsvValue = (val: string) => {
    const needsQuotes = val.includes(resolvedDelimiter) || val.includes('"') || val.includes('\n') || val.includes('\r');
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
      .join(resolvedDelimiter),
  );

  if (includeHeaders) {
    const headerLine = headers.map(h => escapeCsvValue(h)).join(resolvedDelimiter);
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
  const [inferTypes, setInferTypes] = useState(true);
  const [emptyAsNull, setEmptyAsNull] = useState(false);
  const [booleanMapping, setBooleanMapping] = useState<BooleanMapping>("true-false");
  const [dateParse, setDateParse] = useState(false);
  const [columnTypeOverrides, setColumnTypeOverrides] = useState<Record<string, ColumnType>>({});
  const autoConvertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputSourceRef = useRef<"typing" | "paste" | "file">("typing");
  const workerRef = useRef<Worker | null>(null);
  const workerRequestIdRef = useRef(0);
  const [isWorkerActive, setIsWorkerActive] = useState(false);

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
      if (stats.bytes > WORKER_THRESHOLD_BYTES || stats.lines > WORKER_THRESHOLD_LINES) {
        return null;
      }
      const parsedRows = parseCsvRows(input, delimiter).filter((row) => !(row.length === 1 && row[0].trim() === ""));
      const headerCols = hasHeaders ? parsedRows[0]?.length ?? 0 : 0;
      const dataCount = hasHeaders ? Math.max(parsedRows.length - 1, 0) : parsedRows.length;
      return { headerCols, dataCount };
    } catch {
      return null;
    }
  }, [input, mode, hasHeaders, delimiter]);

  const csvPreview = useMemo(() => {
    if (!input.trim() || mode !== "csv-to-json") return null;
    try {
      if (stats.bytes > WORKER_THRESHOLD_BYTES || stats.lines > WORKER_THRESHOLD_LINES) {
        return null;
      }
      const parsedRows = parseCsvRows(input, delimiter).filter((row) => !(row.length === 1 && row[0].trim() === ""));
      if (!parsedRows.length) return null;
      if (parsedRows[0]?.[0]?.startsWith("\uFEFF")) {
        parsedRows[0][0] = parsedRows[0][0].replace(/^\uFEFF/, "");
      }
      const baseHeaders = hasHeaders
        ? parsedRows[0].map((h) => (trimWhitespace ? h.trim() : h))
        : Array.from({ length: parsedRows[0].length }, (_, i) => `col_${i + 1}`);
      const headers = makeUniqueHeaders(baseHeaders);
      const dataRows = hasHeaders ? parsedRows.slice(1) : parsedRows;
      const sampleRows = dataRows.slice(0, 5).map((row) =>
        row.map((c, index) => {
          const trimmed = trimWhitespace ? c.trim() : c;
          const stripped = stripQuotes && /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
          return coerceCsvValue(stripped, {
            inferTypes,
            emptyAsNull,
            booleanMapping,
            dateParse,
            columnType: columnTypeOverrides[headers[index]] ?? "auto",
          });
        }),
      );
      const schemaSample = dataRows.slice(0, 200).map((row) =>
        row.map((c, index) => {
          const trimmed = trimWhitespace ? c.trim() : c;
          const stripped = stripQuotes && /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
          return coerceCsvValue(stripped, {
            inferTypes,
            emptyAsNull,
            booleanMapping,
            dateParse,
            columnType: columnTypeOverrides[headers[index]] ?? "auto",
          });
        }),
      );
      const schema = headers.map((header, index) => {
        let total = 0;
        let empty = 0;
        let hasNumber = false;
        let hasBoolean = false;
        let hasString = false;
        schemaSample.forEach((row) => {
          const value = row[index];
          total += 1;
          if (value === "" || value === undefined || value === null) {
            empty += 1;
            return;
          }
          switch (typeof value) {
            case "number":
              hasNumber = true;
              break;
            case "boolean":
              hasBoolean = true;
              break;
            default:
              hasString = true;
          }
        });
        const nonEmpty = total - empty;
        let type: CsvType = "empty";
        if (nonEmpty === 0) {
          type = "empty";
        } else if (hasString && (hasNumber || hasBoolean)) {
          type = "mixed";
        } else if (hasNumber && hasBoolean) {
          type = "mixed";
        } else if (hasNumber) {
          type = "number";
        } else if (hasBoolean) {
          type = "boolean";
        } else {
          type = "string";
        }
        return { header, type, nonEmpty, total };
      });
      return { headers, sampleRows, schema, sampleSize: schemaSample.length };
    } catch {
      return null;
    }
  }, [
    input,
    mode,
    delimiter,
    hasHeaders,
    trimWhitespace,
    stripQuotes,
    inferTypes,
    emptyAsNull,
    booleanMapping,
    dateParse,
    columnTypeOverrides,
  ]);

  useEffect(() => {
    if (!csvPreview?.headers) return;
    setColumnTypeOverrides((prev) => {
      const next: Record<string, ColumnType> = {};
      csvPreview.headers.forEach((header) => {
        if (prev[header]) next[header] = prev[header];
      });
      return next;
    });
  }, [csvPreview?.headers]);

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const { id, type, output, message } = event.data ?? {};
      if (id !== workerRequestIdRef.current) return;
      if (type === "result") {
        setOutput(output ?? "");
        setStatus("Done");
      } else {
        setOutput("");
        setError(getBetterErrorMessage(new Error(message ?? "Worker error"), mode));
        setStatus("Error");
      }
      setIsProcessing(false);
      setIsWorkerActive(false);
    };
    worker.onerror = (event) => {
      setOutput("");
      setError(getBetterErrorMessage(new Error(event.message || "Worker error"), mode));
      setStatus("Error");
      setIsProcessing(false);
      setIsWorkerActive(false);
    };
    workerRef.current = worker;
    return worker;
  };

  const cancelWorker = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsWorkerActive(false);
    setIsProcessing(false);
    setStatus("Cancelled");
  };

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

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

  const autoConvertPaused = autoConvert
    && (stats.bytes > WORKER_THRESHOLD_BYTES || stats.lines > WORKER_THRESHOLD_LINES);

  // Auto-convert when input changes (debounced to avoid heavy parsing on each keystroke)
  useEffect(() => {
    if (!autoConvert) return;
    if (autoConvertPaused) return;
    if (autoConvertTimerRef.current) {
      clearTimeout(autoConvertTimerRef.current);
    }
    if (!input.trim()) return;
    const source = inputSourceRef.current;
    if (source === "paste" || source === "file") {
      inputSourceRef.current = "typing";
      handleConvert();
      return;
    }
    autoConvertTimerRef.current = setTimeout(() => {
      handleConvert();
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, mode, delimiter, hasHeaders, jsonIndent, autoConvert, autoConvertPaused]);

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

    if (mode === "csv-to-json" && stats.lines > MAX_ROWS) {
      setError(`Too many rows (${stats.lines.toLocaleString()}). Please limit input to ${MAX_ROWS.toLocaleString()} rows or less.`);
      setStatus("Row limit exceeded");
      return;
    }

    const shouldUseWorker = stats.bytes > WORKER_THRESHOLD_BYTES || stats.lines > WORKER_THRESHOLD_LINES;
    setIsProcessing(true);
    setError("");
    setStatus("Converting...");

    try {
      if (shouldUseWorker) {
        const worker = ensureWorker();
        workerRequestIdRef.current += 1;
        const requestId = workerRequestIdRef.current;
        setIsWorkerActive(true);
        setStatus("Processing in background…");
        worker.postMessage({
          id: requestId,
          mode,
          input,
          delimiter,
          hasHeaders,
          strict,
          trimWhitespace,
          stripQuotes,
          inferTypes,
          emptyAsNull,
          booleanMapping,
          dateParse,
          columnTypes: columnTypeOverrides,
          jsonIndent,
        });
        return;
      }

      // Use setTimeout to allow UI to update with loading state
      await new Promise(resolve => setTimeout(resolve, 0));
      if (stats.lines > 5000) {
        // Allow an extra tick for very large inputs
        setStatus("Processing large input…");
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (mode === "csv-to-json") {
        const result = csvToJson(
          input,
          delimiter,
          hasHeaders,
          strict,
          trimWhitespace,
          stripQuotes,
          inferTypes,
          emptyAsNull,
          booleanMapping,
          dateParse,
          columnTypeOverrides,
        );
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
      if (!shouldUseWorker) {
        setIsProcessing(false);
      }
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

      inputSourceRef.current = "file";
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
      case "auto": return "Auto";
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
              CSV to JSON
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
          {isProcessing && isWorkerActive && (
            <button
              onClick={cancelWorker}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              type="button"
            >
              Cancel
            </button>
          )}
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
              <option value="auto">{getDelimiterDisplay("auto")}</option>
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
          {mode === "csv-to-json" && (
            <>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={inferTypes}
                  onChange={(e) => setInferTypes(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Infer types
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={emptyAsNull}
                  onChange={(e) => setEmptyAsNull(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Empty → null
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Bool mapping</span>
                <select
                  value={booleanMapping}
                  onChange={(e) => setBooleanMapping(e.target.value as BooleanMapping)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="true-false">true/false</option>
                  <option value="yes-no">yes/no</option>
                  <option value="y-n">y/n</option>
                  <option value="one-zero">1/0</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={dateParse}
                  onChange={(e) => setDateParse(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Parse dates
              </label>
            </>
          )}
        </div>

        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => {
            inputSourceRef.current = "typing";
            setInput(event.target.value);
          }}
          onPaste={() => {
            inputSourceRef.current = "paste";
          }}
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

        {csvPreview && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Preview (first 5 rows)</span>
              <span>Schema sample: {csvPreview.sampleSize.toLocaleString()} rows</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {csvPreview.headers.map((header) => (
                      <th key={header} className="px-2 py-1.5 text-left font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvPreview.sampleRows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`} className="text-slate-700">
                      {csvPreview.headers.map((header, colIndex) => (
                        <td key={`${header}-${rowIndex}`} className="px-2 py-1.5">
                          {row[colIndex] === undefined ? "" : String(row[colIndex])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!csvPreview.sampleRows.length && (
                    <tr>
                      <td className="px-2 py-2 text-slate-500" colSpan={csvPreview.headers.length}>
                        No data rows to preview.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Column</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Inferred type</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Override</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Non-empty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {csvPreview.schema.map((col) => (
                    <tr key={`schema-${col.header}`}>
                      <td className="px-2 py-1.5">{col.header}</td>
                      <td className="px-2 py-1.5">{col.type}</td>
                      <td className="px-2 py-1.5">
                        <select
                          value={columnTypeOverrides[col.header] ?? "auto"}
                          onChange={(event) => {
                            const value = event.target.value as ColumnType;
                            setColumnTypeOverrides((prev) => {
                              const next = { ...prev };
                              if (value === "auto") {
                                delete next[col.header];
                              } else {
                                next[col.header] = value;
                              }
                              return next;
                            });
                          }}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                          <option value="auto">Auto</option>
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">{col.nonEmpty}/{col.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {autoConvertPaused && (
          <p className="text-sm font-medium text-slate-600">Auto-convert paused (large input).</p>
        )}
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
