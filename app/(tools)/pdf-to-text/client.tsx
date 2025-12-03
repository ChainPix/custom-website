"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, Loader2, Upload } from "lucide-react";

export default function PdfToTextClient() {
  const [fileName, setFileName] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleParse = async (file: File) => {
    setError("");
    setOutput("");
    setFileName(file.name);
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
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
              : "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      pdfjsLib.GlobalWorkerOptions.workerSrc = `${resolvedWorkerSrc}`;

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
      setOutput(combined || "No extractable text found in this PDF.");
    } catch (err) {
      console.error("PDF parse failed", err);
      setError("Unable to parse this PDF. Use text-based PDFs (not scanned images).");
    } finally {
      setIsParsing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Unable to copy", err);
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">PDF → Text</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert PDFs to plain text directly in your browser. Fast, private, and free.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
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
                if (file) void handleParse(file);
              }}
            />
          </label>
          {fileName ? (
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <span className="font-medium">{fileName}</span>
              {isParsing ? (
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing
                </span>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
              {error}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Works best on digital PDFs. For scanned images, run OCR first.
            </p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Extracted text</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              {copied ? (
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
          <div className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            <pre className="whitespace-pre-wrap break-words text-slate-100">
              {output || "PDF text will appear here after uploading."}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
