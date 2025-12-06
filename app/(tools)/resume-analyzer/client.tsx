"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileUp, Loader2, RefreshCcw, Sparkles } from "lucide-react";

type Insights = {
  wordCount: number;
  charCount: number;
  readingMinutes: number;
  bulletCount: number;
  keywords: Array<{ word: string; count: number }>;
  uniqueWords: number;
  bigrams: Array<{ phrase: string; count: number }>;
  trigrams: Array<{ phrase: string; count: number }>;
  sections: SectionMatch[];
};

type SectionKey = "experience" | "education" | "skills";

type SectionMatch = {
  key: SectionKey;
  found: boolean;
  line: number | null;
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

function simpleStem(token: string) {
  let t = token.replace(/'s$/, "");
  t = t.replace(/(ing|ed|ers|er|ly|s)$/i, (m) => {
    if (m === "s" && t.length <= 3) return m;
    return "";
  });
  return t;
}

function analyze(text: string): Insights {
  const matches = text.toLowerCase().match(/\b[a-z]{2,}\b/g) ?? [];
  const counts: Record<string, number> = {};
  const stems: string[] = [];
  const filteredTokens: string[] = [];

  matches.forEach((word) => {
    if (stopWords.has(word)) return;
    const stem = simpleStem(word);
    stems.push(stem);
    filteredTokens.push(stem);
    counts[stem] = (counts[stem] ?? 0) + 1;
  });

  const keywords = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  const uniqueWords = Object.keys(counts).length;

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

  const bigrams = buildNgrams(filteredTokens, 2);
  const trigrams = buildNgrams(filteredTokens, 3);

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
    wordCount: matches.length,
    charCount: text.length,
    readingMinutes: Math.max(1, Math.round(matches.length / 200)),
    bulletCount: (text.match(/-|•/g) ?? []).length,
    keywords,
    uniqueWords,
    bigrams,
    trigrams,
    sections,
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
    const mammothModule = await import("mammoth");
    const extractRawText = (mammothModule as { extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> })
      .extractRawText;
    const result = await extractRawText({ arrayBuffer });
    return result.value ?? "";
  } catch (err) {
    console.error("DOCX parse failed", err);
    throw new Error("DOCX parsing not available in this build.");
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

  const insights = useMemo(() => analyze(text), [text]);
  const jdInsights = useMemo(() => analyze(jdText), [jdText]);
  const comparison = useMemo(() => {
    if (!jdText.trim() || !text.trim()) {
      return { matchScore: 0, missing: [] as string[], extras: [] as string[] };
    }
    const resumeSet = new Set(insights.keywords.map((k) => k.word));
    const jdSet = new Set(jdInsights.keywords.map((k) => k.word));
    const missing = Array.from(jdSet).filter((k) => !resumeSet.has(k));
    const extras = Array.from(resumeSet).filter((k) => !jdSet.has(k));
    const matchCount = jdInsights.keywords.filter((k) => resumeSet.has(k.word)).length;
    const matchScore = jdSet.size ? Math.round((matchCount / jdSet.size) * 100) : 0;
    return { matchScore, missing, extras };
  }, [insights.keywords, jdInsights.keywords, jdText, text]);

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
      `Top keywords: ${insights.keywords.map((k) => `${k.word} (${k.count})`).join(", ") || "n/a"}`,
      `Bigrams: ${insights.bigrams.map((b) => `${b.phrase} (${b.count})`).join(", ") || "n/a"}`,
      `Trigrams: ${insights.trigrams.map((t) => `${t.phrase} (${t.count})`).join(", ") || "n/a"}`,
      `Job match: ${comparison.matchScore}%`,
      `Missing keywords: ${comparison.missing.join(", ") || "n/a"}`,
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
      ...insights,
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
      ["keywords", insights.keywords.map((k) => `${k.word} (${k.count})`).join("; ") || "n/a"],
      ["bigrams", insights.bigrams.map((b) => `${b.phrase} (${b.count})`).join("; ") || "n/a"],
      ["trigrams", insights.trigrams.map((t) => `${t.phrase} (${t.count})`).join("; ") || "n/a"],
      ["jdMatchScore", `${comparison.matchScore}%`],
      ["missingKeywords", comparison.missing.join("; ") || "n/a"],
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
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
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
                  {keyword.word} · {keyword.count}
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
                </div>
              )}
            </div>
            {jdText && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-1">Missing keywords</p>
                  {comparison.missing.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {comparison.missing.map((word) => (
                        <span key={word} className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                          {word}
                        </span>
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
