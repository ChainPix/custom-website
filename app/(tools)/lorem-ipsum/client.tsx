"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const loremWords =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";

const randomWords = (count: number) => {
  const words = loremWords.split(" ");
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(words[i % words.length] ?? "lorem");
  }
  return out;
};

export default function LoremIpsumClient() {
  const [paragraphs, setParagraphs] = useState(2);
  const [sentences, setSentences] = useState(0);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    const paraCount = Math.min(Math.max(paragraphs, 0), 20);
    const sentCount = Math.min(Math.max(sentences, 0), 50);
    const blocks: string[] = [];

    if (paraCount > 0) {
      for (let i = 0; i < paraCount; i += 1) {
        const words = randomWords(80 + i * 2);
        const sentence = words.join(" ");
        blocks.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".");
      }
    }

    if (sentCount > 0) {
      const sentenceWords = randomWords(12);
      const sentence = sentenceWords.join(" ");
      for (let i = 0; i < sentCount; i += 1) {
        blocks.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".");
      }
    }

    return blocks.join("\n\n").trim();
  }, [paragraphs, sentences]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Lorem Ipsum & Mock Data</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate placeholder text: paragraphs or sentences for quick prototypes and layouts.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
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
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setParagraphs(2);
              setSentences(0);
              setCopied(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Output</div>
        <pre className="max-h-[260px] overflow-auto whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
          {text || "Generated text will appear here."}
        </pre>
      </div>
    </main>
  );
}
