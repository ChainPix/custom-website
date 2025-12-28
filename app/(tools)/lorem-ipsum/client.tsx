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
  const [bulletPrefix, setBulletPrefix] = useState("- ");
  const [exportFormat, setExportFormat] = useState<"text" | "markdown" | "html">("text");

  const MAX_CHARS = 8000;

  const effectiveSeed = seed.trim() || "default-seed";

  const rng = useMemo(() => {
    return hashSeed(effectiveSeed);
  }, [effectiveSeed, regenTick]);

  const { text, blocks, warning: computedWarning } = useMemo(() => {
    const paraCountRaw = Math.max(paragraphs, 0);
    const sentCountRaw = Math.max(sentences, 0);
    const paraCount = Math.min(paraCountRaw, 20);
    const sentCount = Math.min(sentCountRaw, 50);
    const blocks: string[] = [];
    let nextWarning = "";

    if (paraCountRaw > 20 || sentCountRaw > 50) {
      nextWarning = "Counts clamped to avoid overly large output.";
    }

    if (format === "paragraphs" || format === "headlines") {
      if (paraCount > 0) {
        for (let i = 0; i < paraCount; i += 1) {
          const words = randomWords(80 + i * 2, rng, theme);
          const sentence = words.join(" ");
          const block = format === "headlines"
            ? sentence.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
            : sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
          blocks.push(block);
        }
      }
    }

    if (format === "sentences" || format === "bullets") {
      const sentenceWords = randomWords(12, rng, theme);
      const sentence = sentenceWords.join(" ");
      for (let i = 0; i < Math.max(sentCount, format === "bullets" ? 6 : sentCount); i += 1) {
        const line = sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
        blocks.push(format === "bullets" ? `- ${line}` : line);
      }
    } else if (sentCount > 0 && format === "paragraphs") {
      const sentenceWords = randomWords(12, rng, theme);
      const sentence = sentenceWords.join(" ");
      for (let i = 0; i < sentCount; i += 1) {
        blocks.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".");
      }
    }

    const raw = blocks
      .map((line) => (format === "bullets" ? `${bulletPrefix}${line.replace(/^-+\s*/, "")}` : line))
      .join(format === "bullets" ? "\n" : "\n\n")
      .trim();
    if (raw.length > MAX_CHARS) {
      nextWarning = `Output truncated to ${MAX_CHARS.toLocaleString()} characters.`;
      return { text: raw.slice(0, MAX_CHARS) + "…", blocks, warning: nextWarning };
    }
    return { text: raw, blocks, warning: nextWarning };
  }, [paragraphs, sentences, format, theme, rng, bulletPrefix]);

  useEffect(() => {
    setWarning(computedWarning);
  }, [computedWarning]);

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const charCount = text.length;

  const downloadContent = useMemo(() => {
    if (!text) return "";
    if (exportFormat === "text" || exportFormat === "markdown") {
      return text;
    }
    // HTML export
    if (format === "bullets") {
      const items = text.split("\n").map((line) => line.replace(new RegExp(`^${bulletPrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`), ""));
      return `<ul>\n${items.map((i) => `  <li>${i}</li>`).join("\n")}\n</ul>`;
    }
    const paragraphs = text.split("\n\n");
    if (format === "headlines") {
      return paragraphs.map((p) => `<h3>${p}</h3>`).join("\n");
    }
    return paragraphs.map((p) => `<p>${p}</p>`).join("\n");
  }, [text, exportFormat, format, bulletPrefix]);

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
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lorem-ipsum.txt";
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setParagraphs(2);
              setSentences(0);
              setCopied(false);
              setFormat("paragraphs");
              setTheme("classic");
              setSeed("");
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
