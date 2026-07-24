/**
 * OCR Worker Pool Manager
 * Manages multiple OCR workers for parallel page processing
 * v1.3.2: Enables 2-4x faster OCR through parallelization
 */

export interface WorkerPoolOptions {
  maxWorkers?: number; // Default: 2 (safe for most devices)
  language?: string;
  timeout?: number; // ms per page
}

interface WorkerTask {
  imageData: ImageData;
  pageNum: number;
  totalPages: number;
  resolve: (result: { text: string; confidence: number }) => void;
  reject: (error: Error) => void;
  timeoutId?: number;
}

interface PoolWorker {
  worker: Worker;
  busy: boolean;
  initialized: boolean;
}

const DEFAULT_MAX_WORKERS = 2; // Safe default for most devices
const DEFAULT_TIMEOUT = 120000; // 2 minutes per page
const INIT_TIMEOUT = 30000; // 30 seconds to initialize

export class OCRWorkerPool {
  private workers: PoolWorker[] = [];
  private taskQueue: WorkerTask[] = [];
  private maxWorkers: number;
  private language: string;
  private timeout: number;
  private initPromise: Promise<void> | null = null;

  constructor(options: WorkerPoolOptions = {}) {
    this.maxWorkers = options.maxWorkers || DEFAULT_MAX_WORKERS;
    this.language = options.language || 'eng';
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }

  /**
   * Initialize worker pool
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.createWorkers();
    return this.initPromise;
  }

  /**
   * Create and initialize all workers in the pool
   */
  private async createWorkers(): Promise<void> {
    console.log(`[WorkerPool] Initializing ${this.maxWorkers} OCR workers...`);

    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(
        new URL('../app/(tools)/pdf-to-text/workers/ocr-worker.ts', import.meta.url),
        { type: 'module' }
      );

      const poolWorker: PoolWorker = {
        worker,
        busy: false,
        initialized: false,
      };

      this.workers.push(poolWorker);

      // Initialize worker
      const initPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Worker ${i} initialization timeout`));
        }, INIT_TIMEOUT);

        const handleMessage = (e: MessageEvent) => {
          if (e.data.type === 'INIT_COMPLETE') {
            clearTimeout(timeoutId);
            worker.removeEventListener('message', handleMessage);
            poolWorker.initialized = true;
            console.log(`[WorkerPool] Worker ${i} initialized`);
            resolve();
          } else if (e.data.type === 'INIT_ERROR') {
            clearTimeout(timeoutId);
            worker.removeEventListener('message', handleMessage);
            reject(new Error(e.data.payload || `Worker ${i} init failed`));
          }
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          reject(new Error(`Worker ${i} error: ${e.message}`));
        });

        worker.postMessage({ type: 'INIT', payload: { lang: this.language } });
      });

      initPromises.push(initPromise);
    }

    // Wait for all workers to initialize
    await Promise.all(initPromises);
    console.log(`[WorkerPool] All ${this.maxWorkers} workers ready`);
  }

  /**
   * Process a page with OCR (queues if no worker available)
   */
  async processPage(
    imageData: ImageData,
    pageNum: number,
    totalPages: number
  ): Promise<{ text: string; confidence: number }> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        imageData,
        pageNum,
        totalPages,
        resolve,
        reject,
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Process next task in queue with an available worker
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    // Find an available worker
    const availableWorker = this.workers.find((w) => !w.busy && w.initialized);
    if (!availableWorker) return; // All workers busy

    const task = this.taskQueue.shift();
    if (!task) return;

    availableWorker.busy = true;

    // Set timeout for this task
    task.timeoutId = window.setTimeout(() => {
      availableWorker.busy = false;
      task.reject(new Error(`OCR timeout for page ${task.pageNum}`));
      this.processNextTask(); // Try next task
    }, this.timeout);

    // Handle worker response
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'PAGE_COMPLETE' && e.data.payload.pageNum === task.pageNum) {
        clearTimeout(task.timeoutId);
        availableWorker.worker.removeEventListener('message', handleMessage);
        availableWorker.busy = false;

        task.resolve({
          text: e.data.payload.text,
          confidence: e.data.payload.confidence,
        });

        // Process next task
        this.processNextTask();
      } else if (e.data.type === 'PAGE_ERROR' && e.data.payload.pageNum === task.pageNum) {
        clearTimeout(task.timeoutId);
        availableWorker.worker.removeEventListener('message', handleMessage);
        availableWorker.busy = false;

        task.reject(new Error(e.data.payload.error));

        // Process next task
        this.processNextTask();
      }
    };

    availableWorker.worker.addEventListener('message', handleMessage);

    // Send task to worker
    const transferableImageData = {
      data: task.imageData.data,
      width: task.imageData.width,
      height: task.imageData.height,
    };

    availableWorker.worker.postMessage(
      {
        type: 'OCR_PAGE',
        payload: {
          imageData: transferableImageData,
          pageNum: task.pageNum,
          totalPages: task.totalPages,
        },
      },
      [transferableImageData.data.buffer]
    );
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Terminate all workers and clear queue
   */
  terminate(): void {
    console.log('[WorkerPool] Terminating all workers...');

    // Clear all pending tasks
    this.taskQueue.forEach((task) => {
      if (task.timeoutId) {
        clearTimeout(task.timeoutId);
      }
      task.reject(new Error('Worker pool terminated'));
    });
    this.taskQueue = [];

    // Terminate all workers
    this.workers.forEach((poolWorker, index) => {
      try {
        poolWorker.worker.postMessage({ type: 'TERMINATE' });
        poolWorker.worker.terminate();
        console.log(`[WorkerPool] Worker ${index} terminated`);
      } catch (err) {
        console.warn(`[WorkerPool] Failed to terminate worker ${index}:`, err);
      }
    });

    this.workers = [];
    this.initPromise = null;
    console.log('[WorkerPool] All workers terminated');
  }
}

/**
 * Detect optimal worker count based on device capabilities
 */
export function detectOptimalWorkerCount(): number {
  // Check CPU cores
  const cores = navigator.hardwareConcurrency || 2;

  // Check if mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Check available memory (if available)
  const memory = (navigator as any).deviceMemory; // GB, Chrome only

  let optimalCount: number;

  if (isMobile) {
    // Mobile: Conservative (1-2 workers)
    optimalCount = cores >= 4 ? 2 : 1;
  } else {
    // Desktop: More aggressive (2-4 workers)
    if (cores >= 8) {
      optimalCount = 4; // High-end desktop
    } else if (cores >= 4) {
      optimalCount = 2; // Mid-range
    } else {
      optimalCount = 1; // Low-end
    }

    // Reduce if low memory
    if (memory && memory < 4) {
      optimalCount = Math.max(1, optimalCount - 1);
    }
  }

  console.log(
    `[WorkerPool] Detected optimal worker count: ${optimalCount} (cores: ${cores}, mobile: ${isMobile}${memory ? `, memory: ${memory}GB` : ''})`
  );

  return optimalCount;
}
