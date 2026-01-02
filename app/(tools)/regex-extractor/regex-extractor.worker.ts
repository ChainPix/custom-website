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

const computeMatches = (request: WorkerRequest): WorkerResponse => {
  const { id, pattern, flags, text, limits, mode, replacement } = request;
  if (!pattern) {
    return { id, rows: [], warning: "Enter a regex pattern.", regexError: "", replacedText: "", splitParts: [] };
  }
  try {
    const regex = new RegExp(pattern, flags);
    const limitedText = text.slice(0, limits.maxLen);
    let warning = text.length > limits.maxLen ? "Large input; results may be truncated." : "";

    if (mode === "replace") {
      return {
        id,
        rows: [],
        warning,
        regexError: "",
        replacedText: limitedText.replace(regex, replacement),
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
        splitParts: limitedText.split(regex),
      };
    }

    const matches: Row[] = [];
    for (const m of limitedText.matchAll(regex)) {
      matches.push({
        match: m[0] ?? "",
        index: m.index ?? 0,
        groups: (m as RegExpExecArray).slice(1) as string[],
        namedGroups: ((m as RegExpExecArray).groups ?? {}) as Record<string, string>,
      });
      if (matches.length >= limits.maxMatches) {
        warning = `Results truncated at ${limits.maxMatches} matches.`;
        break;
      }
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
