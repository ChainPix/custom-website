/**
 * Pure JSON → table parsing logic shared by the json-table worker (and
 * covered by tests/unit/json-table.spec.ts). Kept free of DOM/worker globals
 * so it can be imported and unit-tested directly.
 */

export type JsonTableRow = Record<string, unknown>;

export type JsonTableArrayMode = "join" | "index" | "stringify";

export type JsonTableParseOptions = {
  jsonPath: string;
  flattenTable: boolean;
  arrayMode: JsonTableArrayMode;
  maxChars: number;
  lenientMode: boolean;
};

export type JsonTableParseResult = {
  rows: JsonTableRow[];
  headers: string[];
  error: string;
  errorLine: number | null;
  errorColumn: number | null;
  errorPos: number | null;
  errorSnippet: string;
};

export const buildHeaders = (rows: JsonTableRow[]) =>
  Array.from(
    rows.reduce((set: Set<string>, item: JsonTableRow) => {
      Object.keys(item || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  ).sort((a, b) => a.localeCompare(b));

export const normalizeRows = (value: unknown) => {
  if (Array.isArray(value)) {
    const isObjectArray = value.every((item) => item !== null && typeof item === "object" && !Array.isArray(item));
    if (isObjectArray) {
      return { rows: value as JsonTableRow[], error: "" };
    }
    const rows = value.map((item) => ({ value: item })) as JsonTableRow[];
    return { rows, error: "" };
  }
  if (value !== null && typeof value === "object") {
    return { rows: [value as JsonTableRow], error: "" };
  }
  return { rows: [{ value }] as JsonTableRow[], error: "" };
};

export const getErrorDetails = (raw: string, err: unknown) => {
  const message = err instanceof Error ? err.message : "Invalid JSON input.";
  const match = /position\s+(\d+)/i.exec(message);
  if (!match) {
    return { errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
  }
  const pos = Number(match[1]);
  if (!Number.isFinite(pos)) {
    return { errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
  }
  const slice = raw.slice(0, pos);
  const lines = slice.split("\n");
  const errorLine = lines.length;
  const errorColumn = lines[lines.length - 1]?.length + 1;
  const lineText = raw.split("\n")[errorLine - 1] || "";
  const caret = " ".repeat(Math.max(errorColumn - 1, 0)) + "^";
  return { errorLine, errorColumn, errorPos: pos, errorSnippet: `${lineText}\n${caret}` };
};

export const fixCommonJsonIssues = (raw: string) => {
  let next = raw;
  next = next.replace(/,\s*([}\]])/g, "$1");
  next = next.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, inner) => {
    const escaped = String(inner).replace(/"/g, '\\"');
    return `"${escaped}"`;
  });
  return next;
};

export const flattenRow = (row: JsonTableRow, arrayMode: JsonTableArrayMode) => {
  const out: Record<string, unknown> = {};
  const visit = (value: unknown, prefix: string) => {
    if (value === null || value === undefined) {
      out[prefix] = value;
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        out[prefix] = arrayMode === "stringify" ? "[]" : "";
        return;
      }
      if (arrayMode === "join") {
        out[prefix] = value
          .map((item) =>
            item === null || item === undefined
              ? ""
              : typeof item === "string" || typeof item === "number" || typeof item === "boolean"
              ? String(item)
              : JSON.stringify(item),
          )
          .join("; ");
        return;
      }
      if (arrayMode === "stringify") {
        out[prefix] = JSON.stringify(value);
        return;
      }
      value.forEach((item, index) => {
        const nextPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
        visit(item, nextPrefix);
      });
      return;
    }
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (!entries.length) {
        out[prefix] = {};
        return;
      }
      entries
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, val]) => {
          const nextPrefix = prefix ? `${prefix}.${key}` : key;
          visit(val, nextPrefix);
        });
      return;
    }
    out[prefix] = value;
  };

  Object.entries(row).forEach(([key, value]) => {
    visit(value, key);
  });
  return out as JsonTableRow;
};

export const resolveJsonPath = (value: unknown, path: string) => {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "$") return { value, error: "" };
  if (!trimmed.startsWith("$")) {
    return { value: null, error: "JSONPath must start with $." };
  }
  const raw = trimmed.slice(1);
  const segments = raw.split(".").filter(Boolean);
  let nodes: unknown[] = [value];
  for (const segment of segments) {
    const next: unknown[] = [];
    const match = /^([^\[\]]+)?(\[(\*|\d+)\])?$/.exec(segment);
    if (!match) {
      return { value: null, error: "Unsupported JSONPath segment." };
    }
    const [, prop, , bracket] = match;
    for (const node of nodes) {
      const base = prop ? (node as Record<string, unknown>)?.[prop] : node;
      if (bracket === "*") {
        if (Array.isArray(base)) next.push(...base);
      } else if (bracket) {
        const index = Number(bracket);
        if (Array.isArray(base) && Number.isFinite(index)) next.push(base[index]);
      } else if (base !== undefined) {
        next.push(base);
      }
    }
    nodes = next;
    if (!nodes.length) break;
  }
  if (!nodes.length) {
    return { value: null, error: "JSONPath did not resolve to any data." };
  }
  return { value: nodes.length === 1 ? nodes[0] : nodes, error: "" };
};

export const parseJsonTableInput = (input: string, options: JsonTableParseOptions): JsonTableParseResult => {
  if (input.length > options.maxChars) {
    return {
      rows: [],
      headers: [],
      error: `Input exceeds ${options.maxChars.toLocaleString()} characters. Trim the JSON to parse it.`,
      errorLine: null,
      errorColumn: null,
      errorPos: null,
      errorSnippet: "",
    };
  }
  try {
    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch (err) {
      if (!options.lenientMode) throw err;
      const fixed = fixCommonJsonIssues(input);
      data = JSON.parse(fixed);
    }
    const resolved = resolveJsonPath(data, options.jsonPath);
    if (resolved.error) {
      return { rows: [], headers: [], error: resolved.error, errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
    }
    const normalized = normalizeRows(resolved.value);
    if (normalized.error) {
      return { rows: [], headers: [], error: normalized.error, errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
    }
    const rows = options.flattenTable
      ? normalized.rows.map((row) => flattenRow(row, options.arrayMode))
      : normalized.rows;
    return { rows, headers: buildHeaders(rows), error: "", errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
  } catch (err) {
    const details = getErrorDetails(input, err);
    return { rows: [], headers: [], error: "Invalid JSON input.", ...details };
  }
};
