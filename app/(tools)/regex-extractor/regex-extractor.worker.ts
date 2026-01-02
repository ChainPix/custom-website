import { RE2 } from "re2-wasm";

type Row = {
  match: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
};

type WorkerRequest = {
  id: number;
  pattern: string;
  flags: string;
  text: string;
  limits: { maxLen: number; maxMatches: number };
  mode: "extract" | "replace" | "split";
  replacement: string;
  safeMode: boolean;
};

type WorkerResponse = {
  id: number;
  rows: Row[];
  warning: string;
  regexError: string;
  replacedText: string;
  splitParts: string[];
};

const sanitizeRegexError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  const cleaned = message.replace(/^Invalid regular expression: .*?:\s*/, "");
  return cleaned || message;
};

const ensureSafeFlags = (flags: string) => {
  const set = new Set(flags.split(""));
  set.add("u");
  return Array.from(set).join("");
};

const createRegex = (pattern: string, flags: string, safeMode: boolean) => {
  if (safeMode) {
    return new RE2(pattern, ensureSafeFlags(flags));
  }
  return new RegExp(pattern, flags);
};

const computeMatches = (request: WorkerRequest): WorkerResponse => {
  const { id, pattern, flags, text, limits, mode, replacement, safeMode } = request;
  if (!pattern) {
    return { id, rows: [], warning: "Enter a regex pattern.", regexError: "", replacedText: "", splitParts: [] };
  }
  try {
    const regex = createRegex(pattern, flags, safeMode);
    const limitedText = text.slice(0, limits.maxLen);
    let warning = text.length > limits.maxLen ? "Large input; results may be truncated." : "";

    if (mode === "replace") {
      return {
        id,
        rows: [],
        warning,
        regexError: "",
        replacedText: limitedText.replace(regex as RegExp, replacement),
        splitParts: [],
      };
    }

    if (mode === "split") {
      return {
        id,
        rows: [],
        warning,
        regexError: "",
        replacedText: "",
        splitParts: limitedText.split(regex as RegExp),
      };
    }

    const matches: Row[] = [];
    let guard = 0;
    let match = (regex as RegExp).exec(limitedText);
    while (match) {
      matches.push({
        match: match[0] ?? "",
        index: match.index ?? 0,
        groups: (match as RegExpExecArray).slice(1) as string[],
        namedGroups: ((match as RegExpExecArray).groups ?? {}) as Record<string, string>,
      });
      if (matches.length >= limits.maxMatches) {
        warning = `Results truncated at ${limits.maxMatches} matches.`;
        break;
      }
      if ((regex as RegExp).global) {
        if (match[0] === "") {
          (regex as RegExp).lastIndex += 1;
        }
      } else {
        break;
      }
      match = (regex as RegExp).exec(limitedText);
      guard += 1;
      if (guard > limits.maxMatches * 4) break;
    }
    if (!matches.length && !warning) {
      warning = "No matches found.";
    }
    return { id, rows: matches, warning, regexError: "", replacedText: "", splitParts: [] };
  } catch (error) {
    return { id, rows: [], warning: "", regexError: sanitizeRegexError(error), replacedText: "", splitParts: [] };
  }
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  self.postMessage(computeMatches(event.data));
};
