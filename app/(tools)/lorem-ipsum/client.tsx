"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const wordThemes: Record<string, string> = {
  classic: "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
  tech: "server api cloud kubernetes container microservice queue cache gateway database deploy latency metrics logging tracing security",
  nature: "forest river mountain ocean breeze flora fauna meadow canyon sunrise horizon valley coast desert rain",
  startup: "product sprint roadmap iterate launch growth traction retention funnel revenue cohort churn experiment feedback iterate",
};

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
  const [format, setFormat] = useState<"paragraphs" | "sentences" | "bullets" | "headlines">("paragraphs");
  const [warning, setWarning] = useState("");
  const [seed, setSeed] = useState("");
  const [theme, setTheme] = useState<keyof typeof wordThemes>("classic");
  const [regenTick, setRegenTick] = useState(0);
  const [autoSeed, setAutoSeed] = useState(() => Math.floor(Math.random() * 1e9).toString(36));
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

  const MAX_CHARS = 8000;

  useEffect(() => {
    if (!seed.trim()) {
      setAutoSeed(Math.floor(Math.random() * 1e9).toString(36));
    }
  }, [seed, regenTick]);

  const effectiveSeed = seed.trim() || autoSeed;

  const rng = useMemo(() => {
    return hashSeed(effectiveSeed);
  }, [effectiveSeed, regenTick]);

  const { text, blocks, warning: computedWarning } = useMemo(() => {
    type Block = { kind: "heading" | "headline" | "paragraph" | "line"; text: string };

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

    if (format === "paragraphs" || format === "headlines") {
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

    if (format === "sentences" || format === "bullets") {
      for (let i = 0; i < Math.max(sentCount, format === "bullets" ? 6 : sentCount); i += 1) {
        const wordCount = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
        const { sentence } = buildSentence(wordCount);
        blocks.push({ kind: "line", text: sentence });
      }
    } else if (sentCount > 0 && format === "paragraphs" && !headingsActive) {
      for (let i = 0; i < sentCount; i += 1) {
        const wordCount = minWordsValue + Math.floor(rng() * (maxWordsValue - minWordsValue + 1));
        const { sentence } = buildSentence(wordCount);
        blocks.push({ kind: "line", text: sentence });
      }
    }

    const raw = blocks
      .map((block) => (format === "bullets" ? `${bulletPrefix}${block.text}` : block.text))
      .join(format === "bullets" ? "\n" : "\n\n")
      .trim();
    if (raw.length > MAX_CHARS) {
      nextWarning = `Output truncated to ${MAX_CHARS.toLocaleString()} characters.`;
      return { text: raw.slice(0, MAX_CHARS) + "…", blocks, warning: nextWarning };
    }
    return { text: raw, blocks, warning: nextWarning };
  }, [
    paragraphs,
    sentences,
    format,
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

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const charCount = text.length;

  const downloadContent = useMemo(() => {
    if (!text) return "";
    if (exportFormat === "text") {
      return text;
    }
    if (exportFormat === "markdown") {
      if (format === "bullets") {
        return text;
      }
      return blocks
        .map((block) => {
          if (block.kind === "heading" || block.kind === "headline") {
            return `## ${block.text}`;
          }
          return block.text;
        })
        .join("\n\n");
    }
    // HTML export
    if (format === "bullets") {
      const items = blocks.map((block) => block.text);
      return `<ul>\n${items.map((i) => `  <li>${i}</li>`).join("\n")}\n</ul>`;
    }
    return blocks
      .map((block) => {
        if (block.kind === "heading") return `<h2>${block.text}</h2>`;
        if (block.kind === "headline") return `<h3>${block.text}</h3>`;
        return `<p>${block.text}</p>`;
      })
      .join("\n");
  }, [text, exportFormat, format, blocks]);

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

  const handleDownload = () => {
    if (!downloadContent) return;
    const downloadType = exportFormat === "html"
      ? "text/html"
      : exportFormat === "markdown"
        ? "text/markdown"
        : "text/plain";
    const downloadExtension = exportFormat === "html" ? "html" : exportFormat === "markdown" ? "md" : "txt";
    const blob = new Blob([downloadContent], { type: downloadType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lorem-ipsum.${downloadExtension}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const applyPreset = (preset: "short" | "medium" | "long" | "sentences" | "bullets") => {
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

  const isPresetActive = (preset: "short" | "medium" | "long" | "sentences" | "bullets") => {
    if (preset === "short") return paragraphs === 1 && sentences === 0 && format === "paragraphs";
    if (preset === "medium") return paragraphs === 2 && sentences === 0 && format === "paragraphs";
    if (preset === "long") return paragraphs === 5 && sentences === 0 && format === "paragraphs";
    if (preset === "sentences") return paragraphs === 0 && format === "sentences";
    if (preset === "bullets") return format === "bullets";
    return false;
  };

  const presetClasses = (active: boolean) =>
    `rounded-full px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${
      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
    }`;

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
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Paragraphs (0–20)
            <input
              type="number"
              min={0}
              max={20}
              value={paragraphs}
              onChange={(event) => setParagraphs(Number(event.target.value))}
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
              onChange={(event) => setSentences(Number(event.target.value))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Sentence count"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as typeof format)}
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
                onChange={(event) => setBulletPrefix(event.target.value || "- ")}
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
              onChange={(event) => setTheme(event.target.value as typeof theme)}
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
        </div>
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
                    onClick={() => setParagraphWords(paragraphLengthPresets[preset])}
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
                  onChange={(event) => setParagraphWords(Number(event.target.value))}
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
                onChange={(event) => setMinWords(Number(event.target.value))}
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
                onChange={(event) => setMaxWords(Number(event.target.value))}
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
                onChange={(event) => setCommaFrequency(Number(event.target.value))}
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
                onChange={(event) => setQuestionRatio(Number(event.target.value))}
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
                    onChange={(event) => setIncludeHeadings(event.target.checked)}
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
                    onChange={(event) => setSectionCount(Number(event.target.value))}
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
                    onChange={(event) => setSectionParagraphs(Number(event.target.value))}
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
                  onChange={(event) => setStartWithClassic(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                  aria-label="Start with classic lorem ipsum sentence"
                />
                <span className="text-xs text-slate-500">First sentence is standard</span>
              </div>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setParagraphs(2);
              setSentences(0);
              setCopied(false);
              setFormat("paragraphs");
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
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
            aria-label="Download generated text"
          >
            <Download className="h-4 w-4" />
            Download
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
        <div id="lorem-output-heading" className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <span>Output</span>
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
          {text || "Generated text will appear here."}
        </pre>
      </div>

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
