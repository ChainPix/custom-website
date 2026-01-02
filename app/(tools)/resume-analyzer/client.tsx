"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileUp, Loader2, RefreshCcw, Sparkles } from "lucide-react";

type Keyword = {
  word: string;
  count: number;
  score: number;
};

type Insights = {
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

type SectionKey = "experience" | "education" | "skills";

type SectionMatch = {
  key: SectionKey;
  found: boolean;
  line: number | null;
};

type SectionBucket = "summary" | "experience" | "education" | "skills" | "projects" | "other";

type TermEntry = {
  term: string;
  count: number;
  score: number;
  bestSectionWeight: number;
};

type TermData = {
  totalTokens: number;
  counts: Record<string, number>;
  forms: Record<string, Set<string>>;
  sectionCounts: Record<SectionBucket, Record<string, number>>;
  tokens: string[];
  terms: TermEntry[];
  topTerms: TermEntry[];
  displayTerms: Keyword[];
};

type MissingTerm = {
  term: string;
  appearsNowhere: boolean;
  suggestedSection: "Skills" | "Experience";
  template: string;
};

type MatchResult = {
  matchScore: number;
  missing: MissingTerm[];
  extras: string[];
  exactMatches: number;
  aliasMatches: number;
  totalTerms: number;
};

type PassiveBullet = {
  text: string;
  suggestion: string;
};

type RepeatedVerb = {
  verb: string;
  count: number;
};

type QualityInsights = {
  totalBullets: number;
  actionVerbRate: number;
  measurabilityRate: number;
  bulletQualityScore: number;
  readabilityScore: number;
  passiveBullets: PassiveBullet[];
  repeatedVerbs: RepeatedVerb[];
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
const DISPLAY_TERM_COUNT = 12;

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

const sectionWeights: Record<SectionBucket, number> = {
  summary: 0.8,
  skills: 1.6,
  experience: 1.3,
  projects: 1.2,
  education: 1.0,
  other: 1.0,
};

const sectionHeaderPatterns: Array<{ key: SectionBucket; pattern: RegExp }> = [
  { key: "skills", pattern: /\bskills\b|\btooling\b|\btechnologies\b|\btech stack\b/i },
  { key: "experience", pattern: /\bexperience\b|\bwork history\b|\bemployment\b/i },
  { key: "projects", pattern: /\bprojects\b|\bproject work\b/i },
  { key: "education", pattern: /\beducation\b|\bstudies\b|\bdegree\b|\buniversity\b/i },
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
    .filter((line) => /^[-•*]\s+/.test(line))
    .map((line) => line.replace(/^[-•*]\s+/, "").trim());
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

function buildTermData(text: string, useSections: boolean): TermData {
  const counts: Record<string, number> = {};
  const forms: Record<string, Set<string>> = {};
  const tokens: string[] = [];
  const sectionCounts: Record<SectionBucket, Record<string, number>> = {
    summary: {},
    experience: {},
    education: {},
    skills: {},
    projects: {},
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

function analyze(text: string, termData: TermData): Insights {
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
    experience: /\bexperience\b|\bwork history\b|\bemployment\b/i,
    education: /\beducation\b|\bstudies\b|\bdegree\b|\buniversity\b/i,
    skills: /\bskills\b|\btooling\b|\btechnologies\b|\btech stack\b/i,
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
    bulletCount: (text.match(/-|•/g) ?? []).length,
    keywords: termData.displayTerms,
    uniqueWords: Object.keys(termData.counts).length,
    bigrams,
    trigrams,
    sections,
    quality: analyzeQuality(text),
  };
}

function compareTerms(resumeData: TermData, jdData: TermData): MatchResult {
  const resumeTopMap = new Map<string, TermEntry>();
  resumeData.topTerms.forEach((entry) => {
    resumeTopMap.set(entry.term, entry);
  });
  const jdTopMap = new Map<string, TermEntry>();
  jdData.topTerms.forEach((entry) => {
    jdTopMap.set(entry.term, entry);
  });

  const maxSectionWeight = Math.max(...Object.values(sectionWeights));
  const totalPossible = jdData.topTerms.reduce((sum, entry) => sum + entry.score * maxSectionWeight, 0);
  let earned = 0;
  let exactMatches = 0;
  let aliasMatches = 0;
  const missing: MissingTerm[] = [];

  jdData.topTerms.forEach((entry) => {
    const resumeEntry = resumeTopMap.get(entry.term);
    if (!resumeEntry) {
      const appearsNowhere = !(entry.term in resumeData.counts);
      const suggestedSection: "Skills" | "Experience" = TECH_DICTIONARY.has(entry.term) ? "Skills" : "Experience";
      const template =
        suggestedSection === "Skills"
          ? `- ${entry.term} (add to Skills; pair with [tool/version])`
          : `- Used ${entry.term} to [action], resulting in [metric].`;
      missing.push({
        term: entry.term,
        appearsNowhere,
        suggestedSection,
        template,
      });
      return;
    }

    const jdForms = jdData.forms[entry.term] ?? new Set<string>();
    const resumeForms = resumeData.forms[entry.term] ?? new Set<string>();
    const hasExactForm = Array.from(jdForms).some((form) => resumeForms.has(form));
    const matchQuality = hasExactForm ? 1 : 0.9;
    if (hasExactForm) {
      exactMatches += 1;
    } else {
      aliasMatches += 1;
    }
    earned += entry.score * matchQuality * resumeEntry.bestSectionWeight;
  });

  const extras = resumeData.topTerms
    .filter((entry) => !jdTopMap.has(entry.term))
    .map((entry) => entry.term);

  const matchScore = totalPossible ? Math.round((earned / totalPossible) * 100) : 0;

  return {
    matchScore,
    missing,
    extras,
    exactMatches,
    aliasMatches,
    totalTerms: jdData.topTerms.length,
  };
}

async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerModule = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")) as {
    default?: string;
    href?: string;
  };
  const resolvedWorkerSrc =
    typeof workerModule === "string"
      ? workerModule
      : typeof workerModule.default === "string"
        ? workerModule.default
        : typeof workerModule.href === "string"
          ? workerModule.href
          : "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.449/pdf.worker.min.js";

  pdfjsLib.GlobalWorkerOptions.workerSrc = `${resolvedWorkerSrc}`;

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
    pages.push(strings);
  }
  return pages.join("\n\n");
}

async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value ?? "";
  } catch (err) {
    console.error("DOCX parse failed", err);
    throw new Error("DOCX parsing failed. Try PDF/TXT or paste text.");
  }
}

export default function ResumeAnalyzerClient() {
  const [text, setText] = useState("");
  const [jdText, setJdText] = useState("");
  const [status, setStatus] = useState<string>("Ready");
  const [copied, setCopied] = useState(false);
  const [warning, setWarning] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const resumeTermData = useMemo(() => buildTermData(text, true), [text]);
  const jdTermData = useMemo(() => buildTermData(jdText, false), [jdText]);
  const insights = useMemo(() => analyze(text, resumeTermData), [text, resumeTermData]);
  const comparison = useMemo(() => {
    if (!jdText.trim() || !text.trim()) {
      return {
        matchScore: 0,
        missing: [] as MissingTerm[],
        extras: [] as string[],
        exactMatches: 0,
        aliasMatches: 0,
        totalTerms: 0,
      };
    }
    return compareTerms(resumeTermData, jdTermData);
  }, [jdText, text, resumeTermData, jdTermData]);

  useEffect(() => {
    if (!text.trim()) {
      setWarning("");
      setStatus("Ready");
      return;
    }
    const bytes = new Blob([text]).size;
    if (bytes > 50 * 1024) {
      setWarning("Large input detected (>50 KB). Analysis may be approximate.");
    } else {
      setWarning("");
    }
    setStatus("Analyzing...");
    const timer = setTimeout(() => {
      setStatus("Updated");
    }, 150);
    return () => clearTimeout(timer);
  }, [text]);

  const handleCopyInsights = async () => {
    const payload = [
      `Words: ${insights.wordCount}`,
      `Characters: ${insights.charCount}`,
      `Reading time: ~${insights.readingMinutes} min`,
      `Bullets: ${insights.bulletCount}`,
      `Unique words: ${insights.uniqueWords}`,
      `Top keywords: ${insights.keywords
        .map((k) => `${k.word} (${k.count}, w=${k.score.toFixed(2)})`)
        .join(", ") || "n/a"}`,
      `Bigrams: ${insights.bigrams.map((b) => `${b.phrase} (${b.count})`).join(", ") || "n/a"}`,
      `Trigrams: ${insights.trigrams.map((t) => `${t.phrase} (${t.count})`).join(", ") || "n/a"}`,
      `Readability score: ${insights.quality.readabilityScore}`,
      `Action verb rate: ${insights.quality.actionVerbRate}%`,
      `Measurability rate: ${insights.quality.measurabilityRate}%`,
      `Bullet quality score: ${insights.quality.bulletQualityScore}`,
      `Job match: ${comparison.matchScore}%`,
      `Match breakdown: ${comparison.exactMatches} exact, ${comparison.aliasMatches} alias`,
      `Missing keywords: ${comparison.missing.map((m) => m.term).join(", ") || "n/a"}`,
      `Extra keywords: ${comparison.extras.join(", ") || "n/a"}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      setWarning("Unable to copy insights. Please copy manually.");
    }
  };

  const handleSample = () => {
    const sample = `SENIOR SOFTWARE ENGINEER
- Delivered 3 React/Next.js products, improving conversion by 15%
- Led migration from REST to GraphQL; reduced average response time by 40%
- Built CI/CD with GitHub Actions, Jest, and Playwright; cut release time by 60%
Stack: TypeScript, Node.js, Postgres, Redis, AWS (ECS, S3), Terraform`;
    setText(sample);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("");

    const ext = file.name.toLowerCase();
    const isPdf = ext.endsWith(".pdf") || file.type === "application/pdf";
    const isDocx = ext.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isTxt = ext.endsWith(".txt") || file.type === "text/plain";

    if (!isPdf && !isDocx && !isTxt) {
      setWarning("Unsupported file type. Upload PDF, DOCX, or plain text.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setWarning("File too large (max 10MB).");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setWarning("");
    setStatus("Parsing file...");
    setUploadStatus(isPdf ? "Parsing PDF..." : isDocx ? "Parsing DOCX..." : "Reading text...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (isPdf) {
          const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdfText = await parseWithTimeout(() => extractPdfText(buffer));
          setText(pdfText);
        } else if (isDocx) {
          const buffer = e.target?.result as ArrayBuffer;
          const docxText = await parseWithTimeout(() => extractDocxText(buffer));
          setText(docxText);
        } else {
          setText(e.target?.result as string);
        }
        setUploadStatus("Upload complete");
      } catch (err) {
        console.error("Upload parse failed", err);
        setWarning("Could not parse file. Please try another file or paste text.");
        setUploadStatus("");
      } finally {
        setIsUploading(false);
        setStatus("Updated");
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      setWarning("Failed to read file. Please try again.");
      setIsUploading(false);
      setUploadStatus("");
      event.target.value = "";
    };

    if (isPdf || isDocx) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const downloadData = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      textLength: text.length,
      insights,
      match: comparison,
    };
    downloadData(JSON.stringify(payload, null, 2), "resume-insights.json", "application/json");
  };

  const handleExportCsv = () => {
    const rows = [
      ["metric", "value"],
      ["wordCount", insights.wordCount],
      ["charCount", insights.charCount],
      ["readingMinutes", insights.readingMinutes],
      ["bulletCount", insights.bulletCount],
      ["uniqueWords", insights.uniqueWords],
      ["keywords", insights.keywords.map((k) => `${k.word} (${k.count}, w=${k.score.toFixed(2)})`).join("; ") || "n/a"],
      ["bigrams", insights.bigrams.map((b) => `${b.phrase} (${b.count})`).join("; ") || "n/a"],
      ["trigrams", insights.trigrams.map((t) => `${t.phrase} (${t.count})`).join("; ") || "n/a"],
      ["readabilityScore", insights.quality.readabilityScore],
      ["actionVerbRate", `${insights.quality.actionVerbRate}%`],
      ["measurabilityRate", `${insights.quality.measurabilityRate}%`],
      ["bulletQualityScore", insights.quality.bulletQualityScore],
      ["jdMatchScore", `${comparison.matchScore}%`],
      ["jdExactMatches", comparison.exactMatches],
      ["jdAliasMatches", comparison.aliasMatches],
      ["missingKeywords", comparison.missing.map((m) => m.term).join("; ") || "n/a"],
      ["extraKeywords", comparison.extras.join("; ") || "n/a"],
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadData(csv, "resume-insights.csv", "text/csv");
  };

  const parseWithTimeout = async <T,>(fn: () => Promise<T>, ms = 12000) => {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Parsing timed out. Try a smaller file.")), ms);
      fn()
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status}
      </div>
            {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-slate-600" itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/" itemProp="item" className="underline underline-offset-4 transition hover:text-slate-900">
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name" className="font-medium text-slate-900">
              Resume Analyzer
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Resume Analyzer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Paste your resume text to check keyword frequency, length, and readability. Built for ATS
          prep and quick recruiter-friendly edits.
        </p>
        <p className="text-xs text-slate-500">Runs entirely in your browser. Remove private data.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <button
              onClick={() => setText("")}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              Clear
            </button>
            <button
              onClick={handleSample}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Sample
            </button>
            <button
              onClick={handleCopyInsights}
              className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 font-medium text-white shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)] transition hover:-translate-y-0.5"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? "Copied" : "Copy insights"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-1.5 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5">
              <FileUp className="h-3.5 w-3.5" aria-hidden />
              {isUploading ? "Uploading..." : "Upload PDF/DOCX/TXT"}
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload resume file"
                disabled={isUploading}
              />
            </label>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export CSV
            </button>
          </div>
          <textarea
            className="h-[260px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Paste your resume text. Remove private data; this runs in your browser."
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Resume text input"
          />
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              Words: {insights.wordCount}
            </span>
            <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              Characters: {insights.charCount}
            </span>
            <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              Reading: ~{insights.readingMinutes} min
            </span>
            <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              Bullets: {insights.bulletCount}
            </span>
          </div>
          {warning && <p className="text-sm font-medium text-amber-600" role="alert">{warning}</p>}
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-900">Top keywords</p>
          <div className="flex flex-wrap gap-2">
            {insights.keywords.length ? (
              insights.keywords.map((keyword) => (
                <span
                  key={keyword.word}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)]"
                >
                  {keyword.word} · {keyword.count} · w{keyword.score.toFixed(2)}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                Add skills, tools, and results to surface stronger keywords.
              </p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Job description (optional)</p>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Paste a job description to compare keywords"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
              />
              {jdText && (
                <div className="mt-2 text-xs text-slate-600">
                  Match score: <span className="font-semibold text-slate-900">{comparison.matchScore}%</span>
                  {comparison.totalTerms > 0 && (
                    <span className="ml-2 text-slate-500">
                      ({comparison.exactMatches} exact, {comparison.aliasMatches} alias)
                    </span>
                  )}
                </div>
              )}
            </div>
            {jdText && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Missing JD terms</p>
                  {comparison.missing.length ? (
                    <div className="space-y-2">
                      {comparison.missing.map((item) => (
                        <div key={item.term} className="rounded-lg border border-amber-100 bg-amber-50/60 p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                              {item.term}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              Add to {item.suggestedSection}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-600">
                            {item.appearsNowhere ? "Appears nowhere in resume." : "Mentioned in resume (low signal)."}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            Template: <span className="font-medium text-slate-800">{item.template}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">None detected</p>
                  )}
                </div>
                <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Extra keywords</p>
                  {comparison.extras.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.extras.map((word) => (
                        <span key={word} className="rounded-full bg-slate-900/10 px-2 py-1 text-[11px] font-medium text-slate-800 ring-1 ring-slate-200">
                          {word}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">None detected</p>
                  )}
                </div>
              </div>
            )}
            <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Quality signals</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {insights.quality.totalBullets} bullets
                </span>
              </div>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md bg-slate-50 px-2 py-2 ring-1 ring-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Readability</p>
                  <p className="text-sm font-semibold text-slate-800">{insights.quality.readabilityScore}</p>
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-2 ring-1 ring-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Action verbs</p>
                  <p className="text-sm font-semibold text-slate-800">{insights.quality.actionVerbRate}%</p>
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-2 ring-1 ring-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Measurable</p>
                  <p className="text-sm font-semibold text-slate-800">{insights.quality.measurabilityRate}%</p>
                </div>
                <div className="rounded-md bg-slate-50 px-2 py-2 ring-1 ring-slate-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bullet quality</p>
                  <p className="text-sm font-semibold text-slate-800">{insights.quality.bulletQualityScore}</p>
                </div>
              </div>
              {insights.quality.passiveBullets.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-amber-700">Passive bullets</p>
                  <div className="mt-1 space-y-2">
                    {insights.quality.passiveBullets.map((item, index) => (
                      <div key={`${item.text}-${index}`} className="rounded-md border border-amber-100 bg-amber-50/70 p-2">
                        <p className="text-[11px] text-slate-700">{item.text}</p>
                        <p className="mt-1 text-[11px] text-slate-600">
                          Try: <span className="font-medium text-slate-800">{item.suggestion}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {insights.quality.repeatedVerbs.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-700">Repeated verbs</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {insights.quality.repeatedVerbs.map((item) => (
                      <span
                        key={item.verb}
                        className="rounded-full bg-slate-900/10 px-2 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                      >
                        {item.verb} × {item.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-1">Sections detected</p>
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                {insights.sections.map((section) => (
                  <div key={section.key} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2 ring-1 ring-slate-200">
                    <span
                      className={`h-2 w-2 rounded-full ${section.found ? "bg-emerald-500" : "bg-amber-400"}`}
                      aria-hidden
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold capitalize text-slate-800">{section.key}</span>
                      <span className="text-slate-500">
                        {section.found ? `Line ${section.line}` : "Not found"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
                Use action verbs (built, delivered, optimized) and measurable results.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
                Include tech stack and certifications that match the job description.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
                Keep formatting simple for ATS parsing.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
