"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Star } from "lucide-react";

const wordThemes: Record<string, string> = {
  classic: "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
  tech: "server api cloud kubernetes container microservice queue cache gateway database deploy latency metrics logging tracing security",
  nature: "forest river mountain ocean breeze flora fauna meadow canyon sunrise horizon valley coast desert rain",
  startup: "product sprint roadmap iterate launch growth traction retention funnel revenue cohort churn experiment feedback iterate",
};

const mockFirstNames = [
  "Avery", "Jordan", "Casey", "Riley", "Parker", "Morgan", "Quinn", "Taylor", "Hayden", "Rowan",
  "Elliot", "Kai", "Reese", "Jules", "Skyler", "Emerson", "Drew", "Bailey", "Reagan", "Finley",
];
const mockLastNames = [
  "Bennett", "Hayes", "Coleman", "Diaz", "Nguyen", "Patel", "Brooks", "Khan", "Rivera", "Carter",
  "Adams", "Singh", "Wright", "Young", "Kim", "Chen", "Martinez", "Clark", "Lopez", "Turner",
];
const mockStreets = [
  "Maple", "Oak", "Pine", "Cedar", "Willow", "Birch", "Cherry", "Hill", "Lake", "Sunset",
  "Aspen", "Spruce", "Meadow", "Ridge", "Park", "Valley", "River", "Forest", "Summit", "Harbor",
];
const mockCities = [
  "Riverton", "Brookfield", "Cedar Grove", "Fairview", "Mapleton", "Lakeview", "Oakdale", "Hillcrest",
  "Pinehurst", "Willow Creek", "Springfield", "Stonehaven", "Greystone", "Northfield", "Silverton",
];
const mockStates = ["CA", "NY", "TX", "FL", "IL", "WA", "CO", "AZ", "MA", "NC", "GA", "OR", "VA"];
const mockCountries = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Spain", "Brazil",
  "India", "Japan", "South Africa", "Mexico", "Netherlands", "Sweden", "Italy",
];
const mockDomains = ["example", "acme", "bright", "northwind", "atlas", "orbit", "summit", "lumen"];
const mockTlds = ["com", "net", "io", "co", "dev"];

type BlockKind = "heading" | "headline" | "paragraph" | "line" | "bullet";
type Block = { kind: BlockKind; text: string };

type GeneratorSettings = {
  mode: "lorem" | "mock";
  format: "paragraphs" | "sentences" | "bullets" | "headlines";
  mockFormat: "json" | "csv" | "sql" | "ts";
  mockCount: number;
  template: "none" | "wireframe" | "blog" | "product" | "errors";
  paragraphs: number;
  sentences: number;
  theme: keyof typeof wordThemes;
  paragraphWords: number;
  minWords: number;
  maxWords: number;
  commaFrequency: number;
  questionRatio: number;
  includeHeadings: boolean;
  sectionCount: number;
  sectionParagraphs: number;
  startWithClassic: boolean;
  bulletPrefix: string;
  exportFormat: "text" | "markdown" | "html";
};

type GenerationEntry = {
  id: string;
  createdAt: string;
  summary: string;
  mode: "lorem" | "mock";
  settings: GeneratorSettings;
  seed: string;
  text: string;
  key: string;
};

type FavoritePreset = {
  id: string;
  createdAt: string;
  label: string;
  settings: GeneratorSettings;
  seed: string;
  key: string;
};

const RECENTS_KEY = "lorem-ipsum:recent-generations";
const FAVORITES_KEY = "lorem-ipsum:favorites";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashSeed = (seed: string) => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return mulberry32(h >>> 0);
};

const randomWords = (count: number, random: () => number, theme: string) => {
  const words = (wordThemes[theme] ?? wordThemes.classic).split(" ");
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(random() * words.length);
    out.push(words[idx] ?? "lorem");
  }
  return out;
};

const pickOne = (items: string[], random: () => number) => items[Math.floor(random() * items.length)] ?? items[0] ?? "";

const randomUuid = (random: () => number) => {
  const hex = "0123456789abcdef";
  const bytes = Array.from({ length: 16 }, () => Math.floor(random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const parts = [
    bytes.slice(0, 4),
    bytes.slice(4, 6),
    bytes.slice(6, 8),
    bytes.slice(8, 10),
    bytes.slice(10, 16),
  ];
  return parts
    .map((part) => part.map((byte) => hex[(byte >> 4) & 0x0f] + hex[byte & 0x0f]).join(""))
    .join("-");
};

const randomPhone = (random: () => number) => {
  const area = 200 + Math.floor(random() * 800);
  const mid = 100 + Math.floor(random() * 900);
  const last = 1000 + Math.floor(random() * 9000);
  return `(${area}) ${mid}-${last}`;
};

const randomTimestamp = (random: () => number) => {
  const start = Date.parse("2020-01-01T00:00:00Z");
  const end = Date.parse("2025-01-01T00:00:00Z");
  const value = start + Math.floor(random() * (end - start));
  return new Date(value).toISOString();
};

const randomAddress = (random: () => number) => {
  const number = 100 + Math.floor(random() * 9000);
  const street = pickOne(mockStreets, random);
  const city = pickOne(mockCities, random);
  const state = pickOne(mockStates, random);
  const zip = 10000 + Math.floor(random() * 89999);
  return `${number} ${street} St, ${city}, ${state} ${zip}`;
};

const escapeCsvValue = (value: string) => {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
};

const escapeSqlValue = (value: string) => `'${value.replace(/'/g, "''")}'`;

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

const buildTextFromBlocks = (blocks: Block[], bulletPrefix: string) => {
  if (!blocks.length) return "";
  let output = "";
  blocks.forEach((block, index) => {
    const line = block.kind === "bullet" ? `${bulletPrefix}${block.text}` : block.text;
    if (index === 0) {
      output = line;
      return;
    }
    const prev = blocks[index - 1];
    const separator = prev.kind === "bullet" && block.kind === "bullet" ? "\n" : "\n\n";
    output += `${separator}${line}`;
  });
  return output.trim();
};

const buildMarkdownFromBlocks = (blocks: Block[], bulletPrefix: string) => {
  if (!blocks.length) return "";
  const formatted = blocks.map((block) => {
    if (block.kind === "heading") return `## ${block.text}`;
    if (block.kind === "headline") return `### ${block.text}`;
    if (block.kind === "bullet") return `${bulletPrefix}${block.text}`;
    return block.text;
  });
  return buildTextFromBlocks(
    formatted.map((text, idx) => ({
      kind: blocks[idx]?.kind === "bullet" ? "bullet" : "paragraph",
      text,
    })),
    "",
  );
};

const buildHtmlFromBlocks = (blocks: Block[]) => {
  if (!blocks.length) return "";
  const lines: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      lines.push("</ul>");
      inList = false;
    }
  };
  blocks.forEach((block) => {
    if (block.kind === "bullet") {
      if (!inList) {
        lines.push("<ul>");
        inList = true;
      }
      lines.push(`  <li>${block.text}</li>`);
      return;
    }
    closeList();
    if (block.kind === "heading") {
      lines.push(`<h2>${block.text}</h2>`);
    } else if (block.kind === "headline") {
      lines.push(`<h3>${block.text}</h3>`);
    } else {
      lines.push(`<p>${block.text}</p>`);
    }
  });
  closeList();
  return lines.join("\n");
};

const paragraphLengthPresets = {
  short: 60,
  medium: 90,
  long: 130,
} as const;

const classicFirstSentence = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
const classicFirstSentenceWords = classicFirstSentence.split(/\s+/).length;

export default function LoremIpsumClient() {
  const [paragraphs, setParagraphs] = useState(2);
  const [sentences, setSentences] = useState(0);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [mode, setMode] = useState<"lorem" | "mock">("lorem");
  const [format, setFormat] = useState<"paragraphs" | "sentences" | "bullets" | "headlines">("paragraphs");
  const [mockFormat, setMockFormat] = useState<"json" | "csv" | "sql" | "ts">("json");
  const [mockCount, setMockCount] = useState(8);
  const [template, setTemplate] = useState<"none" | "wireframe" | "blog" | "product" | "errors">("none");
  const [warning, setWarning] = useState("");
  const [seed, setSeed] = useState("");
  const [theme, setTheme] = useState<keyof typeof wordThemes>("classic");
  const [regenTick, setRegenTick] = useState(0);
  const [autoSeed, setAutoSeed] = useState("default-seed");
  const [paragraphWords, setParagraphWords] = useState(paragraphLengthPresets.medium);
  const [minWords, setMinWords] = useState(8);
  const [maxWords, setMaxWords] = useState(16);
  const [commaFrequency, setCommaFrequency] = useState(0.2);
  const [questionRatio, setQuestionRatio] = useState(0.1);
  const [includeHeadings, setIncludeHeadings] = useState(false);
  const [sectionCount, setSectionCount] = useState(3);
  const [sectionParagraphs, setSectionParagraphs] = useState(2);
  const [startWithClassic, setStartWithClassic] = useState(false);
  const [bulletPrefix, setBulletPrefix] = useState("- ");
  const [exportFormat, setExportFormat] = useState<"text" | "markdown" | "html">("text");
  const [previewTab, setPreviewTab] = useState<"plain" | "markdown" | "html">("plain");
  const [recentGenerations, setRecentGenerations] = useState<GenerationEntry[]>([]);
  const [favoritePresets, setFavoritePresets] = useState<FavoritePreset[]>([]);
  const lastGenerationKey = useRef("");
  const [shareParams, setShareParams] = useState("");

  const MAX_CHARS = 8000;

  useEffect(() => {
    if (!seed.trim()) {
      setAutoSeed(Math.floor(Math.random() * 1e9).toString(36));
    }
  }, [seed, regenTick]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("preset");
    const themeParam = params.get("theme");
    const seedParam = params.get("seed");

    if (preset) {
      const presetValue = preset.toLowerCase();
      if (presetValue === "wireframe" || presetValue === "blog" || presetValue === "product" || presetValue === "errors") {
        applyTemplate(presetValue);
      }
    }
    if (themeParam && themeParam in wordThemes) {
      setTheme(themeParam as keyof typeof wordThemes);
    }
    if (seedParam) {
      setSeed(seedParam);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedRecents = localStorage.getItem(RECENTS_KEY);
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedRecents) {
        setRecentGenerations(JSON.parse(storedRecents) as GenerationEntry[]);
      }
      if (storedFavorites) {
        setFavoritePresets(JSON.parse(storedFavorites) as FavoritePreset[]);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recentGenerations));
  }, [recentGenerations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritePresets));
  }, [favoritePresets]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (template !== "none") {
      params.set("preset", template);
    }
    if (theme) {
      params.set("theme", theme);
    }
    const seedValue = seed.trim() || autoSeed;
    if (seedValue) {
      params.set("seed", seedValue);
    }
    const value = params.toString();
    setShareParams(value ? `?${value}` : "");
  }, [template, theme, seed, autoSeed]);

  const effectiveSeed = seed.trim() || autoSeed;

  const settingsSnapshot = useMemo<GeneratorSettings>(() => ({
    mode,
    format,
    mockFormat,
    mockCount,
    template,
    paragraphs,
    sentences,
    theme,
    paragraphWords,
    minWords,
    maxWords,
    commaFrequency,
    questionRatio,
    includeHeadings,
    sectionCount,
    sectionParagraphs,
    startWithClassic,
    bulletPrefix,
    exportFormat,
  }), [
    mode,
    format,
    mockFormat,
    mockCount,
    template,
    paragraphs,
    sentences,
    theme,
    paragraphWords,
    minWords,
    maxWords,
    commaFrequency,
    questionRatio,
    includeHeadings,
    sectionCount,
    sectionParagraphs,
    startWithClassic,
    bulletPrefix,
    exportFormat,
  ]);

  const serializePreset = (settings: GeneratorSettings, seedValue: string) =>
    JSON.stringify({ settings, seed: seedValue });

  const applySettings = (settings: GeneratorSettings, seedValue: string) => {
    setMode(settings.mode);
    setFormat(settings.format);
    setMockFormat(settings.mockFormat);
    setMockCount(settings.mockCount);
    setTemplate(settings.template);
    setParagraphs(settings.paragraphs);
    setSentences(settings.sentences);
    setTheme(settings.theme);
    setParagraphWords(settings.paragraphWords);
    setMinWords(settings.minWords);
    setMaxWords(settings.maxWords);
    setCommaFrequency(settings.commaFrequency);
    setQuestionRatio(settings.questionRatio);
    setIncludeHeadings(settings.includeHeadings);
    setSectionCount(settings.sectionCount);
    setSectionParagraphs(settings.sectionParagraphs);
    setStartWithClassic(settings.startWithClassic);
    setBulletPrefix(settings.bulletPrefix);
    setExportFormat(settings.exportFormat);
    setSeed(seedValue);
    setStatus("Preset applied");
  };

  const rng = useMemo(() => {
    return hashSeed(effectiveSeed);
  }, [effectiveSeed, regenTick]);

  const { text, blocks, warning: computedWarning } = useMemo(() => {
    const paraCountRaw = Math.max(paragraphs, 0);
    const sentCountRaw = Math.max(sentences, 0);
    const sectionCountRaw = Math.max(sectionCount, 0);
    const sectionParagraphsRaw = Math.max(sectionParagraphs, 0);
    const headingsActive = includeHeadings && format === "paragraphs";
    const requestedParagraphs = headingsActive
      ? sectionCountRaw * sectionParagraphsRaw
      : paraCountRaw;
    const paraCount = Math.min(requestedParagraphs, 20);
    const sentCount = Math.min(sentCountRaw, 50);
    const blocks: Block[] = [];
    const minWordsRaw = Math.max(minWords, 1);
    const maxWordsRaw = Math.max(maxWords, 1);
    const minWordsValue = Math.min(minWordsRaw, maxWordsRaw);
    const maxWordsValue = Math.max(minWordsRaw, maxWordsRaw);
    const commaFrequencyValue = Math.min(Math.max(commaFrequency, 0), 1);
    const questionRatioValue = Math.min(Math.max(questionRatio, 0), 1);
    let nextWarning = "";

    if (mode === "mock") {
      const mockCountRaw = Math.max(mockCount, 0);
      const mockCountClamped = Math.min(mockCountRaw, 100);
      if (mockCountRaw > 100) {
        nextWarning = "Mock records clamped to 100 for safety.";
      }
      const records = Array.from({ length: mockCountClamped }, () => {
        const first = pickOne(mockFirstNames, rng);
        const last = pickOne(mockLastNames, rng);
        const domain = pickOne(mockDomains, rng);
        const tld = pickOne(mockTlds, rng);
        const name = `${first} ${last}`;
        const email = `${first}.${last}@${domain}.${tld}`.toLowerCase();
        const country = pickOne(mockCountries, rng);
        const price = Number((5 + rng() * 495).toFixed(2));
        const slug = randomWords(2 + Math.floor(rng() * 3), rng, theme).join("-");
        const url = `https://www.${domain}.${tld}/${slug}`.toLowerCase();
        return {
          name,
          email,
          address: randomAddress(rng),
          phone: randomPhone(rng),
          uuid: randomUuid(rng),
          timestamp: randomTimestamp(rng),
          price,
          country,
          url,
        };
      });

      let output = "";
      if (mockFormat === "json") {
        output = JSON.stringify(records, null, 2);
      } else if (mockFormat === "csv") {
        const headers = Object.keys(records[0] ?? {});
        const rows = records.map((record) =>
          headers
            .map((key) => escapeCsvValue(String(record[key as keyof typeof record] ?? "")))
            .join(","),
        );
        output = [headers.join(","), ...rows].join("\n");
      } else if (mockFormat === "sql") {
        const headers = Object.keys(records[0] ?? {});
        const values = records
          .map((record) =>
            `(${headers
              .map((key) => {
                const value = record[key as keyof typeof record];
                if (typeof value === "number") return value.toString();
                return escapeSqlValue(String(value ?? ""));
              })
              .join(", ")})`,
          )
          .join(",\n");
        output = `INSERT INTO mock_data (${headers.join(", ")}) VALUES\n${values};`;
      } else {
        const typeFields = [
          "  name: string;",
          "  email: string;",
          "  address: string;",
          "  phone: string;",
          "  uuid: string;",
          "  timestamp: string;",
          "  price: number;",
          "  country: string;",
          "  url: string;",
        ].join("\n");
        const sample = records
          .map((record) => `  ${JSON.stringify(record, null, 2).replace(/\n/g, "\n  ")}`)
          .join(",\n");
        output = `type MockRecord = {\n${typeFields}\n};\n\nconst records: MockRecord[] = [\n${sample}\n];`;
      }

      return { text: output, blocks: [], warning: nextWarning };
    }

    if (requestedParagraphs > 20 || sentCountRaw > 50) {
      nextWarning = "Counts clamped to avoid overly large output.";
    }

    let usedClassicSentence = false;
    const buildSentence = (wordCount: number) => {
      if (startWithClassic && !usedClassicSentence) {
        usedClassicSentence = true;
        return { sentence: classicFirstSentence, wordCount: classicFirstSentenceWords };
      }
      const sentenceWords = randomWords(wordCount, rng, theme);
      const punctuatedWords = sentenceWords.map((word, idx) => {
        if (idx === 0 || idx === sentenceWords.length - 1) return word;
        return rng() < commaFrequencyValue ? `${word},` : word;
      });
      const sentence = punctuatedWords.join(" ");
      const ending = rng() < questionRatioValue ? "?" : ".";
      return { sentence: sentence.charAt(0).toUpperCase() + sentence.slice(1) + ending, wordCount };
    };

    const buildHeading = () => {
      const wordCount = 4 + Math.floor(rng() * 4);
      const words = randomWords(wordCount, rng, theme);
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    };

    const buildLabel = () => {
      const wordCount = 2 + Math.floor(rng() * 3);
      const words = randomWords(wordCount, rng, theme);
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    };

    const buildParagraph = () => {
      const baseWords = Math.min(Math.max(paragraphWords, 40), 180);
      const targetWords = Math.round(baseWords * (0.9 + rng() * 0.2));
      let wordsUsed = 0;
      const sentences: string[] = [];
      let safety = 0;
      while (wordsUsed < targetWords && safety < 40) {
        const wordCount = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
        const { sentence, wordCount: usedCount } = buildSentence(wordCount);
        sentences.push(sentence);
        wordsUsed += usedCount;
        safety += 1;
      }
      return sentences.join(" ");
    };

    if (template !== "none") {
      if (template === "wireframe") {
        blocks.push({ kind: "headline", text: buildLabel() });
        blocks.push({ kind: "headline", text: buildLabel() });
        blocks.push({ kind: "headline", text: buildLabel() });
        blocks.push({ kind: "headline", text: buildLabel() });
        blocks.push({ kind: "paragraph", text: buildParagraph() });
        blocks.push({ kind: "paragraph", text: buildParagraph() });
      } else if (template === "blog") {
        blocks.push({ kind: "headline", text: buildHeading() });
        const subtitleWords = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
        blocks.push({ kind: "line", text: buildSentence(subtitleWords).sentence });
        for (let i = 0; i < 5; i += 1) {
          blocks.push({ kind: "paragraph", text: buildParagraph() });
        }
      } else if (template === "product") {
        blocks.push({ kind: "headline", text: buildHeading() });
        const taglineWords = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
        blocks.push({ kind: "line", text: buildSentence(taglineWords).sentence });
        for (let i = 0; i < 3; i += 1) {
          const featureWords = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
          blocks.push({ kind: "bullet", text: buildSentence(featureWords).sentence.replace(/[?.]$/, "") });
        }
      } else if (template === "errors") {
        const prefixes = ["Error", "Warning", "Notice", "Failed", "Unable", "Timeout"];
        for (let i = 0; i < 6; i += 1) {
          const prefix = pickOne(prefixes, rng);
          const wordCount = Math.max(3, minWordsValue - 2) + Math.floor(rng() * 4);
          const { sentence } = buildSentence(wordCount);
          blocks.push({ kind: "bullet", text: `${prefix}: ${sentence.replace(/[?.]$/, "")}` });
        }
      }
    } else if (format === "paragraphs" || format === "headlines") {
      if (paraCount > 0) {
        if (format === "paragraphs" && headingsActive) {
          let paragraphsLeft = paraCount;
          for (let i = 0; i < sectionCountRaw; i += 1) {
            if (paragraphsLeft <= 0) break;
            blocks.push({ kind: "heading", text: buildHeading() });
            for (let j = 0; j < sectionParagraphsRaw; j += 1) {
              if (paragraphsLeft <= 0) break;
              blocks.push({ kind: "paragraph", text: buildParagraph() });
              paragraphsLeft -= 1;
            }
          }
        } else {
          for (let i = 0; i < paraCount; i += 1) {
            if (format === "headlines") {
              const sentence = buildSentence(minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1))).sentence;
              const headline = sentence.replace(/[?.]$/, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
              blocks.push({ kind: "headline", text: headline });
            } else {
              blocks.push({ kind: "paragraph", text: buildParagraph() });
            }
          }
        }
      }
    }

    if (template === "none" && (format === "sentences" || format === "bullets")) {
      for (let i = 0; i < Math.max(sentCount, format === "bullets" ? 6 : sentCount); i += 1) {
        const wordCount = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
        const { sentence } = buildSentence(wordCount);
        blocks.push({ kind: format === "bullets" ? "bullet" : "line", text: sentence });
      }
    } else if (template === "none" && sentCount > 0 && format === "paragraphs" && !headingsActive) {
      for (let i = 0; i < sentCount; i += 1) {
        const wordCount = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
        const { sentence } = buildSentence(wordCount);
        blocks.push({ kind: "line", text: sentence });
      }
    }

    const raw = buildTextFromBlocks(blocks, bulletPrefix);
    if (raw.length > MAX_CHARS) {
      nextWarning = `Output truncated to ${MAX_CHARS.toLocaleString()} characters.`;
      return { text: raw.slice(0, MAX_CHARS) + "…", blocks, warning: nextWarning };
    }
    return { text: raw, blocks, warning: nextWarning };
  }, [
    mode,
    paragraphs,
    sentences,
    format,
    mockFormat,
    mockCount,
    template,
    theme,
    rng,
    bulletPrefix,
    paragraphWords,
    minWords,
    maxWords,
    commaFrequency,
    questionRatio,
    includeHeadings,
    sectionCount,
    sectionParagraphs,
    startWithClassic,
  ]);

  useEffect(() => {
    setWarning(computedWarning);
  }, [computedWarning]);

  useEffect(() => {
    if (!text) return;
    const presetKey = serializePreset(settingsSnapshot, seed);
    const lastKey = `${presetKey}-${text}`;
    if (lastGenerationKey.current === lastKey) return;
    lastGenerationKey.current = lastKey;
    const summary = mode === "mock"
      ? `${mockFormat.toUpperCase()} • ${mockCount} records`
      : template !== "none"
        ? `Template • ${template}`
        : `${format} • ${text.split("\n")[0]?.slice(0, 40) ?? ""}`.trim();
    const entry: GenerationEntry = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      summary,
      mode,
      settings: settingsSnapshot,
      seed,
      text,
      key: presetKey,
    };
    setRecentGenerations((prev) => {
      const next = [entry, ...prev.filter((item) => item.key !== presetKey || item.text !== text)];
      return next.slice(0, 8);
    });
  }, [text, mode, mockFormat, mockCount, template, format, seed, settingsSnapshot]);

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const charCount = text.length;

  const downloadContent = useMemo(() => {
    if (!text) return "";
    if (mode === "mock") {
      return text;
    }
    if (exportFormat === "text") {
      return text;
    }
    if (exportFormat === "markdown") {
      return buildMarkdownFromBlocks(blocks, bulletPrefix);
    }
    return buildHtmlFromBlocks(blocks);
  }, [text, mode, exportFormat, blocks, bulletPrefix]);

  const markdownContent = useMemo(() => {
    if (!text) return "";
    if (mode === "mock") return text;
    return buildMarkdownFromBlocks(blocks, bulletPrefix);
  }, [text, mode, blocks, bulletPrefix]);

  const htmlContent = useMemo(() => {
    if (!text) return "";
    if (mode === "mock") return text;
    return buildHtmlFromBlocks(blocks);
  }, [text, mode, blocks]);

  const blockGroups = useMemo(() => {
    if (mode === "mock") return [];
    const groups: { id: string; label: string; content: string; preview: string }[] = [];
    let bulletBuffer: string[] = [];
    let index = 0;
    const flushBullets = () => {
      if (!bulletBuffer.length) return;
      const content = bulletBuffer.map((line) => `${bulletPrefix}${line}`).join("\n");
      groups.push({
        id: `bullets-${index}`,
        label: "Bullet list",
        content,
        preview: bulletBuffer[0] ?? "",
      });
      bulletBuffer = [];
      index += 1;
    };
    blocks.forEach((block) => {
      if (block.kind === "bullet") {
        bulletBuffer.push(block.text);
        return;
      }
      flushBullets();
      const label = block.kind === "heading"
        ? "Heading"
        : block.kind === "headline"
          ? "Headline"
          : block.kind === "paragraph"
            ? "Paragraph"
            : "Sentence";
      groups.push({
        id: `block-${index}`,
        label,
        content: block.text,
        preview: block.text,
      });
      index += 1;
    });
    flushBullets();
    return groups;
  }, [blocks, bulletPrefix, mode]);

  const currentPresetKey = useMemo(() => serializePreset(settingsSnapshot, seed), [settingsSnapshot, seed]);
  const isCurrentFavorite = useMemo(
    () => favoritePresets.some((preset) => preset.key === currentPresetKey),
    [favoritePresets, currentPresetKey],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent || text);
      setStatus("Markdown copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent || text);
      setStatus("HTML copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyRichText = async () => {
    if (!htmlContent) return;
    try {
      if (typeof ClipboardItem !== "undefined") {
        const item = new ClipboardItem({ "text/html": new Blob([htmlContent], { type: "text/html" }) });
        await navigator.clipboard.write([item]);
        setStatus("Rich text copied");
        return;
      }
      await navigator.clipboard.writeText(htmlContent);
      setStatus("HTML copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyShareLink = async () => {
    try {
      const base = typeof window === "undefined" ? "" : window.location.origin + window.location.pathname;
      const link = `${base}${shareParams}`;
      await navigator.clipboard.writeText(link);
      setStatus("Share link copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyBlock = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setStatus("Block copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleToggleFavorite = () => {
    const label = mode === "mock"
      ? `Mock • ${mockFormat.toUpperCase()}`
      : template !== "none"
        ? `Template • ${template}`
        : `Lorem • ${format}`;
    if (isCurrentFavorite) {
      setFavoritePresets((prev) => prev.filter((preset) => preset.key !== currentPresetKey));
      setStatus("Favorite removed");
      return;
    }
    const entry: FavoritePreset = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      label,
      settings: settingsSnapshot,
      seed,
      key: currentPresetKey,
    };
    setFavoritePresets((prev) => [entry, ...prev]);
    setStatus("Favorite saved");
  };

  const handleFavoriteFromEntry = (entry: GenerationEntry) => {
    if (favoritePresets.some((preset) => preset.key === entry.key)) {
      setStatus("Already starred");
      return;
    }
    const favorite: FavoritePreset = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      label: entry.summary || "Saved preset",
      settings: entry.settings,
      seed: entry.seed,
      key: entry.key,
    };
    setFavoritePresets((prev) => [favorite, ...prev]);
    setStatus("Favorite saved");
  };

  const handleCopyHistory = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!downloadContent) return;
    const downloadType = mode === "mock"
      ? mockFormat === "json"
        ? "application/json"
        : "text/plain"
      : exportFormat === "html"
        ? "text/html"
        : exportFormat === "markdown"
          ? "text/markdown"
          : "text/plain";
    const downloadExtension = mode === "mock"
      ? mockFormat === "json"
        ? "json"
        : mockFormat === "csv"
          ? "csv"
          : mockFormat === "sql"
            ? "sql"
            : "ts"
      : exportFormat === "html"
        ? "html"
        : exportFormat === "markdown"
          ? "md"
          : "txt";
    const blob = new Blob([downloadContent], { type: downloadType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "mock" ? `mock-data.${downloadExtension}` : `lorem-ipsum.${downloadExtension}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
          return;
        }
      }
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        setRegenTick((t) => t + 1);
        setStatus("Regenerated");
      } else if (key === "c") {
        event.preventDefault();
        void handleCopy();
      } else if (key === "d") {
        event.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCopy, handleDownload]);

  const applyPreset = (preset: "short" | "medium" | "long" | "sentences" | "bullets") => {
    setMode("lorem");
    setTemplate("none");
    if (preset === "short") {
      setParagraphs(1);
      setSentences(0);
      setFormat("paragraphs");
    } else if (preset === "medium") {
      setParagraphs(2);
      setSentences(0);
      setFormat("paragraphs");
    } else if (preset === "long") {
      setParagraphs(5);
      setSentences(0);
      setFormat("paragraphs");
    } else if (preset === "sentences") {
      setParagraphs(0);
      setSentences(8);
      setFormat("sentences");
    } else if (preset === "bullets") {
      setParagraphs(0);
      setSentences(6);
      setFormat("bullets");
    }
    setStatus("Preset applied");
  };

  const applyTemplate = (preset: "wireframe" | "blog" | "product" | "errors") => {
    setMode("lorem");
    setTemplate(preset);
    setFormat("paragraphs");
    setIncludeHeadings(false);
    if (preset === "wireframe") {
      setParagraphWords(paragraphLengthPresets.medium);
      setMinWords(6);
      setMaxWords(14);
      setCommaFrequency(0.15);
      setQuestionRatio(0);
      setParagraphs(2);
      setSentences(0);
    } else if (preset === "blog") {
      setParagraphWords(paragraphLengthPresets.long);
      setMinWords(10);
      setMaxWords(18);
      setCommaFrequency(0.2);
      setQuestionRatio(0.05);
      setParagraphs(5);
      setSentences(0);
    } else if (preset === "product") {
      setParagraphWords(paragraphLengthPresets.short);
      setMinWords(6);
      setMaxWords(12);
      setCommaFrequency(0.1);
      setQuestionRatio(0);
      setParagraphs(1);
      setSentences(0);
    } else if (preset === "errors") {
      setParagraphWords(paragraphLengthPresets.short);
      setMinWords(4);
      setMaxWords(8);
      setCommaFrequency(0);
      setQuestionRatio(0);
      setParagraphs(0);
      setSentences(6);
      setFormat("sentences");
    }
    setStatus("Template applied");
  };

  const isPresetActive = (preset: "short" | "medium" | "long" | "sentences" | "bullets") => {
    if (preset === "short") return paragraphs === 1 && sentences === 0 && format === "paragraphs";
    if (preset === "medium") return paragraphs === 2 && sentences === 0 && format === "paragraphs";
    if (preset === "long") return paragraphs === 5 && sentences === 0 && format === "paragraphs";
    if (preset === "sentences") return paragraphs === 0 && format === "sentences";
    if (preset === "bullets") return format === "bullets";
    return false;
  };

  const isTemplateActive = (preset: "wireframe" | "blog" | "product" | "errors") => template === preset;

  const presetClasses = (active: boolean) =>
    `rounded-full px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${
      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
    }`;

  const formatTimestamp = (value: string) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning}
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
              Lorem Ipsum
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Lorem Ipsum & Mock Data</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate placeholder text: paragraphs or sentences for quick prototypes and layouts.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        {mode === "lorem" && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
            Presets:
            <button
              onClick={() => applyPreset("short")}
              className={presetClasses(isPresetActive("short"))}
              aria-label="Preset: short paragraph"
            >
              Short
            </button>
            <button
              onClick={() => applyPreset("medium")}
              className={presetClasses(isPresetActive("medium"))}
              aria-label="Preset: medium paragraphs"
            >
              Medium
            </button>
            <button
              onClick={() => applyPreset("long")}
              className={presetClasses(isPresetActive("long"))}
              aria-label="Preset: long paragraphs"
            >
              Long
            </button>
            <button
              onClick={() => applyPreset("sentences")}
              className={presetClasses(isPresetActive("sentences"))}
              aria-label="Preset: sentences"
            >
              Sentences
            </button>
            <button
              onClick={() => applyPreset("bullets")}
              className={presetClasses(isPresetActive("bullets"))}
              aria-label="Preset: bulleted list"
            >
              Bulleted list
            </button>
          </div>
        )}
        {mode === "lorem" && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
            Templates:
            <button
              onClick={() => applyTemplate("wireframe")}
              className={presetClasses(isTemplateActive("wireframe"))}
              aria-label="Template: UI wireframe filler"
            >
              UI wireframe
            </button>
            <button
              onClick={() => applyTemplate("blog")}
              className={presetClasses(isTemplateActive("blog"))}
              aria-label="Template: blog post skeleton"
            >
              Blog post
            </button>
            <button
              onClick={() => applyTemplate("product")}
              className={presetClasses(isTemplateActive("product"))}
              aria-label="Template: product landing"
            >
              Product landing
            </button>
            <button
              onClick={() => applyTemplate("errors")}
              className={presetClasses(isTemplateActive("errors"))}
              aria-label="Template: error messages"
            >
              Error messages
            </button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as typeof mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Generator mode"
            >
              <option value="lorem">Lorem Ipsum</option>
              <option value="mock">Mock data</option>
            </select>
          </label>
          {mode === "lorem" ? (
            <>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Paragraphs (0–20)
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={paragraphs}
                  onChange={(event) => {
                    setParagraphs(Number(event.target.value));
                    setTemplate("none");
                  }}
                  disabled={includeHeadings && format === "paragraphs"}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Paragraph count"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Sentences (0–50)
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={sentences}
                  onChange={(event) => {
                    setSentences(Number(event.target.value));
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Sentence count"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Format
                <select
                  value={format}
                  onChange={(event) => {
                    setFormat(event.target.value as typeof format);
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Output format"
                >
                  <option value="paragraphs">Paragraphs</option>
                  <option value="sentences">Sentences</option>
                  <option value="bullets">Bulleted list</option>
                  <option value="headlines">Headlines (title case)</option>
                </select>
              </label>
              {format === "bullets" && (
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Bullet prefix
                <input
                  type="text"
                  value={bulletPrefix}
                  onChange={(event) => {
                    setBulletPrefix(event.target.value || "- ");
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Bullet prefix"
                />
                  <span className="text-xs text-slate-500">Default: "- ".</span>
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Theme
                <select
                  value={theme}
                  onChange={(event) => {
                    setTheme(event.target.value as typeof theme);
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Word theme"
                >
                  <option value="classic">Classic</option>
                  <option value="tech">Tech</option>
                  <option value="nature">Nature</option>
                  <option value="startup">Startup</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Seed (optional)
                <input
                  type="text"
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                  placeholder="Leave blank for random"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Seed for reproducible output"
                />
                <span className="text-xs text-slate-500">Set a seed for reproducible output.</span>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Export as
                <select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as typeof exportFormat)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Export format"
                >
                  <option value="text">Plain text</option>
                  <option value="markdown">Markdown</option>
                  <option value="html">HTML</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Records (0–100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={mockCount}
                  onChange={(event) => setMockCount(Number(event.target.value))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Mock record count"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Output format
                <select
                  value={mockFormat}
                  onChange={(event) => setMockFormat(event.target.value as typeof mockFormat)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Mock output format"
                >
                  <option value="json">JSON array</option>
                  <option value="csv">CSV</option>
                  <option value="sql">SQL INSERT</option>
                  <option value="ts">TypeScript types + sample objects</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Seed (optional)
                <input
                  type="text"
                  value={seed}
                  onChange={(event) => setSeed(event.target.value)}
                  placeholder="Leave blank for random"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Seed for reproducible output"
                />
                <span className="text-xs text-slate-500">Set a seed for reproducible output.</span>
              </label>
            </>
          )}
        </div>
        {mode === "lorem" && (
          <div className="rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Structure</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
                Paragraph length (words)
                <div className="flex flex-wrap gap-2">
                  {(["short", "medium", "long"] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setParagraphWords(paragraphLengthPresets[preset]);
                        setTemplate("none");
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${
                        paragraphWords === paragraphLengthPresets[preset]
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700"
                      }`}
                      aria-pressed={paragraphWords === paragraphLengthPresets[preset]}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={40}
                    max={180}
                    step={5}
                    value={paragraphWords}
                    onChange={(event) => {
                      setParagraphWords(Number(event.target.value));
                      setTemplate("none");
                    }}
                    className="w-full"
                    aria-label="Words per paragraph"
                  />
                  <span className="min-w-[48px] text-xs font-semibold text-slate-700">{paragraphWords}</span>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Min words (sentence)
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={minWords}
                  onChange={(event) => {
                    setMinWords(Number(event.target.value));
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Minimum words per sentence"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Max words (sentence)
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={maxWords}
                  onChange={(event) => {
                    setMaxWords(Number(event.target.value));
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Maximum words per sentence"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Comma frequency (0–1)
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={commaFrequency}
                  onChange={(event) => {
                    setCommaFrequency(Number(event.target.value));
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Comma frequency"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Question ratio (0–1)
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={questionRatio}
                  onChange={(event) => {
                    setQuestionRatio(Number(event.target.value));
                    setTemplate("none");
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  aria-label="Question ratio"
                />
              </label>
              {format === "paragraphs" && (
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  Include headings + body
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeHeadings}
                      onChange={(event) => {
                        setIncludeHeadings(event.target.checked);
                        setTemplate("none");
                      }}
                      className="h-4 w-4 rounded border-slate-300"
                      aria-label="Include headings and body sections"
                    />
                    <span className="text-xs text-slate-500">H2 + paragraphs per section</span>
                  </div>
                </label>
              )}
              {format === "paragraphs" && includeHeadings && (
                <>
                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    Sections
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={sectionCount}
                      onChange={(event) => {
                        setSectionCount(Number(event.target.value));
                        setTemplate("none");
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      aria-label="Section count"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    Paragraphs per section
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={sectionParagraphs}
                      onChange={(event) => {
                        setSectionParagraphs(Number(event.target.value));
                        setTemplate("none");
                      }}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      aria-label="Paragraphs per section"
                    />
                  </label>
                </>
              )}
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Start with classic “Lorem ipsum…”
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={startWithClassic}
                    onChange={(event) => {
                      setStartWithClassic(event.target.checked);
                      setTemplate("none");
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                    aria-label="Start with classic lorem ipsum sentence"
                  />
                  <span className="text-xs text-slate-500">First sentence is standard</span>
                </div>
              </label>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setMode("lorem");
              setTemplate("none");
              setParagraphs(2);
              setSentences(0);
              setCopied(false);
              setFormat("paragraphs");
              setMockFormat("json");
              setMockCount(8);
              setTheme("classic");
              setSeed("");
              setParagraphWords(paragraphLengthPresets.medium);
              setMinWords(8);
              setMaxWords(16);
              setCommaFrequency(0.2);
              setQuestionRatio(0.1);
              setIncludeHeadings(false);
              setSectionCount(3);
              setSectionParagraphs(2);
              setStartWithClassic(false);
              setBulletPrefix("- ");
              setExportFormat("text");
              setStatus("Reset");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset to defaults"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
            aria-label="Copy generated text"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
            aria-label="Copy Markdown"
          >
            Copy Markdown
          </button>
          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
            aria-label="Copy HTML"
          >
            Copy HTML
          </button>
          <button
            onClick={handleCopyRichText}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text || mode === "mock"}
            aria-label="Copy as rich text"
          >
            Copy rich text
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
            aria-label="Download generated text"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-[var(--shadow-soft)] ring-1 transition hover:-translate-y-0.5 ${
              isCurrentFavorite
                ? "bg-amber-50 text-amber-700 ring-amber-200"
                : "bg-white text-slate-600 ring-slate-200"
            }`}
            aria-label={isCurrentFavorite ? "Remove favorite preset" : "Star favorite preset"}
          >
            <Star className={`h-4 w-4 ${isCurrentFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
            {isCurrentFavorite ? "Starred" : "Star"}
          </button>
          <button
            onClick={() => {
              setRegenTick((t) => t + 1);
              setStatus("Regenerated");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Regenerate with current settings"
          >
            Regenerate
          </button>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            {status}
          </span>
        </div>
        <div className="text-xs text-slate-600">
          Words: {wordCount.toLocaleString()} · Characters: {charCount.toLocaleString()}{" "}
          {warning ? <span className="text-amber-600 font-medium"> · {warning}</span> : null}
        </div>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="lorem-output-heading"
      >
        <div id="lorem-output-heading" className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span>Output</span>
            <div className="flex items-center rounded-full bg-white/10 p-1 text-[11px] font-semibold">
              {(["plain", "markdown", "html"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPreviewTab(tab)}
                  className={`rounded-full px-2 py-1 transition ${
                    previewTab === tab ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"
                  }`}
                  aria-label={`Preview ${tab}`}
                >
                  {tab === "plain" ? "Plain" : tab === "markdown" ? "Markdown" : "HTML"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <span>
              Words: {wordCount.toLocaleString()} · Chars: {charCount.toLocaleString()}
            </span>
            {warning ? <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200">{warning}</span> : null}
            <button
              onClick={() => {
                setParagraphs(0);
                setSentences(0);
                setStatus("Output cleared");
              }}
              className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold transition hover:bg-white/20"
              aria-label="Clear output"
            >
              Clear output
            </button>
          </div>
        </div>
        <pre
          className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
          aria-live="polite"
        >
          {previewTab === "markdown"
            ? markdownContent || "Generated markdown will appear here."
            : previewTab === "html"
              ? htmlContent || "Generated HTML will appear here."
              : text || "Generated text will appear here."}
        </pre>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Examples</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase text-slate-500">UI wireframe</div>
              <p className="mt-1 text-sm text-slate-700">Short labels + medium paragraphs for layout mockups.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase text-slate-500">Blog skeleton</div>
              <p className="mt-1 text-sm text-slate-700">Title, subtitle, and five body paragraphs.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase text-slate-500">Product landing</div>
              <p className="mt-1 text-sm text-slate-700">Hero headline, tagline, and feature bullets.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs font-semibold uppercase text-slate-500">Error messages</div>
              <p className="mt-1 text-sm text-slate-700">Short warning strings for UI states.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Share</h2>
          <p className="mt-1 text-sm text-slate-600">Copy a link that keeps your preset, theme, and seed.</p>
          <div className="mt-3 flex flex-col gap-2">
            <input
              type="text"
              readOnly
              value={shareParams || "No preset selected yet."}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
              aria-label="Share link parameters"
            />
            <button
              onClick={handleCopyShareLink}
              className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              disabled={!shareParams}
            >
              Copy share link
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Recent generations</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {recentGenerations.length === 0 ? (
              <p className="text-slate-500">No recent generations yet.</p>
            ) : (
              recentGenerations.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{entry.summary || "Generation"}</div>
                    <div className="text-xs text-slate-500">{formatTimestamp(entry.createdAt)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => applySettings(entry.settings, entry.seed)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => handleCopyHistory(entry.text)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleFavoriteFromEntry(entry)}
                      className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"
                    >
                      Star
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Favorites</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {favoritePresets.length === 0 ? (
              <p className="text-slate-500">Star a preset to save it here.</p>
            ) : (
              favoritePresets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="text-sm font-semibold text-slate-900">{preset.label}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => applySettings(preset.settings, preset.seed)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setFavoritePresets((prev) => prev.filter((entry) => entry.id !== preset.id))}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {mode === "lorem" && blockGroups.length > 0 && (
        <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Copy blocks</h2>
          <p className="mt-1 text-sm text-slate-600">Grab a single paragraph or a whole bullet list.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {blockGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</span>
                  <button
                    onClick={() => handleCopyBlock(group.content)}
                    className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                  >
                    Copy
                  </button>
                </div>
                <div className="mt-2 max-h-16 overflow-hidden text-sm text-slate-700 whitespace-pre-wrap">
                  {group.preview}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick a preset or set paragraphs/sentences and choose a format (paragraphs, sentences, bullets, headlines).</li>
          <li>Optionally set a seed for reproducible output; copy or download the generated text.</li>
          <li>Outputs are clamped to avoid overly large text; word/character counts update live.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. All generation happens in your browser.</p>
          <p><strong>Why a seed?</strong> Set a seed to regenerate the same text for testing or design consistency.</p>
          <p><strong>Can I download?</strong> Yes, use the Download button for a .txt file or copy to clipboard.</p>
        </div>
      </div>
    </main>
  );
}
