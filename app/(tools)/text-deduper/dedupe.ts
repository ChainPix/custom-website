"use strict";

export type Options = {
  caseInsensitive: boolean;
  trimLines: boolean;
  keepBlank: boolean;
  sort: boolean;
  normalizeWhitespace: boolean;
};

export type MatchingMode =
  | "exact"
  | "trim-collapse"
  | "nfkc"
  | "ignore-punctuation"
  | "ignore-diacritics"
  | "url"
  | "email";

export type KeepMode = "first" | "last" | "shortest" | "longest" | "prefer-non-empty";

export type EmailNormalization = "domain" | "full";

export type DedupeConfig = {
  options: Options;
  matchingMode: MatchingMode;
  emailNormalization: EmailNormalization;
  keepMode: KeepMode;
};

export type DedupeStats = {
  totalLines: number;
  nonBlankLines: number;
  uniqueLines: number;
  duplicatesRemoved: number;
  blankLinesRemoved: number;
};

export type DedupeResult = {
  output: string;
  outputLines: string[];
  stats: DedupeStats;
  duplicatesMap: Map<string, { line: string; count: number }>;
  removedLines: string[];
  frequencies: Array<{ line: string; count: number }>;
};

type Entry = {
  line: string;
  count: number;
  orderIndex: number;
};

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

export const dedupeText = (input: string, config: DedupeConfig): DedupeResult => {
  const { options, keepMode } = config;
  const lines = input.split(/\r?\n/);

  const entries = new Map<string, Entry>();
  const removedLines: string[] = [];
  const totalLines = lines.length;
  let nonBlankLines = 0;
  let blankLinesRemoved = 0;
  let includedLines = 0;

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];
    if (options.normalizeWhitespace) {
      line = line.replace(/\s+/g, " ").trim();
    }
    const normalized = options.trimLines ? line.trim() : line;
    const isBlank = normalized === "";
    if (isBlank && !options.keepBlank) {
      blankLinesRemoved += 1;
      continue;
    }
    if (!isBlank) {
      nonBlankLines += 1;
    }
    includedLines += 1;

    const matchKey = buildMatchKey(normalized, config);
    const existing = entries.get(matchKey);
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
        removedLines.push(existing.line);
        existing.line = normalized;
        existing.orderIndex = index;
      } else {
        removedLines.push(normalized);
      }
    } else {
      entries.set(matchKey, { line: normalized, count: 1, orderIndex: index });
    }
  }

  const collator = options.caseInsensitive
    ? new Intl.Collator(undefined, { sensitivity: "base" })
    : null;
  const frequencies = Array.from(entries.values()).sort((a, b) => {
    if (!options.sort) return a.orderIndex - b.orderIndex;
    const comparison = collator ? collator.compare(a.line, b.line) : a.line.localeCompare(b.line);
    if (comparison !== 0) return comparison;
    return a.orderIndex - b.orderIndex;
  });
  const outputLines = frequencies.map((entry) => entry.line);
  const uniqueLines = outputLines.length;
  const duplicatesRemoved = Math.max(includedLines - uniqueLines, 0);
  const duplicatesMap = new Map<string, { line: string; count: number }>();
  entries.forEach((entry, key) => {
    duplicatesMap.set(key, { line: entry.line, count: entry.count });
  });

  return {
    output: outputLines.join("\n"),
    outputLines,
    stats: {
      totalLines,
      nonBlankLines,
      uniqueLines,
      duplicatesRemoved,
      blankLinesRemoved,
    },
    duplicatesMap,
    removedLines,
    frequencies: frequencies.map((entry) => ({ line: entry.line, count: entry.count })),
  };
};
