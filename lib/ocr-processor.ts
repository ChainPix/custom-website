/**
 * OCR Processor - Main Controller
 * Orchestrates PDF processing using PDF.js and Tesseract.js
 */

import {
  analyzePDF,
  extractTextPages,
  extractTextFromPages,
  renderPageToCanvas,
  type PDFAnalysisResult,
  type PDFCategory,
} from './pdf-intelligence';
import {
  initCheckpointDB,
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint,
  updateCheckpointStatus,
  type OCRCheckpoint,
} from './ocr-checkpoint';
import { hashFile, calculateProgress, estimateRemainingTime } from './file-utils';

export interface ProcessingOptions {
  language?: string; // OCR language (default: 'eng')
  enableCheckpointing?: boolean; // Save progress to IndexedDB
  checkpointInterval?: number; // Save every N pages (default: 5)
  onProgress?: (progress: ProcessingProgress) => void;
  onPageComplete?: (pageNum: number, text: string) => void;
  onError?: (error: ProcessingError) => void;
  abortSignal?: AbortSignal; // Cancel processing
}

export interface ProcessingProgress {
  phase: 'analyzing' | 'extracting' | 'ocr' | 'complete';
  currentPage: number;
  totalPages: number;
  percentage: number;
  estimatedTimeRemaining: number; // seconds
  category: PDFCategory;
  message: string;
}

export interface ProcessingError {
  type:
    | 'validation'
    | 'analysis'
    | 'extraction'
    | 'ocr'
    | 'checkpoint'
    | 'memory'
    | 'timeout'
    | 'cancelled';
  message: string;
  pageNum?: number;
  recoverable: boolean;
}

export interface ProcessingResult {
  success: boolean;
  text: string;
  category: PDFCategory;
  totalPages: number;
  processedPages: number;
  pageTexts: Record<number, string>;
  confidence?: number; // OCR confidence (0-100)
  processingTime: number; // seconds
  checkpointRestored: boolean;
}

let ocrWorker: Worker | null = null;
let workerInitialized = false;
let processingStartTime = 0;
const OCR_TIMEOUT_MS = 120000;

/**
 * Main entry point - Process PDF with automatic strategy selection
 */
export async function processPDF(
  file: File,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  processingStartTime = Date.now();

  try {
    // Step 1: Analyze PDF to determine processing strategy
    reportProgress(options, {
      phase: 'analyzing',
      currentPage: 0,
      totalPages: 0,
      percentage: 0,
      estimatedTimeRemaining: 0,
      category: 'text-based',
      message: 'Analyzing PDF structure...',
    });

    const analysis = await analyzePDF(file);

    // Step 2: Check for existing checkpoint
    let checkpoint: OCRCheckpoint | undefined;
    if (options.enableCheckpointing !== false) {
      const fileHash = await hashFile(file);
      checkpoint = await loadCheckpoint(fileHash);

      if (checkpoint && checkpoint.status === 'in_progress') {
        // Resume from checkpoint
        return await resumeFromCheckpoint(file, checkpoint, analysis, options);
      }
    }

    // Step 3: Route to appropriate processing function
    reportProgress(options, {
      phase: 'extracting',
      currentPage: 0,
      totalPages: analysis.totalPages,
      percentage: 5,
      estimatedTimeRemaining: 0,
      category: analysis.category,
      message: `Processing ${analysis.category} PDF...`,
    });

    let result: ProcessingResult;

    switch (analysis.category) {
      case 'text-based':
        result = await processTextBasedPDF(file, analysis, options);
        break;
      case 'image-based':
        result = await processOCRPDF(file, analysis, options);
        break;
      case 'mixed':
        result = await processMixedPDF(file, analysis, options);
        break;
    }

    // Step 4: Clean up checkpoint on success
    if (options.enableCheckpointing !== false && checkpoint) {
      await deleteCheckpoint(checkpoint.fileHash);
    }

    return result;
  } catch (err: any) {
    handleError(options, {
      type: 'analysis',
      message: err.message || 'Failed to process PDF',
      recoverable: false,
    });
    throw err;
  } finally {
    // Clean up worker
    terminateWorker();
  }
}

/**
 * Process text-based PDF (fast path using PDF.js only)
 * OPTIMIZED: No checkpointing needed for fast text extraction
 */
async function processTextBasedPDF(
  file: File,
  analysis: PDFAnalysisResult,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  const pageTexts: Record<number, string> = {};

  try {
    console.log(`\n=== Processing Text-Based PDF ===`);
    console.log(`Total pages: ${analysis.totalPages}`);
    console.log(`Using fast PDF.js extraction (no OCR needed)`);

    const extractedPages = await extractTextPages(file, (pageNum, totalPages, text) => {
      // Store page text
      pageTexts[pageNum] = text;

      // Report progress
      const percentage = 10 + Math.round((pageNum / totalPages) * 85);
      reportProgress(options, {
        phase: 'extracting',
        currentPage: pageNum,
        totalPages,
        percentage,
        estimatedTimeRemaining: 0, // Text extraction is too fast for meaningful ETA
        category: 'text-based',
        message: `Extracting page ${pageNum} of ${totalPages}...`,
      });

      // Report page completion
      if (options.onPageComplete) {
        options.onPageComplete(pageNum, text);
      }

      // Check abort signal
      if (options.abortSignal?.aborted) {
        throw new Error('Processing cancelled by user');
      }
    });

    // Combine all text
    const combinedText = extractedPages
      .map((page) => `--- Page ${page.pageNum} ---\n${page.text}`)
      .join('\n\n');

    // Final progress
    reportProgress(options, {
      phase: 'complete',
      currentPage: analysis.totalPages,
      totalPages: analysis.totalPages,
      percentage: 100,
      estimatedTimeRemaining: 0,
      category: 'text-based',
      message: 'Text extraction complete!',
    });

    const processingTime = (Date.now() - processingStartTime) / 1000;

    return {
      success: true,
      text: combinedText,
      category: 'text-based',
      totalPages: analysis.totalPages,
      processedPages: extractedPages.length,
      pageTexts,
      processingTime,
      checkpointRestored: false,
    };
  } catch (err: any) {
    if (err.message === 'Processing cancelled by user') {
      handleError(options, {
        type: 'cancelled',
        message: 'Processing cancelled',
        recoverable: false,
      });
    } else {
      handleError(options, {
        type: 'extraction',
        message: err.message || 'Text extraction failed',
        recoverable: false,
      });
    }
    throw err;
  }
}

/**
 * Process image-based PDF (full OCR pipeline)
 * OPTIMIZED: Checkpoints every 10 pages instead of 5
 */
async function processOCRPDF(
  file: File,
  analysis: PDFAnalysisResult,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  const pageTexts: Record<number, string> = {};
  const fileHash = await hashFile(file);
  let totalConfidence = 0;
  let confidenceCount = 0;

  try {
    console.log(`\n=== Processing Image-Based PDF ===`);
    console.log(`Total pages: ${analysis.totalPages}`);
    console.log(`All pages require OCR processing`);

    // Initialize OCR worker
    await initializeOCRWorker(options.language || 'eng');

    // Process each page with OCR
    for (let pageNum = 1; pageNum <= analysis.totalPages; pageNum++) {
      // Check abort signal
      if (options.abortSignal?.aborted) {
        throw new Error('Processing cancelled by user');
      }

      // Render page to canvas
      const imageData = await renderPageToCanvas(file, pageNum);

      // Send to OCR worker
      const result = await processPageWithOCRWithRetry(
        imageData,
        pageNum,
        analysis.totalPages,
        options.language || 'eng'
      );

      pageTexts[pageNum] = result.text;
      totalConfidence += result.confidence;
      confidenceCount++;

      // Report page completion
      if (options.onPageComplete) {
        options.onPageComplete(pageNum, result.text);
      }

      // Report progress
      const percentage = 10 + Math.round((pageNum / analysis.totalPages) * 85);
      const elapsed = (Date.now() - processingStartTime) / 1000;
      const remaining = estimateRemainingTime(pageNum, analysis.totalPages, elapsed);

      reportProgress(options, {
        phase: 'ocr',
        currentPage: pageNum,
        totalPages: analysis.totalPages,
        percentage,
        estimatedTimeRemaining: remaining,
        category: 'image-based',
        message: `OCR processing page ${pageNum} of ${analysis.totalPages}...`,
      });

      // Checkpoint every 10 pages (reduced overhead)
      if (
        options.enableCheckpointing !== false &&
        pageNum % 10 === 0
      ) {
        console.log(`  Checkpointing at page ${pageNum}...`);
        await saveCheckpoint({
          fileHash,
          fileName: file.name,
          fileSize: file.size,
          totalPages: analysis.totalPages,
          completedPages: Object.keys(pageTexts).map(Number),
          pageTexts,
          category: 'image-based',
          lastUpdated: Date.now(),
          status: 'in_progress',
        });
      }
    }

    // Combine all text
    const combinedText = Object.entries(pageTexts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([pageNum, text]) => `--- Page ${pageNum} ---\n${text}`)
      .join('\n\n');

    // Final progress
    reportProgress(options, {
      phase: 'complete',
      currentPage: analysis.totalPages,
      totalPages: analysis.totalPages,
      percentage: 100,
      estimatedTimeRemaining: 0,
      category: 'image-based',
      message: 'OCR processing complete!',
    });

    const processingTime = (Date.now() - processingStartTime) / 1000;
    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    // Mark checkpoint as complete
    if (options.enableCheckpointing !== false) {
      await updateCheckpointStatus(fileHash, 'completed');
    }

    return {
      success: true,
      text: combinedText,
      category: 'image-based',
      totalPages: analysis.totalPages,
      processedPages: Object.keys(pageTexts).length,
      pageTexts,
      confidence: Math.round(avgConfidence),
      processingTime,
      checkpointRestored: false,
    };
  } catch (err: any) {
    if (err.message === 'Processing cancelled by user') {
      // Save checkpoint for resume
      if (options.enableCheckpointing !== false) {
        await saveCheckpoint({
          fileHash,
          fileName: file.name,
          fileSize: file.size,
          totalPages: analysis.totalPages,
          completedPages: Object.keys(pageTexts).map(Number),
          pageTexts,
          category: 'image-based',
          lastUpdated: Date.now(),
          status: 'cancelled',
        });
      }

      handleError(options, {
        type: 'cancelled',
        message: 'Processing cancelled',
        recoverable: true,
      });
    } else {
      handleError(options, {
        type: 'ocr',
        message: err.message || 'OCR processing failed',
        recoverable: false,
      });
    }
    throw err;
  }
}

/**
 * Process mixed PDF (hybrid: PDF.js + OCR)
 * OPTIMIZED: Processes pages in sequential order to maintain page order
 * Uses pageAnalysis from initial scan to avoid duplicate work
 */
async function processMixedPDF(
  file: File,
  analysis: PDFAnalysisResult,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  const pageTexts: Record<number, string> = {};
  const fileHash = await hashFile(file);
  let totalConfidence = 0;
  let confidenceCount = 0;
  let ocrPagesProcessed = 0;

  try {
    console.log(`\n=== Processing Mixed PDF ===`);
    console.log(`Total pages: ${analysis.totalPages}`);
    console.log(`Using pre-analyzed page data to avoid duplicate work`);

    // Initialize OCR worker upfront if any pages need OCR
    const pagesNeedingOCR = analysis.pageAnalysis.filter(p => p.needsOCR);
    if (pagesNeedingOCR.length > 0) {
      console.log(`Initializing OCR for ${pagesNeedingOCR.length} pages...`);
      await initializeOCRWorker(options.language || 'eng');
    }

    // Process pages in sequential order (1, 2, 3, ...)
    for (let pageNum = 1; pageNum <= analysis.totalPages; pageNum++) {
      // Check abort signal
      if (options.abortSignal?.aborted) {
        throw new Error('Processing cancelled by user');
      }

      // Get page analysis result (already computed in analyzePDF)
      const pageInfo = analysis.pageAnalysis[pageNum - 1];

      if (!pageInfo) {
        console.warn(`Page ${pageNum}: No analysis data, skipping`);
        pageTexts[pageNum] = '[Page analysis missing]';
        continue;
      }

      // Determine processing method based on page analysis
      if (!pageInfo.hasText && !pageInfo.hasImages) {
        // Empty page
        pageTexts[pageNum] = '[Empty page]';
        console.log(`Page ${pageNum}: Empty`);
      } else if (pageInfo.hasText && !pageInfo.needsOCR) {
        // Text-based page - fast extraction
        console.log(`Page ${pageNum}: Extracting text (${pageInfo.textLength} chars)`);
        const extracted = await extractTextFromPages(file, [pageNum]);
        pageTexts[pageNum] = extracted[0]?.text || '[Extraction failed]';
      } else if (pageInfo.needsOCR) {
        // Needs OCR - check if it also has text
        console.log(`Page ${pageNum}: OCR processing...`);

        // Extract any existing text first
        let existingText = '';
        if (pageInfo.hasText) {
          const extracted = await extractTextFromPages(file, [pageNum]);
          existingText = extracted[0]?.text || '';
          console.log(`  Found embedded text: ${existingText.length} chars`);
        }

        // Render and OCR the page
        const imageData = await renderPageToCanvas(file, pageNum);
        const ocrResult = await processPageWithOCRWithRetry(
          imageData,
          pageNum,
          analysis.totalPages,
          options.language || 'eng'
        );

        console.log(`  OCR result: ${ocrResult.text.length} chars, confidence: ${ocrResult.confidence}%`);

        // Merge text from both sources intelligently
        pageTexts[pageNum] = mergeHybridText(
          existingText,
          ocrResult.text,
          ocrResult.confidence
        );

        totalConfidence += ocrResult.confidence;
        confidenceCount++;
        ocrPagesProcessed++;

        // Checkpoint every 10 OCR pages (increased from 5 to reduce overhead)
        if (
          options.enableCheckpointing !== false &&
          ocrPagesProcessed % 10 === 0
        ) {
          console.log(`  Checkpointing at page ${pageNum}...`);
          await saveCheckpoint({
            fileHash,
            fileName: file.name,
            fileSize: file.size,
            totalPages: analysis.totalPages,
            completedPages: Object.keys(pageTexts).map(Number),
            pageTexts,
            category: 'mixed',
            lastUpdated: Date.now(),
            status: 'in_progress',
          });
        }
      }

      // Report progress after each page
      const percentage = Math.round((pageNum / analysis.totalPages) * 95) + 5;
      const elapsed = (Date.now() - processingStartTime) / 1000;
      const remaining = estimateRemainingTime(pageNum, analysis.totalPages, elapsed);

      reportProgress(options, {
        phase: pageInfo.needsOCR ? 'ocr' : 'extracting',
        currentPage: pageNum,
        totalPages: analysis.totalPages,
        percentage,
        estimatedTimeRemaining: remaining,
        category: 'mixed',
        message: `Processing page ${pageNum} of ${analysis.totalPages}...`,
      });

      // Notify page completion
      if (options.onPageComplete && pageTexts[pageNum]) {
        options.onPageComplete(pageNum, pageTexts[pageNum]);
      }
    }

    // Combine all text in page order (guaranteed correct order)
    console.log(`\n=== Combining Text in Page Order ===`);
    const combinedText = Array.from({ length: analysis.totalPages }, (_, i) => i + 1)
      .map((pageNum) => {
        const text = pageTexts[pageNum] || '[Page not processed]';
        const preview = text.substring(0, 50).replace(/\n/g, ' ');
        console.log(`Page ${pageNum}: ${text.length} chars - "${preview}..."`);
        return `--- Page ${pageNum} ---\n${text}`;
      })
      .join('\n\n');

    console.log(`\n=== Final Results ===`);
    console.log(`Total pages: ${analysis.totalPages}`);
    console.log(`Processed pages: ${Object.keys(pageTexts).length}`);
    console.log(`OCR pages: ${ocrPagesProcessed}`);
    console.log(`Total text length: ${combinedText.length} characters`);
    console.log(`Average OCR confidence: ${confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 'N/A'}%`);
    console.log(`====================\n`);

    // Final progress
    reportProgress(options, {
      phase: 'complete',
      currentPage: analysis.totalPages,
      totalPages: analysis.totalPages,
      percentage: 100,
      estimatedTimeRemaining: 0,
      category: 'mixed',
      message: 'Hybrid processing complete!',
    });

    const processingTime = (Date.now() - processingStartTime) / 1000;

    // Clean up checkpoint on success
    if (options.enableCheckpointing !== false) {
      await deleteCheckpoint(fileHash);
    }

    return {
      success: true,
      text: combinedText,
      category: 'mixed',
      totalPages: analysis.totalPages,
      processedPages: Object.keys(pageTexts).length,
      pageTexts,
      confidence: confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : undefined,
      processingTime,
      checkpointRestored: false,
    };
  } catch (err: any) {
    if (err.message === 'Processing cancelled by user') {
      // Save checkpoint for resume
      if (options.enableCheckpointing !== false) {
        await saveCheckpoint({
          fileHash,
          fileName: file.name,
          fileSize: file.size,
          totalPages: analysis.totalPages,
          completedPages: Object.keys(pageTexts).map(Number),
          pageTexts,
          category: 'mixed',
          lastUpdated: Date.now(),
          status: 'cancelled',
        });
      }

      handleError(options, {
        type: 'cancelled',
        message: 'Processing cancelled',
        recoverable: true,
      });
    } else {
      handleError(options, {
        type: 'ocr',
        message: err.message || 'Mixed processing failed',
        recoverable: false,
      });
    }
    throw err;
  }
}

/**
 * Resume processing from checkpoint
 */
async function resumeFromCheckpoint(
  file: File,
  checkpoint: OCRCheckpoint,
  analysis: PDFAnalysisResult,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  console.log(`Resuming from checkpoint: ${checkpoint.completedPages.length} pages already processed`);

  const pageTexts = { ...checkpoint.pageTexts };
  const completedPages = new Set(checkpoint.completedPages);
  const fileHash = checkpoint.fileHash;

  // Determine remaining pages
  const allPages = Array.from({ length: analysis.totalPages }, (_, i) => i + 1);
  const remainingPages = allPages.filter((p) => !completedPages.has(p));

  if (remainingPages.length === 0) {
    // All pages already processed
    const combinedText = Object.entries(pageTexts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([pageNum, text]) => `--- Page ${pageNum} ---\n${text}`)
      .join('\n\n');

    return {
      success: true,
      text: combinedText,
      category: checkpoint.category,
      totalPages: analysis.totalPages,
      processedPages: Object.keys(pageTexts).length,
      pageTexts,
      processingTime: 0,
      checkpointRestored: true,
    };
  }

  if (checkpoint.category === 'image-based') {
    await initializeOCRWorker(options.language || 'eng');

    for (let i = 0; i < remainingPages.length; i++) {
      const pageNum = remainingPages[i];

      if (options.abortSignal?.aborted) {
        throw new Error('Processing cancelled by user');
      }

      const imageData = await renderPageToCanvas(file, pageNum);
      const result = await processPageWithOCRWithRetry(
        imageData,
        pageNum,
        analysis.totalPages,
        options.language || 'eng'
      );

      pageTexts[pageNum] = result.text;

      if (options.onPageComplete) {
        options.onPageComplete(pageNum, result.text);
      }

      const totalProcessed = Object.keys(pageTexts).length;
      const percentage = Math.round((totalProcessed / analysis.totalPages) * 100);
      const elapsed = (Date.now() - processingStartTime) / 1000;
      const remaining = estimateRemainingTime(i + 1, remainingPages.length, elapsed);

      reportProgress(options, {
        phase: 'ocr',
        currentPage: totalProcessed,
        totalPages: analysis.totalPages,
        percentage,
        estimatedTimeRemaining: remaining,
        category: checkpoint.category,
        message: `Resuming OCR: page ${pageNum} of ${analysis.totalPages}...`,
      });

      if ((i + 1) % (options.checkpointInterval || 5) === 0) {
        await saveCheckpoint({
          ...checkpoint,
          completedPages: Object.keys(pageTexts).map(Number),
          pageTexts,
          lastUpdated: Date.now(),
        });
      }
    }
  }

  if (checkpoint.category === 'mixed') {
    const { getPageInfo } = await import('./pdf-intelligence');
    const textPages: number[] = [];
    const ocrPages: number[] = [];

    for (const pageNum of remainingPages) {
      try {
        const pageInfo = await getPageInfo(file, pageNum);
        const hasText = pageInfo.textLength > 0;
        const hasImages = pageInfo.hasImages;
        const textLooksSubstantial =
          pageInfo.textLength >= 400 || pageInfo.textItemsCount >= 20;

        if (hasText) {
          textPages.push(pageNum);
        }
        if (hasImages && (!hasText || !textLooksSubstantial)) {
          ocrPages.push(pageNum);
        }
        if (!hasText && !hasImages) {
          pageTexts[pageNum] = '[Empty page]';
          if (options.onPageComplete) {
            options.onPageComplete(pageNum, pageTexts[pageNum]);
          }
        }
      } catch (err) {
        console.error(`Failed to analyze page ${pageNum}, assuming needs OCR:`, err);
        ocrPages.push(pageNum);
      }
    }

    if (textPages.length > 0) {
      await extractTextFromPages(file, textPages, (pageNum, text) => {
        pageTexts[pageNum] = text;
        if (options.onPageComplete) {
          options.onPageComplete(pageNum, text);
        }
      });
    }

    if (ocrPages.length > 0) {
      await initializeOCRWorker(options.language || 'eng');

      for (let i = 0; i < ocrPages.length; i++) {
        const pageNum = ocrPages[i];

        if (options.abortSignal?.aborted) {
          throw new Error('Processing cancelled by user');
        }

        const imageData = await renderPageToCanvas(file, pageNum);
        const result = await processPageWithOCRWithRetry(
          imageData,
          pageNum,
          analysis.totalPages,
          options.language || 'eng'
        );

        const existingText = pageTexts[pageNum] || '';
        pageTexts[pageNum] = mergeHybridText(
          existingText,
          result.text,
          result.confidence
        );

        if (options.onPageComplete) {
          options.onPageComplete(pageNum, pageTexts[pageNum]);
        }

        const totalProcessed = Object.keys(pageTexts).length;
        const percentage = Math.round((totalProcessed / analysis.totalPages) * 100);
        const elapsed = (Date.now() - processingStartTime) / 1000;
        const remaining = estimateRemainingTime(i + 1, ocrPages.length, elapsed);

        reportProgress(options, {
          phase: 'ocr',
          currentPage: totalProcessed,
          totalPages: analysis.totalPages,
          percentage,
          estimatedTimeRemaining: remaining,
          category: checkpoint.category,
          message: `Resuming OCR: page ${pageNum} of ${analysis.totalPages}...`,
        });

        if ((i + 1) % (options.checkpointInterval || 5) === 0) {
          await saveCheckpoint({
            ...checkpoint,
            completedPages: Object.keys(pageTexts).map(Number),
            pageTexts,
            lastUpdated: Date.now(),
          });
        }
      }
    }
  }

  const combinedText = Object.entries(pageTexts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([pageNum, text]) => `--- Page ${pageNum} ---\n${text}`)
    .join('\n\n');

  const processingTime = (Date.now() - processingStartTime) / 1000;

  await updateCheckpointStatus(fileHash, 'completed');

  return {
    success: true,
    text: combinedText,
    category: checkpoint.category,
    totalPages: analysis.totalPages,
    processedPages: Object.keys(pageTexts).length,
    pageTexts,
    processingTime,
    checkpointRestored: true,
  };
}

/**
 * Initialize OCR worker
 */
async function initializeOCRWorker(language: string = 'eng'): Promise<void> {
  if (workerInitialized && ocrWorker) return;

  ocrWorker = new Worker(
    new URL('../app/(tools)/pdf-to-text/workers/ocr-worker.ts', import.meta.url),
    { type: 'module' }
  );

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('OCR worker initialization timeout'));
    }, 30000); // 30 second timeout

    ocrWorker!.addEventListener('message', (e) => {
      if (e.data.type === 'INIT_COMPLETE') {
        clearTimeout(timeout);
        workerInitialized = true;
        resolve();
      } else if (e.data.type === 'INIT_ERROR') {
        clearTimeout(timeout);
        reject(new Error(e.data.payload || 'OCR worker initialization failed'));
      }
    });

    ocrWorker!.addEventListener('error', (e) => {
      clearTimeout(timeout);
      reject(new Error(`OCR worker error: ${e.message}`));
    });

    ocrWorker!.postMessage({ type: 'INIT', payload: { lang: language } });
  });
}

/**
 * Process single page with OCR worker
 */
async function processPageWithOCR(
  imageData: ImageData,
  pageNum: number,
  totalPages: number
): Promise<{ text: string; confidence: number }> {
  if (!ocrWorker || !workerInitialized) {
    throw new Error('OCR worker not initialized');
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`OCR timeout for page ${pageNum}`));
    }, OCR_TIMEOUT_MS);

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'PAGE_COMPLETE' && e.data.payload.pageNum === pageNum) {
        clearTimeout(timeout);
        ocrWorker!.removeEventListener('message', handleMessage);
        resolve({
          text: e.data.payload.text,
          confidence: e.data.payload.confidence,
        });
      } else if (e.data.type === 'PAGE_ERROR' && e.data.payload.pageNum === pageNum) {
        clearTimeout(timeout);
        ocrWorker!.removeEventListener('message', handleMessage);
        reject(new Error(e.data.payload.error));
      }
    };

    ocrWorker!.addEventListener('message', handleMessage);

    // Convert ImageData to transferable format
    const transferableImageData = {
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
    };

    ocrWorker!.postMessage(
      {
        type: 'OCR_PAGE',
        payload: { imageData: transferableImageData, pageNum, totalPages },
      },
      [transferableImageData.data.buffer] // Transfer array buffer for performance
    );
  });
}

/**
 * Terminate OCR worker
 */
function terminateWorker(): void {
  if (ocrWorker) {
    ocrWorker.postMessage({ type: 'TERMINATE' });
    ocrWorker.terminate();
    ocrWorker = null;
    workerInitialized = false;
  }
}

/**
 * Report progress to callback
 */
function reportProgress(options: ProcessingOptions, progress: ProcessingProgress): void {
  if (options.onProgress) {
    options.onProgress(progress);
  }
}

function isOcrTimeoutError(error: any): boolean {
  return typeof error?.message === 'string' && error.message.includes('OCR timeout');
}

async function processPageWithOCRWithRetry(
  imageData: ImageData,
  pageNum: number,
  totalPages: number,
  language: string
): Promise<{ text: string; confidence: number }> {
  try {
    return await processPageWithOCR(imageData, pageNum, totalPages);
  } catch (err: any) {
    if (!isOcrTimeoutError(err)) {
      throw err;
    }

    terminateWorker();
    await initializeOCRWorker(language);
    return await processPageWithOCR(imageData, pageNum, totalPages);
  }
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function mergeHybridText(
  pdfText: string,
  ocrText: string,
  confidence?: number
): string {
  if (!pdfText) return ocrText || '';
  if (!ocrText) return pdfText;

  const normalizedPdf = normalizeForMatch(pdfText);
  const normalizedOcr = normalizeForMatch(ocrText);

  if (!normalizedOcr) return pdfText;
  const pdfLines = pdfText
    .split(/\r?\n/)
    .map((line) => normalizeForMatch(line))
    .filter((line) => line.length >= 6);

  let matchedLines = 0;
  for (const line of pdfLines) {
    if (normalizedOcr.includes(line)) {
      matchedLines++;
    }
  }

  const overlapRatio =
    pdfLines.length > 0 ? matchedLines / pdfLines.length : 0;
  const lengthRatio =
    normalizedOcr.length / Math.max(normalizedPdf.length, 1);
  const confidenceOk = confidence === undefined || confidence >= 70;

  if (
    confidenceOk &&
    (overlapRatio >= 0.6 || (overlapRatio >= 0.3 && lengthRatio >= 1.2))
  ) {
    return ocrText.trim();
  }

  if (normalizedPdf.includes(normalizedOcr)) return pdfText;

  const pdfLineSet = new Set(pdfLines);

  const uniqueOcrLines = ocrText
    .split(/\r?\n/)
    .filter((line) => {
      const normalized = normalizeForMatch(line);
      return normalized.length >= 6 && !pdfLineSet.has(normalized);
    });

  if (uniqueOcrLines.length === 0) return pdfText;

  return `${pdfText}\n\n${uniqueOcrLines.join('\n')}`.trim();
}

/**
 * Handle errors
 */
function handleError(options: ProcessingOptions, error: ProcessingError): void {
  if (options.onError) {
    options.onError(error);
  }
}

/**
 * Cancel ongoing processing (call terminateWorker)
 */
export function cancelProcessing(): void {
  terminateWorker();
}
