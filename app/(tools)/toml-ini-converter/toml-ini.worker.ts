import ini from "ini";
import toml from "toml";

type Mode = "toml" | "ini";

type ParseRequest = {
  type: "parse";
  requestId: number;
  input: string;
  mode: Mode;
  pretty: boolean;
  nestIniDots: boolean;
};

type ParseResponse = {
  type: "result";
  requestId: number;
  output: string;
  error: string;
  status: string;
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

const parseInput = (message: ParseRequest): ParseResponse => {
  const { input, mode, pretty, nestIniDots, requestId } = message;
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
        };
      }
    }
    const escapedIniInput = nestIniDots ? input : escapeIniSections(input);
    const parsed = mode === "toml" ? toml.parse(input) : ini.parse(escapedIniInput);
    const output = pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
    return {
      type: "result",
      requestId,
      output,
      error: "",
      status: `Parsed ${mode.toUpperCase()} input`,
    };
  } catch (err) {
    if (mode === "toml") {
      const line = typeof (err as { line?: unknown }).line === "number" ? (err as { line: number }).line : null;
      const column =
        typeof (err as { column?: unknown }).column === "number" ? (err as { column: number }).column : null;
      if (line !== null && column !== null) {
        const error = `Invalid TOML at line ${line}, column ${column}.`;
        return { type: "result", requestId, output: "", error, status: error };
      }
      if (err instanceof Error && err.message) {
        const error = `Invalid TOML: ${err.message}`;
        return { type: "result", requestId, output: "", error, status: error };
      }
    }
    const error = `Invalid ${mode.toUpperCase()} input.`;
    return { type: "result", requestId, output: "", error, status: error };
  }
};

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const message = event.data;
  if (!message || message.type !== "parse") return;
  self.postMessage(parseInput(message));
};
