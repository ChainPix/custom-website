"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, FileUp, Loader2, RefreshCcw, Sparkles } from "lucide-react";

import {
  DEFAULT_SECTION_WEIGHTS,
  analyze,
  buildTermData,
  compareTerms,
  redactPrivacyText,
  type Insights,
  type MissingTerm,
  type SectionWeights,
  type TermData,
} from "./analysis";

const SCANNED_PDF_WARNING = "No text detected—this looks scanned. Upload DOCX or paste text.";

const PRESETS: Array<{ id: string; label: string; weights: SectionWeights }> = [
  { id: "software", label: "Software Engineer", weights: { ...DEFAULT_SECTION_WEIGHTS, experience: 1.4, projects: 1.3 } },
  { id: "data", label: "Data/ML", weights: { ...DEFAULT_SECTION_WEIGHTS, skills: 1.7, education: 1.2, projects: 1.3 } },
  { id: "devops", label: "DevOps", weights: { ...DEFAULT_SECTION_WEIGHTS, skills: 1.8, experience: 1.4 } },
  { id: "intern", label: "Intern", weights: { ...DEFAULT_SECTION_WEIGHTS, education: 1.3, projects: 1.3, summary: 0.9 } },
];

type WorkerAnalysisCache = {
  rawText: string;
  analyzedText: string;
  weightsKey: string;
  privacyMode: boolean;
  termData: TermData;
  insights: Insights;
};

type PdfWorkerMessage =
  | { type: "pdf-progress"; requestId: number; current: number; total: number }
  | {
      type: "pdf-complete";
      requestId: number;
      rawText: string;
      analyzedText: string;
      termData: TermData;
      insights: Insights;
    }
  | { type: "pdf-empty"; requestId: number }
  | { type: "pdf-error"; requestId: number; message: string };

type PdfWorkerRequest = {
  type: "parse-pdf";
  requestId: number;
  buffer: ArrayBuffer;
  weights: SectionWeights;
  privacyMode: boolean;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildHighlightParts = (text: string, terms: string[], selectedTerm: string | null) => {
  if (!text || terms.length === 0) return [text];
  const sortedTerms = Array.from(new Set(terms.map((term) => term.trim()).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );
  if (!sortedTerms.length) return [text];
  const regex = new RegExp(`(${sortedTerms.map(escapeRegExp).join("|")})`, "gi");
  const parts: Array<string | { match: string; key: string; selected: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const value = match[0];
    parts.push({
      match: value,
      key: `${value}-${match.index}`,
      selected: selectedTerm ? value.toLowerCase() === selectedTerm.toLowerCase() : false,
    });
    lastIndex = match.index + value.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
};

const getInsertHints = (text: string, section: "Skills" | "Experience") => {
  const lines = text.split(/\r?\n/);
  const sectionPattern =
    section === "Skills"
      ? /\bskills\b|\btooling\b|\btechnologies\b|\btech stack\b/i
      : /\bexperience\b|\bwork history\b|\bemployment\b/i;
  const sectionIndex = lines.findIndex((line) => sectionPattern.test(line));
  const hints: Array<{ line: number; text: string }> = [];
  if (sectionIndex >= 0) {
    const start = sectionIndex + 1;
    for (let i = start; i < Math.min(lines.length, start + 3); i++) {
      if (!lines[i].trim()) continue;
      hints.push({ line: i + 1, text: lines[i].trim() });
    }
    if (!hints.length) {
      hints.push({ line: sectionIndex + 1, text: "Add a new bullet under this section." });
    }
  } else {
    hints.push({ line: 1, text: "Add a Skills section near the top." });
  }
  return hints;
};

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
  const [workerAnalysis, setWorkerAnalysis] = useState<WorkerAnalysisCache | null>(null);
  const pdfWorkerRef = useRef<Worker | null>(null);
  const pdfRequestIdRef = useRef(0);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].id);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedMissing, setSelectedMissing] = useState<MissingTerm | null>(null);
  const [beforeText, setBeforeText] = useState("");

  const presetWeights = useMemo(() => {
    return PRESETS.find((preset) => preset.id === selectedPreset)?.weights ?? DEFAULT_SECTION_WEIGHTS;
  }, [selectedPreset]);
  const weightsKey = useMemo(() => JSON.stringify(presetWeights), [presetWeights]);

  const analyzedText = useMemo(() => {
    return privacyMode ? redactPrivacyText(text) : text;
  }, [privacyMode, text]);
  const beforeAnalyzedText = useMemo(() => {
    return privacyMode ? redactPrivacyText(beforeText) : beforeText;
  }, [privacyMode, beforeText]);

  const resumeTermData = useMemo(() => {
    if (
      workerAnalysis?.rawText === text &&
      workerAnalysis.analyzedText === analyzedText &&
      workerAnalysis.weightsKey === weightsKey &&
      workerAnalysis.privacyMode === privacyMode
    ) {
      return workerAnalysis.termData;
    }
    return buildTermData(analyzedText, true, presetWeights);
  }, [analyzedText, presetWeights, privacyMode, text, weightsKey, workerAnalysis]);
  const jdTermData = useMemo(() => buildTermData(jdText, false, presetWeights), [jdText, presetWeights]);
  const beforeTermData = useMemo(() => buildTermData(beforeAnalyzedText, true, presetWeights), [beforeAnalyzedText, presetWeights]);
  const insights = useMemo(() => {
    if (
      workerAnalysis?.rawText === text &&
      workerAnalysis.analyzedText === analyzedText &&
      workerAnalysis.weightsKey === weightsKey &&
      workerAnalysis.privacyMode === privacyMode
    ) {
      return workerAnalysis.insights;
    }
    return analyze(analyzedText, resumeTermData);
  }, [analyzedText, resumeTermData, privacyMode, text, weightsKey, workerAnalysis]);
  const beforeInsights = useMemo(() => analyze(beforeAnalyzedText, beforeTermData), [beforeAnalyzedText, beforeTermData]);
  const comparison = useMemo(() => {
    if (!jdText.trim() || !analyzedText.trim()) {
      return {
        matchScore: 0,
        missing: [] as MissingTerm[],
        extras: [] as string[],
        exactMatches: 0,
        aliasMatches: 0,
        totalTerms: 0,
      };
    }
    return compareTerms(resumeTermData, jdTermData, presetWeights);
  }, [analyzedText, jdText, jdTermData, presetWeights, resumeTermData]);
  const beforeComparison = useMemo(() => {
    if (!jdText.trim() || !beforeAnalyzedText.trim()) {
      return {
        matchScore: 0,
        missing: [] as MissingTerm[],
        extras: [] as string[],
        exactMatches: 0,
        aliasMatches: 0,
        totalTerms: 0,
      };
    }
    return compareTerms(beforeTermData, jdTermData, presetWeights);
  }, [beforeAnalyzedText, beforeTermData, jdText, jdTermData, presetWeights]);

  const highlightTerms = useMemo(() => {
    if (jdText.trim()) {
      return jdTermData.topTerms.slice(0, 20).map((entry) => entry.term);
    }
    return insights.keywords.map((entry) => entry.word);
  }, [jdText, jdTermData.topTerms, insights.keywords]);
  const highlightParts = useMemo(
    () => buildHighlightParts(analyzedText, highlightTerms, selectedMissing?.term ?? null),
    [analyzedText, highlightTerms, selectedMissing],
  );
  const insertHints = useMemo(() => {
    if (!selectedMissing) return [];
    return getInsertHints(analyzedText || text, selectedMissing.suggestedSection);
  }, [analyzedText, selectedMissing, text]);

  const handlePdfWorkerMessage = (event: MessageEvent<PdfWorkerMessage>) => {
    const data = event.data;
    if (data.requestId !== pdfRequestIdRef.current) return;
    if (data.type === "pdf-progress") {
      setUploadStatus(`Parsing PDF (page ${data.current} of ${data.total})`);
      return;
    }
    if (data.type === "pdf-empty") {
      setWarning(SCANNED_PDF_WARNING);
      setUploadStatus("");
      setStatus("Updated");
      setIsUploading(false);
      setText("");
      setWorkerAnalysis(null);
      return;
    }
    if (data.type === "pdf-error") {
      setWarning(data.message || "Could not parse PDF. Please try another file or paste text.");
      setUploadStatus("");
      setStatus("Updated");
      setIsUploading(false);
      return;
    }
    if (data.type === "pdf-complete") {
      setWorkerAnalysis({
        rawText: data.rawText,
        analyzedText: data.analyzedText,
        termData: data.termData,
        insights: data.insights,
        weightsKey,
        privacyMode,
      });
      setText(data.rawText);
      setUploadStatus("Upload complete");
      setStatus("Updated");
      setWarning("");
      setIsUploading(false);
    }
  };

  const ensurePdfWorker = () => {
    if (pdfWorkerRef.current) return pdfWorkerRef.current;
    const worker = new Worker(new URL("./resume-analyzer.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = handlePdfWorkerMessage;
    worker.onerror = () => {
      setWarning("PDF worker failed. Try again or paste text.");
      setUploadStatus("");
      setStatus("Updated");
      setIsUploading(false);
    };
    pdfWorkerRef.current = worker;
    return worker;
  };

  useEffect(() => {
    if (!text.trim()) {
      if (warning !== SCANNED_PDF_WARNING) {
        setWarning("");
        setStatus("Ready");
      }
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
  }, [text, warning]);

  useEffect(() => {
    return () => {
      if (pdfWorkerRef.current) {
        pdfWorkerRef.current.terminate();
        pdfWorkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!jdText.trim()) {
      setSelectedMissing(null);
      return;
    }
    if (selectedMissing && !comparison.missing.find((item) => item.term === selectedMissing.term)) {
      setSelectedMissing(null);
    }
  }, [comparison.missing, jdText, selectedMissing]);

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
      if (isPdf) {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const worker = ensurePdfWorker();
          const requestId = pdfRequestIdRef.current + 1;
          pdfRequestIdRef.current = requestId;
          setUploadStatus("Parsing PDF...");
          const payload: PdfWorkerRequest = { type: "parse-pdf", requestId, buffer, weights: presetWeights, privacyMode };
          worker.postMessage(payload, [buffer]);
        } catch (err) {
          console.error("PDF worker failed", err);
          setWarning("Could not parse PDF. Please try another file or paste text.");
          setUploadStatus("");
          setIsUploading(false);
          setStatus("Updated");
        } finally {
          event.target.value = "";
        }
        return;
      }

      try {
        if (isDocx) {
          const buffer = e.target?.result as ArrayBuffer;
          const docxText = await parseWithTimeout(() => extractDocxText(buffer));
          setText(docxText);
        } else {
          setText(e.target?.result as string);
        }
        setWorkerAnalysis(null);
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
            <button
              onClick={() => setPrivacyMode((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium shadow-[var(--shadow-soft)] ring-1 transition hover:-translate-y-0.5 ${
                privacyMode ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-white text-slate-700 ring-slate-200"
              }`}
            >
              {privacyMode ? "Privacy mode on" : "Privacy mode"}
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
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-medium shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preset</label>
              <select
                value={selectedPreset}
                onChange={(event) => setSelectedPreset(event.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                aria-label="Select resume preset"
              >
                {PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            className="h-[260px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Paste your resume text. Remove private data; this runs in your browser."
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Resume text input"
          />
          {privacyMode && (
            <p className="text-xs text-emerald-700">
              Privacy mode hides emails, phones, and links in analysis previews.
            </p>
          )}
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
          {uploadStatus && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className={`h-3.5 w-3.5 ${isUploading ? "animate-spin" : ""}`} aria-hidden />
              <span>{uploadStatus}</span>
            </div>
          )}
        </div>
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold text-slate-900">Highlighted resume</p>
            <span className="text-xs text-slate-500">
              {jdText.trim() ? "Job keywords highlighted" : "Top resume keywords highlighted"}
            </span>
          </div>
          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
            <div className="whitespace-pre-wrap leading-relaxed">
              {highlightParts.map((part, index) => {
                if (typeof part === "string") {
                  return <span key={`${index}-text`}>{part}</span>;
                }
                return (
                  <mark
                    key={part.key}
                    className={`rounded px-1 ${
                      part.selected ? "bg-amber-200 text-amber-900" : "bg-slate-900/10 text-slate-900"
                    }`}
                  >
                    {part.match}
                  </mark>
                );
              })}
            </div>
          </div>
          {selectedMissing && insertHints.length > 0 && (
            <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-amber-700">Suggested insert spots</p>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  {selectedMissing.term}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {insertHints.map((hint) => (
                  <p key={`${hint.line}-${hint.text}`} className="text-[11px]">
                    Line {hint.line}: <span className="font-medium text-slate-800">{hint.text}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Before vs After</p>
            <span className="text-xs text-slate-500">Paste an older resume</span>
          </div>
          <textarea
            className="h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Paste your previous resume for comparison"
            value={beforeText}
            onChange={(event) => setBeforeText(event.target.value)}
            aria-label="Previous resume text input"
          />
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Match score</p>
              <p className="text-sm font-semibold text-slate-800">
                {beforeText.trim() ? beforeComparison.matchScore : 0}% → {comparison.matchScore}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Readability</p>
              <p className="text-sm font-semibold text-slate-800">
                {beforeText.trim() ? beforeInsights.quality.readabilityScore : 0} → {insights.quality.readabilityScore}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Action verbs</p>
              <p className="text-sm font-semibold text-slate-800">
                {beforeText.trim() ? beforeInsights.quality.actionVerbRate : 0}% → {insights.quality.actionVerbRate}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Measurable</p>
              <p className="text-sm font-semibold text-slate-800">
                {beforeText.trim() ? beforeInsights.quality.measurabilityRate : 0}% → {insights.quality.measurabilityRate}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bullet quality</p>
              <p className="text-sm font-semibold text-slate-800">
                {beforeText.trim() ? beforeInsights.quality.bulletQualityScore : 0} → {insights.quality.bulletQualityScore}
              </p>
            </div>
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
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedMissing((prev) => (prev?.term === item.term ? null : item))
                              }
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 transition ${
                                selectedMissing?.term === item.term
                                  ? "bg-amber-200 text-amber-900 ring-amber-300"
                                  : "bg-amber-100 text-amber-800 ring-amber-200"
                              }`}
                            >
                              {item.term}
                            </button>
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
