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
    useJSON5: boolean;
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

const sortObjectKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectKeys(item));
  }
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((result: Record<string, unknown>, key) => {
        result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
        return result;
      }, {} as Record<string, unknown>);
  }
  return obj;
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

  const processedData = payload.sortKeys ? sortObjectKeys(result.parsed) : result.parsed;
  let output = "";
  try {
    output =
      payload.mode === "minify"
        ? JSON.stringify(processedData)
        : JSON.stringify(processedData, null, payload.indentSize);
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
