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
type ArrayMode = "indices" | "join";
type ColumnMapping = {
  id: string;
  sourceIndex: number;
  name: string;
  include: boolean;
};
type HeaderOrderMode = "first" | "alphabetical" | "custom";
type HeaderSourceMode = "first" | "union";
type CsvDialectPreset = "custom" | "rfc4180" | "excel-windows";
type CsvLineEnding = "\n" | "\r\n";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const MAX_ROWS = 20000;
const WORKER_THRESHOLD_BYTES = 250 * 1024;
const WORKER_THRESHOLD_LINES = 2000;

const getLineColumnFromIndex = (text: string, index: number) => {
  const safeIndex = Math.max(0, Math.min(index, text.length));
  const before = text.slice(0, safeIndex);
  const line = before.split(/\r?\n/).length;
  const lastBreak = Math.max(before.lastIndexOf("\n"), before.lastIndexOf("\r"));
  const column = safeIndex - lastBreak;
  return { line, column };
};

const parseCsvRows = (csv: string, delimiter: Delimiter = ",") => {
  const normalizedCsv = csv.replace(/^\uFEFF/, "");
  const result = Papa.parse<string[]>(normalizedCsv, {
    delimiter: delimiter === "auto" ? undefined : delimiter,
    skipEmptyLines: "greedy",
  });

  if (result.errors.length) {
    const [first] = result.errors;
    const line = typeof first.row === "number" ? first.row + 1 : 0;
    const columnInfo = typeof first.index === "number"
      ? getLineColumnFromIndex(normalizedCsv, first.index)
      : null;
    const column = columnInfo?.column ?? 0;
    const error = new Error(first.message) as Error & { line?: number; column?: number };
    if (line) error.line = line;
    if (column) error.column = column;
    throw error;
  }

  return result.data;
};

const parseCsvRowsPreview = (csv: string, delimiter: Delimiter = ",") => {
  const normalizedCsv = csv.replace(/^\uFEFF/, "");
  const result = Papa.parse<string[]>(normalizedCsv, {
    delimiter: delimiter === "auto" ? undefined : delimiter,
    skipEmptyLines: "greedy",
  });

  let errorInfo: { line: number; column: number; message: string } | null = null;
  if (result.errors.length) {
    const [first] = result.errors;
    const line = typeof first.row === "number" ? first.row + 1 : 0;
    const columnInfo = typeof first.index === "number"
      ? getLineColumnFromIndex(normalizedCsv, first.index)
      : null;
    const column = columnInfo?.column ?? 0;
    errorInfo = {
      line,
      column,
      message: first.message,
    };
  }

  return { rows: result.data, error: errorInfo };
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

const flattenValue = (
  value: unknown,
  options: {
    arrayMode: ArrayMode;
    arrayDelimiter: string;
    explodeArrays: boolean;
  },
  prefix = "",
): Array<Record<string, CsvValue>> => {
  const isPlainObject = (val: unknown): val is Record<string, unknown> =>
    Boolean(val) && typeof val === "object" && !Array.isArray(val);

  if (Array.isArray(value)) {
    if (options.explodeArrays) {
      const rows: Array<Record<string, CsvValue>> = [];
      value.forEach((item) => {
        const expanded = flattenValue(item, options, prefix);
        if (expanded.length) {
          rows.push(...expanded);
        } else {
          rows.push({ [prefix]: "" });
        }
      });
      return rows.length ? rows : [{ [prefix]: "" }];
    }

    if (options.arrayMode === "join") {
      const joined = value
        .map((item) => {
          if (item === null || item === undefined) return "";
          if (typeof item === "object") return JSON.stringify(item);
          return String(item);
        })
        .join(options.arrayDelimiter);
      return [{ [prefix]: joined }];
    }

    const rows: Array<Record<string, CsvValue>> = [];
    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      if (isPlainObject(item) || Array.isArray(item)) {
        const expanded = flattenValue(item, options, nextPrefix);
        rows.push(...expanded);
      } else {
        rows.push({ [nextPrefix]: item === undefined ? "" : (item as CsvValue) });
      }
    });
    return rows.length ? rows : [{ [prefix]: "" }];
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    let rows: Array<Record<string, CsvValue>> = [{}];
    entries.forEach(([key, val]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      const expanded = flattenValue(val, options, nextPrefix);
      const merged: Array<Record<string, CsvValue>> = [];
      rows.forEach((row) => {
        expanded.forEach((exp) => {
          merged.push({ ...row, ...exp });
        });
      });
      rows = merged;
    });
    return rows.length ? rows : [{}];
  }

  if (!prefix) return [{}];
  return [{ [prefix]: value === undefined ? "" : (value as CsvValue) }];
};

const unflattenObject = (flat: Record<string, CsvValue>, useDotNotation: boolean) => {
  if (!useDotNotation) return flat;
  const nested: Record<string, unknown> = {};
  Object.entries(flat).forEach(([key, value]) => {
    if (!key.includes(".")) {
      nested[key] = value;
      return;
    }
    const parts = key.split(".").filter(Boolean);
    let cursor: Record<string, unknown> = nested;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = value;
        return;
      }
      if (!cursor[part] || typeof cursor[part] !== "object") {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    });
  });
  return nested;
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
  columnTypes = {} as Record<number, ColumnType>,
  useDotNotation = false,
  columnMapping: ColumnMapping[] = [],
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

  const applyMapping = (values: CsvValue[]) => {
    if (!columnMapping.length) {
      return { headers, values };
    }
    const mappedHeaders: string[] = [];
    const mappedValues: CsvValue[] = [];
    columnMapping.forEach((column) => {
      if (!column.include) return;
      const headerName = column.name || headers[column.sourceIndex] || `col_${column.sourceIndex + 1}`;
      mappedHeaders.push(headerName);
      mappedValues.push(values[column.sourceIndex] ?? "");
    });
    return { headers: mappedHeaders, values: mappedValues };
  };

  return dataRows.map((row, index) => {
    const cols = row.map((c) => {
      const trimmed = trimWhitespace ? c.trim() : c;
      const stripped = stripQuotes && /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
      return coerceCsvValue(stripped, {
        inferTypes,
        emptyAsNull,
        booleanMapping,
        dateParse,
        columnType: columnTypes[index] ?? "auto",
      });
    });
    if (strict && cols.length !== headers.length) {
      const rowIndex = hasHeaders ? index + 2 : index + 1;
      throw new Error(
        `Row ${rowIndex} has ${cols.length} columns, expected ${headers.length}. Check uneven delimiters or quotes.`,
      );
    }
    const mapped = applyMapping(cols);
    const obj: Record<string, CsvValue> = {};
    mapped.headers.forEach((header, idx) => {
      obj[header || `col_${idx + 1}`] = mapped.values[idx] ?? "";
    });
    return unflattenObject(obj, useDotNotation);
  });
}

function jsonToCsv(
  jsonStr: string,
  delimiter: Delimiter = ",",
  includeHeaders = true,
  flatten = true,
  arrayMode: ArrayMode = "indices",
  arrayDelimiter = ";",
  explodeArrays = false,
  headerOrderMode: HeaderOrderMode = "first",
  headerSourceMode: HeaderSourceMode = "union",
  customHeaderOrder: string[] = [],
  lineEnding: CsvLineEnding = "\n",
) {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error("JSON should be an array of objects.");
  const data = parsed as Array<Record<string, unknown>>;

  if (!data.length) return "";
  if (data.length > MAX_ROWS) {
    throw new Error(`Too many rows (${data.length.toLocaleString()}). Please limit to ${MAX_ROWS.toLocaleString()} rows.`);
  }

  const rows = data.flatMap((item) => {
    if (!flatten) return [item as Record<string, CsvValue>];
    return flattenValue(item, { arrayMode, arrayDelimiter, explodeArrays });
  });

  const firstRowHeaders = Object.keys(rows[0] ?? {});
  const unionHeaders = Array.from(
    rows.reduce((set: Set<string>, item) => {
      Object.keys(item || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );

  const baseHeaders = headerSourceMode === "first" ? firstRowHeaders : unionHeaders;
  let headers = baseHeaders;

  if (headerOrderMode === "alphabetical") {
    headers = [...baseHeaders].sort((a, b) => a.localeCompare(b));
  } else if (headerOrderMode === "custom") {
    const custom = customHeaderOrder.filter((h) => baseHeaders.includes(h));
    const remaining = baseHeaders.filter((h) => !custom.includes(h));
    headers = [...custom, ...remaining];
  }

  const resolvedDelimiter = delimiter === "auto" ? "," : delimiter;
  const escapeCsvValue = (val: string) => {
    const needsQuotes = val.includes(resolvedDelimiter) || val.includes('"') || val.includes('\n') || val.includes('\r');
    if (needsQuotes) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = rows.map((item) =>
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
    return [headerLine, ...lines].join(lineEnding);
  }

  return lines.join(lineEnding);
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
  const [columnTypeOverrides, setColumnTypeOverrides] = useState<Record<number, ColumnType>>({});
  const [useDotNotation, setUseDotNotation] = useState(false);
  const [flattenJson, setFlattenJson] = useState(true);
  const [arrayMode, setArrayMode] = useState<ArrayMode>("indices");
  const [arrayDelimiter, setArrayDelimiter] = useState(";");
  const [explodeArrays, setExplodeArrays] = useState(false);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [headerOrderMode, setHeaderOrderMode] = useState<HeaderOrderMode>("first");
  const [headerSourceMode, setHeaderSourceMode] = useState<HeaderSourceMode>("union");
  const [customHeaderOrder, setCustomHeaderOrder] = useState<string[]>([]);
  const [csvDialect, setCsvDialect] = useState<CsvDialectPreset>("custom");
  const [csvLineEnding, setCsvLineEnding] = useState<CsvLineEnding>("\n");
  const [clearOnClose, setClearOnClose] = useState(false);
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
      const previewParse = parseCsvRowsPreview(input, delimiter);
      const parsedRows = previewParse.rows.filter((row) => !(row.length === 1 && row[0].trim() === ""));
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
      const previewParse = parseCsvRowsPreview(input, delimiter);
      const parsedRows = previewParse.rows.filter((row) => !(row.length === 1 && row[0].trim() === ""));
      if (!parsedRows.length) return null;
      const headerRow = hasHeaders ? parsedRows[0] : [];
      const sanitizedHeaderRow = headerRow.map((h) => (trimWhitespace ? h.trim() : h));
      if (sanitizedHeaderRow[0]?.startsWith("\uFEFF")) {
        sanitizedHeaderRow[0] = sanitizedHeaderRow[0].replace(/^\uFEFF/, "");
      }
      const baseHeaders = hasHeaders
        ? sanitizedHeaderRow
        : Array.from({ length: parsedRows[0].length }, (_, i) => `col_${i + 1}`);
      const headers = makeUniqueHeaders(baseHeaders);
      const dataRows = hasHeaders ? parsedRows.slice(1) : parsedRows;
      const expectedLength = baseHeaders.length;
      const inconsistentRows = dataRows.reduce<number[]>((acc, row, idx) => {
        if (row.length !== expectedLength) acc.push(idx + (hasHeaders ? 2 : 1));
        return acc;
      }, []);
      const emptyHeaders = baseHeaders.filter((header) => !header.trim());
      const duplicateHeaders = baseHeaders.reduce<Record<string, number>>((acc, header) => {
        const normalized = header.trim() || "(empty)";
        acc[normalized] = (acc[normalized] ?? 0) + 1;
        return acc;
      }, {});
      const sampleRows = dataRows.slice(0, 5).map((row) =>
        row.map((c, index) => {
          const trimmed = trimWhitespace ? c.trim() : c;
          const stripped = stripQuotes && /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
          return coerceCsvValue(stripped, {
            inferTypes,
            emptyAsNull,
            booleanMapping,
            dateParse,
            columnType: columnTypeOverrides[index] ?? "auto",
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
            columnType: columnTypeOverrides[index] ?? "auto",
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
      return {
        headers,
        baseHeaders,
        sampleRows,
        schema,
        sampleSize: schemaSample.length,
        inconsistentRows,
        emptyHeaderCount: emptyHeaders.length,
        duplicateHeaders,
        errorInfo: previewParse.error,
        sampleRowNumbers: dataRows.slice(0, 5).map((_, idx) => idx + (hasHeaders ? 2 : 1)),
      };
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

  const jsonHeaderPreview = useMemo(() => {
    if (!input.trim() || mode !== "json-to-csv") return null;
    try {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      const data = parsed as Array<Record<string, unknown>>;
      const rows = data.flatMap((item) => {
        if (!flattenJson) return [item as Record<string, CsvValue>];
        return flattenValue(item, { arrayMode, arrayDelimiter, explodeArrays });
      });
      const firstHeaders = Object.keys(rows[0] ?? {});
      const unionHeaders = Array.from(
        rows.reduce((set: Set<string>, item) => {
          Object.keys(item || {}).forEach((key) => set.add(key));
          return set;
        }, new Set<string>()),
      );
      const baseHeaders = headerSourceMode === "first" ? firstHeaders : unionHeaders;
      let ordered = baseHeaders;
      if (headerOrderMode === "alphabetical") {
        ordered = [...baseHeaders].sort((a, b) => a.localeCompare(b));
      } else if (headerOrderMode === "custom") {
        const custom = customHeaderOrder.filter((h) => baseHeaders.includes(h));
        const remaining = baseHeaders.filter((h) => !custom.includes(h));
        ordered = [...custom, ...remaining];
      }
      return { headers: ordered };
    } catch {
      return null;
    }
  }, [
    input,
    mode,
    flattenJson,
    arrayMode,
    arrayDelimiter,
    explodeArrays,
    headerSourceMode,
    headerOrderMode,
    customHeaderOrder,
  ]);

  useEffect(() => {
    if (!csvPreview?.headers) {
      setColumnMapping([]);
      return;
    }
    setColumnMapping((prev) =>
      csvPreview.headers.map((header, index) => {
        const existing = prev.find((col) => col.sourceIndex === index);
        if (existing) {
          return { ...existing, id: header };
        }
        return {
          id: header,
          sourceIndex: index,
          name: header,
          include: true,
        };
      }),
    );
  }, [csvPreview?.headers]);

  useEffect(() => {
    if (headerOrderMode !== "custom") return;
    if (!jsonHeaderPreview?.headers?.length) return;
    setCustomHeaderOrder((prev) => (prev.length ? prev : jsonHeaderPreview.headers));
  }, [headerOrderMode, jsonHeaderPreview?.headers]);

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

  useEffect(() => {
    const stored = sessionStorage.getItem("csvJsonClearOnClose");
    if (stored === "true") {
      setClearOnClose(true);
      const savedInput = sessionStorage.getItem("csvJsonInput");
      const savedOutput = sessionStorage.getItem("csvJsonOutput");
      if (savedInput) setInput(savedInput);
      if (savedOutput) setOutput(savedOutput);
    }
  }, []);

  useEffect(() => {
    if (!clearOnClose) {
      sessionStorage.removeItem("csvJsonClearOnClose");
      sessionStorage.removeItem("csvJsonInput");
      sessionStorage.removeItem("csvJsonOutput");
      return;
    }
    sessionStorage.setItem("csvJsonClearOnClose", "true");
    sessionStorage.setItem("csvJsonInput", input);
    sessionStorage.setItem("csvJsonOutput", output);
  }, [clearOnClose, input, output]);

  useEffect(() => {
    if (!clearOnClose) return;
    const handler = () => {
      sessionStorage.removeItem("csvJsonClearOnClose");
      sessionStorage.removeItem("csvJsonInput");
      sessionStorage.removeItem("csvJsonOutput");
    };
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
    };
  }, [clearOnClose]);

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
          const snippetStart = Math.max(0, position - 30);
          const snippetEnd = Math.min(input.length, position + 30);
          const snippet = input
            .slice(snippetStart, snippetEnd)
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r");
          return `Invalid JSON at line ${line}, column ${column}: ${err.message} Snippet: "${snippet}"`;
        }
        return `Invalid JSON: ${err.message}`;
      } else {
        const csvError = err as Error & { line?: number; column?: number };
        if (csvError.line) {
          return `CSV parsing error at line ${csvError.line}${csvError.column ? `, column ${csvError.column}` : ""}: ${csvError.message}`;
        }
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
          useDotNotation,
          flattenJson,
          arrayMode,
          arrayDelimiter,
          explodeArrays,
          columnMapping,
          headerOrderMode,
          headerSourceMode,
          customHeaderOrder,
          csvLineEnding,
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
          useDotNotation,
          columnMapping,
        );
        setOutput(JSON.stringify(result, null, jsonIndent));
      } else {
        setOutput(
          jsonToCsv(
            input,
            delimiter,
            hasHeaders,
            flattenJson,
            arrayMode,
            arrayDelimiter,
            explodeArrays,
            headerOrderMode,
            headerSourceMode,
            customHeaderOrder,
            csvLineEnding,
          ),
        );
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

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      inputSourceRef.current = "paste";
      setInput(text);
      setStatus("Pasted from clipboard");
    } catch (err) {
      console.error("Paste failed", err);
      setStatus("Paste failed");
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
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>Runs fully in your browser; files are not uploaded.</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Offline mode
          </span>
        </div>
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
            onClick={handlePasteFromClipboard}
            className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            type="button"
          >
            Paste from clipboard
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
              onChange={(e) => {
                const nextDelimiter = e.target.value as Delimiter;
                setDelimiter(nextDelimiter);
                if (mode === "json-to-csv" && csvDialect !== "custom") {
                  setCsvDialect("custom");
                }
              }}
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
              checked={clearOnClose}
              onChange={(e) => setClearOnClose(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Clear on tab close
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
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={useDotNotation}
                  onChange={(e) => setUseDotNotation(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Dot notation headers
              </label>
            </>
          )}
          {mode === "json-to-csv" && (
            <>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={flattenJson}
                  onChange={(e) => setFlattenJson(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                />
                Flatten objects
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Dialect</span>
                <select
                  value={csvDialect}
                  onChange={(e) => {
                    const nextDialect = e.target.value as CsvDialectPreset;
                    setCsvDialect(nextDialect);
                    if (nextDialect === "rfc4180") {
                      setDelimiter(",");
                      setCsvLineEnding("\n");
                    }
                    if (nextDialect === "excel-windows") {
                      setDelimiter(";");
                      setCsvLineEnding("\r\n");
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="custom">Custom</option>
                  <option value="rfc4180">RFC4180-ish</option>
                  <option value="excel-windows">Excel (Windows)</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Line endings</span>
                <select
                  value={csvLineEnding}
                  onChange={(e) => {
                    const nextEnding = e.target.value as CsvLineEnding;
                    setCsvLineEnding(nextEnding);
                    if (csvDialect !== "custom") {
                      setCsvDialect("custom");
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="\n">LF (\\n)</option>
                  <option value="\r\n">CRLF (\\r\\n)</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Header source</span>
                <select
                  value={headerSourceMode}
                  onChange={(e) => setHeaderSourceMode(e.target.value as HeaderSourceMode)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="union">Union of all rows</option>
                  <option value="first">Only first row</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Header order</span>
                <select
                  value={headerOrderMode}
                  onChange={(e) => setHeaderOrderMode(e.target.value as HeaderOrderMode)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="first">Preserve first row order</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="custom">Custom order</option>
                </select>
              </label>
              {headerOrderMode === "custom" && jsonHeaderPreview && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Custom order</span>
                  <div className="flex flex-wrap gap-2">
                    {jsonHeaderPreview.headers.map((header, index) => (
                      <span
                        key={`custom-header-${header}`}
                        className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"
                      >
                        {header}
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-1 text-[10px] text-slate-500 hover:text-slate-700"
                          disabled={index === 0}
                          onClick={() => {
                            setCustomHeaderOrder((prev) => {
                              const current = prev.length ? prev : jsonHeaderPreview.headers;
                              const next = [...current];
                              const [item] = next.splice(index, 1);
                              next.splice(index - 1, 0, item);
                              return next;
                            });
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-1 text-[10px] text-slate-500 hover:text-slate-700"
                          disabled={index === jsonHeaderPreview.headers.length - 1}
                          onClick={() => {
                            setCustomHeaderOrder((prev) => {
                              const current = prev.length ? prev : jsonHeaderPreview.headers;
                              const next = [...current];
                              const [item] = next.splice(index, 1);
                              next.splice(index + 1, 0, item);
                              return next;
                            });
                          }}
                        >
                          ▼
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span>Arrays</span>
                <select
                  value={arrayMode}
                  onChange={(e) => setArrayMode(e.target.value as ArrayMode)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  disabled={!flattenJson}
                >
                  <option value="indices">Use indices</option>
                  <option value="join">Join values</option>
                </select>
              </label>
              {arrayMode === "join" && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <span>Join</span>
                  <input
                    value={arrayDelimiter}
                    onChange={(event) => setArrayDelimiter(event.target.value)}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              )}
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={explodeArrays}
                  onChange={(e) => setExplodeArrays(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                  disabled={!flattenJson}
                />
                Explode arrays
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
            {(csvPreview.emptyHeaderCount > 0
              || Object.values(csvPreview.duplicateHeaders).some((count) => count > 1)
              || csvPreview.inconsistentRows.length > 0
              || csvPreview.errorInfo) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {csvPreview.emptyHeaderCount > 0 && (
                  <p>Warning: {csvPreview.emptyHeaderCount} empty header(s) detected.</p>
                )}
                {Object.entries(csvPreview.duplicateHeaders)
                  .filter(([, count]) => count > 1)
                  .map(([name, count]) => (
                    <p key={`dup-${name}`}>Warning: header "{name}" appears {count} times.</p>
                  ))}
                {csvPreview.inconsistentRows.length > 0 && (
                  <p>Warning: {csvPreview.inconsistentRows.length} row(s) have inconsistent column counts.</p>
                )}
                {csvPreview.errorInfo?.line && (
                  <p>
                    Warning: parser error near line {csvPreview.errorInfo.line}
                    {csvPreview.errorInfo.column ? `, column ${csvPreview.errorInfo.column}` : ""}.
                  </p>
                )}
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Include</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Header</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Rename</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {columnMapping.map((column, index) => (
                    <tr key={`map-${column.id}`}>
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={column.include}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setColumnMapping((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, include: checked } : item,
                              ),
                            );
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                        />
                      </td>
                      <td className="px-2 py-1.5">{csvPreview.headers[column.sourceIndex]}</td>
                      <td className="px-2 py-1.5">
                        <input
                          value={column.name}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            setColumnMapping((prev) =>
                              prev.map((item, idx) =>
                                idx === index ? { ...item, name: nextName } : item,
                              ),
                            );
                          }}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            disabled={index === 0}
                            onClick={() => {
                              setColumnMapping((prev) => {
                                const next = [...prev];
                                const [item] = next.splice(index, 1);
                                next.splice(index - 1, 0, item);
                                return next;
                              });
                            }}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            disabled={index === columnMapping.length - 1}
                            onClick={() => {
                              setColumnMapping((prev) => {
                                const next = [...prev];
                                const [item] = next.splice(index, 1);
                                next.splice(index + 1, 0, item);
                                return next;
                              });
                            }}
                          >
                            Down
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    {columnMapping.filter((column) => column.include).map((column) => {
                      const isHeaderError = hasHeaders && csvPreview.errorInfo?.line === 1;
                      return (
                        <th
                          key={`preview-${column.id}`}
                          className={
                            isHeaderError
                              ? "bg-amber-50 px-2 py-1.5 text-left font-semibold text-amber-900"
                              : "px-2 py-1.5 text-left font-semibold"
                          }
                        >
                          {column.name || column.id}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvPreview.sampleRows.map((row, rowIndex) => {
                    const rowNumber = csvPreview.sampleRowNumbers[rowIndex];
                    const isErrorRow = csvPreview.errorInfo?.line === rowNumber;
                    return (
                      <tr
                        key={`row-${rowIndex}`}
                        className={isErrorRow ? "bg-amber-50 text-amber-900" : "text-slate-700"}
                      >
                      {columnMapping.filter((column) => column.include).map((column) => (
                        <td key={`${column.id}-${rowIndex}`} className="px-2 py-1.5">
                          {row[column.sourceIndex] === undefined ? "" : String(row[column.sourceIndex])}
                        </td>
                      ))}
                      </tr>
                    );
                  })}
                  {!csvPreview.sampleRows.length && (
                    <tr>
                      <td className="px-2 py-2 text-slate-500" colSpan={columnMapping.length || 1}>
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
                  {columnMapping.map((column) => {
                    const col = csvPreview.schema.find((entry) => entry.header === csvPreview.headers[column.sourceIndex]);
                    if (!col) return null;
                    return (
                      <tr key={`schema-${column.id}`}>
                        <td className="px-2 py-1.5">{column.name}</td>
                        <td className="px-2 py-1.5">{col.type}</td>
                        <td className="px-2 py-1.5">
                          <select
                            value={columnTypeOverrides[column.sourceIndex] ?? "auto"}
                            onChange={(event) => {
                              const value = event.target.value as ColumnType;
                              setColumnTypeOverrides((prev) => {
                                const next = { ...prev };
                                if (value === "auto") {
                                  delete next[column.sourceIndex];
                                } else {
                                  next[column.sourceIndex] = value;
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
                    );
                  })}
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
