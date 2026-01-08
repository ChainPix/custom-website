import Papa from "papaparse";

type Mode = "csv-to-json" | "json-to-csv";
type Delimiter = "," | ";" | "\t" | "|" | "auto";
type CsvValue = string | number | boolean;

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
  jsonIndent: number;
};

type WorkerResponse = {
  id: number;
  type: "result" | "error";
  output?: string;
  message?: string;
};

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

const coerceCsvValue = (value: string, inferTypes: boolean): CsvValue => {
  if (!inferTypes) return value;
  if (!value) return value;
  const normalized = value.trim();
  if (normalized !== value) return value;
  const lower = normalized.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(normalized)) {
    return Number(normalized);
  }
  return value;
};

const csvToJson = (
  csv: string,
  delimiter: Delimiter,
  hasHeaders: boolean,
  strict: boolean,
  trimWhitespace: boolean,
  stripQuotes: boolean,
  inferTypes: boolean,
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

  return dataRows.map((row, index) => {
    const cols = row.map((c) => {
      const trimmed = trimWhitespace ? c.trim() : c;
      const stripped = stripQuotes && /^".*"$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
      return coerceCsvValue(stripped, inferTypes);
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
};

const jsonToCsv = (jsonStr: string, delimiter: Delimiter, includeHeaders: boolean) => {
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
      );
      const output = JSON.stringify(result, null, jsonIndent);
      const response: WorkerResponse = { id, type: "result", output };
      self.postMessage(response);
    } else {
      const output = jsonToCsv(input, delimiter, hasHeaders);
      const response: WorkerResponse = { id, type: "result", output };
      self.postMessage(response);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Worker error";
    const response: WorkerResponse = { id, type: "error", message };
    self.postMessage(response);
  }
});
