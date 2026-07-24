/**
 * PDF Intelligence Module
 * Analyzes PDFs to determine optimal processing strategy
 */

import { getOptimalSettings } from './file-utils';

// Dynamic import for PDF.js (client-side only)
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

/**
 * Configure PDF.js worker and load library
 */
async function configurePDFWorker(): Promise<typeof import('pdfjs-dist')> {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing only available in browser');
  }

  // Load PDF.js if not already loaded
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
  }

  // Configure worker if not already configured
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    try {
      const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      const resolvedWorkerSrc =
        typeof workerModule === 'string'
          ? workerModule
          : typeof workerModule.default === 'string'
            ? workerModule.default
            : typeof (workerModule as any).href === 'string'
              ? (workerModule as any).href
              : `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      pdfjsLib.GlobalWorkerOptions.workerSrc = resolvedWorkerSrc;
    } catch {
      // Fallback to unpkg CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }
  }

  return pdfjsLib;
}

export type PDFCategory = 'text-based' | 'image-based' | 'mixed';

export interface PDFAnalysisResult {
  category: PDFCategory;
  totalPages: number;
  textRatio: number; // 0.0 to 1.0
  estimatedOCRPages: number;
  recommendation: string;
  pageAnalysis: Array<{
    pageNum: number;
    hasText: boolean;
    textLength: number;
    hasImages: boolean;
    needsOCR: boolean;
  }>;
}

export interface ExtractedPage {
  pageNum: number;
  text: string;
  extractionMethod: 'pdfjs' | 'ocr' | 'empty';
}

/**
 * Analyze PDF to determine if it needs OCR
 * Categorizes as: text-based, image-based, or mixed
 */
export async function analyzePDF(file: File): Promise<PDFAnalysisResult> {
  try {
    // Configure PDF.js worker
    const pdfjs = await configurePDFWorker();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    const totalPages = pdf.numPages;
    const pageAnalysis: PDFAnalysisResult['pageAnalysis'] = [];
    let pagesWithText = 0;
    let totalTextLength = 0;

    const ops = pdfjs.OPS as Record<string, number>;
    const imageOps = new Set<number>([
      ops.paintImageXObject,
      ops.paintInlineImageXObject,
      ops.paintImageMaskXObject,
    ]);
    if ('paintJpegXObject' in ops) {
      imageOps.add(ops.paintJpegXObject);
    }

    // Analyze each page individually
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Extract text and count characters
      const text = textContent.items
        .map((item: any) => {
          if ('str' in item && typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .join(' ')
        .trim();

      const textLength = text.length;
      const hasText = textLength > 50; // Threshold: 50 characters minimum

      const operatorList = await page.getOperatorList();
      const hasImages = operatorList.fnArray.some((fn) => imageOps.has(fn));

      if (hasText) {
        pagesWithText++;
        totalTextLength += textLength;
      }

      pageAnalysis.push({
        pageNum: i,
        hasText,
        textLength,
        hasImages,
        needsOCR: hasImages || !hasText,
      });
    }

    // Calculate text ratio
    const textRatio = pagesWithText / totalPages;

    // Categorize PDF with improved logic to reduce false "mixed" classifications
    let category: PDFCategory;
    let recommendation: string;
    let estimatedOCRPages: number;

    const pagesWithImages = pageAnalysis.filter((page) => page.hasImages).length;
    const pagesNeedingOCR = pageAnalysis.filter((page) => page.needsOCR).length;

    // More intelligent categorization
    if (pagesWithText === totalPages && pagesWithImages === 0) {
      // All pages have text, no images -> Pure text
      category = 'text-based';
      estimatedOCRPages = 0;
      recommendation = 'Fast text extraction (PDF.js)';
    } else if (pagesWithText === 0) {
      // No text at all -> Pure image/scan
      category = 'image-based';
      estimatedOCRPages = totalPages;
      recommendation = 'Full OCR processing required';
    } else if (textRatio >= 0.9 && pagesNeedingOCR <= 2) {
      // 90%+ text pages and only 1-2 pages need OCR -> Treat as text-based
      // Common case: PDFs with a cover image or chart
      category = 'text-based';
      estimatedOCRPages = 0;
      recommendation = 'Primarily text - fast extraction (minor images ignored)';
    } else if (textRatio <= 0.1 && pagesNeedingOCR >= totalPages * 0.9) {
      // 90%+ pages need OCR -> Treat as image-based
      category = 'image-based';
      estimatedOCRPages = totalPages;
      recommendation = 'Primarily scanned images - full OCR required';
    } else {
      // True mixed content -> Use hybrid processing
      category = 'mixed';
      estimatedOCRPages = pagesNeedingOCR;
      recommendation = `Hybrid: ${pagesWithText} text pages + ${pagesNeedingOCR} OCR pages`;
    }

    return {
      category,
      totalPages,
      textRatio,
      estimatedOCRPages,
      recommendation,
      pageAnalysis,
    };
  } catch (err) {
    console.error('Failed to analyze PDF:', err);
    throw new Error('Could not analyze PDF structure. File may be corrupted.');
  }
}

/**
 * Extract text from text-based PDF pages using PDF.js
 * Fast path for PDFs with embedded text
 */
export async function extractTextPages(
  file: File,
  onProgress?: (pageNum: number, totalPages: number, text: string) => void
): Promise<ExtractedPage[]> {
  try {
    const pdfjs = await configurePDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    const totalPages = pdf.numPages;
    const extractedPages: ExtractedPage[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Extract text with proper spacing
      const text = textContent.items
        .map((item: any) => {
          if ('str' in item && typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .join(' ')
        .trim();

      extractedPages.push({
        pageNum: i,
        text: text || '[Empty page]',
        extractionMethod: text ? 'pdfjs' : 'empty',
      });

      // Report progress
      if (onProgress) {
        onProgress(i, totalPages, text);
      }
    }

    return extractedPages;
  } catch (err) {
    console.error('Failed to extract text from PDF:', err);
    throw new Error('Text extraction failed. PDF may be corrupted or encrypted.');
  }
}

/**
 * Extract text from specific pages only (for mixed PDFs)
 */
export async function extractTextFromPages(
  file: File,
  pageNumbers: number[],
  onProgress?: (pageNum: number, text: string) => void
): Promise<ExtractedPage[]> {
  try {
    const pdfjs = await configurePDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    const extractedPages: ExtractedPage[] = [];

    for (const pageNum of pageNumbers) {
      if (pageNum < 1 || pageNum > pdf.numPages) {
        console.warn(`Page ${pageNum} out of range, skipping`);
        continue;
      }

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const text = textContent.items
        .map((item: any) => {
          if ('str' in item && typeof item.str === 'string') {
            return item.str;
          }
          return '';
        })
        .join(' ')
        .trim();

      extractedPages.push({
        pageNum,
        text: text || '[Empty page]',
        extractionMethod: text ? 'pdfjs' : 'empty',
      });

      if (onProgress) {
        onProgress(pageNum, text);
      }
    }

    return extractedPages;
  } catch (err) {
    console.error('Failed to extract text from specific pages:', err);
    throw new Error('Partial text extraction failed');
  }
}

/**
 * Check if OffscreenCanvas is supported (v1.3.2+)
 * OffscreenCanvas enables off-main-thread rendering for better performance
 */
function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Create optimal canvas type based on browser support (v1.3.2+)
 * Prefers OffscreenCanvas for better performance when available
 */
function createOptimalCanvas(
  width: number,
  height: number
): HTMLCanvasElement | OffscreenCanvas {
  if (isOffscreenCanvasSupported()) {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Render PDF page to canvas for OCR processing (v1.3.2 optimized)
 * Returns ImageData that can be sent to OCR worker
 *
 * Optimizations:
 * - Target 300 DPI for optimal OCR accuracy
 * - Auto-downsample >600 DPI scans to prevent memory issues
 * - Use OffscreenCanvas when available for better performance
 * - Enforce canvas size limits (2048px desktop, 1536px mobile)
 * - Memory cleanup after rendering
 */
export async function renderPageToCanvas(
  file: File,
  pageNum: number,
  scale?: number
): Promise<ImageData> {
  let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;

  try {
    const pdfjs = await configurePDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    if (pageNum < 1 || pageNum > pdf.numPages) {
      throw new Error(`Page ${pageNum} out of range (1-${pdf.numPages})`);
    }

    const page = await pdf.getPage(pageNum);
    const settings = getOptimalSettings();

    // Get page dimensions at scale 1.0
    const baseViewport = page.getViewport({ scale: 1.0 });
    const pageWidthInches = baseViewport.width / 72; // PDF points to inches
    const pageHeightInches = baseViewport.height / 72;

    // Calculate optimal scale for target 300 DPI
    // Standard letter page: 8.5" x 11" at 300 DPI = 2550 x 3300 pixels
    const TARGET_DPI = 300;
    const MAX_DPI = 600; // Prevent excessive resolution

    let optimalScale: number;

    if (scale) {
      // Use provided scale
      optimalScale = scale;
    } else {
      // Calculate scale to achieve ~300 DPI
      // DPI = (pixels / inches), so scale = (TARGET_DPI * inches) / basePixels
      const targetWidth = TARGET_DPI * pageWidthInches;
      const targetHeight = TARGET_DPI * pageHeightInches;

      // Use the dimension that gives us closest to target DPI
      const scaleForWidth = targetWidth / baseViewport.width;
      const scaleForHeight = targetHeight / baseViewport.height;
      optimalScale = Math.min(scaleForWidth, scaleForHeight);

      // Cap at MAX_DPI equivalent
      const maxScale = (MAX_DPI * pageWidthInches) / baseViewport.width;
      optimalScale = Math.min(optimalScale, maxScale);

      // Don't go below device-specific minimum
      optimalScale = Math.max(optimalScale, settings.ocrScale);
    }

    const viewport = page.getViewport({ scale: optimalScale });

    // Calculate effective DPI
    const effectiveDPI = Math.round((viewport.width / pageWidthInches));
    const usingOffscreen = isOffscreenCanvasSupported();
    console.log(
      `[Render] Page ${pageNum}: ${Math.round(pageWidthInches * 10) / 10}" x ${Math.round(pageHeightInches * 10) / 10}" ` +
      `→ ${Math.round(viewport.width)}x${Math.round(viewport.height)}px (${effectiveDPI} DPI, scale: ${optimalScale.toFixed(2)}, ${usingOffscreen ? 'OffscreenCanvas' : 'HTMLCanvas'})`
    );

    // Auto-downsample if exceeds safe limits
    let canvasWidth = viewport.width;
    let canvasHeight = viewport.height;

    const maxDimension = settings.maxCanvasDimension;
    const maxPixels = 4096 * 4096; // 16 megapixels max
    const currentPixels = canvasWidth * canvasHeight;

    if (canvasWidth > maxDimension || canvasHeight > maxDimension || currentPixels > maxPixels) {
      // Calculate downsample factor
      const dimensionFactor = maxDimension / Math.max(canvasWidth, canvasHeight);
      const pixelFactor = Math.sqrt(maxPixels / currentPixels);
      const scaleFactor = Math.min(dimensionFactor, pixelFactor, 1.0);

      const oldWidth = canvasWidth;
      const oldHeight = canvasHeight;
      canvasWidth = Math.floor(canvasWidth * scaleFactor);
      canvasHeight = Math.floor(canvasHeight * scaleFactor);

      console.warn(
        `[Render] Auto-downsampling: ${Math.round(oldWidth)}x${Math.round(oldHeight)} ` +
        `→ ${canvasWidth}x${canvasHeight} (${Math.round(scaleFactor * 100)}%)`
      );
    }

    // Create optimal canvas (OffscreenCanvas if supported, HTMLCanvas otherwise)
    canvas = createOptimalCanvas(canvasWidth, canvasHeight);

    const context = canvas.getContext('2d', {
      alpha: false, // No transparency needed
      willReadFrequently: true, // Optimize for getImageData
      desynchronized: true, // Allow off-main-thread rendering
    }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

    if (!context) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Disable image smoothing for sharper text
    context.imageSmoothingEnabled = false;

    // Render PDF page to canvas with adjusted scale
    const finalScale = optimalScale * (canvasWidth / viewport.width);
    const renderViewport = page.getViewport({ scale: finalScale });

    await page.render({
      canvasContext: context as any,
      viewport: renderViewport,
    }).promise;

    // Extract ImageData for OCR
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Clean up canvas immediately
    canvas.width = 0;
    canvas.height = 0;
    canvas = null;

    return imageData;
  } catch (err) {
    console.error(`Failed to render page ${pageNum}:`, err);
    throw new Error(`Could not render page ${pageNum} for OCR`);
  } finally {
    // Ensure canvas is cleaned up
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

/**
 * Render multiple PDF pages in parallel (v1.3.2+)
 * Uses Promise.all for concurrent rendering when processing multiple pages
 *
 * @param file PDF file to render
 * @param pageNumbers Array of page numbers to render
 * @param scale Optional scale factor
 * @returns Array of ImageData in same order as pageNumbers
 */
export async function renderPagesInParallel(
  file: File,
  pageNumbers: number[],
  scale?: number
): Promise<ImageData[]> {
  console.log(`[Render] Rendering ${pageNumbers.length} pages in parallel...`);
  const startTime = Date.now();

  try {
    // Render all pages concurrently
    const renderPromises = pageNumbers.map((pageNum) =>
      renderPageToCanvas(file, pageNum, scale)
    );

    const results = await Promise.all(renderPromises);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Render] Completed ${pageNumbers.length} pages in ${elapsed}s (parallel)`);

    return results;
  } catch (err) {
    console.error('[Render] Parallel rendering failed:', err);
    throw err;
  }
}

/**
 * Convert ImageData to compressed JPEG blob (v1.3.2)
 * Reduces memory usage by 70-80% with minimal quality loss
 *
 * @param imageData - ImageData from canvas
 * @param quality - JPEG quality 0.0-1.0 (default: 0.92)
 * @returns Compressed image as Blob
 */
export async function compressImageData(
  imageData: ImageData,
  quality: number = 0.92
): Promise<Blob> {
  // Create temporary canvas
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context for compression');
  }

  // Put image data on canvas
  ctx.putImageData(imageData, 0, 0);

  // Convert to JPEG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Clean up
        canvas.width = 0;
        canvas.height = 0;

        if (blob) {
          const originalSize = imageData.data.length;
          const compressedSize = blob.size;
          const savings = Math.round((1 - compressedSize / originalSize) * 100);

          console.log(
            `[Compression] ${Math.round(originalSize / 1024)}KB → ${Math.round(compressedSize / 1024)}KB (saved ${savings}%)`
          );

          resolve(blob);
        } else {
          reject(new Error('Failed to create JPEG blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Decompress JPEG blob back to ImageData
 * Used when OCR worker receives compressed data
 */
export async function decompressImageBlob(blob: Blob): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Clean up
      canvas.width = 0;
      canvas.height = 0;
      URL.revokeObjectURL(url);

      resolve(imageData);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image from blob'));
    };

    img.src = url;
  });
}

/**
 * Render multiple pages to canvas (batch operation)
 */
export async function renderPagesToCanvas(
  file: File,
  pageNumbers: number[],
  scale?: number,
  onProgress?: (pageNum: number, totalPages: number) => void
): Promise<Map<number, ImageData>> {
  const renderedPages = new Map<number, ImageData>();

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];

    try {
      const imageData = await renderPageToCanvas(file, pageNum, scale);
      renderedPages.set(pageNum, imageData);

      if (onProgress) {
        onProgress(i + 1, pageNumbers.length);
      }
    } catch (err) {
      console.error(`Failed to render page ${pageNum}, skipping:`, err);
      // Continue with next page
    }
  }

  return renderedPages;
}

/**
 * Get detailed page information (for debugging)
 */
export async function getPageInfo(file: File, pageNum: number): Promise<{
  pageNum: number;
  width: number;
  height: number;
  rotation: number;
  textItemsCount: number;
  textLength: number;
  hasImages: boolean;
}> {
  try {
    const pdfjs = await configurePDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    if (pageNum < 1 || pageNum > pdf.numPages) {
      throw new Error(`Page ${pageNum} out of range (1-${pdf.numPages})`);
    }

  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.0 });
  const textContent = await page.getTextContent();

    const text = textContent.items
      .map((item: any) => {
        if ('str' in item && typeof item.str === 'string') {
          return item.str;
        }
        return '';
      })
      .join(' ');

    const ops = pdfjs.OPS as Record<string, number>;
    const imageOps = new Set<number>([
      ops.paintImageXObject,
      ops.paintInlineImageXObject,
      ops.paintImageMaskXObject,
    ]);
    if ('paintJpegXObject' in ops) {
      imageOps.add(ops.paintJpegXObject);
    }
    const operatorList = await page.getOperatorList();
    const hasImages = operatorList.fnArray.some((fn) => imageOps.has(fn));

    return {
      pageNum,
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation,
      textItemsCount: textContent.items.length,
      textLength: text.length,
      hasImages,
    };
  } catch (err) {
    console.error(`Failed to get page info for page ${pageNum}:`, err);
    throw new Error(`Could not retrieve page ${pageNum} information`);
  }
}

/**
 * Quick PDF validation (checks if file can be opened)
 */
export async function validatePDFStructure(file: File): Promise<{
  valid: boolean;
  error?: string;
  pageCount?: number;
  encrypted?: boolean;
}> {
  try {
    const pdfjs = await configurePDFWorker();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });

    const pdf = await loadingTask.promise;

    return {
      valid: true,
      pageCount: pdf.numPages,
      encrypted: false, // Cannot reliably detect encryption without attempting to render
    };
  } catch (err: any) {
    console.error('PDF validation failed:', err);

    let errorMessage = 'Invalid or corrupted PDF file';

    if (err.name === 'InvalidPDFException') {
      errorMessage = 'File is not a valid PDF document';
    } else if (err.name === 'MissingPDFException') {
      errorMessage = 'PDF file appears to be empty';
    } else if (err.name === 'PasswordException') {
      errorMessage = 'PDF is password-protected (not supported)';
    } else if (err.name === 'UnexpectedResponseException') {
      errorMessage = 'Failed to load PDF (unexpected format)';
    }

    return {
      valid: false,
      error: errorMessage,
    };
  }
}

/**
 * Estimate processing time based on PDF analysis
 */
export function estimateProcessingTime(analysis: PDFAnalysisResult): {
  totalSeconds: number;
  breakdown: {
    textExtraction: number;
    ocrProcessing: number;
    overhead: number;
  };
  formattedTime: string;
} {
  const textExtractionSpeed = 0.1; // seconds per page (fast)
  const ocrSpeed = 4.0; // seconds per page (slow)
  const overhead = 2.0; // initial setup time

  const textPages = analysis.totalPages - analysis.estimatedOCRPages;
  const ocrPages = analysis.estimatedOCRPages;

  const textExtraction = textPages * textExtractionSpeed;
  const ocrProcessing = ocrPages * ocrSpeed;

  const totalSeconds = textExtraction + ocrProcessing + overhead;

  // Format time
  let formattedTime: string;
  if (totalSeconds < 10) {
    formattedTime = 'Less than 10 seconds';
  } else if (totalSeconds < 60) {
    formattedTime = `About ${Math.round(totalSeconds / 10) * 10} seconds`;
  } else {
    const minutes = Math.ceil(totalSeconds / 60);
    formattedTime = minutes === 1 ? 'About 1 minute' : `About ${minutes} minutes`;
  }

  return {
    totalSeconds,
    breakdown: {
      textExtraction,
      ocrProcessing,
      overhead,
    },
    formattedTime,
  };
}
