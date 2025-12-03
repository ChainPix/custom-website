"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Clipboard,
  FileText,
  Loader2,
  ScanText,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";

type ResumeInsights = {
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

const defaultJson = `{
  "name": "FastFormat",
  "type": "online tool",
  "features": ["json formatter", "resume analyzer", "pdf to text"],
  "fast": true
}`;

function analyzeResume(text: string): ResumeInsights {
  const matches = text.toLowerCase().match(/\b[a-z]{2,}\b/g) ?? [];
  const counts: Record<string, number> = {};
  matches.forEach((word) => {
    if (!stopWords.has(word)) {
      counts[word] = (counts[word] ?? 0) + 1;
    }
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

export default function Home() {
  const [jsonInput, setJsonInput] = useState(defaultJson);
  const [jsonOutput, setJsonOutput] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [resumeText, setResumeText] = useState("");
  const resumeInsights = useMemo(() => analyzeResume(resumeText), [resumeText]);

  const [pdfName, setPdfName] = useState("");
  const [pdfText, setPdfText] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);

  useEffect(() => {
    handleFormatJson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1400);
    } catch (error) {
      console.error("Unable to copy", error);
    }
  };

  const handleFormatJson = () => {
    setJsonError("");
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error("Failed to format JSON", error);
      setJsonOutput("");
      setJsonError("That is not valid JSON. Make sure keys and strings are quoted.");
    }
  };

  const handleMinifyJson = () => {
    setJsonError("");
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed));
    } catch (error) {
      console.error("Failed to minify JSON", error);
      setJsonOutput("");
      setJsonError("That is not valid JSON. Make sure keys and strings are quoted.");
    }
  };

  const handleParsePdf = async (file: File) => {
    setPdfError("");
    setPdfText("");
    setPdfName(file.name);
    setIsParsingPdf(true);

    try {
      const buffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");

      // Configure the built-in worker so the parser runs fast in browsers.
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdf.worker.min.js",
        import.meta.url,
      ).toString();

      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const pageTexts: string[] = [];

      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items
          .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
          .join(" ");
        pageTexts.push(strings);
      }

      const combined = pageTexts.join("\n\n").trim();
      setPdfText(combined || "No extractable text found in this PDF.");
    } catch (error) {
      console.error(error);
      setPdfError("Unable to parse this PDF. Try a text-based PDF (not a scanned image).");
    } finally {
      setIsParsingPdf(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_14px_38px_-14px_rgba(15,23,42,0.55)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">FastFormat</p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Online JSON Formatter, Resume Analyzer, PDF to Text
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 font-medium text-slate-700 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.5)]">
                <Sparkles className="h-4 w-4 text-slate-500" />
                Instant, free, no sign-up
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              <p className="max-w-3xl text-lg leading-relaxed text-slate-700">
                Built for speed and clarity. These free online tools help you format JSON, analyze
                resumes, and convert PDF files to clean text without downloads. Optimized for SEO,
                mobile usability, and AdSense-friendly layouts.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <a
                  href="#json-formatter"
                  className="group flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition duration-150 hover:-translate-y-0.5"
                >
                  JSON Formatter
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#resume-analyzer"
                  className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition duration-150 hover:-translate-y-0.5"
                >
                  Resume Analyzer
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#pdf-to-text"
                  className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition duration-150 hover:-translate-y-0.5"
                >
                  PDF → Text
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
              </div>
              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Speed</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">Instant results</p>
                  <p>Client-side formatting and parsing keeps interactions snappy.</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Clarity</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    Minimalist layout
                  </p>
                  <p>High-contrast text, soft shadows, and focused tool cards.</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">SEO</p>
                  <p className="mt-2 text-base font-semibold text-slate-900">Meta-rich pages</p>
                  <p>Keyword-focused descriptions help rank for daily tool searches.</p>
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-[0_20px_78px_-42px_rgba(15,23,42,0.55)] ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ad space</p>
              <div className="mt-4 h-48 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70" />
              <p className="mt-4 text-sm text-slate-600">
                Keep ads on the side or bottom to protect usability. This reserved space is ready
                for Google AdSense.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-12">
        <section
          id="json-formatter"
          className="rounded-3xl bg-white/90 p-8 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_16px_38px_-18px_rgba(15,23,42,0.6)]">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">JSON Formatter</p>
              <h2 className="text-xl font-semibold text-slate-900">
                Free online JSON formatter and beautifier
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700">
            This free online JSON formatter helps developers format, validate, and minify JSON
            instantly. No sign-up, no limits—just paste JSON and get a clean, indented response
            that is easy to copy, share, and debug.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleFormatJson}
                    className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
                  >
                    <Sparkles className="h-4 w-4" />
                    Format JSON
                  </button>
                  <button
                    onClick={handleMinifyJson}
                    className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Minify
                  </button>
                </div>
                <button
                  onClick={() => setJsonInput("")}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Clear
                </button>
              </div>
              <textarea
                className="h-[280px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                spellCheck={false}
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
                placeholder='Paste JSON here e.g. {"hello":"world"}'
              />
              {jsonError ? (
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <FileText className="h-4 w-4" />
                  {jsonError}
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  Tip: use this formatter to clean up API responses, config files, and log payloads.
                </div>
              )}
            </div>

            <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-semibold">Formatted JSON</p>
                <button
                  onClick={() => copyText(jsonOutput || jsonInput, "json")}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
                >
                  {copied === "json" ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-4 w-4" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
                {jsonOutput || "Formatted JSON will appear here."}
              </pre>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
            Optimized for search: phrases like “JSON formatter online”, “free JSON beautifier”, and
            “copy JSON output” are included so Google can route developers who need quick formatting
            help.
          </div>
        </section>

        <section
          id="resume-analyzer"
          className="rounded-3xl bg-white/90 p-8 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_16px_38px_-18px_rgba(15,23,42,0.6)]">
              <ScanText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Resume Analyzer</p>
              <h2 className="text-xl font-semibold text-slate-900">
                Check resume keywords, length, and readability
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700">
            Paste your resume text to instantly see keyword frequency, word count, bullet usage, and
            estimated reading time. This resume analyzer is free and helps you optimize for ATS
            scanners and recruiters in seconds.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200">
              <textarea
                className="h-[260px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Paste your resume text. Remove private data; this runs in your browser."
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                  Word count: {resumeInsights.wordCount}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                  Characters: {resumeInsights.charCount}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                  Reading time: ~{resumeInsights.readingMinutes} min
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                  Bullet points: {resumeInsights.bulletCount}
                </span>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl bg-white p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">Keyword focus</p>
              <div className="flex flex-wrap gap-2">
                {resumeInsights.keywords.length ? (
                  resumeInsights.keywords.map((keyword) => (
                    <span
                      key={keyword.word}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-[0_14px_32px_-24px_rgba(15,23,42,0.65)]"
                    >
                      {keyword.word} · {keyword.count}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">
                    Add skills, tools, and results to surface strong keywords.
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    Keep sentences concise and prefer action verbs (built, delivered, optimized).
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    Mention the stack and metrics so ATS systems match job descriptions.
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                    Aim for readable sections: summary, experience, skills, education.
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
            Google-friendly copy: “resume analyzer”, “resume keyword checker”, and “ATS-friendly
            resume review” signal what this tool does so it can rank for daily resume searches.
          </div>
        </section>

        <section
          id="pdf-to-text"
          className="rounded-3xl bg-white/90 p-8 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_16px_38px_-18px_rgba(15,23,42,0.6)]">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">PDF → Text</p>
              <h2 className="text-xl font-semibold text-slate-900">
                Convert PDF to plain text for free
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-700">
            Upload a PDF and get clean, selectable text. Works best for digital PDFs (not scanned
            images). No uploads to servers—extraction runs in your browser for privacy and speed.
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4 rounded-2xl bg-slate-50/80 p-5 ring-1 ring-slate-200">
              <label
                htmlFor="pdf-input"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400"
              >
                <Upload className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="font-semibold text-slate-900">Drop a PDF or click to upload</p>
                  <p className="text-slate-600">Under 5MB recommended for faster parsing.</p>
                </div>
                <input
                  id="pdf-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleParsePdf(file);
                    }
                  }}
                />
              </label>
              {pdfName ? (
                <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">{pdfName}</span>
                  </div>
                  <span className="text-xs text-slate-500">Processing…</span>
                </div>
              ) : null}
              {pdfError ? (
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                  {pdfError}
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  Tip: for scanned PDFs, run OCR first—this parser extracts existing text layers.
                </div>
              )}
            </div>

            <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <p className="text-sm font-semibold">Extracted text</p>
                <div className="flex items-center gap-2">
                  {isParsingPdf ? (
                    <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin" /> Parsing
                    </span>
                  ) : null}
                  <button
                    onClick={() => copyText(pdfText, "pdf")}
                    className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                    disabled={!pdfText}
                  >
                    {copied === "pdf" ? (
                      <>
                        <Check className="h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Clipboard className="h-4 w-4" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
                {pdfText || "PDF text will appear here after uploading."}
              </pre>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
            SEO phrases included: “PDF to text free”, “convert PDF to plain text online”, and
            “browser-based PDF text extractor” so people searching for quick conversions can find
            this page.
          </div>
        </section>

        <section className="rounded-3xl bg-white/90 p-8 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Why this layout</p>
              <h3 className="text-xl font-semibold text-slate-900">
                Modern minimalist + soft skeuomorphism keeps tools focused
              </h3>
              <p className="text-base leading-relaxed text-slate-700">
                The interface uses neutral whites and grays, rounded cards, and soft shadows that
                subtly lift each tool card. No heavy gradients or pop-ups—just fast interactions that
                respect SEO and AdSense placement. Clear headings tell Google and users exactly what
                each tool does.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
                  <p className="font-semibold text-slate-900">Fast loading</p>
                  Tailwind + Next.js app router with client-side tools keeps TTFB low and Core Web
                  Vitals happy.
                </div>
                <div className="rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700 ring-1 ring-slate-200">
                  <p className="font-semibold text-slate-900">Ad-friendly</p>
                  Ads stay at the side/bottom so users remain focused on their tasks, improving CTR
                  and retention.
                </div>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-[0_24px_56px_-38px_rgba(15,23,42,0.58)] ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ad space</p>
              <div className="mt-4 h-48 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70" />
              <p className="mt-4 text-sm text-slate-600">
                Keep the main content untouched. Ads here won&apos;t block headings or form fields,
                preserving usability and SEO signals.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
