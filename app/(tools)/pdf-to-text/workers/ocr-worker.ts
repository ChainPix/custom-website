/**
 * OCR Web Worker for Tesseract.js
 * Runs OCR processing in background thread to prevent UI blocking
 * v1.3.2: Enhanced with image preprocessing for better OCR accuracy
 */

import { createWorker, Worker as TesseractWorker } from 'tesseract.js';
import { preprocessCanvas, DEFAULT_PREPROCESSING } from '@/lib/image-preprocessing';

let worker: TesseractWorker | null = null;
let isInitialized = false;

interface WorkerMessage {
  type: 'INIT' | 'OCR_PAGE' | 'TERMINATE';
  payload?: any;
}

interface OCRPagePayload {
  imageData: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  };
  pageNum: number;
  totalPages: number;
}

self.addEventListener('message', async (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'INIT':
        await initWorker(payload?.lang || 'eng');
        break;
      case 'OCR_PAGE':
        await processPage(payload as OCRPagePayload);
        break;
      case 'TERMINATE':
        await terminateWorker();
        break;
      default:
        self.postMessage({
          type: 'ERROR',
          payload: `Unknown message type: ${type}`,
        });
    }
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      payload: err.message || 'Worker error',
    });
  }
});

/**
 * Initialize Tesseract.js worker with specified language
 */
async function initWorker(lang: string = 'eng') {
  try {
    if (isInitialized && worker) {
      self.postMessage({ type: 'INIT_COMPLETE' });
      return;
    }

    // Create worker with progress logger
    worker = await createWorker(lang, 1, {
      logger: (m) => {
        // Send initialization progress to main thread
        if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
          self.postMessage({
            type: 'INIT_PROGRESS',
            payload: {
              status: m.status,
              progress: m.progress || 0,
            },
          });
        }
      },
      errorHandler: (err) => {
        self.postMessage({
          type: 'INIT_ERROR',
          payload: err.message || 'Initialization failed',
        });
      },
    });

    isInitialized = true;
    self.postMessage({ type: 'INIT_COMPLETE' });
  } catch (err: any) {
    isInitialized = false;
    self.postMessage({
      type: 'INIT_ERROR',
      payload: err.message || 'Failed to initialize OCR engine',
    });
  }
}

/**
 * Process a single PDF page with OCR
 */
async function processPage(payload: OCRPagePayload) {
  if (!worker || !isInitialized) {
    self.postMessage({
      type: 'PAGE_ERROR',
      payload: {
        pageNum: payload.pageNum,
        error: 'Worker not initialized',
      },
    });
    return;
  }

  const startTime = Date.now();

  try {
    // Reconstruct ImageData from transferred data
    const imageData = new ImageData(
      new Uint8ClampedArray(payload.imageData.data),
      payload.imageData.width,
      payload.imageData.height
    );

    // Create canvas and draw image
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.putImageData(imageData, 0, 0);

    // Apply image preprocessing to enhance OCR accuracy
    // Includes: grayscale, contrast boost, noise removal, sharpening, binarization, deskew, border removal
    preprocessCanvas(ctx, imageData.width, imageData.height, DEFAULT_PREPROCESSING);

    // Run OCR on the preprocessed canvas
    const { data } = await worker.recognize(canvas);

    const processingTime = (Date.now() - startTime) / 1000;

    self.postMessage({
      type: 'PAGE_COMPLETE',
      payload: {
        pageNum: payload.pageNum,
        text: data.text,
        confidence: data.confidence,
        processingTime,
      },
    });
  } catch (err: any) {
    self.postMessage({
      type: 'PAGE_ERROR',
      payload: {
        pageNum: payload.pageNum,
        error: err.message || 'OCR processing failed',
      },
    });
  }
}

/**
 * Terminate the worker and clean up resources
 */
async function terminateWorker() {
  if (worker) {
    try {
      await worker.terminate();
      worker = null;
      isInitialized = false;
      self.postMessage({ type: 'TERMINATED' });
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        payload: err.message || 'Failed to terminate worker',
      });
    }
  } else {
    self.postMessage({ type: 'TERMINATED' });
  }
}

// Handle uncaught errors in worker
self.addEventListener('error', (e) => {
  self.postMessage({
    type: 'ERROR',
    payload: `Worker error: ${e.message}`,
  });
});

self.addEventListener('unhandledrejection', (e) => {
  self.postMessage({
    type: 'ERROR',
    payload: `Unhandled promise rejection: ${e.reason}`,
  });
});
