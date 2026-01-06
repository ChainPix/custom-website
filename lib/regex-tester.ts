export type RegexBuildResult = {
  regex: RegExp | null;
  error: string;
  source: string;
};

export type RegexMatch = {
  match: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string | undefined>;
  zeroLength: boolean;
};

export type MatchComputation = {
  matches: RegexMatch[];
  elapsedMs: number;
  expensive: boolean;
};

export type HighlightSegment = {
  key: string;
  content: string;
  highlight: boolean;
  zeroLength?: boolean;
  matchIndex?: number;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildRegex = (pattern: string, flags: string[], escapeInput: boolean): RegexBuildResult => {
  if (!pattern) {
    return { regex: null, error: "", source: "" };
  }
  const source = escapeInput ? escapeRegex(pattern) : pattern;
  try {
    return { regex: new RegExp(source, flags.join("")), error: "", source };
  } catch (err) {
    return { regex: null, error: "Invalid regex pattern.", source };
  }
};

export const computeMatches = (text: string, regex: RegExp, timeBudgetMs?: number): MatchComputation => {
  const working = new RegExp(regex.source, regex.flags);
  working.lastIndex = 0;
  const list: RegexMatch[] = [];
  const pushMatch = (m: RegExpExecArray) => {
    const matchText = m[0] ?? "";
    list.push({
      match: matchText,
      index: m.index ?? 0,
      groups: m.slice(1),
      namedGroups: m.groups ?? {},
      zeroLength: matchText.length === 0,
    });
  };
  const start = performance.now();
  if (!working.global) {
    const single = working.exec(text);
    if (single) pushMatch(single);
    const elapsed = performance.now() - start;
    const expensive = timeBudgetMs !== undefined && elapsed > timeBudgetMs;
    return { matches: expensive ? [] : list, elapsedMs: elapsed, expensive };
  }
  let next = working.exec(text);
  while (next) {
    const elapsed = performance.now() - start;
    if (timeBudgetMs !== undefined && elapsed > timeBudgetMs) {
      return { matches: [], elapsedMs: elapsed, expensive: true };
    }
    pushMatch(next);
    if (next[0] === "") {
      if (working.lastIndex >= text.length) break;
      working.lastIndex += 1;
    }
    next = working.exec(text);
  }
  const elapsed = performance.now() - start;
  const expensive = timeBudgetMs !== undefined && elapsed > timeBudgetMs;
  return { matches: expensive ? [] : list, elapsedMs: elapsed, expensive };
};

export const buildHighlightSegments = (text: string, matches: RegexMatch[]): HighlightSegment[] => {
  if (!text || !matches.length) return [{ key: "all", content: text, highlight: false }];
  const segs: HighlightSegment[] = [];
  let cursor = 0;
  matches.forEach((m, idx) => {
    const start = m.index ?? 0;
    const end = start + m.match.length;
    if (start > cursor) {
      segs.push({ key: `plain-${idx}`, content: text.slice(cursor, start), highlight: false });
    }
    if (end === start) {
      segs.push({ key: `hit-${idx}`, content: "|", highlight: true, zeroLength: true, matchIndex: idx });
    } else {
      segs.push({
        key: `hit-${idx}`,
        content: text.slice(start, end),
        highlight: true,
        matchIndex: idx,
      });
    }
    cursor = end;
  });
  if (cursor < text.length) {
    segs.push({ key: "tail", content: text.slice(cursor), highlight: false });
  }
  return segs;
};
