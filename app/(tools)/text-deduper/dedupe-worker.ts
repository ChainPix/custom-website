"use strict";

import { dedupeText } from "./dedupe";

type Options = {
  caseInsensitive: boolean;
  trimLines: boolean;
  keepBlank: boolean;
  sort: boolean;
  normalizeWhitespace: boolean;
};

type MatchingMode =
  | "exact"
  | "trim-collapse"
  | "nfkc"
  | "ignore-punctuation"
  | "ignore-diacritics"
  | "url"
  | "email";

type KeepMode = "first" | "last" | "shortest" | "longest" | "prefer-non-empty";
type EmailNormalization = "domain" | "full";

type DedupeConfig = {
  options: Options;
  matchingMode: MatchingMode;
  emailNormalization: EmailNormalization;
  keepMode: KeepMode;
};

type Entry = {
  line: string;
  count: number;
  orderIndex: number;
};

type Stats = {
  totalLines: number;
  nonBlankLines: number;
  uniqueLines: number;
  duplicatesRemoved: number;
  blankLinesRemoved: number;
};

type ResultPayload = {
  output: string;
  outputLines: string[];
  removedLines: string[];
  stats: Stats;
  frequencies: Array<{ line: string; count: number }>;
};

type InitMessage = {
  type: "init";
  requestId: number;
  config: DedupeConfig;
};

type ChunkMessage = {
  type: "chunk";
  requestId: number;
  chunk: string;
};

type EndMessage = {
  type: "end";
  requestId: number;
  endedWithNewline: boolean;
};

type ProcessMessage = {
  type: "process";
  requestId: number;
  text: string;
  config: DedupeConfig;
};

type WorkerMessage = InitMessage | ChunkMessage | EndMessage | ProcessMessage;

type State = {
  requestId: number;
  config: DedupeConfig;
  entries: Map<string, Entry>;
  removedLines: string[];
  totalLines: number;
  nonBlankLines: number;
  blankLinesRemoved: number;
  includedLines: number;
  remainder: string;
  lineIndex: number;
};

let state: State | null = null;

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    return `${hostname}${pathname}${url.search}${url.hash}`;
  } catch {
    return trimmed;
  }
};

const normalizeEmail = (value: string, normalization: EmailNormalization) => {
  const trimmed = value.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return trimmed;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();
  if (normalization === "full") {
    return `${local.toLowerCase()}@${domain}`;
  }
  return `${local}@${domain}`;
};

const buildMatchKey = (value: string, config: DedupeConfig) => {
  const { matchingMode, emailNormalization, options } = config;
  let key = value;
  switch (matchingMode) {
    case "trim-collapse":
      key = key.replace(/\s+/g, " ").trim();
      break;
    case "nfkc":
      key = key.normalize("NFKC");
      break;
    case "ignore-punctuation":
      key = key.replace(/[\p{P}\p{S}]/gu, "");
      break;
    case "ignore-diacritics":
      key = key.normalize("NFD").replace(/\p{M}/gu, "");
      break;
    case "url":
      key = normalizeUrl(key);
      break;
    case "email":
      key = normalizeEmail(key, emailNormalization);
      break;
    default:
      break;
  }
  return options.caseInsensitive ? key.toLowerCase() : key;
};

const processLine = (line: string, config: DedupeConfig, currentState: State) => {
  const { options, keepMode } = config;
  const index = currentState.lineIndex;
  currentState.lineIndex += 1;
  currentState.totalLines += 1;

  const normalized = options.trimLines ? line.trim() : line;
  const isBlank = normalized === "";
  if (isBlank && !options.keepBlank) {
    currentState.blankLinesRemoved += 1;
    return;
  }
  if (!isBlank) {
    currentState.nonBlankLines += 1;
  }
  currentState.includedLines += 1;

  const matchKey = buildMatchKey(normalized, config);
  const existing = currentState.entries.get(matchKey);
  if (existing) {
    existing.count += 1;
    let shouldReplace = false;
    if (keepMode === "last") {
      shouldReplace = true;
    } else if (keepMode === "shortest") {
      shouldReplace = normalized.length < existing.line.length;
    } else if (keepMode === "longest") {
      shouldReplace = normalized.length > existing.line.length;
    } else if (keepMode === "prefer-non-empty") {
      shouldReplace = existing.line === "" && normalized !== "";
    }
    if (shouldReplace) {
      currentState.removedLines.push(existing.line);
      existing.line = normalized;
      existing.orderIndex = index;
    } else {
      currentState.removedLines.push(normalized);
    }
  } else {
    currentState.entries.set(matchKey, { line: normalized, count: 1, orderIndex: index });
  }
};

const finalizeResult = (currentState: State): ResultPayload => {
  const { options } = currentState.config;
  const frequencies = Array.from(currentState.entries.values()).sort((a, b) =>
    options.sort ? a.line.localeCompare(b.line) : a.orderIndex - b.orderIndex
  );
  const outputLines = frequencies.map((entry) => entry.line);
  const uniqueLines = outputLines.length;
  const duplicatesRemoved = Math.max(currentState.includedLines - uniqueLines, 0);
  return {
    output: outputLines.join("\n"),
    outputLines,
    removedLines: currentState.removedLines,
    stats: {
      totalLines: currentState.totalLines,
      nonBlankLines: currentState.nonBlankLines,
      uniqueLines,
      duplicatesRemoved,
      blankLinesRemoved: currentState.blankLinesRemoved,
    },
    frequencies: frequencies.map((entry) => ({ line: entry.line, count: entry.count })),
  };
};

const startState = (requestId: number, config: DedupeConfig) => ({
  requestId,
  config,
  entries: new Map<string, Entry>(),
  removedLines: [],
  totalLines: 0,
  nonBlankLines: 0,
  blankLinesRemoved: 0,
  includedLines: 0,
  remainder: "",
  lineIndex: 0,
});

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  try {
    if (message.type === "init") {
      state = startState(message.requestId, message.config);
      return;
    }

    if (message.type === "process") {
      const result = dedupeText(message.text, message.config);
      self.postMessage({
        requestId: message.requestId,
        type: "result",
        payload: {
          output: result.output,
          outputLines: result.outputLines,
          removedLines: result.removedLines,
          stats: result.stats,
          frequencies: result.frequencies,
        },
      });
      return;
    }

    if (!state || state.requestId !== message.requestId) {
      return;
    }

    if (message.type === "chunk") {
      const combined = state.remainder + message.chunk;
      const parts = combined.split(/\r?\n/);
      state.remainder = parts.pop() ?? "";
      for (const part of parts) {
        processLine(part, state.config, state);
      }
      return;
    }

    if (message.type === "end") {
      if (state.remainder !== "") {
        processLine(state.remainder, state.config, state);
      } else if (message.endedWithNewline) {
        processLine("", state.config, state);
      }
      const payload = finalizeResult(state);
      self.postMessage({ requestId: message.requestId, type: "result", payload });
      state = null;
    }
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Worker failed";
    self.postMessage({ requestId: message.requestId, type: "error", error: messageText });
  }
};
