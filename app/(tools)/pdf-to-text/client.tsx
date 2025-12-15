"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Check, Clipboard, Download, Loader2, Upload, X, FileText, Image as ImageIcon, FileStack } from "lucide-react";
import { processPDF, cancelProcessing, type ProcessingProgress, type ProcessingResult } from "@/lib/ocr-processor";
import { validatePDFFile, formatFileSize, formatEstimatedTime } from "@/lib/file-utils";

export default function PdfToTextClient() {
  const [fileName, setFileName] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [isDragging, setIsDragging] = useState(false);
  const [normalize, setNormalize] = useState(false);

  // New OCR-related state
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [exportFormat, setExportFormat] = useState<'txt' | 'md' | 'json'>('txt');
  const abortControllerRef = useRef<AbortController | null>(null);

  const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'text-based':
        return <FileText className="h-4 w-4" />;
      case 'image-based':
        return <ImageIcon className="h-4 w-4" />;
      case 'mixed':
        return <FileStack className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const badges = {
      'text-based': 'bg-green-100 text-green-800',
      'image-based': 'bg-amber-100 text-amber-800',
      'mixed': 'bg-blue-100 text-blue-800',
    };
    return badges[category as keyof typeof badges] || badges['text-based'];
  };

  const handleParse = async (file: File) => {
    setError("");
    setOutput("");
    setResult(null);
    setProgress(null);
    setFileName(file.name);
    setIsParsing(true);
    setStatus("Processing...");

    // Validate file
    const validation = validatePDFFile(file, MAX_SIZE_BYTES);
    if (!validation.valid) {
      let errorMessage = validation.error || 'Invalid file';

      // Add helpful suggestions for oversized files
      if (validation.error?.includes('too large') || validation.error?.includes('exceeds')) {
        errorMessage += '\n\nSuggestions:\n• Split the PDF into smaller files\n• Reduce image quality in the PDF\n• Use a PDF compressor tool before uploading\n• Process the PDF locally with desktop software';
      }

      setError(errorMessage);
      setIsParsing(false);
      setStatus("Ready");
      return;
    }

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Process PDF with OCR support
      const processingResult = await processPDF(file, {
        language: 'eng',
        enableCheckpointing: true,
        checkpointInterval: 5,
        abortSignal: abortControllerRef.current.signal,

        onProgress: (prog) => {
          setProgress(prog);
          setStatus(prog.message);
        },

        onPageComplete: (pageNum, text) => {
          console.log(`Page ${pageNum} complete:`, text.substring(0, 100));
        },

        onError: (err) => {
          console.error('Processing error:', err);
        },
      });

      if (processingResult.success) {
        const combined = normalize ? normalizeText(processingResult.text) : processingResult.text;
        setOutput(combined);
        setResult(processingResult);
        setStatus("Completed");

        if (processingResult.checkpointRestored) {
          setStatus("Completed (resumed from checkpoint)");
        }
      } else {
        setError("Processing failed. Please try again.");
        setStatus("Error");
      }
    } catch (err: any) {
      console.error("PDF processing failed", err);

      if (err.message === 'Processing cancelled by user') {
        setError("Processing cancelled");
        setStatus("Cancelled");
      } else {
        setError(err.message || 'Processing failed. Please try again.');
        setStatus("Error");
      }
    } finally {
      setIsParsing(false);
      setProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      cancelProcessing();
      setIsParsing(false);
      setStatus("Cancelled");
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

  const handleDownload = () => {
    if (!output || !result) return;

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (exportFormat) {
      case 'md':
        content = `# ${fileName}\n\n${output}`;
        mimeType = 'text/markdown';
        extension = '.md';
        break;

      case 'json':
        const jsonData = {
          fileName: fileName,
          category: result.category,
          totalPages: result.totalPages,
          processedPages: result.processedPages,
          confidence: result.confidence,
          processingTime: result.processingTime,
          text: output,
          pageTexts: result.pageTexts,
        };
        content = JSON.stringify(jsonData, null, 2);
        mimeType = 'application/json';
        extension = '.json';
        break;

      case 'txt':
      default:
        content = output;
        mimeType = 'text/plain';
        extension = '.txt';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (fileName || "extracted").replace(/\.pdf$/i, '') + extension;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const normalizeText = (text: string) => {
    const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    return cleaned;
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
        <h1 className="text-3xl font-semibold text-slate-900">PDF → Text</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert PDFs to plain text with OCR support. Works with text-based and scanned PDFs.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 w-full">
          <label
            htmlFor="pdf-input"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleParse(file);
            }}
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center text-sm transition hover:-translate-y-0.5 ${
              isDragging ? "border-slate-500 bg-slate-50" : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <Upload className="h-5 w-5 text-slate-500" aria-hidden />
            <div>
              <p className="font-semibold text-slate-900">Drop a PDF or click to upload</p>
              <p className="text-slate-600">Up to 100MB • Supports OCR for scanned documents</p>
            </div>
            <p className="text-xs text-slate-500">Press Enter/Space to open file picker.</p>
            <input
              id="pdf-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleParse(file);
              }}
              disabled={isParsing}
            />
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-slate-900/5 ring-2 ring-slate-400" aria-hidden />
            )}
          </label>

          <p className="text-xs text-slate-600">
            Runs client-side; files aren&apos;t uploaded to a server. OCR processed locally with Tesseract.js.
          </p>

          {fileName && (
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <span className="font-medium truncate flex-1 min-w-0 max-w-full">{fileName}</span>
              {isParsing ? (
                <button
                  onClick={handleCancel}
                  className="ml-2 flex items-center gap-2 text-xs font-semibold text-red-600 underline underline-offset-4"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => {
                    setFileName("");
                    setOutput("");
                    setResult(null);
                    setProgress(null);
                    setError("");
                    setStatus("Ready");
                  }}
                  className="ml-2 text-xs font-semibold text-slate-500 underline underline-offset-4"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isParsing && progress && (
            <div className="space-y-3 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-200 border-2 border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
                  <span className="text-sm font-semibold text-blue-900">{progress.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getCategoryIcon(progress.category)}
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryBadge(progress.category)}`}>
                    {progress.category.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-blue-700">
                  <span>Page {progress.currentPage} of {progress.totalPages}</span>
                  <span className="text-base font-bold">{progress.percentage}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-blue-100 ring-1 ring-blue-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>

              {progress.estimatedTimeRemaining > 0 && (
                <p className="text-xs font-medium text-blue-700">
                  ⏱️ {formatEstimatedTime(progress.estimatedTimeRemaining)} remaining
                </p>
              )}
            </div>
          )}

          {/* Result Summary */}
          {result && !isParsing && (
            <div className="space-y-2 rounded-xl bg-green-50 p-4 ring-1 ring-green-200">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-700" />
                <span className="text-sm font-medium text-green-900">Processing Complete</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                <div>Category: <span className="font-semibold">{result.category}</span></div>
                <div>Pages: <span className="font-semibold">{result.processedPages}/{result.totalPages}</span></div>
                {result.confidence && (
                  <div>Confidence: <span className="font-semibold">{result.confidence}%</span></div>
                )}
                <div>Time: <span className="font-semibold">{result.processingTime.toFixed(1)}s</span></div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm ring-1 ring-red-200 border border-red-300">
              <div className="flex items-start gap-2">
                <X className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 mb-1">Error</p>
                  <p className="text-red-700 whitespace-pre-line">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800 w-full min-w-0">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 flex-wrap gap-2">
            <p className="text-sm font-semibold">Extracted text</p>
            <div className="flex items-center gap-2 flex-wrap">
              {output && (
                <>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'txt' | 'md' | 'json')}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white border border-slate-700 hover:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-colors"
                  >
                    <option value="txt" className="bg-slate-800">TXT Format</option>
                    <option value="md" className="bg-slate-800">Markdown</option>
                    <option value="json" className="bg-slate-800">JSON</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={normalize}
                      onChange={(e) => setNormalize(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    Normalize
                  </label>
                </>
              )}
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!output}
              >
                <Download className="h-4 w-4" aria-hidden /> Download
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
          <div
            className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-label="Extracted text output"
          >
            <pre className="whitespace-pre-wrap break-words text-slate-100">
              {output || "PDF text will appear here after uploading."}
            </pre>
          </div>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Features</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li><strong>OCR Support:</strong> Automatically detects and processes scanned PDFs with Tesseract.js</li>
          <li><strong>Smart Categorization:</strong> Text-based, image-based, or mixed PDFs processed optimally</li>
          <li><strong>Large Files:</strong> Supports up to 100MB PDFs with checkpointing</li>
          <li><strong>Resume Capability:</strong> Automatically resumes interrupted OCR processing</li>
          <li><strong>Multiple Formats:</strong> Export as TXT, Markdown, or JSON</li>
          <li><strong>Privacy-First:</strong> Everything runs locally in your browser</li>
        </ul>
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold">FAQ</p>
          <p><strong>Processing Time:</strong> Text PDFs: ~2s. Scanned PDFs: ~4s per page.</p>
          <p><strong>Mobile Support:</strong> Works on iOS 14+ and Android Chrome 90+</p>
          <p><strong>Accuracy:</strong> 85-95% OCR accuracy on clean scans</p>
        </div>
      </section>
    </main>
  );
}
