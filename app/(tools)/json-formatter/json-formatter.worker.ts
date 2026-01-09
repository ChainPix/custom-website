/// <reference lib="webworker" />

import JSON5 from "json5";

type WorkerRequest = {
  type: "process";
  requestId: number;
  payload: {
    input: string;
    mode: "format" | "minify";
    indentSize: number;
    sortKeys: boolean;
    sortScope: "recursive" | "top";
    useJSON5: boolean;
    preserveNumberFormat: boolean;
    numberLiterals: Record<string, string>;
  };
};

type WorkerResponse = {
  type: "result";
  requestId: number;
  output: string;
  parsed?: unknown;
  error?: string;
  errorLocation?: { line: number; column: number } | null;
};

type ParseResult = {
  parsed: unknown;
  error: string | null;
  errorLocation?: { line: number; column: number } | null;
};

const parseWithBetterError = (jsonString: string, useJSON5: boolean): ParseResult => {
  try {
    const parsed = useJSON5 ? JSON5.parse(jsonString) : JSON.parse(jsonString);
    return { parsed, error: null, errorLocation: null };
  } catch (err) {
    if (err instanceof SyntaxError) {
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const lines = jsonString.substring(0, position).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return {
          parsed: null,
          error: `Invalid JSON at line ${line}, column ${column}: ${err.message}`,
          errorLocation: { line, column },
        };
      }
      return { parsed: null, error: `Invalid JSON: ${err.message}`, errorLocation: null };
    }
    return { parsed: null, error: "Invalid JSON. Ensure keys and strings use quotes.", errorLocation: null };
  }
};

const sortObjectKeys = (obj: unknown, recursive: boolean = true): unknown => {
  if (Array.isArray(obj)) {
    return recursive ? obj.map((item) => sortObjectKeys(item, true)) : obj;
  }
  if (obj !== null && typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const value = (obj as Record<string, unknown>)[key];
      result[key] = recursive ? sortObjectKeys(value, true) : value;
    }
    return result;
  }
  return obj;
};

const pathToPointer = (path: string[]) =>
  path.length === 0
    ? ""
    : path.map((segment) => `/${segment.replace(/~/g, "~0").replace(/\//g, "~1")}`).join("");

const stringifyWithNumberLiterals = (
  value: unknown,
  indent: number,
  numberLiterals: Record<string, string>,
  path: string[] = [],
  level: number = 0,
): string => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    const pointer = pathToPointer(path);
    return numberLiterals[pointer] ?? String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item, index) =>
      stringifyWithNumberLiterals(item, indent, numberLiterals, [...path, String(index)], level + 1),
    );
    if (indent === 0) {
      return `[${items.join(",")}]`;
    }
    const pad = " ".repeat(indent * level);
    const innerPad = " ".repeat(indent * (level + 1));
    return `[\n${items.map((item) => `${innerPad}${item}`).join(",\n")}\n${pad}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return "{}";
    const entries = keys.map((key) => {
      const child = (value as Record<string, unknown>)[key];
      const childValue = stringifyWithNumberLiterals(child, indent, numberLiterals, [...path, key], level + 1);
      return `${JSON.stringify(key)}:${indent === 0 ? "" : " "}${childValue}`;
    });
    if (indent === 0) {
      return `{${entries.join(",")}}`;
    }
    const pad = " ".repeat(indent * level);
    const innerPad = " ".repeat(indent * (level + 1));
    return `{\n${entries.map((entry) => `${innerPad}${entry}`).join(",\n")}\n${pad}}`;
  }
  return JSON.stringify(value);
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (!message || message.type !== "process") return;

  const { requestId, payload } = message;
  const result = parseWithBetterError(payload.input, payload.useJSON5);

  if (result.error) {
    const response: WorkerResponse = {
      type: "result",
      requestId,
      output: "",
      error: result.error,
      errorLocation: result.errorLocation ?? null,
    };
    self.postMessage(response);
    return;
  }

  const processedData = payload.sortKeys
    ? payload.sortScope === "recursive"
      ? sortObjectKeys(result.parsed)
      : sortObjectKeys(result.parsed, false)
    : result.parsed;
  let output = "";
  try {
    if (payload.preserveNumberFormat) {
      output = stringifyWithNumberLiterals(
        processedData,
        payload.mode === "minify" ? 0 : payload.indentSize,
        payload.numberLiterals,
      );
    } else {
      output =
        payload.mode === "minify"
          ? JSON.stringify(processedData)
          : JSON.stringify(processedData, null, payload.indentSize);
    }
  } catch (err) {
    const response: WorkerResponse = {
      type: "result",
      requestId,
      output: "",
      error: "Unable to format JSON. The structure may be too complex.",
      errorLocation: null,
    };
    self.postMessage(response);
    return;
  }

  const response: WorkerResponse = {
    type: "result",
    requestId,
    output,
    parsed: processedData,
  };
  self.postMessage(response);
};
