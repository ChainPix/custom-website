/// <reference lib="webworker" />

type Row = Record<string, unknown>;

type WorkerRequest = {
  id: number;
  input: string;
  jsonPath: string;
  flattenTable: boolean;
  arrayMode: "join" | "index" | "stringify";
  maxChars: number;
};

type WorkerResponse = {
  id: number;
  payload: { rows: Row[]; headers: string[]; error: string };
};

const buildHeaders = (rows: Row[]) =>
  Array.from(
    rows.reduce((set: Set<string>, item: Row) => {
      Object.keys(item || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  ).sort((a, b) => a.localeCompare(b));

const normalizeRows = (value: unknown) => {
  if (Array.isArray(value)) {
    const isObjectArray = value.every((item) => item !== null && typeof item === "object" && !Array.isArray(item));
    if (isObjectArray) {
      return { rows: value as Row[], error: "" };
    }
    const rows = value.map((item) => ({ value: item })) as Row[];
    return { rows, error: "" };
  }
  if (value !== null && typeof value === "object") {
    return { rows: [value as Row], error: "" };
  }
  return { rows: [{ value }] as Row[], error: "" };
};

const flattenRow = (row: Row, arrayMode: WorkerRequest["arrayMode"]) => {
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
  return out as Row;
};

const resolveJsonPath = (value: unknown, path: string) => {
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

const parseInput = (input: string, options: WorkerRequest) => {
  if (input.length > options.maxChars) {
    return {
      rows: [],
      headers: [],
      error: `Input exceeds ${options.maxChars.toLocaleString()} characters. Trim the JSON to parse it.`,
    };
  }
  try {
    const data = JSON.parse(input);
    const resolved = resolveJsonPath(data, options.jsonPath);
    if (resolved.error) {
      return { rows: [], headers: [], error: resolved.error };
    }
    const normalized = normalizeRows(resolved.value);
    if (normalized.error) {
      return { rows: [], headers: [], error: normalized.error };
    }
    const rows = options.flattenTable
      ? normalized.rows.map((row) => flattenRow(row, options.arrayMode))
      : normalized.rows;
    return { rows, headers: buildHeaders(rows), error: "" };
  } catch {
    return { rows: [], headers: [], error: "Invalid JSON input." };
  }
};

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const payload = parseInput(event.data.input, event.data);
  const response: WorkerResponse = { id: event.data.id, payload };
  ctx.postMessage(response);
};
