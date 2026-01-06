type DuplicateKey = {
  key: string;
  line: number;
  column: number;
};

type ValidationError = {
  message: string;
  line?: number;
  col?: number;
  path?: string;
};

type ValidationMeta = {
  type: "object" | "array" | "primitive";
  charsIn: number;
  charsOut: number;
  linesIn: number;
  linesOut: number;
};

type ValidationOutcome = {
  ok: boolean;
  formatted?: string;
  error?: ValidationError;
  meta?: ValidationMeta;
  warning?: string;
};

type ValidationEnvelope = ValidationOutcome & {
  parsed: unknown | null;
  duplicateKeys: DuplicateKey[];
};

type ValidateMessage = {
  id: number;
  input: string;
  trimInput: boolean;
  json5Mode: boolean;
  bigIntMode: boolean;
};

type ValidateOptions = Omit<ValidateMessage, "id" | "input">;

const LARGE_INPUT_LIMIT = 200_000;
const LOSSLESS_PREFIX = "__losslessNumber__:";
let json5Parser: typeof JSON.parse | null = null;

type ErrorLocation = {
  line: number;
  column: number;
  offset: number | null;
};

const getLineColumn = (text: string, offset: number) => {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const upto = text.slice(0, safeOffset);
  const lines = upto.split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
};

const getOffsetFromLineColumn = (text: string, line: number, column: number) => {
  if (line <= 1) return Math.max(0, column - 1);
  const lines = text.split("\n");
  const lineIndex = Math.min(line - 1, lines.length - 1);
  const beforeLines = lines.slice(0, lineIndex).join("\n");
  const base = beforeLines.length + (lineIndex > 0 ? 1 : 0);
  return Math.max(0, base + column - 1);
};

const extractErrorLocation = (message: string, raw: string): ErrorLocation | null => {
  const offsetMatch = message.match(/position\s+(\d+)/i);
  const lineColumnMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  const lineColumnAltMatch = message.match(/line\s+(\d+)[^\d]+column\s+(\d+)/i);

  let offset: number | null = null;
  let line: number | null = null;
  let column: number | null = null;

  if (offsetMatch) {
    offset = Number(offsetMatch[1]);
    if (!Number.isNaN(offset)) {
      const location = getLineColumn(raw, offset);
      line = location.line;
      column = location.column;
    }
  }

  const lineColumnSource = lineColumnMatch || lineColumnAltMatch;
  if (lineColumnSource && (!line || !column)) {
    line = Number(lineColumnSource[1]);
    column = Number(lineColumnSource[2]);
    if (!Number.isNaN(line) && !Number.isNaN(column) && offset === null) {
      offset = getOffsetFromLineColumn(raw, line, column);
    }
  }

  if (!line || !column || Number.isNaN(line) || Number.isNaN(column)) return null;

  return {
    line,
    column,
    offset,
  };
};

const getJson5Parser = async () => {
  if (!json5Parser) {
    const module = await import("json5");
    json5Parser = module.default.parse;
  }
  return json5Parser;
};

const countNewlines = (text: string) => {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) count += 1;
  }
  return count;
};

const stringifyJSON = (value: unknown, pretty: boolean): string => {
  const indent = pretty ? "  " : "";
  const newline = pretty ? "\n" : "";
  const space = pretty ? " " : "";

  const stringifyValue = (val: unknown, level: number): string => {
    if (val === null) return "null";
    if (typeof val === "string") return JSON.stringify(val);
    if (typeof val === "number") return Number.isFinite(val) ? String(val) : "null";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "bigint") return val.toString();

    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      const entries = val.map((entry) => stringifyValue(entry, level + 1));
      if (!pretty) return `[${entries.join(",")}]`;
      const padding = indent.repeat(level + 1);
      return `[${newline}${padding}${entries.join(`,${newline}${padding}`)}${newline}${indent.repeat(level)}]`;
    }

    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      const keys = Object.keys(obj);
      if (keys.length === 0) return "{}";
      const padding = indent.repeat(level + 1);
      const pieces = keys.map((key) => {
        const renderedKey = JSON.stringify(key);
        const renderedValue = stringifyValue(obj[key], level + 1);
        return `${renderedKey}:${space}${renderedValue}`;
      });
      if (!pretty) return `{${pieces.join(",")}}`;
      return `{${newline}${padding}${pieces.join(`,${newline}${padding}`)}${newline}${indent.repeat(level)}}`;
    }

    return "null";
  };

  return stringifyValue(value, 0);
};

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortKeysDeep(val)] as const);
    return Object.fromEntries(entries);
  }
  return value;
};

const removeNullsDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => removeNullsDeep(item)).filter((item) => item !== null);
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => val !== null)
      .map(([key, val]) => [key, removeNullsDeep(val)] as const);
    return Object.fromEntries(entries);
  }
  return value;
};

const dedupeArraysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const seen = new Set<string>();
    const deduped: unknown[] = [];
    for (const entry of value) {
      const normalized = stringifyJSON(sortKeysDeep(entry), false);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      deduped.push(dedupeArraysDeep(entry));
    }
    return deduped;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, dedupeArraysDeep(val)] as const),
    );
  }
  return value;
};

const camelToSnake = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
const snakeToCamel = (value: string) => value.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

const convertKeysDeep = (value: unknown, converter: (key: string) => string): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => convertKeysDeep(item, converter));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [converter(key), convertKeysDeep(val, converter)]),
    );
  }
  return value;
};

const replaceNumberTokens = (text: string) => {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      result += char;
      continue;
    }
    if (char === "-" || (char >= "0" && char <= "9")) {
      const start = i;
      let end = i + 1;
      while (end < text.length && text[end] >= "0" && text[end] <= "9") end += 1;
      if (end < text.length && text[end] === ".") {
        end += 1;
        while (end < text.length && text[end] >= "0" && text[end] <= "9") end += 1;
      }
      if (end < text.length && (text[end] === "e" || text[end] === "E")) {
        end += 1;
        if (text[end] === "+" || text[end] === "-") end += 1;
        while (end < text.length && text[end] >= "0" && text[end] <= "9") end += 1;
      }
      const token = text.slice(start, end);
      result += `"${LOSSLESS_PREFIX}${token}"`;
      i = end - 1;
      continue;
    }
    result += char;
  }
  return result;
};

const convertLosslessNumbers = (value: unknown): unknown => {
  if (typeof value === "string" && value.startsWith(LOSSLESS_PREFIX)) {
    const token = value.slice(LOSSLESS_PREFIX.length);
    const isInteger = /^-?\d+$/.test(token);
    if (!isInteger) return Number(token);
    try {
      const big = BigInt(token);
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
      if (big > maxSafe || big < minSafe) return big;
      return Number(token);
    } catch {
      return Number(token);
    }
  }
  if (Array.isArray(value)) return value.map((entry) => convertLosslessNumbers(entry));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, convertLosslessNumbers(val)]),
    );
  }
  return value;
};

const detectDuplicateKeys = (raw: string): DuplicateKey[] => {
  type Frame = { type: "object" | "array"; keys: Set<string>; expectingKey: boolean };
  const stack: Frame[] = [];
  const duplicates: DuplicateKey[] = [];
  let i = 0;
  let line = 1;
  let column = 1;
  let inString = false;
  let escaped = false;
  let expectingKey = false;
  let expectingValue = false;

  const advance = (char: string) => {
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  };

  const readString = () => {
    let value = "";
    const startLine = line;
    const startColumn = column;
    i += 1;
    advance('"');
    while (i < raw.length) {
      const ch = raw[i];
      if (escaped) {
        escaped = false;
        value += ch;
        advance(ch);
        i += 1;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        value += ch;
        advance(ch);
        i += 1;
        continue;
      }
      if (ch === '"') {
        advance(ch);
        i += 1;
        return { value, line: startLine, column: startColumn };
      }
      value += ch;
      advance(ch);
      i += 1;
    }
    return { value, line: startLine, column: startColumn };
  };

  while (i < raw.length) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      advance(ch);
      i += 1;
      continue;
    }

    if (ch === '"') {
      if (stack.length && stack[stack.length - 1].type === "object" && expectingKey) {
        const keyToken = readString();
        const frame = stack[stack.length - 1];
        if (frame.keys.has(keyToken.value)) {
          duplicates.push({ key: keyToken.value, line: keyToken.line, column: keyToken.column });
        } else {
          frame.keys.add(keyToken.value);
        }
        expectingKey = false;
        continue;
      }
      inString = true;
      advance(ch);
      i += 1;
      continue;
    }

    if (ch === "{") {
      stack.push({ type: "object", keys: new Set(), expectingKey: true });
      expectingKey = true;
      expectingValue = false;
      advance(ch);
      i += 1;
      continue;
    }
    if (ch === "[") {
      stack.push({ type: "array", keys: new Set(), expectingKey: false });
      expectingValue = true;
      expectingKey = false;
      advance(ch);
      i += 1;
      continue;
    }
    if (ch === "}") {
      stack.pop();
      expectingKey = false;
      expectingValue = false;
      advance(ch);
      i += 1;
      continue;
    }
    if (ch === "]") {
      stack.pop();
      expectingValue = false;
      advance(ch);
      i += 1;
      continue;
    }
    if (ch === ":") {
      expectingValue = true;
      advance(ch);
      i += 1;
      continue;
    }
    if (ch === ",") {
      const frame = stack[stack.length - 1];
      if (frame && frame.type === "object") {
        expectingKey = true;
        expectingValue = false;
      } else if (frame && frame.type === "array") {
        expectingValue = true;
      }
      advance(ch);
      i += 1;
      continue;
    }

    if (!/\s/.test(ch)) {
      if (expectingValue) {
        expectingValue = false;
      }
    }
    advance(ch);
    i += 1;
  }

  return duplicates;
};

const parseLosslessJSON = (raw: string): unknown => {
  const transformed = replaceNumberTokens(raw);
  const parsed = JSON.parse(transformed);
  return convertLosslessNumbers(parsed);
};

const parseInput = async (raw: string, json5Mode: boolean, bigIntMode: boolean) => {
  if (json5Mode) {
    const parser = await getJson5Parser();
    return parser(raw);
  }
  if (!bigIntMode) return JSON.parse(raw);
  JSON.parse(raw);
  return parseLosslessJSON(raw);
};

const buildWarning = (raw: string, json5Mode: boolean, bigIntMode: boolean) => {
  const warnings: string[] = [];
  if (raw.length > LARGE_INPUT_LIMIT) {
    warnings.push(`Large input (${raw.length.toLocaleString()} chars). Validation may be slower.`);
  }
  if (bigIntMode && json5Mode) {
    warnings.push("Big-int mode supports strict JSON only; JSON5 parsing may lose precision.");
  }
  return warnings.join(" ");
};

const buildMeta = (input: string, formatted: string, parsed: unknown): ValidationMeta => {
  const type = Array.isArray(parsed) ? "array" : parsed !== null && typeof parsed === "object" ? "object" : "primitive";
  return {
    type,
    charsIn: input.length,
    charsOut: formatted.length,
    linesIn: input ? countNewlines(input) + 1 : 0,
    linesOut: formatted ? countNewlines(formatted) + 1 : 0,
  };
};

const validate = async (input: string, options: ValidateOptions): Promise<ValidationEnvelope> => {
  const raw = options.trimInput ? input.trim() : input;
  if (!raw) {
    return {
      ok: false,
      parsed: null,
      duplicateKeys: [],
    };
  }
  const warning = buildWarning(raw, options.json5Mode, options.bigIntMode);
  try {
    const parsed = await parseInput(raw, options.json5Mode, options.bigIntMode && !options.json5Mode);
    const formatted = stringifyJSON(parsed, true);
    const duplicates = detectDuplicateKeys(raw);
    return {
      ok: true,
      formatted,
      meta: buildMeta(input, formatted, parsed),
      warning: warning || undefined,
      parsed,
      duplicateKeys: duplicates,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    const location = extractErrorLocation(message, raw);
    return {
      ok: false,
      error: {
        message,
        line: location?.line,
        col: location?.column,
      },
      warning: warning || undefined,
      parsed: null,
      duplicateKeys: [],
    };
  }
};

self.onmessage = async (event: MessageEvent<ValidateMessage>) => {
  const { id, input, trimInput, json5Mode, bigIntMode } = event.data;
  const payload = await validate(input, { trimInput, json5Mode, bigIntMode });
  self.postMessage({ id, payload });
};
