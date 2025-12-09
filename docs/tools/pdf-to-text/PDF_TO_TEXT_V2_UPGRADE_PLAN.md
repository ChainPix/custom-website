# PDF → Text Tool V2.0 Upgrade Plan: Browser-Based OCR

**Version:** 2.0.0 (Major Upgrade)
**Status:** 🔄 Planning Phase
**Target Completion:** v1.3 Release
**Estimated Effort:** 2-3 weeks

---

## Executive Summary

Upgrade the PDF → Text tool from text-only extraction to a full-featured, browser-based OCR solution using Tesseract.js WASM. This enables extraction from scanned/image-based PDFs while maintaining client-side processing and cross-browser compatibility.

### Key Objectives
1. ✅ Add browser-based OCR using Tesseract.js WASM
2. ✅ Intelligent PDF categorization (text-based vs image-based vs mixed)
3. ✅ Handle large PDFs (100MB+) with chunking and memory management
4. ✅ Progressive OCR with live progress indicators
5. ✅ Robust error handling and recovery mechanisms
6. ✅ Cross-browser and mobile compatibility
7. ✅ No backend/server requirements

---

## Current State Analysis

### Existing Capabilities
- ✅ Text-based PDF extraction via PDF.js
- ✅ 10MB file size limit
- ✅ Basic error handling
- ✅ Client-side processing

### Critical Limitations (V1.0)
1. ❌ **No OCR support** - Cannot extract from scanned PDFs
2. ❌ **No detection** - Doesn't identify text vs image PDFs
3. ❌ **10MB limit** - Too restrictive for document scanning
4. ❌ **No progress feedback** - Long operations appear frozen
5. ❌ **Weak error handling** - Generic errors, no recovery
6. ❌ **Memory management** - Can crash browser on large files
7. ❌ **No checkpointing** - Cannot resume interrupted OCR

---

## Architecture Overview

### Three-Tier Processing Pipeline

```
┌─────────────────────────────────────────────────────┐
│           PDF Upload & Validation                   │
│  • File size check (0-100MB)                        │
│  • MIME type validation                             │
│  • Corruption detection                             │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│        PDF Categorization (Intelligence)            │
│  • Text-based: Fast PDF.js extraction               │
│  • Image-based: Full OCR pipeline                   │
│  • Mixed: Hybrid extraction                         │
└─────────────┬───────────────────────────────────────┘
              │
         ┌────┴────┐
         │         │
    Text-based  Image-based
         │         │
         ▼         ▼
   ┌─────────┐  ┌──────────────────────────────┐
   │ PDF.js  │  │   Tesseract.js WASM OCR      │
   │ Extract │  │  • Web Worker processing     │
   └─────────┘  │  • Page-by-page chunking     │
                │  • IndexedDB checkpointing   │
                │  • Progress tracking         │
                └──────────────────────────────┘
```

---

## Technical Implementation Plan

### Phase 1: Infrastructure Setup (Days 1-3)

#### 1.1 Dependencies Installation
```bash
npm install tesseract.js@5.0.0
npm install idb@8.0.0  # IndexedDB wrapper for checkpointing
npm install pdfjs-dist@3.11.174  # Already installed, ensure latest
```

#### 1.2 Web Worker Setup
Create dedicated worker for OCR to prevent UI freezing:

**File:** `app/(tools)/pdf-to-text/workers/ocr-worker.ts`
```typescript
import { createWorker, Worker as TesseractWorker } from 'tesseract.js';

let worker: TesseractWorker | null = null;

self.addEventListener('message', async (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      await initWorker(payload.lang);
      break;
    case 'OCR_PAGE':
      await processPage(payload);
      break;
    case 'TERMINATE':
      await terminateWorker();
      break;
  }
});

async function initWorker(lang: string = 'eng') {
  try {
    worker = await createWorker(lang, 1, {
      logger: (m) => {
        // Send progress updates to main thread
        self.postMessage({ type: 'PROGRESS', payload: m });
      },
      errorHandler: (err) => {
        self.postMessage({ type: 'ERROR', payload: err.message });
      },
    });

    self.postMessage({ type: 'INIT_COMPLETE' });
  } catch (err) {
    self.postMessage({ type: 'INIT_ERROR', payload: err });
  }
}

async function processPage(payload: { imageData: ImageData; pageNum: number; totalPages: number }) {
  if (!worker) {
    self.postMessage({ type: 'ERROR', payload: 'Worker not initialized' });
    return;
  }

  try {
    const { data } = await worker.recognize(payload.imageData);

    self.postMessage({
      type: 'PAGE_COMPLETE',
      payload: {
        pageNum: payload.pageNum,
        text: data.text,
        confidence: data.confidence,
      },
    });
  } catch (err) {
    self.postMessage({
      type: 'PAGE_ERROR',
      payload: { pageNum: payload.pageNum, error: err },
    });
  }
}

async function terminateWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
    self.postMessage({ type: 'TERMINATED' });
  }
}
```

#### 1.3 IndexedDB Checkpoint Store
**File:** `lib/ocr-checkpoint.ts`
```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OCRCheckpointDB extends DBSchema {
  checkpoints: {
    key: string; // fileHash
    value: {
      fileHash: string;
      fileName: string;
      totalPages: number;
      completedPages: number[];
      pageTexts: Record<number, string>;
      lastUpdated: number;
      status: 'in_progress' | 'completed' | 'failed';
    };
  };
}

let db: IDBPDatabase<OCRCheckpointDB> | null = null;

export async function initCheckpointDB() {
  db = await openDB<OCRCheckpointDB>('ocr-checkpoints', 1, {
    upgrade(db) {
      db.createObjectStore('checkpoints', { keyPath: 'fileHash' });
    },
  });
  return db;
}

export async function saveCheckpoint(checkpoint: OCRCheckpointDB['checkpoints']['value']) {
  if (!db) await initCheckpointDB();
  await db!.put('checkpoints', { ...checkpoint, lastUpdated: Date.now() });
}

export async function loadCheckpoint(fileHash: string) {
  if (!db) await initCheckpointDB();
  return await db!.get('checkpoints', fileHash);
}

export async function deleteCheckpoint(fileHash: string) {
  if (!db) await initCheckpointDB();
  await db!.delete('checkpoints', fileHash);
}

export async function listCheckpoints() {
  if (!db) await initCheckpointDB();
  return await db!.getAll('checkpoints');
}
```

---

### Phase 2: PDF Categorization Logic (Days 4-5)

#### 2.1 PDF Intelligence Module
**File:** `lib/pdf-intelligence.ts`
```typescript
import * as pdfjsLib from 'pdfjs-dist';

export type PDFCategory = 'text-based' | 'image-based' | 'mixed';

export interface PDFAnalysis {
  category: PDFCategory;
  totalPages: number;
  textPages: number[];
  imagePages: number[];
  estimatedOCRTime: number; // in seconds
  fileSize: number;
  needsOCR: boolean;
}

/**
 * Analyze PDF to determine if it's text-based, image-based, or mixed
 */
export async function analyzePDF(file: File): Promise<PDFAnalysis> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const textPages: number[] = [];
  const imagePages: number[] = [];
  const SAMPLE_SIZE = Math.min(5, pdf.numPages); // Sample first 5 pages for speed

  // Analyze sample pages
  for (let i = 1; i <= SAMPLE_SIZE; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    if (text.length > 50) {
      // Page has meaningful text (>50 chars)
      textPages.push(i);
    } else {
      // Page is likely image-based
      imagePages.push(i);
    }
  }

  // Extrapolate for all pages
  const textRatio = textPages.length / SAMPLE_SIZE;
  const estimatedTextPages = Math.round(pdf.numPages * textRatio);
  const estimatedImagePages = pdf.numPages - estimatedTextPages;

  // Categorize
  let category: PDFCategory;
  if (textRatio >= 0.9) {
    category = 'text-based';
  } else if (textRatio <= 0.1) {
    category = 'image-based';
  } else {
    category = 'mixed';
  }

  // Estimate OCR time (rough: 2-5 seconds per page)
  const estimatedOCRTime = estimatedImagePages * 3.5;

  return {
    category,
    totalPages: pdf.numPages,
    textPages: Array.from({ length: estimatedTextPages }, (_, i) => i + 1),
    imagePages: Array.from({ length: estimatedImagePages }, (_, i) => estimatedTextPages + i + 1),
    estimatedOCRTime,
    fileSize: file.size,
    needsOCR: category === 'image-based' || category === 'mixed',
  };
}

/**
 * Extract text from text-based pages only
 */
export async function extractTextPages(
  file: File,
  pageNumbers: number[]
): Promise<Record<number, string>> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const results: Record<number, string> = {};

  for (const pageNum of pageNumbers) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    results[pageNum] = text;
  }

  return results;
}

/**
 * Render PDF page to canvas for OCR
 */
export async function renderPageToCanvas(
  file: File,
  pageNum: number,
  scale: number = 2.0 // Higher scale = better OCR accuracy
): Promise<ImageData> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(pageNum);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  return context.getImageData(0, 0, canvas.width, canvas.height);
}
```

---

### Phase 3: OCR Processing Engine (Days 6-9)

#### 3.1 Main OCR Controller
**File:** `lib/ocr-processor.ts`
```typescript
import { analyzePDF, extractTextPages, renderPageToCanvas, PDFAnalysis } from './pdf-intelligence';
import { saveCheckpoint, loadCheckpoint, deleteCheckpoint } from './ocr-checkpoint';
import { hashFile } from './file-utils';

export interface OCRProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
  status: 'analyzing' | 'extracting_text' | 'ocr_processing' | 'completed' | 'error';
  message: string;
}

export interface OCRResult {
  text: string;
  pageTexts: Record<number, string>;
  confidence: number;
  processingTime: number;
}

export class OCRProcessor {
  private worker: Worker | null = null;
  private onProgress: (progress: OCRProgress) => void;
  private onComplete: (result: OCRResult) => void;
  private onError: (error: Error) => void;
  private fileHash: string = '';
  private startTime: number = 0;
  private pageTexts: Record<number, string> = {};
  private completedPages: Set<number> = new Set();

  constructor(
    onProgress: (progress: OCRProgress) => void,
    onComplete: (result: OCRResult) => void,
    onError: (error: Error) => void
  ) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onError = onError;
  }

  async processFile(file: File, resumeFromCheckpoint: boolean = false) {
    this.startTime = Date.now();
    this.fileHash = await hashFile(file);

    try {
      // Check for existing checkpoint
      if (resumeFromCheckpoint) {
        const checkpoint = await loadCheckpoint(this.fileHash);
        if (checkpoint && checkpoint.status === 'in_progress') {
          return this.resumeFromCheckpoint(file, checkpoint);
        }
      }

      // Analyze PDF
      this.reportProgress(0, 0, 'analyzing', 'Analyzing PDF structure...');
      const analysis = await analyzePDF(file);

      if (!analysis.needsOCR) {
        // Fast path: text-based PDF
        return this.processTextBasedPDF(file, analysis);
      } else {
        // OCR path: image-based or mixed
        return this.processOCRPDF(file, analysis);
      }
    } catch (error) {
      this.onError(error as Error);
      throw error;
    }
  }

  private async processTextBasedPDF(file: File, analysis: PDFAnalysis) {
    this.reportProgress(0, analysis.totalPages, 'extracting_text', 'Extracting text from PDF...');

    const pageRange = Array.from({ length: analysis.totalPages }, (_, i) => i + 1);
    this.pageTexts = await extractTextPages(file, pageRange);

    const combinedText = Object.values(this.pageTexts).join('\n\n');
    const processingTime = (Date.now() - this.startTime) / 1000;

    this.reportProgress(analysis.totalPages, analysis.totalPages, 'completed', 'Extraction complete!');

    this.onComplete({
      text: combinedText,
      pageTexts: this.pageTexts,
      confidence: 100, // Native text extraction
      processingTime,
    });
  }

  private async processOCRPDF(file: File, analysis: PDFAnalysis) {
    // Initialize Web Worker
    this.worker = new Worker(new URL('../workers/ocr-worker.ts', import.meta.url));
    this.setupWorkerListeners();

    // Extract text pages first (if mixed)
    if (analysis.category === 'mixed' && analysis.textPages.length > 0) {
      this.reportProgress(0, analysis.totalPages, 'extracting_text', 'Extracting text pages...');
      const textResults = await extractTextPages(file, analysis.textPages);
      Object.assign(this.pageTexts, textResults);
      analysis.textPages.forEach(p => this.completedPages.add(p));
    }

    // Initialize Tesseract worker
    this.reportProgress(0, analysis.totalPages, 'ocr_processing', 'Initializing OCR engine...');
    await this.initWorker('eng');

    // Process image pages with OCR
    for (const pageNum of analysis.imagePages) {
      if (this.completedPages.has(pageNum)) continue; // Skip if already done

      this.reportProgress(
        this.completedPages.size,
        analysis.totalPages,
        'ocr_processing',
        `OCR processing page ${pageNum} of ${analysis.totalPages}...`
      );

      const imageData = await renderPageToCanvas(file, pageNum, 2.0);
      await this.ocrPage(imageData, pageNum, analysis.totalPages);

      // Checkpoint every 5 pages
      if (this.completedPages.size % 5 === 0) {
        await this.saveProgress(file.name, analysis.totalPages);
      }
    }

    // Finalize
    await this.terminateWorker();
    await deleteCheckpoint(this.fileHash); // Clear checkpoint after success

    const combinedText = Object.keys(this.pageTexts)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => this.pageTexts[Number(k)])
      .join('\n\n');

    const processingTime = (Date.now() - this.startTime) / 1000;

    this.reportProgress(analysis.totalPages, analysis.totalPages, 'completed', 'OCR complete!');

    this.onComplete({
      text: combinedText,
      pageTexts: this.pageTexts,
      confidence: 85, // Estimated OCR confidence
      processingTime,
    });
  }

  private setupWorkerListeners() {
    if (!this.worker) return;

    this.worker.addEventListener('message', (e) => {
      const { type, payload } = e.data;

      switch (type) {
        case 'INIT_COMPLETE':
          // Worker ready
          break;
        case 'PAGE_COMPLETE':
          this.pageTexts[payload.pageNum] = payload.text;
          this.completedPages.add(payload.pageNum);
          break;
        case 'PAGE_ERROR':
          console.error(`OCR error on page ${payload.pageNum}:`, payload.error);
          // Continue with empty text for failed page
          this.pageTexts[payload.pageNum] = '';
          this.completedPages.add(payload.pageNum);
          break;
        case 'ERROR':
          this.onError(new Error(payload));
          break;
      }
    });
  }

  private async initWorker(lang: string) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Worker init timeout')), 30000);

      const handler = (e: MessageEvent) => {
        if (e.data.type === 'INIT_COMPLETE') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', handler);
          resolve();
        } else if (e.data.type === 'INIT_ERROR') {
          clearTimeout(timeout);
          reject(new Error(e.data.payload));
        }
      };

      this.worker?.addEventListener('message', handler);
      this.worker?.postMessage({ type: 'INIT', payload: { lang } });
    });
  }

  private async ocrPage(imageData: ImageData, pageNum: number, totalPages: number) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('OCR timeout')), 60000);

      const handler = (e: MessageEvent) => {
        if (e.data.type === 'PAGE_COMPLETE' && e.data.payload.pageNum === pageNum) {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', handler);
          resolve();
        } else if (e.data.type === 'PAGE_ERROR' && e.data.payload.pageNum === pageNum) {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', handler);
          resolve(); // Continue despite error
        }
      };

      this.worker?.addEventListener('message', handler);
      this.worker?.postMessage({ type: 'OCR_PAGE', payload: { imageData, pageNum, totalPages } });
    });
  }

  private async terminateWorker() {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'TERMINATE' });
    this.worker.terminate();
    this.worker = null;
  }

  private async saveProgress(fileName: string, totalPages: number) {
    await saveCheckpoint({
      fileHash: this.fileHash,
      fileName,
      totalPages,
      completedPages: Array.from(this.completedPages),
      pageTexts: this.pageTexts,
      lastUpdated: Date.now(),
      status: 'in_progress',
    });
  }

  private async resumeFromCheckpoint(file: File, checkpoint: any) {
    this.pageTexts = checkpoint.pageTexts;
    this.completedPages = new Set(checkpoint.completedPages);

    // Re-analyze to get remaining pages
    const analysis = await analyzePDF(file);
    const remainingPages = analysis.imagePages.filter(p => !this.completedPages.has(p));

    if (remainingPages.length === 0) {
      // Already completed
      const combinedText = Object.values(this.pageTexts).join('\n\n');
      this.onComplete({
        text: combinedText,
        pageTexts: this.pageTexts,
        confidence: 85,
        processingTime: 0,
      });
      return;
    }

    // Continue OCR on remaining pages
    return this.processOCRPDF(file, {
      ...analysis,
      imagePages: remainingPages,
    });
  }

  private reportProgress(current: number, total: number, status: OCRProgress['status'], message: string) {
    this.onProgress({
      currentPage: current,
      totalPages: total,
      percentage: total > 0 ? Math.round((current / total) * 100) : 0,
      status,
      message,
    });
  }

  async cancel() {
    await this.terminateWorker();
    await saveCheckpoint({
      fileHash: this.fileHash,
      fileName: '',
      totalPages: 0,
      completedPages: Array.from(this.completedPages),
      pageTexts: this.pageTexts,
      lastUpdated: Date.now(),
      status: 'failed',
    });
  }
}
```

#### 3.2 File Hashing Utility
**File:** `lib/file-utils.ts`
```typescript
/**
 * Generate SHA-256 hash of file for checkpointing
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
```

---

### Phase 4: UI/UX Implementation (Days 10-12)

#### 4.1 Updated Client Component
**File:** `app/(tools)/pdf-to-text/client.tsx` (Updated)
```typescript
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { OCRProcessor, OCRProgress, OCRResult } from "@/lib/ocr-processor";
import { formatFileSize } from "@/lib/file-utils";
import { Check, Clipboard, Download, Loader2, Upload, AlertTriangle, X } from "lucide-react";

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export default function PdfToTextV2Client() {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [copied, setCopied] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [ocrQuality, setOcrQuality] = useState<'fast' | 'balanced' | 'accurate'>('balanced');
  const [result, setResult] = useState<OCRResult | null>(null);
  const processorRef = useRef<OCRProcessor | null>(null);

  const handleFile = async (file: File) => {
    setError("");
    setWarning("");
    setOutput("");
    setResult(null);
    setProgress(null);
    setFileName(file.name);
    setFileSize(file.size);

    // Validation
    if (file.size > MAX_SIZE_BYTES) {
      setError(`File too large. Maximum size: 100MB. Current: ${formatFileSize(file.size)}`);
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Unsupported file type. Please upload a PDF.");
      return;
    }

    // Show processing mode warning
    if (file.size > 20 * 1024 * 1024) {
      setWarning("Large file detected. Processing may take several minutes. OCR will run page-by-page to prevent memory issues.");
    }

    setIsProcessing(true);

    // Initialize OCR processor
    processorRef.current = new OCRProcessor(
      (progress) => {
        setProgress(progress);
      },
      (result) => {
        setResult(result);
        setOutput(normalize ? normalizeText(result.text) : result.text);
        setIsProcessing(false);
        setProgress(null);
      },
      (error) => {
        setError(error.message || "An error occurred during processing.");
        setIsProcessing(false);
        setProgress(null);
      }
    );

    try {
      await processorRef.current.processFile(file, false);
    } catch (err: any) {
      setError(err?.message || "Failed to process PDF.");
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (processorRef.current) {
      await processorRef.current.cancel();
      setIsProcessing(false);
      setProgress(null);
      setError("Processing cancelled by user.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = (format: 'txt' | 'md' | 'json') => {
    if (!output) return;

    let content: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'txt':
        content = output;
        mimeType = 'text/plain';
        extension = 'txt';
        break;
      case 'md':
        content = `# ${fileName}\n\n${output}`;
        mimeType = 'text/markdown';
        extension = 'md';
        break;
      case 'json':
        content = JSON.stringify({
          fileName,
          totalPages: result?.pageTexts ? Object.keys(result.pageTexts).length : 0,
          confidence: result?.confidence || 0,
          processingTime: result?.processingTime || 0,
          text: output,
          pageTexts: result?.pageTexts || {},
        }, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.pdf$/i, '')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const normalizeText = (text: string) => {
    return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {progress?.message || (isProcessing ? "Processing..." : "Ready")}
      </div>

      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">PDF → Text with OCR</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Extract text from any PDF - including scanned documents. All processing happens in your browser with zero uploads.
        </p>
      </header>

      {/* Upload Section */}
      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <label
          htmlFor="pdf-input"
          className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm transition hover:border-slate-400"
        >
          <Upload className="h-5 w-5 text-slate-500" />
          <div>
            <p className="font-semibold text-slate-900">Drop a PDF or click to upload</p>
            <p className="text-slate-600">Supports text-based and scanned PDFs up to 100MB</p>
          </div>
          <input
            id="pdf-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            disabled={isProcessing}
          />
        </label>

        {fileName && (
          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <div>
              <p className="font-medium text-slate-900">{fileName}</p>
              <p className="text-xs text-slate-500">{formatFileSize(fileSize)}</p>
            </div>
            {isProcessing ? (
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-xs font-semibold text-red-600 underline"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : (
              <button
                onClick={() => {
                  setFileName("");
                  setOutput("");
                  setError("");
                  setWarning("");
                  setProgress(null);
                }}
                className="text-xs font-semibold text-slate-500 underline"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Progress Bar */}
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">{progress.message}</span>
              <span className="text-slate-600">{progress.percentage}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            {progress.currentPage > 0 && (
              <p className="text-xs text-slate-600">
                Page {progress.currentPage} of {progress.totalPages}
              </p>
            )}
          </div>
        )}

        {warning && (
          <div className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-amber-700">{warning}</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-600">
          <strong>Privacy:</strong> All processing happens in your browser. No files are uploaded to any server.
        </p>
      </div>

      {/* Output Section */}
      <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Extracted Text</p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={normalize}
                onChange={(e) => {
                  setNormalize(e.target.checked);
                  if (result) {
                    setOutput(e.target.checked ? normalizeText(result.text) : result.text);
                  }
                }}
                className="h-3.5 w-3.5 rounded"
              />
              Normalize
            </label>
            <button
              onClick={() => handleDownload('txt')}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              <Download className="h-4 w-4" /> TXT
            </button>
            <button
              onClick={() => handleDownload('md')}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              <Download className="h-4 w-4" /> MD
            </button>
            <button
              onClick={() => handleDownload('json')}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              <Download className="h-4 w-4" /> JSON
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 text-sm leading-relaxed">
          <pre className="whitespace-pre-wrap break-words text-slate-100">
            {output || "Extracted text will appear here..."}
          </pre>
        </div>
        {result && (
          <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
            Processed in {result.processingTime.toFixed(1)}s
            {result.confidence < 100 && ` • OCR Confidence: ~${result.confidence}%`}
          </div>
        )}
      </div>

      {/* Info Section */}
      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Features & How It Works</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li><strong>Text-based PDFs:</strong> Fast extraction using PDF.js (no OCR needed)</li>
          <li><strong>Scanned PDFs:</strong> Browser-based OCR using Tesseract.js WASM</li>
          <li><strong>Mixed PDFs:</strong> Intelligent hybrid processing (text + OCR)</li>
          <li><strong>Large files:</strong> Page-by-page chunking to prevent memory issues</li>
          <li><strong>Progress tracking:</strong> Real-time updates with percentage and page numbers</li>
          <li><strong>Export options:</strong> Download as .txt, .md, or .json</li>
        </ul>
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold">FAQ</p>
          <p><strong>How accurate is OCR?</strong> Tesseract.js achieves 85-95% accuracy on clear scans. Quality depends on image resolution and text clarity.</p>
          <p><strong>What languages are supported?</strong> Currently English (eng). v2.1 will add multi-language support.</p>
          <p><strong>Why is it slow?</strong> OCR processing in-browser is computationally intensive. Expect 3-5 seconds per page.</p>
          <p><strong>Is my data safe?</strong> Yes. Everything happens locally in your browser. Zero uploads to any server.</p>
        </div>
      </section>
    </main>
  );
}
```

---

### Phase 5: Error Handling & Edge Cases (Days 13-14)

#### 5.1 Comprehensive Error Handler
**File:** `lib/error-handler.ts`
```typescript
export enum PDFErrorType {
  INVALID_FILE = 'INVALID_FILE',
  CORRUPTED_PDF = 'CORRUPTED_PDF',
  UNSUPPORTED_COMPRESSION = 'UNSUPPORTED_COMPRESSION',
  MEMORY_EXHAUSTED = 'MEMORY_EXHAUSTED',
  WORKER_CRASH = 'WORKER_CRASH',
  OCR_INIT_FAILED = 'OCR_INIT_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  USER_CANCELLED = 'USER_CANCELLED',
}

export interface PDFError {
  type: PDFErrorType;
  message: string;
  userMessage: string;
  suggestedFix: string;
  retryable: boolean;
}

export function handlePDFError(error: any): PDFError {
  // Corrupted PDF
  if (error.message?.includes('Invalid PDF structure')) {
    return {
      type: PDFErrorType.CORRUPTED_PDF,
      message: error.message,
      userMessage: 'This PDF appears to be corrupted or damaged.',
      suggestedFix: 'Try opening the PDF in another app first, or re-download the file.',
      retryable: false,
    };
  }

  // Memory exhaustion
  if (error.message?.includes('out of memory') || error.name === 'QuotaExceededError') {
    return {
      type: PDFErrorType.MEMORY_EXHAUSTED,
      message: error.message,
      userMessage: 'Browser ran out of memory processing this PDF.',
      suggestedFix: 'Try closing other tabs, or use a smaller PDF. Large files (50MB+) may cause memory issues.',
      retryable: true,
    };
  }

  // Worker crash
  if (error.message?.includes('Worker') || error.message?.includes('terminated')) {
    return {
      type: PDFErrorType.WORKER_CRASH,
      message: error.message,
      userMessage: 'OCR engine crashed unexpectedly.',
      suggestedFix: 'Try reloading the page and processing again with chunking enabled.',
      retryable: true,
    };
  }

  // OCR initialization failure
  if (error.message?.includes('Tesseract') || error.message?.includes('init')) {
    return {
      type: PDFErrorType.OCR_INIT_FAILED,
      message: error.message,
      userMessage: 'Failed to initialize OCR engine.',
      suggestedFix: 'Check your internet connection (WASM files need to download). Try reloading the page.',
      retryable: true,
    };
  }

  // Timeout
  if (error.message?.includes('timeout')) {
    return {
      type: PDFErrorType.TIMEOUT,
      message: error.message,
      userMessage: 'Processing took too long and timed out.',
      suggestedFix: 'This PDF may be too large or complex. Try a smaller file or contact support.',
      retryable: true,
    };
  }

  // Generic error
  return {
    type: PDFErrorType.INVALID_FILE,
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred.',
    suggestedFix: 'Please try again or contact support if the issue persists.',
    retryable: true,
  };
}
```

---

### Phase 6: Testing & Optimization (Days 15-17)

#### 6.1 Test Cases

**Test Data Files:**
```
test-data/
├── text-based/
│   ├── simple-1page.pdf (text only, 1 page, 50KB)
│   ├── medium-10pages.pdf (text only, 10 pages, 500KB)
│   └── large-50pages.pdf (text only, 50 pages, 2MB)
├── image-based/
│   ├── scanned-1page.pdf (image only, 1 page, 200KB)
│   ├── scanned-5pages.pdf (image only, 5 pages, 1MB)
│   └── scanned-20pages.pdf (image only, 20 pages, 10MB)
├── mixed/
│   ├── mixed-10pages.pdf (5 text + 5 images, 2MB)
│   └── mixed-30pages.pdf (15 text + 15 images, 8MB)
└── edge-cases/
    ├── corrupted.pdf (invalid structure)
    ├── encrypted.pdf (password protected)
    ├── large-100mb.pdf (100MB file)
    └── zero-bytes.pdf (0 bytes)
```

**Playwright Tests:**
```typescript
// tests/pdf-to-text-v2.spec.ts
import { test, expect } from '@playwright/test';

test.describe('PDF to Text V2 with OCR', () => {
  test('should extract text from text-based PDF', async ({ page }) => {
    await page.goto('/pdf-to-text');
    await page.setInputFiles('input[type="file"]', 'test-data/text-based/simple-1page.pdf');
    await expect(page.locator('text=/Extracted text/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('pre')).toContainText('Expected content');
  });

  test('should OCR scanned PDF with progress indicator', async ({ page }) => {
    await page.goto('/pdf-to-text');
    await page.setInputFiles('input[type="file"]', 'test-data/image-based/scanned-1page.pdf');

    // Check progress bar appears
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    await expect(page.locator('text=/OCR processing/i')).toBeVisible();

    // Wait for completion
    await expect(page.locator('text=/OCR complete/i')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('pre')).not.toBeEmpty();
  });

  test('should handle mixed PDF correctly', async ({ page }) => {
    await page.goto('/pdf-to-text');
    await page.setInputFiles('input[type="file"]', 'test-data/mixed/mixed-10pages.pdf');

    // Should show hybrid processing
    await expect(page.locator('text=/Extracting text pages/i')).toBeVisible();
    await expect(page.locator('text=/OCR processing/i')).toBeVisible();

    await expect(page.locator('text=/complete/i')).toBeVisible({ timeout: 60000 });
  });

  test('should reject oversized files', async ({ page }) => {
    await page.goto('/pdf-to-text');
    await page.setInputFiles('input[type="file"]', 'test-data/edge-cases/large-101mb.pdf');
    await expect(page.locator('text=/File too large/i')).toBeVisible();
  });

  test('should handle corrupted PDF gracefully', async ({ page }) => {
    await page.goto('/pdf-to-text');
    await page.setInputFiles('input[type="file"]', 'test-data/edge-cases/corrupted.pdf');
    await expect(page.locator('text=/corrupted or damaged/i')).toBeVisible();
  });

  test('should allow cancellation during OCR', async ({ page }) => {
    await page.goto('/pdf-to-text');
    await page.setInputFiles('input[type="file"]', 'test-data/image-based/scanned-20pages.pdf');

    // Wait for OCR to start
    await expect(page.locator('text=/OCR processing/i')).toBeVisible();

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Verify cancelled
    await expect(page.locator('text=/cancelled/i')).toBeVisible();
  });

  test('should export to multiple formats', async ({ page }) => {
    await page.goto('/pdf-to-text');
    await page.setInputFiles('input[type="file"]', 'test-data/text-based/simple-1page.pdf');
    await expect(page.locator('pre')).not.toBeEmpty({ timeout: 10000 });

    // Test TXT download
    const downloadTxt = page.waitForEvent('download');
    await page.click('button:has-text("TXT")');
    const downloadedTxt = await downloadTxt;
    expect(downloadedTxt.suggestedFilename()).toMatch(/\.txt$/);

    // Test JSON download
    const downloadJson = page.waitForEvent('download');
    await page.click('button:has-text("JSON")');
    const downloadedJson = await downloadJson;
    expect(downloadedJson.suggestedFilename()).toMatch(/\.json$/);
  });
});
```

---

### Phase 7: Performance Optimization

#### 7.1 Optimization Checklist

**Memory Optimization:**
- ✅ Process pages sequentially (not in parallel) to limit memory
- ✅ Release canvas/ImageData after each page
- ✅ Use IndexedDB for checkpoint storage (not in-memory)
- ✅ Implement Web Worker to prevent main thread blocking
- ✅ Set max canvas size (2048x2048) to prevent large image memory spikes

**Speed Optimization:**
- ✅ Fast-path for text-based PDFs (no OCR overhead)
- ✅ Lazy-load Tesseract.js WASM only when needed
- ✅ Pre-render first 3 pages for quick preview
- ✅ Use lower OCR quality for preview, high quality for final
- ✅ Cache Tesseract.js worker initialization

**Code Example - Canvas Size Limit:**
```typescript
export async function renderPageToCanvas(
  file: File,
  pageNum: number,
  maxDimension: number = 2048 // Limit canvas size
): Promise<ImageData> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(pageNum);

  // Calculate scale to fit within max dimension
  const viewport = page.getViewport({ scale: 1.0 });
  const scale = Math.min(
    maxDimension / viewport.width,
    maxDimension / viewport.height,
    2.0 // Cap at 2x for OCR quality
  );

  const scaledViewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  await page.render({ canvasContext: context, viewport: scaledViewport }).promise;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  // Clean up
  canvas.width = 0;
  canvas.height = 0;

  return imageData;
}
```

---

## Mobile & Cross-Browser Compatibility

### Browser Support Matrix

| Browser | Version | Text Extraction | OCR Support | Web Workers | IndexedDB | Notes |
|---------|---------|----------------|-------------|-------------|-----------|-------|
| Chrome Desktop | 90+ | ✅ | ✅ | ✅ | ✅ | Full support |
| Firefox Desktop | 88+ | ✅ | ✅ | ✅ | ✅ | Full support |
| Safari Desktop | 14+ | ✅ | ✅ | ✅ | ✅ | Full support |
| Edge Desktop | 90+ | ✅ | ✅ | ✅ | ✅ | Full support |
| Chrome Mobile | 90+ | ✅ | ✅ | ✅ | ✅ | May be slower |
| Safari iOS | 14+ | ✅ | ⚠️ | ✅ | ✅ | WASM slower on iOS |
| Firefox Android | 88+ | ✅ | ✅ | ✅ | ✅ | Good performance |
| Samsung Internet | 14+ | ✅ | ⚠️ | ✅ | ✅ | Test thoroughly |

**iOS-Specific Considerations:**
- WebAssembly JIT disabled on iOS → OCR is 2-3x slower
- Memory limits more strict → reduce max file size to 50MB on iOS
- Use lower canvas resolution (1.5x instead of 2.0x) for OCR

**Detection Code:**
```typescript
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function getOptimalSettings() {
  if (isIOS()) {
    return {
      maxFileSize: 50 * 1024 * 1024,
      ocrScale: 1.5,
      chunkSize: 3, // Pages per batch
    };
  }
  return {
    maxFileSize: 100 * 1024 * 1024,
    ocrScale: 2.0,
    chunkSize: 5,
  };
}
```

---

## Deployment Checklist

### Before Release
- [ ] Test all 3 PDF types (text, image, mixed) on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile: iOS Safari, Chrome Android
- [ ] Verify memory usage stays under 500MB for 50-page PDF
- [ ] Confirm OCR accuracy > 85% on clean scans
- [ ] Test cancellation and resume functionality
- [ ] Verify IndexedDB checkpointing works across page reloads
- [ ] Load test with 100MB PDF
- [ ] Test error handling for all edge cases
- [ ] Verify Web Worker doesn't crash on long operations
- [ ] Confirm no memory leaks after multiple operations
- [ ] Test export to all formats (TXT, MD, JSON)
- [ ] Lighthouse score > 95 (Performance)
- [ ] Accessibility audit passes

### Configuration
```env
# .env.local (for development)
NEXT_PUBLIC_TESSERACT_LANG=eng
NEXT_PUBLIC_MAX_FILE_SIZE_MB=100
NEXT_PUBLIC_OCR_SCALE=2.0
```

---

## Alternative Approaches

### If Tesseract.js is too slow:
1. **Use lighter OCR engine:**
   - Try `OCRAD.js` (smaller, faster, less accurate)
   - Trade-off: 70-80% accuracy vs Tesseract's 85-95%

2. **Server-side OCR (optional paid tier):**
   - Google Cloud Vision API
   - AWS Textract
   - Azure Computer Vision
   - Requires backend, but 10x faster

3. **Hybrid approach:**
   - Free tier: Browser-based OCR (current plan)
   - Paid tier: Cloud OCR API for speed

---

## Documentation Updates

Update `pdf-to-text.md` with:
1. New OCR capabilities in features section
2. Updated limitations (remove "no OCR" limitation)
3. Performance metrics for OCR (3-5s per page)
4. Browser compatibility notes for mobile
5. FAQ section on OCR accuracy and speed

---

## Success Metrics

### Technical Metrics
- ✅ OCR accuracy: >85% on clean scans
- ✅ Processing speed: <5s per page
- ✅ Memory usage: <500MB for 50-page PDF
- ✅ Mobile compatibility: Works on iOS 14+ and Android Chrome 90+
- ✅ Error rate: <5% for valid PDFs

### User Experience Metrics
- ✅ Time to first text: <2s for text-based PDFs
- ✅ Progress updates: Every second during OCR
- ✅ Clear error messages: 100% of errors have actionable fixes
- ✅ Export options: TXT, MD, JSON all functional

---

## Estimated Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| 1. Infrastructure | 3 days | Dependencies, Web Workers, IndexedDB |
| 2. PDF Categorization | 2 days | Analysis logic, text/image detection |
| 3. OCR Engine | 4 days | Tesseract integration, chunking, checkpointing |
| 4. UI/UX | 3 days | Progress bars, error handling, exports |
| 5. Error Handling | 2 days | Edge cases, retry logic |
| 6. Testing | 3 days | Cross-browser, mobile, load tests |
| 7. Optimization | 2 days | Performance tuning, memory optimization |
| **Total** | **19 days** | **~3 weeks** |

---

## Next Steps

1. **Approve architecture** - Review this plan, suggest changes
2. **Create feature branch** - `feature/pdf-ocr-v2`
3. **Install dependencies** - Tesseract.js, idb
4. **Build Phase 1** - Web Workers and IndexedDB setup
5. **Iterative development** - Phase-by-phase implementation
6. **Testing** - Comprehensive cross-browser testing
7. **Deployment** - Merge to main, deploy to production

---

**Status:** ✅ Ready for Implementation
**Author:** ToolStack Development Team
**Last Updated:** 2025-12-09
