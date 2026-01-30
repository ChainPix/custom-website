import ini from "ini";
import toml from "toml";
import { stringify as stringifyToml, type JsonMap } from "@iarna/toml";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";

type Mode = "toml" | "ini" | "json";

type SchemaIssue = {
  path: string;
  message: string;
};

type SchemaValidation = {
  valid: boolean;
  errors: SchemaIssue[];
  schemaError: string;
};

type ErrorLocation = {
  line: number;
  column: number;
};

type ParseRequest = {
  type: "parse";
  requestId: number;
  input: string;
  mode: Mode;
  outputFormat: Mode;
  pretty: boolean;
  nestIniDots: boolean;
  iniArrayDelimiter: "comma" | "newline";
  iniDuplicateKeys: "last" | "array";
  iniCoerceTypes: boolean;
  schemaEnabled: boolean;
  schemaInput: string;
};

type ParseResponse = {
  type: "result";
  requestId: number;
  output: string;
  error: string;
  status: string;
  schemaValidation: SchemaValidation | null;
  errorLocation: ErrorLocation | null;
};

const findIniLineError = (raw: string) => {
  const lines = raw.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) {
      continue;
    }
    if (trimmed.startsWith("[") && !/^\[[^\]]+\]\s*$/.test(trimmed)) {
      return { line: index + 1, message: `Invalid INI section header at line ${index + 1}.` };
    }
  }
  return null;
};

const escapeIniSections = (raw: string) =>
  raw.replace(/^(\s*)\[([^\]]+)\](\s*)$/gm, (_match, lead, name, tail) => {
    let backslashes = 0;
    let escaped = "";
    for (const char of name) {
      if (char === "\\") {
        backslashes += 1;
        escaped += char;
        continue;
      }
      if (char === ".") {
        escaped += backslashes % 2 === 1 ? "." : "\\.";
        backslashes = 0;
        continue;
      }
      backslashes = 0;
      escaped += char;
    }
    return `${lead}[${escaped}]${tail}`;
  });

const getLineColumn = (text: string, offset: number): ErrorLocation => {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const upto = text.slice(0, safeOffset);
  const lines = upto.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
};

const extractJsonErrorLocation = (message: string, raw: string): ErrorLocation | null => {
  const match = message.match(/position\s+(\d+)/i);
  if (!match) return null;
  const offset = Number(match[1]);
  if (Number.isNaN(offset)) return null;
  return getLineColumn(raw, offset);
};

let ajvInstance: Ajv | null = null;
let cachedSchemaSource = "";
let cachedValidate: ValidateFunction | null = null;
let cachedSchemaError = "";

const getAjv = () => {
  if (!ajvInstance) {
    ajvInstance = new Ajv({ allErrors: true, strict: false });
  }
  return ajvInstance;
};

const toSchemaIssues = (errors: ErrorObject[] | null | undefined): SchemaIssue[] =>
  (errors || []).map((err) => ({
    path: err.instancePath || "(root)",
    message: err.message || "Schema validation error.",
  }));

const validateSchema = (schemaInput: string, value: unknown): SchemaValidation => {
  const trimmed = schemaInput.trim();
  if (!trimmed) {
    return { valid: false, errors: [], schemaError: "Schema is empty." };
  }
  if (trimmed !== cachedSchemaSource) {
    cachedSchemaSource = trimmed;
    cachedValidate = null;
    cachedSchemaError = "";
    try {
      const schema = JSON.parse(trimmed);
      const ajv = getAjv();
      cachedValidate = ajv.compile(schema);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid schema JSON.";
      cachedSchemaError = `Invalid schema: ${message}`;
    }
  }
  if (cachedSchemaError) {
    return { valid: false, errors: [], schemaError: cachedSchemaError };
  }
  if (!cachedValidate) {
    return { valid: false, errors: [], schemaError: "Schema validation unavailable." };
  }
  const valid = Boolean(cachedValidate(value));
  return {
    valid,
    errors: valid ? [] : toSchemaIssues(cachedValidate.errors),
    schemaError: "",
  };
};

const coerceIniPrimitive = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return value;
};

const transformIniValue = (value: unknown, arrayDelimiter: "comma" | "newline", coerceTypes: boolean): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => transformIniValue(entry, arrayDelimiter, coerceTypes));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        transformIniValue(val, arrayDelimiter, coerceTypes),
      ])
    );
  }
  if (typeof value === "boolean") {
    return coerceTypes ? value : value ? "true" : "false";
  }
  if (value === null) {
    return coerceTypes ? null : "null";
  }
  if (typeof value !== "string") return value;

  const segments =
    arrayDelimiter === "comma" && value.includes(",")
      ? value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0)
      : [value];
  if (segments.length > 1) {
    return coerceTypes ? segments.map((entry) => coerceIniPrimitive(entry)) : segments;
  }
  return coerceTypes ? coerceIniPrimitive(value) : value;
};

const parseInput = (message: ParseRequest): ParseResponse => {
  const {
    input,
    mode,
    outputFormat,
    pretty,
    nestIniDots,
    iniArrayDelimiter,
    iniDuplicateKeys,
    iniCoerceTypes,
    schemaEnabled,
    schemaInput,
    requestId,
  } = message;
  try {
    if (mode === "ini") {
      const iniLineError = findIniLineError(input);
      if (iniLineError) {
        return {
          type: "result",
          requestId,
          output: "",
          error: iniLineError.message,
          status: iniLineError.message,
          schemaValidation: null,
          errorLocation: { line: iniLineError.line, column: 1 },
        };
      }
    }
    const escapedIniInput = nestIniDots ? input : escapeIniSections(input);
    const parsed =
      mode === "toml"
        ? toml.parse(input)
        : mode === "ini"
          ? ini.parse(escapedIniInput, { bracketedArray: iniDuplicateKeys !== "array" })
          : JSON.parse(input);
    const normalizedParsed =
      mode === "ini" ? transformIniValue(parsed, iniArrayDelimiter, iniCoerceTypes) : parsed;
    const preservesInput = outputFormat === mode && !pretty;
    const output = preservesInput
      ? input
      : outputFormat === "json"
        ? pretty
          ? JSON.stringify(normalizedParsed, null, 2)
          : JSON.stringify(normalizedParsed)
        : outputFormat === "ini"
          ? ini.stringify(normalizedParsed as Record<string, unknown>, {
              whitespace: pretty,
              align: pretty,
              newline: true,
            })
          : stringifyToml(normalizedParsed as JsonMap);
    const status = preservesInput
      ? `Validated ${mode.toUpperCase()} input`
      : mode === outputFormat
        ? `Formatted ${mode.toUpperCase()} input`
        : `Converted ${mode.toUpperCase()} to ${outputFormat.toUpperCase()}`;
    const schemaValidation = schemaEnabled ? validateSchema(schemaInput, normalizedParsed) : null;
    return {
      type: "result",
      requestId,
      output,
      error: "",
      status,
      schemaValidation,
      errorLocation: null,
    };
  } catch (err) {
    if (mode === "toml") {
      const line = typeof (err as { line?: unknown }).line === "number" ? (err as { line: number }).line : null;
      const column =
        typeof (err as { column?: unknown }).column === "number" ? (err as { column: number }).column : null;
      if (line !== null && column !== null) {
        const error = `Invalid TOML at line ${line}, column ${column}.`;
        return {
          type: "result",
          requestId,
          output: "",
          error,
          status: error,
          schemaValidation: null,
          errorLocation: { line, column },
        };
      }
      if (err instanceof Error && err.message) {
        const error = `Invalid TOML: ${err.message}`;
        return { type: "result", requestId, output: "", error, status: error, schemaValidation: null, errorLocation: null };
      }
    } else if (mode === "json") {
      if (err instanceof Error && err.message) {
        const error = `Invalid JSON: ${err.message}`;
        return {
          type: "result",
          requestId,
          output: "",
          error,
          status: error,
          schemaValidation: null,
          errorLocation: extractJsonErrorLocation(err.message, input),
        };
      }
    }
    const error = `Invalid ${mode.toUpperCase()} input.`;
    return { type: "result", requestId, output: "", error, status: error, schemaValidation: null, errorLocation: null };
  }
};

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const message = event.data;
  if (!message || message.type !== "parse") return;
  self.postMessage(parseInput(message));
};
