"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";

type Insights = {
  wordCount: number;
  charCount: number;
  readingMinutes: number;
  bulletCount: number;
  keywords: Array<{ word: string; count: number }>;
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
]);

function analyze(text: string): Insights {
  const matches = text.toLowerCase().match(/\b[a-z]{2,}\b/g) ?? [];
  const counts: Record<string, number> = {};
  matches.forEach((word) => {
    if (!stopWords.has(word)) counts[word] = (counts[word] ?? 0) + 1;
  });

  const keywords = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  return {
    wordCount: matches.length,
    charCount: text.length,
    readingMinutes: Math.max(1, Math.round(matches.length / 200)),
    bulletCount: (text.match(/-|•/g) ?? []).length,
    keywords,
  };
}

export default function ResumeAnalyzerClient() {
  const [text, setText] = useState("");
  const insights = useMemo(() => analyze(text), [text]);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Resume Analyzer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Paste your resume text to check keyword frequency, length, and readability. Built for ATS
          prep and quick recruiter-friendly edits.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <textarea
            className="h-[260px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Paste your resume text. Remove private data; this runs in your browser."
            value={text}
            onChange={(event) => setText(event.target.value)}
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
                  {keyword.word} · {keyword.count}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-600">
                Add skills, tools, and results to surface stronger keywords.
              </p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Use action verbs (built, delivered, optimized) and measurable results.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Include tech stack and certifications that match the job description.
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                Keep formatting simple for ATS parsing.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
