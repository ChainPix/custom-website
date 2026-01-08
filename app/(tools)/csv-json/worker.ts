import Papa from "papaparse";

type Mode = "csv-to-json" | "json-to-csv";
type Delimiter = "," | ";" | "\t" | "|" | "auto";
type CsvValue = string | number | boolean | null;
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

const MAX_ROWS = 20000;

type WorkerRequest = {
  id: number;
  mode: Mode;
  input: string;
  delimiter: Delimiter;
  hasHeaders: boolean;
  strict: boolean;
  trimWhitespace: boolean;
  stripQuotes: boolean;
  inferTypes: boolean;
  emptyAsNull: boolean;
  booleanMapping: BooleanMapping;
  dateParse: boolean;
  columnTypes: Record<number, ColumnType>;
  useDotNotation: boolean;
  flattenJson: boolean;
  arrayMode: ArrayMode;
  arrayDelimiter: string;
  explodeArrays: boolean;
  columnMapping: ColumnMapping[];
  headerOrderMode: HeaderOrderMode;
  headerSourceMode: HeaderSourceMode;
  customHeaderOrder: string[];
  jsonIndent: number;
};

type WorkerResponse = {
  id: number;
  type: "result" | "error";
  output?: string;
  message?: string;
};

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
    const location = line ? `line ${line}${column ? `, column ${column}` : ""}` : "unknown location";
    throw new Error(`${first.message} (${location})`);
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

const csvToJson = (
  csv: string,
  delimiter: Delimiter,
  hasHeaders: boolean,
  strict: boolean,
  trimWhitespace: boolean,
  stripQuotes: boolean,
  inferTypes: boolean,
  emptyAsNull: boolean,
  booleanMapping: BooleanMapping,
  dateParse: boolean,
  columnTypes: Record<number, ColumnType>,
  useDotNotation: boolean,
  columnMapping: ColumnMapping[],
) => {
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
};

const jsonToCsv = (
  jsonStr: string,
  delimiter: Delimiter,
  includeHeaders: boolean,
  flattenJson: boolean,
  arrayMode: ArrayMode,
  arrayDelimiter: string,
  explodeArrays: boolean,
  headerOrderMode: HeaderOrderMode,
  headerSourceMode: HeaderSourceMode,
  customHeaderOrder: string[],
) => {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error("JSON should be an array of objects.");
  const data = parsed as Array<Record<string, unknown>>;

  if (!data.length) return "";
  if (data.length > MAX_ROWS) {
    throw new Error(`Too many rows (${data.length.toLocaleString()}). Please limit to ${MAX_ROWS.toLocaleString()} rows.`);
  }

  const rows = data.flatMap((item) => {
    if (!flattenJson) return [item as Record<string, CsvValue>];
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
    const headerLine = headers.map((h) => escapeCsvValue(h)).join(resolvedDelimiter);
    return [headerLine, ...lines].join("\n");
  }

  return lines.join("\n");
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const {
    id,
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
    columnTypes,
    useDotNotation,
    flattenJson,
    arrayMode,
    arrayDelimiter,
    explodeArrays,
    columnMapping,
    headerOrderMode,
    headerSourceMode,
    customHeaderOrder,
    jsonIndent,
  } = event.data;

  try {
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
        columnTypes,
        useDotNotation,
        columnMapping,
      );
      const output = JSON.stringify(result, null, jsonIndent);
      const response: WorkerResponse = { id, type: "result", output };
      self.postMessage(response);
    } else {
      const output = jsonToCsv(
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
      );
      const response: WorkerResponse = { id, type: "result", output };
      self.postMessage(response);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker error";
    const response: WorkerResponse = { id, type: "error", message };
    self.postMessage(response);
  }
});
