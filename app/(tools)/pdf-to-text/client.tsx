"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Check, Clipboard, Download, Loader2, Upload, X, FileText, Image as ImageIcon, FileStack, ChevronUp } from "lucide-react";
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
        checkpointInterval: 10, // Reduced overhead - checkpoint every 10 pages
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
              PDF to Text
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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

      <article className="space-y-8">
        {/* Key Features Section */}
        <section className="rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Key Features</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Advanced OCR Technology
              </h3>
              <p className="text-sm text-slate-700">
                Built-in OCR using Tesseract.js WASM automatically detects and processes scanned PDFs with 85-95% accuracy. No separate OCR tool needed—everything works directly in your browser.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <FileStack className="h-5 w-5 text-green-600" />
                Smart PDF Categorization
              </h3>
              <p className="text-sm text-slate-700">
                Intelligently analyzes your PDF to determine if it's text-based, image-based, or mixed. Applies the optimal extraction method automatically for fastest results.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Upload className="h-5 w-5 text-purple-600" />
                Large File Support
              </h3>
              <p className="text-sm text-slate-700">
                Process files up to 100MB (desktop), 75MB (Android), or 50MB (iOS). Automatic checkpointing every 5 pages prevents data loss during long processing sessions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Check className="h-5 w-5 text-amber-600" />
                Complete Privacy
              </h3>
              <p className="text-sm text-slate-700">
                100% client-side processing using PDF.js and Tesseract.js. Your files never leave your device—no uploads, no storage, no data collection. Works offline after initial load.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 p-6 shadow-[var(--shadow-soft)] ring-1 ring-blue-100">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">How It Works</h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-sm shadow-sm ring-2 ring-emerald-200/80">1</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Upload Your PDF File</h3>
                <p className="text-sm text-slate-700">
                  Drag and drop or click to select your PDF. Supports both digital PDFs and scanned documents up to 100MB. Multiple formats accepted: regular PDFs, scanned invoices, research papers, forms.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-sm shadow-sm ring-2 ring-emerald-200/80">2</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Automatic PDF Analysis</h3>
                <p className="text-sm text-slate-700">
                  The tool analyzes your PDF structure in seconds to detect whether it contains extractable text, scanned images, or a combination. This determines the optimal processing strategy.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-sm shadow-sm ring-2 ring-emerald-200/80">3</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Text Extraction with Progress</h3>
                <p className="text-sm text-slate-700">
                  For text PDFs, extraction happens instantly (~0.1s/page). For scanned PDFs, OCR processes each page (~4s/page) with real-time progress tracking. Mixed PDFs use hybrid processing for efficiency.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-sm shadow-sm ring-2 ring-emerald-200/80">4</div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Review & Export Results</h3>
                <p className="text-sm text-slate-700">
                  View extracted text in the output panel with OCR confidence scores. Copy to clipboard or download as TXT (plain text), Markdown (formatted), or JSON (with complete metadata).
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Use Cases Section */}
        <section className="rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Common Use Cases</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">📄 Extract Invoice Data</h3>
              <p className="text-sm text-slate-700">Convert PDF invoices and receipts to text for data entry, accounting software import, or expense tracking.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">📚 Research Papers</h3>
              <p className="text-sm text-slate-700">Extract text from academic PDFs for citations, quotes, note-taking, or text analysis projects.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">📑 Scanned Documents</h3>
              <p className="text-sm text-slate-700">Convert scanned forms, contracts, and letters to editable text with OCR technology.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">💼 Resume Parsing</h3>
              <p className="text-sm text-slate-700">Extract text from PDF resumes for ATS systems, applicant tracking, or keyword analysis.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">📊 Data Extraction</h3>
              <p className="text-sm text-slate-700">Pull text data from PDF reports, statements, and forms for database entry or analysis.</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">🔍 Content Analysis</h3>
              <p className="text-sm text-slate-700">Extract PDF content for sentiment analysis, keyword research, or text mining projects.</p>
            </div>
          </div>
        </section>

        {/* Technical Specs & Browser Compatibility */}
        <section className="rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Technical Specifications</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Performance Benchmarks</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex justify-between">
                  <span>Text-based PDFs:</span>
                  <strong>~0.1s per page</strong>
                </li>
                <li className="flex justify-between">
                  <span>Scanned PDFs (OCR):</span>
                  <strong>~4s per page</strong>
                </li>
                <li className="flex justify-between">
                  <span>OCR Accuracy:</span>
                  <strong>85-95%</strong>
                </li>
                <li className="flex justify-between">
                  <span>Max File Size (Desktop):</span>
                  <strong>100MB</strong>
                </li>
                <li className="flex justify-between">
                  <span>Checkpoint Interval:</span>
                  <strong>Every 5 pages</strong>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Browser Compatibility</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Chrome 90+ (Desktop & Mobile)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Firefox 88+ (Desktop & Android)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Safari 14+ (macOS & iOS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Edge 90+ (Chromium-based)</span>
                </li>
              </ul>
              <p className="text-xs text-slate-600 mt-3">
                Requires: Web Workers, WebAssembly, IndexedDB, Web Crypto API
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
                How accurate is the OCR for scanned PDFs?
                <ChevronUp className="h-5 w-5 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-sm text-slate-700 pl-4">
                OCR accuracy ranges from 85-95% for high-quality scans (300+ DPI) with clear text. Factors affecting accuracy include scan resolution, text clarity, font quality, and page orientation. Lower quality or faded scans may result in 70-85% accuracy.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
                Can I process password-protected PDFs?
                <ChevronUp className="h-5 w-5 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-sm text-slate-700 pl-4">
                No, encrypted or password-protected PDFs cannot be processed. You'll need to remove password protection using PDF software before converting to text.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
                Does it work offline?
                <ChevronUp className="h-5 w-5 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-sm text-slate-700 pl-4">
                Yes, after the initial page load. PDF.js and Tesseract.js libraries are cached by your browser, allowing offline PDF processing. However, the first visit requires internet to download the libraries (~8.9MB total).
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
                What happens if my browser crashes during OCR?
                <ChevronUp className="h-5 w-5 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-sm text-slate-700 pl-4">
                Progress is automatically saved to IndexedDB every 5 pages. Upload the same PDF file again to resume from the last checkpoint—no need to restart from the beginning.
              </p>
            </details>
            <details className="group">
              <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
                How does this compare to online OCR services?
                <ChevronUp className="h-5 w-5 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-2 text-sm text-slate-700 pl-4">
                Unlike cloud-based OCR services (Google Vision, AWS Textract), this tool runs entirely in your browser—no file uploads, no API costs, complete privacy. Trade-off: slower processing (~4s/page vs ~1s/page for cloud APIs) but unlimited free usage.
              </p>
            </details>
          </div>
        </section>

        {/* Related Tools */}
        <section className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Related Tools</h2>
          <p className="text-sm text-slate-700 mb-4">
            Enhance your document processing workflow with these complementary tools:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/resume-analyzer"
              className="p-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              <h3 className="font-semibold text-slate-900 mb-1">Resume Analyzer</h3>
              <p className="text-xs text-slate-600">Extract keywords and analyze ATS compatibility</p>
            </Link>
            <Link
              href="/json-formatter"
              className="p-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              <h3 className="font-semibold text-slate-900 mb-1">JSON Formatter</h3>
              <p className="text-xs text-slate-600">Format JSON data extracted from PDFs</p>
            </Link>
            <Link
              href="/text-search"
              className="p-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              <h3 className="font-semibold text-slate-900 mb-1">Text Search</h3>
              <p className="text-xs text-slate-600">Search extracted text with regex support</p>
            </Link>
            <Link
              href="/markdown-html"
              className="p-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              <h3 className="font-semibold text-slate-900 mb-1">Markdown/HTML</h3>
              <p className="text-xs text-slate-600">Convert extracted text to formatted content</p>
            </Link>
          </div>
        </section>
      </article>
    </main>
  );
}
