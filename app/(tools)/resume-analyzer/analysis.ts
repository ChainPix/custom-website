export type Keyword = {
  word: string;
  count: number;
  score: number;
};

export type SectionKey = "summary" | "experience" | "projects" | "skills" | "education" | "certifications";

export type SectionMatch = {
  key: SectionKey;
  found: boolean;
  line: number | null;
};

export type SectionBucket = "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "other";

export type TermEntry = {
  term: string;
  count: number;
  score: number;
  bestSectionWeight: number;
};

export type TermData = {
  totalTokens: number;
  counts: Record<string, number>;
  forms: Record<string, Set<string>>;
  sectionCounts: Record<SectionBucket, Record<string, number>>;
  tokens: string[];
  terms: TermEntry[];
  topTerms: TermEntry[];
  displayTerms: Keyword[];
};

export type MissingTerm = {
  term: string;
  appearsNowhere: boolean;
  suggestedSection: "Skills" | "Experience";
  template: string;
};

export type MatchResult = {
  matchScore: number;
  missing: MissingTerm[];
  extras: string[];
  exactMatches: number;
  aliasMatches: number;
  totalTerms: number;
};

export type PassiveBullet = {
  text: string;
  suggestion: string;
};

export type RepeatedVerb = {
  verb: string;
  count: number;
};

export type QualityInsights = {
  totalBullets: number;
  actionVerbRate: number;
  measurabilityRate: number;
  bulletQualityScore: number;
  readabilityScore: number;
  passiveBullets: PassiveBullet[];
  repeatedVerbs: RepeatedVerb[];
};

export type Insights = {
  wordCount: number;
  charCount: number;
  readingMinutes: number;
  bulletCount: number;
  keywords: Keyword[];
  uniqueWords: number;
  bigrams: Array<{ phrase: string; count: number }>;
  trigrams: Array<{ phrase: string; count: number }>;
  sections: SectionMatch[];
  quality: QualityInsights;
};

export type SectionWeights = Record<SectionBucket, number>;

export type AtsIssue = {
  type: "columns" | "tables" | "repeating-headers";
  message: string;
};

const stopWords = new Set([
  "the",
  "and",
  "or",
  "for",
  "with",
  "a",
  "an",
  "to",
  "of",
  "in",
  "on",
  "at",
  "is",
  "are",
  "be",
  "from",
  "by",
  "this",
  "that",
  "it",
  "as",
  "was",
  "were",
  "will",
  "your",
  "you",
  "we",
  "our",
  "their",
  "them",
  "this",
  "these",
  "those",
  "my",
  "i",
  "me",
]);

const TECH_DICTIONARY = new Set([
  "aws",
  "azure",
  "bash",
  "c",
  "c#",
  "c++",
  "ci/cd",
  "css",
  "docker",
  "gcp",
  "git",
  "github",
  "gitlab",
  "go",
  "graphql",
  "html",
  "java",
  "javascript",
  "jenkins",
  "jest",
  "kotlin",
  "kubernetes",
  "linux",
  "mongodb",
  "mysql",
  "next.js",
  "node.js",
  "php",
  "playwright",
  "postgresql",
  "python",
  "react",
  "redis",
  "rest",
  "ruby",
  "rust",
  "sass",
  "sql",
  "svelte",
  "swift",
  "tailwind",
  "terraform",
  "typescript",
  "vitest",
  "vue",
]);

const aliasMap: Record<string, string> = {
  k8s: "kubernetes",
  js: "javascript",
  ts: "typescript",
  postgres: "postgresql",
};

const TOKEN_REGEX = /[a-z0-9]+(?:[.+#/][a-z0-9]+)*[+#]*/gi;
const TOP_TERM_COUNT = 100;
const DISPLAY_TERM_COUNT = 30;

const ACTION_VERBS = new Set([
  "achieved",
  "automated",
  "built",
  "created",
  "delivered",
  "designed",
  "developed",
  "drove",
  "implemented",
  "improved",
  "increased",
  "led",
  "launched",
  "optimized",
  "reduced",
  "shipped",
  "streamlined",
]);

const PASSIVE_STARTS: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /^responsible for\b/i, suggestion: "Led" },
  { pattern: /^tasked with\b/i, suggestion: "Delivered" },
  { pattern: /^worked on\b/i, suggestion: "Built" },
  { pattern: /^helped\b/i, suggestion: "Drove" },
  { pattern: /^assisted\b/i, suggestion: "Delivered" },
  { pattern: /^involved in\b/i, suggestion: "Led" },
  { pattern: /^supported\b/i, suggestion: "Implemented" },
];

const OUTCOME_WORDS = new Set([
  "improved",
  "reduced",
  "increased",
  "decreased",
  "boosted",
  "cut",
  "saved",
  "grew",
  "accelerated",
  "optimized",
  "delivered",
  "achieved",
]);

const SCOPE_WORDS = new Set([
  "project",
  "product",
  "service",
  "system",
  "feature",
  "platform",
  "pipeline",
  "workflow",
  "team",
  "customer",
  "client",
  "api",
  "model",
  "dataset",
  "app",
]);

export const DEFAULT_SECTION_WEIGHTS: SectionWeights = {
  summary: 0.8,
  skills: 1.6,
  experience: 1.3,
  projects: 1.2,
  education: 1.0,
  certifications: 1.0,
  other: 1.0,
};

const sectionHeaderPatterns: Array<{ key: SectionBucket; pattern: RegExp }> = [
  { key: "skills", pattern: /\bskills\b|\btooling\b|\btechnologies\b|\btech stack\b/i },
  { key: "experience", pattern: /\bexperience\b|\bwork history\b|\bemployment\b/i },
  { key: "projects", pattern: /\bprojects\b|\bproject work\b/i },
  { key: "education", pattern: /\beducation\b|\bstudies\b|\bdegree\b|\buniversity\b/i },
  { key: "certifications", pattern: /\bcertifications\b|\blicenses?\b|\bcredentials?\b/i },
  { key: "summary", pattern: /\bsummary\b|\bprofile\b|\bobjective\b/i },
];

function normalizeToken(raw: string) {
  const token = raw.toLowerCase();
  const normalized = aliasMap[token] ?? token;
  return normalized;
}

function estimateSyllables(word: string) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  const trimmed = cleaned.replace(/e$/, "");
  const groups = trimmed.match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

function computeReadability(text: string) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.match(/[a-z]+/gi) ?? [];
  const syllables = words.reduce((sum, word) => sum + estimateSyllables(word), 0);
  if (!words.length || !sentences.length) return 0;
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;
  const score = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function detectMetric(line: string) {
  return /\$[\d,.]+|\d+(\.\d+)?%|\b\d+(\.\d+)?\s?(ms|s|sec|secs|seconds|min|mins|minutes|hours|hrs|days|weeks|months|years|x)\b/i.test(
    line,
  );
}

function extractBullets(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-•]\s+/.test(line))
    .map((line) => line.replace(/^[-•]\s+/, "").trim());
}

export function countBullets(text: string) {
  return extractBullets(text).length;
}

function analyzeQuality(text: string): QualityInsights {
  const bullets = extractBullets(text);
  const passiveBullets: PassiveBullet[] = [];
  const verbCounts: Record<string, number> = {};
  let verbHits = 0;
  let metricHits = 0;
  let qualityTotal = 0;

  bullets.forEach((bullet) => {
    const normalized = bullet.toLowerCase();
    const firstWord = normalized.split(/\s+/)[0] ?? "";
    const startsWithVerb = ACTION_VERBS.has(firstWord);
    if (startsWithVerb) {
      verbHits += 1;
      verbCounts[firstWord] = (verbCounts[firstWord] ?? 0) + 1;
    }

    let isPassive = false;
    let suggestion = "";
    for (const passive of PASSIVE_STARTS) {
      if (passive.pattern.test(normalized)) {
        isPassive = true;
        suggestion = `${passive.suggestion} ${bullet.replace(passive.pattern, "").trim()}`;
        break;
      }
    }
    if (isPassive) {
      passiveBullets.push({ text: bullet, suggestion: suggestion || "Start with a stronger action verb." });
    }

    const hasMetric = detectMetric(bullet);
    if (hasMetric) metricHits += 1;

    const hasOutcome = hasMetric || Array.from(OUTCOME_WORDS).some((word) => normalized.includes(word));
    const hasScope = Array.from(SCOPE_WORDS).some((word) => normalized.includes(word));
    const wordCount = bullet.split(/\s+/).filter(Boolean).length;
    const lengthScore = wordCount >= 8 && wordCount <= 24 ? 15 : wordCount >= 5 && wordCount <= 30 ? 8 : 0;

    let qualityScore = 0;
    if (startsWithVerb) qualityScore += 35;
    if (hasScope) qualityScore += 25;
    if (hasOutcome) qualityScore += 25;
    qualityScore += lengthScore;
    if (isPassive) qualityScore = Math.max(0, qualityScore - 15);
    qualityTotal += Math.min(100, qualityScore);
  });

  const repeatedVerbs = Object.entries(verbCounts)
    .filter(([, count]) => count >= 8)
    .map(([verb, count]) => ({ verb, count }))
    .sort((a, b) => b.count - a.count);

  const totalBullets = bullets.length;
  const actionVerbRate = totalBullets ? Math.round((verbHits / totalBullets) * 100) : 0;
  const measurabilityRate = totalBullets ? Math.round((metricHits / totalBullets) * 100) : 0;
  const bulletQualityScore = totalBullets ? Math.round(qualityTotal / totalBullets) : 0;

  return {
    totalBullets,
    actionVerbRate,
    measurabilityRate,
    bulletQualityScore,
    readabilityScore: computeReadability(text),
    passiveBullets: passiveBullets.slice(0, 5),
    repeatedVerbs,
  };
}

export function redactPrivacyText(text: string) {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\b(?:https?:\/\/|www\.)\S+\b/gi, "[link]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]");
}

export function detectAtsIssues(text: string, pageTexts?: string[]): AtsIssue[] {
  const issues: AtsIssue[] = [];
  const lines = text.split(/\r?\n/);
  const suspiciousSpacing = lines.filter((line) => /\s{3,}/.test(line) || /\t/.test(line));
  if (suspiciousSpacing.length >= 4 || suspiciousSpacing.length / Math.max(lines.length, 1) > 0.2) {
    issues.push({
      type: "columns",
      message: "Possible columns detected. ATS parsers can scramble multi-column layouts.",
    });
  }

  const tableIndicators = lines.filter((line) => /\|/.test(line) || /-{3,}\s+-{3,}/.test(line));
  if (tableIndicators.length >= 3) {
    issues.push({
      type: "tables",
      message: "Table-like formatting detected. ATS may skip or reorder table content.",
    });
  }

  if (pageTexts && pageTexts.length >= 3) {
    const normalizedPages = pageTexts.map((page) =>
      page
        .split(/\r?\n/)
        .map((line) => line.trim().toLowerCase())
        .filter((line) => line.length >= 4),
    );
    const lineCounts = new Map<string, number>();
    normalizedPages.forEach((pageLines) => {
      const uniqueLines = new Set(pageLines);
      uniqueLines.forEach((line) => {
        lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
      });
    });
    const repeating = Array.from(lineCounts.entries()).filter(
      ([line, count]) => count / normalizedPages.length >= 0.8 && !/page\s+\d+/i.test(line),
    );
    if (repeating.length > 0) {
      issues.push({
        type: "repeating-headers",
        message: "Likely header/footer repeating across pages. ATS may treat it as duplicated content.",
      });
    }
  }

  return issues;
}

export function buildTermData(
  text: string,
  useSections: boolean,
  sectionWeights: SectionWeights = DEFAULT_SECTION_WEIGHTS,
): TermData {
  const counts: Record<string, number> = {};
  const forms: Record<string, Set<string>> = {};
  const tokens: string[] = [];
  const sectionCounts: Record<SectionBucket, Record<string, number>> = {
    summary: {},
    experience: {},
    education: {},
    skills: {},
    projects: {},
    certifications: {},
    other: {},
  };
  const lines = text.split(/\r?\n/);
  let currentSection: SectionBucket = "summary";

  lines.forEach((line) => {
    if (useSections) {
      for (const { key, pattern } of sectionHeaderPatterns) {
        if (pattern.test(line)) {
          currentSection = key;
          break;
        }
      }
    } else {
      currentSection = "other";
    }
    const matches = line.match(TOKEN_REGEX) ?? [];
    matches.forEach((raw) => {
      const normalized = normalizeToken(raw);
      const isTech = TECH_DICTIONARY.has(normalized);
      if (!isTech && stopWords.has(normalized)) return;
      if (!isTech && normalized.length < 2) return;
      if (/^\d+$/.test(normalized)) return;

      counts[normalized] = (counts[normalized] ?? 0) + 1;
      sectionCounts[currentSection][normalized] = (sectionCounts[currentSection][normalized] ?? 0) + 1;
      if (!forms[normalized]) {
        forms[normalized] = new Set();
      }
      forms[normalized].add(raw.toLowerCase());
      tokens.push(normalized);
    });
  });

  const totalTokens = tokens.length;
  const terms = Object.entries(counts)
    .map(([term, count]) => {
      const weightedCount = (Object.keys(sectionCounts) as SectionBucket[]).reduce((sum, key) => {
        const sectionCount = sectionCounts[key][term] ?? 0;
        return sum + sectionCount * sectionWeights[key];
      }, 0);
      const score =
        totalTokens === 0 ? 0 : (weightedCount / totalTokens) * Math.log(1 + totalTokens / count);
      let bestSectionWeight = 1;
      (Object.keys(sectionCounts) as SectionBucket[]).forEach((key) => {
        if ((sectionCounts[key][term] ?? 0) > 0) {
          bestSectionWeight = Math.max(bestSectionWeight, sectionWeights[key]);
        }
      });
      return { term, count, score, bestSectionWeight };
    })
    .sort((a, b) => b.score - a.score);

  const topTerms = terms.slice(0, Math.min(TOP_TERM_COUNT, terms.length));
  const displayTerms = terms.slice(0, Math.min(DISPLAY_TERM_COUNT, terms.length)).map((entry) => ({
    word: entry.term,
    count: entry.count,
    score: entry.score,
  }));

  return {
    totalTokens,
    counts,
    forms,
    sectionCounts,
    tokens,
    terms,
    topTerms,
    displayTerms,
  };
}

export function analyze(text: string, termData: TermData): Insights {
  const buildNgrams = (tokens: string[], size: number) => {
    const ngramCounts: Record<string, number> = {};
    for (let i = 0; i <= tokens.length - size; i++) {
      const phrase = tokens.slice(i, i + size).join(" ");
      ngramCounts[phrase] = (ngramCounts[phrase] ?? 0) + 1;
    }
    return Object.entries(ngramCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase, count]) => ({ phrase, count }))
      .filter((p) => p.phrase.trim().length > 0);
  };

  const bigrams = buildNgrams(termData.tokens, 2);
  const trigrams = buildNgrams(termData.tokens, 3);

  const sectionPatterns: Record<SectionKey, RegExp> = {
    summary: /\bsummary\b|\bprofile\b|\bobjective\b/i,
    experience: /\bexperience\b|\bwork history\b|\bemployment\b/i,
    projects: /\bprojects\b|\bproject work\b/i,
    skills: /\bskills\b|\btooling\b|\btechnologies\b|\btech stack\b/i,
    education: /\beducation\b|\bstudies\b|\bdegree\b|\buniversity\b/i,
    certifications: /\bcertifications\b|\blicenses?\b|\bcredentials?\b/i,
  };

  const lines = text.split(/\r?\n/);
  const sections: SectionMatch[] = (Object.keys(sectionPatterns) as SectionKey[]).map((key) => {
    const pattern = sectionPatterns[key];
    const idx = lines.findIndex((line) => pattern.test(line));
    return { key, found: idx >= 0, line: idx >= 0 ? idx + 1 : null };
  });

  return {
    wordCount: termData.totalTokens,
    charCount: text.length,
    readingMinutes: Math.max(1, Math.round(termData.totalTokens / 200)),
    bulletCount: countBullets(text),
    keywords: termData.displayTerms,
    uniqueWords: Object.keys(termData.counts).length,
    bigrams,
    trigrams,
    sections,
    quality: analyzeQuality(text),
  };
}
