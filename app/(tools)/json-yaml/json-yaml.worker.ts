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
  yamlJsonMode: "strict" | "coerce";
  preferMode?: "json" | "yaml";
  yamlQuoteStyle: "double" | "single";
  yamlFlowLevel: number;
  yamlWrap: boolean;
  yamlLineWidth: number;
  jsonTrailingNewline: boolean;
  jsonEscapeUnicode: boolean;
  jsonCompact: boolean;
};

type RoundTripRequest = {
  type: "roundtrip";
  requestId: number;
  input: string;
  mode: Mode;
  yamlIndent: number;
  jsonIndent: number;
  preserveKeyOrder: boolean;
  yamlJsonMode: "strict" | "coerce";
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

type WorkerMessage = ConvertRequest | RoundTripRequest | CancelRequest;

type WorkerResponse = {
  type: "progress" | "result";
  requestId: number;
  stage?: string;
  output?: string;
  roundTripOutput?: string;
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
    const docs: unknown[] = [];
    yaml.loadAll(input, (doc) => docs.push(doc), { schema: yaml.JSON_SCHEMA });
    if (docs.length > 1) {
      return { ok: false as const, error: "YAML contains multiple documents (---). Multi-doc is not supported." };
    }
    return { ok: true as const, value: docs[0] };
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

const resolveModeAndParse = (input: string, mode: Mode, preferMode?: "json" | "yaml") => {
  if (mode !== "auto") {
    if (mode === "json-to-yaml") {
      const parsed = parseJson(input);
      if (!parsed.ok) {
        return { ok: false as const, error: parsed.error, line: parsed.line, column: parsed.column };
      }
      return { ok: true as const, mode, value: parsed.value };
    }
    const parsed = parseYaml(input);
    if (!parsed.ok) {
      return { ok: false as const, error: parsed.error, line: parsed.line, column: parsed.column };
    }
    return { ok: true as const, mode, value: parsed.value };
  }

  const preferJson = preferMode !== "yaml";
  const jsonResult = parseJson(input);
  const yamlResult = parseYaml(input);
  if (jsonResult.ok && yamlResult.ok) {
    return { ok: false as const, error: "Ambiguous input: valid JSON and YAML. Please choose a direction." };
  }
  if (jsonResult.ok) {
    return { ok: true as const, mode: "json-to-yaml" as const, value: jsonResult.value };
  }
  if (yamlResult.ok) {
    return { ok: true as const, mode: "yaml-to-json" as const, value: yamlResult.value };
  }
  return {
    ok: false as const,
    error: preferJson ? jsonResult.error : yamlResult.error,
    line: preferJson ? jsonResult.line : yamlResult.line,
    column: preferJson ? jsonResult.column : yamlResult.column
  };
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

const coerceJsonValue = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (value instanceof Map) {
    const entries: Record<string, unknown> = {};
    for (const [key, entryValue] of value.entries()) {
      entries[String(key)] = coerceJsonValue(entryValue);
    }
    return entries;
  }
  if (value instanceof Set) {
    return Array.from(value.values()).map((entry) => coerceJsonValue(entry));
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => coerceJsonValue(entry));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      result[key] = coerceJsonValue(entryValue);
    }
    return result;
  }
  return null;
};

const prepareYamlForJson = (value: unknown, mode: "strict" | "coerce") => {
  if (mode === "coerce") {
    return { ok: true as const, value: coerceJsonValue(value) };
  }
  const unsafeValue = findJsonUnsafeValue(value);
  if (unsafeValue) {
    return {
      ok: false as const,
      error: `YAML contains a value that cannot be converted to JSON at ${unsafeValue.path} (${unsafeValue.reason}).`
    };
  }
  return { ok: true as const, value };
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

  if (message.type !== "convert" && message.type !== "roundtrip") return;

  const {
    requestId,
    input,
    mode,
    yamlIndent,
    jsonIndent,
    preserveKeyOrder,
    yamlJsonMode,
    yamlQuoteStyle,
    yamlFlowLevel,
    yamlWrap,
    yamlLineWidth,
    jsonTrailingNewline,
    jsonEscapeUnicode,
    jsonCompact
  } = message;
  canceledRequests.delete(requestId);

  if (mode === "auto") {
    workerScope.postMessage({ type: "progress", requestId, stage: "Detecting input..." } satisfies WorkerResponse);
  }
  const resolved = resolveModeAndParse(input, mode, message.preferMode);
  if (!resolved.ok) {
    workerScope.postMessage({
      type: "result",
      requestId,
      error: resolved.error,
      errorLine: resolved.line,
      errorColumn: resolved.column
    } satisfies WorkerResponse);
    return;
  }
  const resolvedMode = resolved.mode;
  const parsedValue = resolved.value;

  const toYaml = (value: unknown) => {
    const dataToConvert = preserveKeyOrder ? value : sortObjectKeys(value);
    const output = yaml.dump(dataToConvert, {
      indent: yamlIndent,
      lineWidth: yamlWrap ? yamlLineWidth : -1,
      noRefs: true,
      quotingType: yamlQuoteStyle === "single" ? "'" : "\"",
      flowLevel: yamlFlowLevel
    });
    return output;
  };

  const toJson = (value: unknown) => {
    const prepared = prepareYamlForJson(value, yamlJsonMode);
    if (!prepared.ok) {
      return { ok: false as const, error: prepared.error };
    }
    const dataToConvert = preserveKeyOrder ? prepared.value : sortObjectKeys(prepared.value);
    const indent = jsonCompact ? 0 : jsonIndent;
    const rawOutput = JSON.stringify(dataToConvert, null, indent);
    return { ok: true as const, value: applyJsonFormatting(rawOutput, { jsonEscapeUnicode, jsonTrailingNewline }) };
  };

  if (message.type === "roundtrip") {
    if (resolvedMode === "json-to-yaml") {
      workerScope.postMessage({ type: "progress", requestId, stage: "Serializing YAML..." } satisfies WorkerResponse);
      try {
        const output = toYaml(parsedValue);
        if (getByteSize(output) > MAX_OUTPUT_BYTES) {
          workerScope.postMessage({
            type: "result",
            requestId,
            error: "Converted output exceeds the 25MB limit. Please reduce the input size."
          } satisfies WorkerResponse);
          return;
        }
        if (canceledRequests.has(requestId)) return;
        workerScope.postMessage({ type: "progress", requestId, stage: "Parsing back YAML..." } satisfies WorkerResponse);
        const parsedBack = parseYaml(output);
        if (!parsedBack.ok) {
          workerScope.postMessage({
            type: "result",
            requestId,
            error: parsedBack.error,
            errorLine: parsedBack.line,
            errorColumn: parsedBack.column
          } satisfies WorkerResponse);
          return;
        }
        if (parsedBack.value === undefined || parsedBack.value === null || parsedBack.value === "") {
          workerScope.postMessage({ type: "result", requestId, error: "Parsed YAML is empty; please provide valid content." } satisfies WorkerResponse);
          return;
        }
        if (canceledRequests.has(requestId)) return;
        workerScope.postMessage({ type: "progress", requestId, stage: "Serializing JSON..." } satisfies WorkerResponse);
        const roundTripResult = toJson(parsedBack.value);
        if (!roundTripResult.ok) {
          workerScope.postMessage({ type: "result", requestId, error: roundTripResult.error } satisfies WorkerResponse);
          return;
        }
        const roundTripOutput = roundTripResult.value;
        if (getByteSize(roundTripOutput) > MAX_OUTPUT_BYTES) {
          workerScope.postMessage({
            type: "result",
            requestId,
            error: "Round-trip output exceeds the 25MB limit. Please reduce the input size."
          } satisfies WorkerResponse);
          return;
        }
        workerScope.postMessage({
          type: "result",
          requestId,
          output,
          roundTripOutput,
          detectedMode: resolvedMode
        } satisfies WorkerResponse);
      } catch {
        workerScope.postMessage({ type: "result", requestId, error: "Unable to convert to YAML (possible circular references)." } satisfies WorkerResponse);
      }
      return;
    }

    if (parsedValue === undefined || parsedValue === null || parsedValue === "") {
      workerScope.postMessage({ type: "result", requestId, error: "Parsed YAML is empty; please provide valid content." } satisfies WorkerResponse);
      return;
    }
    if (canceledRequests.has(requestId)) return;
    workerScope.postMessage({ type: "progress", requestId, stage: "Serializing JSON..." } satisfies WorkerResponse);
    try {
      const outputResult = toJson(parsedValue);
      if (!outputResult.ok) {
        workerScope.postMessage({ type: "result", requestId, error: outputResult.error } satisfies WorkerResponse);
        return;
      }
      const output = outputResult.value;
      if (getByteSize(output) > MAX_OUTPUT_BYTES) {
        workerScope.postMessage({
          type: "result",
          requestId,
          error: "Converted output exceeds the 25MB limit. Please reduce the input size."
        } satisfies WorkerResponse);
        return;
      }
      if (canceledRequests.has(requestId)) return;
      workerScope.postMessage({ type: "progress", requestId, stage: "Parsing back JSON..." } satisfies WorkerResponse);
      const parsedBack = parseJson(output);
      if (!parsedBack.ok) {
        workerScope.postMessage({
          type: "result",
          requestId,
          error: parsedBack.error,
          errorLine: parsedBack.line,
          errorColumn: parsedBack.column
        } satisfies WorkerResponse);
        return;
      }
      workerScope.postMessage({ type: "progress", requestId, stage: "Serializing YAML..." } satisfies WorkerResponse);
      const roundTripOutput = toYaml(parsedBack.value);
      if (getByteSize(roundTripOutput) > MAX_OUTPUT_BYTES) {
        workerScope.postMessage({
          type: "result",
          requestId,
          error: "Round-trip output exceeds the 25MB limit. Please reduce the input size."
        } satisfies WorkerResponse);
        return;
      }
      workerScope.postMessage({
        type: "result",
        requestId,
        output,
        roundTripOutput,
        detectedMode: resolvedMode
      } satisfies WorkerResponse);
    } catch {
      workerScope.postMessage({ type: "result", requestId, error: "Unable to convert to JSON. Ensure YAML has no anchors or circular structures." } satisfies WorkerResponse);
    }
    return;
  }

  if (resolvedMode === "json-to-yaml") {
    workerScope.postMessage({ type: "progress", requestId, stage: "Sorting keys..." } satisfies WorkerResponse);
    try {
      workerScope.postMessage({ type: "progress", requestId, stage: "Serializing YAML..." } satisfies WorkerResponse);
      const output = toYaml(parsedValue);
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

  if (parsedValue === undefined || parsedValue === null || parsedValue === "") {
    workerScope.postMessage({ type: "result", requestId, error: "Parsed YAML is empty; please provide valid content." } satisfies WorkerResponse);
    return;
  }
  if (canceledRequests.has(requestId)) return;
  workerScope.postMessage({ type: "progress", requestId, stage: "Sorting keys..." } satisfies WorkerResponse);
  try {
    workerScope.postMessage({ type: "progress", requestId, stage: "Serializing JSON..." } satisfies WorkerResponse);
    const outputResult = toJson(parsedValue);
    if (!outputResult.ok) {
      workerScope.postMessage({ type: "result", requestId, error: outputResult.error } satisfies WorkerResponse);
      return;
    }
    const output = outputResult.value;
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
