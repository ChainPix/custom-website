/// <reference lib="webworker" />

import yaml from "js-yaml";

type Mode = "json-to-yaml" | "yaml-to-json" | "auto";

type ConvertRequest = {
  type: "convert";
  requestId: number;
  input: string;
  mode: Mode;
  yamlIndent: number;
  jsonIndent: number;
  preserveKeyOrder: boolean;
  preferMode?: "json" | "yaml";
  yamlQuoteStyle: "double" | "single";
  yamlFlowLevel: number;
  yamlWrap: boolean;
  yamlLineWidth: number;
  jsonTrailingNewline: boolean;
  jsonEscapeUnicode: boolean;
  jsonCompact: boolean;
};

type CancelRequest = {
  type: "cancel";
  requestId: number;
};

type WorkerMessage = ConvertRequest | CancelRequest;

type WorkerResponse = {
  type: "progress" | "result";
  requestId: number;
  stage?: string;
  output?: string;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
  detectedMode?: Exclude<Mode, "auto">;
};

const MAX_OUTPUT_BYTES = 25 * 1024 * 1024;

const getByteSize = (value: string) => new TextEncoder().encode(value).length;

const getJsonErrorLocation = (err: Error, input: string) => {
  const match = err.message.match(/position (\d+)/);
  if (!match) return null;
  const position = parseInt(match[1], 10);
  const lines = input.substring(0, position).split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
};

const getYamlErrorLocation = (err: Error) => {
  const mark = (err as yaml.YAMLException & { mark?: { line: number; column: number } }).mark;
  if (mark && typeof mark.line === "number" && typeof mark.column === "number") {
    return { line: mark.line + 1, column: mark.column + 1 };
  }
  return null;
};

const getBetterErrorMessage = (err: unknown, conversionMode: Mode, input: string): string => {
  if (err instanceof Error) {
    if (conversionMode === "json-to-yaml") {
      const location = getJsonErrorLocation(err, input);
      if (location) {
        return `Invalid JSON at line ${location.line}, column ${location.column}: ${err.message}`;
      }
      return `Invalid JSON: ${err.message}`;
    }
    const location = getYamlErrorLocation(err);
    if (location) {
      return `Invalid YAML at line ${location.line}, column ${location.column}: ${err.message}`;
    }
    return `Invalid YAML: ${err.message}`;
  }
  return `Invalid ${conversionMode === "json-to-yaml" ? "JSON" : "YAML"} input.`;
};

const escapeUnicodeString = (value: string) =>
  value.replace(/[^\u0000-\u007f]/g, (char) => {
    const code = char.codePointAt(0);
    if (code === undefined) return char;
    if (code <= 0xffff) {
      return `\\u${code.toString(16).padStart(4, "0")}`;
    }
    const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
    const low = ((code - 0x10000) % 0x400) + 0xdc00;
    return `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
  });

const applyJsonFormatting = (value: string, options: { jsonEscapeUnicode: boolean; jsonTrailingNewline: boolean }) => {
  const escaped = options.jsonEscapeUnicode ? escapeUnicodeString(value) : value;
  return options.jsonTrailingNewline ? `${escaped}\n` : escaped;
};

const parseJson = (input: string) => {
  try {
    return { ok: true as const, value: JSON.parse(input) };
  } catch (err) {
    if (err instanceof Error) {
      const location = getJsonErrorLocation(err, input);
      const message = location
        ? `Invalid JSON at line ${location.line}, column ${location.column}: ${err.message}`
        : `Invalid JSON: ${err.message}`;
      return { ok: false as const, error: message, line: location?.line, column: location?.column };
    }
    return { ok: false as const, error: "Invalid JSON input." };
  }
};

const parseYaml = (input: string) => {
  try {
    return { ok: true as const, value: yaml.load(input, { schema: yaml.JSON_SCHEMA }) };
  } catch (err) {
    if (err instanceof Error) {
      const location = getYamlErrorLocation(err);
      const message = location
        ? `Invalid YAML at line ${location.line}, column ${location.column}: ${err.message}`
        : `Invalid YAML: ${err.message}`;
      return { ok: false as const, error: message, line: location?.line, column: location?.column };
    }
    return { ok: false as const, error: "Invalid YAML input." };
  }
};

const sortObjectKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item));
  }
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((result: Record<string, unknown>, key) => {
        result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return obj;
};

const isPlainObject = (value: object) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const findJsonUnsafeValue = (value: unknown, path = "$"): { path: string; reason: string } | null => {
  if (value === undefined) {
    return { path, reason: "value is undefined" };
  }
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { path, reason: "number is not finite" };
    }
    return null;
  }
  if (typeof value === "bigint") {
    return { path, reason: "value is a BigInt" };
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return { path, reason: `value is a ${typeof value}` };
  }
  if (value instanceof Date) {
    return { path, reason: "value is a Date" };
  }
  if (value instanceof Map) {
    return { path, reason: "value is a Map" };
  }
  if (value instanceof Set) {
    return { path, reason: "value is a Set" };
  }
  if (value instanceof RegExp) {
    return { path, reason: "value is a RegExp" };
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findJsonUnsafeValue(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    if (!isPlainObject(value)) {
      return { path, reason: "value is a non-plain object" };
    }
    for (const [key, child] of Object.entries(value)) {
      const found = findJsonUnsafeValue(child, `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }
  return { path, reason: "value is not JSON-compatible" };
};

const workerScope = self as DedicatedWorkerGlobalScope;
const canceledRequests = new Set<number>();

workerScope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === "cancel") {
    canceledRequests.add(message.requestId);
    return;
  }

  if (message.type !== "convert") return;

  const {
    requestId,
    input,
    mode,
    yamlIndent,
    jsonIndent,
    preserveKeyOrder,
    yamlQuoteStyle,
    yamlFlowLevel,
    yamlWrap,
    yamlLineWidth,
    jsonTrailingNewline,
    jsonEscapeUnicode,
    jsonCompact
  } = message;
  canceledRequests.delete(requestId);

  let resolvedMode: Exclude<Mode, "auto"> = mode === "auto" ? "json-to-yaml" : mode;
  let parsedValue: unknown;

  if (mode === "auto") {
    workerScope.postMessage({ type: "progress", requestId, stage: "Detecting input..." } satisfies WorkerResponse);
    const jsonResult = parseJson(input);
    const yamlResult = parseYaml(input);
    const preferJson = message.preferMode !== "yaml";

    if (jsonResult.ok && yamlResult.ok) {
      workerScope.postMessage({
        type: "result",
        requestId,
        error: "Ambiguous input: valid JSON and YAML. Please choose a direction."
      } satisfies WorkerResponse);
      return;
    }
    if (jsonResult.ok) {
      resolvedMode = "json-to-yaml";
      parsedValue = jsonResult.value;
    } else if (yamlResult.ok) {
      resolvedMode = "yaml-to-json";
      parsedValue = yamlResult.value;
    } else {
      workerScope.postMessage({
        type: "result",
        requestId,
        error: preferJson ? jsonResult.error : yamlResult.error,
        errorLine: preferJson ? jsonResult.line : yamlResult.line,
        errorColumn: preferJson ? jsonResult.column : yamlResult.column
      } satisfies WorkerResponse);
      return;
    }
  }

  if (resolvedMode === "json-to-yaml") {
    if (parsedValue === undefined) {
      workerScope.postMessage({ type: "progress", requestId, stage: "Parsing JSON..." } satisfies WorkerResponse);
      const parsed = parseJson(input);
      if (!parsed.ok) {
        workerScope.postMessage({
          type: "result",
          requestId,
          error: parsed.error,
          errorLine: parsed.line,
          errorColumn: parsed.column
        } satisfies WorkerResponse);
        return;
      }
      parsedValue = parsed.value;
    }
    if (canceledRequests.has(requestId)) return;
    workerScope.postMessage({ type: "progress", requestId, stage: "Sorting keys..." } satisfies WorkerResponse);
    const dataToConvert = preserveKeyOrder ? parsedValue : sortObjectKeys(parsedValue);
    try {
      workerScope.postMessage({ type: "progress", requestId, stage: "Serializing YAML..." } satisfies WorkerResponse);
      const output = yaml.dump(dataToConvert, {
        indent: yamlIndent,
        lineWidth: yamlWrap ? yamlLineWidth : -1,
        noRefs: true,
        quotingType: yamlQuoteStyle === "single" ? "'" : "\"",
        flowLevel: yamlFlowLevel
      });
      if (getByteSize(output) > MAX_OUTPUT_BYTES) {
        workerScope.postMessage({
          type: "result",
          requestId,
          error: "Converted output exceeds the 25MB limit. Please reduce the input size."
        } satisfies WorkerResponse);
        return;
      }
      workerScope.postMessage({ type: "result", requestId, output, detectedMode: resolvedMode } satisfies WorkerResponse);
    } catch {
      workerScope.postMessage({ type: "result", requestId, error: "Unable to convert to YAML (possible circular references)." } satisfies WorkerResponse);
    }
    return;
  }

  if (parsedValue === undefined) {
    workerScope.postMessage({ type: "progress", requestId, stage: "Parsing YAML..." } satisfies WorkerResponse);
    const parsed = parseYaml(input);
    if (!parsed.ok) {
      workerScope.postMessage({
        type: "result",
        requestId,
        error: parsed.error,
        errorLine: parsed.line,
        errorColumn: parsed.column
      } satisfies WorkerResponse);
      return;
    }
    parsedValue = parsed.value;
  }
  if (canceledRequests.has(requestId)) return;
  if (parsedValue === undefined || parsedValue === null || parsedValue === "") {
    workerScope.postMessage({ type: "result", requestId, error: "Parsed YAML is empty; please provide valid content." } satisfies WorkerResponse);
    return;
  }
  workerScope.postMessage({ type: "progress", requestId, stage: "Validating JSON..." } satisfies WorkerResponse);
  const unsafeValue = findJsonUnsafeValue(parsedValue);
  if (unsafeValue) {
    workerScope.postMessage({
      type: "result",
      requestId,
      error: `YAML contains a value that cannot be converted to JSON at ${unsafeValue.path} (${unsafeValue.reason}).`
    } satisfies WorkerResponse);
    return;
  }
  if (canceledRequests.has(requestId)) return;
  workerScope.postMessage({ type: "progress", requestId, stage: "Sorting keys..." } satisfies WorkerResponse);
  const dataToConvert = preserveKeyOrder ? parsedValue : sortObjectKeys(parsedValue);
  try {
    workerScope.postMessage({ type: "progress", requestId, stage: "Serializing JSON..." } satisfies WorkerResponse);
    const indent = jsonCompact ? 0 : jsonIndent;
    const rawOutput = JSON.stringify(dataToConvert, null, indent);
    const output = applyJsonFormatting(rawOutput, { jsonEscapeUnicode, jsonTrailingNewline });
    if (getByteSize(output) > MAX_OUTPUT_BYTES) {
      workerScope.postMessage({
        type: "result",
        requestId,
        error: "Converted output exceeds the 25MB limit. Please reduce the input size."
      } satisfies WorkerResponse);
      return;
    }
    workerScope.postMessage({ type: "result", requestId, output, detectedMode: resolvedMode } satisfies WorkerResponse);
  } catch {
    workerScope.postMessage({ type: "result", requestId, error: "Unable to convert to JSON. Ensure YAML has no anchors or circular structures." } satisfies WorkerResponse);
  }
};
