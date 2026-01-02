type ValidationStats = {
  beforeChars: number;
  afterChars: number;
  beforeLines: number;
  afterLines: number;
};

type ErrorLocation = {
  line: number;
  column: number;
  offset: number | null;
};

type ValidationResult = {
  formatted: string;
  parseError: string;
  warningMsg: string;
  stats: ValidationStats | null;
  errorLocation: ErrorLocation | null;
};

type ValidateMessage = {
  id: number;
  input: string;
  trimInput: boolean;
  json5Mode: boolean;
};

const LARGE_INPUT_LIMIT = 200_000;
let json5Parser: typeof JSON.parse | null = null;

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
    json5Parser = module.default;
  }
  return json5Parser;
};

const validate = async (input: string, trimInput: boolean, json5Mode: boolean): Promise<ValidationResult> => {
  const raw = trimInput ? input.trim() : input;
  if (!raw) {
    return {
      formatted: "",
      parseError: "Enter JSON to validate.",
      warningMsg: "",
      stats: null,
      errorLocation: null,
    };
  }
  const warningMsg = raw.length > LARGE_INPUT_LIMIT
    ? `Large input (${raw.length.toLocaleString()} chars). Validation may be slower.`
    : "";
  try {
    const parser = json5Mode ? await getJson5Parser() : JSON.parse;
    const parsed = parser(raw);
    const formatted = JSON.stringify(parsed, null, 2);
    return {
      formatted,
      parseError: "",
      warningMsg,
      stats: null,
      errorLocation: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    return {
      formatted: "",
      parseError: message,
      warningMsg,
      stats: null,
      errorLocation: extractErrorLocation(message, raw),
    };
  }
};

self.onmessage = async (event: MessageEvent<ValidateMessage>) => {
  const { id, input, trimInput, json5Mode } = event.data;
  const result = await validate(input, trimInput, json5Mode);
  self.postMessage({ id, result });
};
