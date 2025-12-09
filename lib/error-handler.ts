/**
 * Error Handler Module
 * Centralized error handling with recovery strategies
 */

export type ErrorType =
  | 'validation'
  | 'analysis'
  | 'extraction'
  | 'ocr'
  | 'checkpoint'
  | 'memory'
  | 'timeout'
  | 'cancelled'
  | 'worker'
  | 'browser_support';

export interface ProcessingError {
  type: ErrorType;
  message: string;
  pageNum?: number;
  recoverable: boolean;
  userMessage: string;
  technicalDetails?: string;
  suggestedAction?: string;
}

/**
 * Create standardized error with user-friendly messages
 */
export function createError(
  type: ErrorType,
  message: string,
  options?: {
    pageNum?: number;
    recoverable?: boolean;
    technicalDetails?: string;
  }
): ProcessingError {
  const error: ProcessingError = {
    type,
    message,
    pageNum: options?.pageNum,
    recoverable: options?.recoverable ?? false,
    userMessage: getUserMessage(type, message, options?.pageNum),
    technicalDetails: options?.technicalDetails,
    suggestedAction: getSuggestedAction(type),
  };

  return error;
}

/**
 * Get user-friendly error message
 */
function getUserMessage(type: ErrorType, message: string, pageNum?: number): string {
  const pageInfo = pageNum ? ` (Page ${pageNum})` : '';

  switch (type) {
    case 'validation':
      return `Invalid file: ${message}`;

    case 'analysis':
      return `Cannot analyze PDF${pageInfo}. ${message}`;

    case 'extraction':
      return `Text extraction failed${pageInfo}. ${message}`;

    case 'ocr':
      return `OCR processing failed${pageInfo}. ${message}`;

    case 'checkpoint':
      return `Failed to save progress. ${message}`;

    case 'memory':
      return `Ran out of memory. Try a smaller file or close other tabs.`;

    case 'timeout':
      return `Processing timed out${pageInfo}. File may be too large or complex.`;

    case 'cancelled':
      return 'Processing cancelled. Progress has been saved.';

    case 'worker':
      return `OCR engine error: ${message}`;

    case 'browser_support':
      return `Your browser does not support required features: ${message}`;

    default:
      return `An error occurred: ${message}`;
  }
}

/**
 * Get suggested action for error recovery
 */
function getSuggestedAction(type: ErrorType): string {
  switch (type) {
    case 'validation':
      return 'Please upload a valid PDF file under 100MB.';

    case 'analysis':
      return 'Try re-downloading the PDF or use a different file.';

    case 'extraction':
      return 'The PDF may be corrupted. Try repairing it with a PDF tool.';

    case 'ocr':
      return 'Try reloading the page and processing again. For better results, ensure scans are clear.';

    case 'checkpoint':
      return 'Progress may not be saved. Consider processing in shorter sessions.';

    case 'memory':
      return 'Close other tabs, reload the page, and try with a smaller file.';

    case 'timeout':
      return 'Try breaking the PDF into smaller files or use a faster device.';

    case 'cancelled':
      return 'Upload the same file again to resume from where you left off.';

    case 'worker':
      return 'Reload the page and try again. Clear browser cache if the problem persists.';

    case 'browser_support':
      return 'Please use a modern browser like Chrome 90+, Firefox 88+, or Safari 14+.';

    default:
      return 'Please try again or contact support if the problem persists.';
  }
}

/**
 * Handle specific error scenarios with retry logic
 */
export class ErrorRecoveryHandler {
  private retryCount: Map<string, number> = new Map();
  private maxRetries: number = 3;

  /**
   * Attempt to recover from error
   */
  async attemptRecovery<T>(
    operation: () => Promise<T>,
    errorKey: string,
    onError?: (error: ProcessingError) => void
  ): Promise<T | null> {
    const currentRetries = this.retryCount.get(errorKey) || 0;

    try {
      const result = await operation();
      // Success - reset retry count
      this.retryCount.delete(errorKey);
      return result;
    } catch (err: any) {
      if (currentRetries < this.maxRetries) {
        // Increment retry count
        this.retryCount.set(errorKey, currentRetries + 1);

        // Exponential backoff
        const delay = Math.pow(2, currentRetries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry
        return this.attemptRecovery(operation, errorKey, onError);
      } else {
        // Max retries exceeded
        const error = this.classifyError(err);
        if (onError) {
          onError(error);
        }
        this.retryCount.delete(errorKey);
        return null;
      }
    }
  }

  /**
   * Classify error into appropriate type
   */
  private classifyError(err: any): ProcessingError {
    const message = err.message || 'Unknown error';

    // Check error patterns
    if (message.includes('out of memory') || message.includes('heap')) {
      return createError('memory', message, { recoverable: false });
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return createError('timeout', message, { recoverable: true });
    }

    if (message.includes('cancelled') || message.includes('abort')) {
      return createError('cancelled', message, { recoverable: true });
    }

    if (message.includes('worker') || message.includes('Worker')) {
      return createError('worker', message, { recoverable: true });
    }

    if (message.includes('PDF') && message.includes('invalid')) {
      return createError('validation', message, { recoverable: false });
    }

    if (message.includes('OCR') || message.includes('Tesseract')) {
      return createError('ocr', message, { recoverable: true });
    }

    if (message.includes('IndexedDB') || message.includes('checkpoint')) {
      return createError('checkpoint', message, { recoverable: true });
    }

    // Generic error
    return createError('extraction', message, { recoverable: false });
  }

  /**
   * Reset retry counts
   */
  reset(): void {
    this.retryCount.clear();
  }
}

/**
 * Log error with context
 */
export function logError(error: ProcessingError, context?: Record<string, any>): void {
  console.error('[PDF OCR Error]', {
    type: error.type,
    message: error.message,
    userMessage: error.userMessage,
    pageNum: error.pageNum,
    recoverable: error.recoverable,
    suggestedAction: error.suggestedAction,
    technicalDetails: error.technicalDetails,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Error boundary for critical errors
 */
export function handleCriticalError(err: any, fallbackMessage: string): ProcessingError {
  // Log to console
  console.error('[Critical Error]', err);

  // Create error
  const error = createError('extraction', err.message || fallbackMessage, {
    recoverable: false,
    technicalDetails: err.stack,
  });

  // Log structured error
  logError(error, {
    isCritical: true,
    stack: err.stack,
  });

  return error;
}

/**
 * Validate browser support and return errors if missing
 */
export function validateBrowserSupport(): ProcessingError | null {
  const missing: string[] = [];

  if (typeof Worker === 'undefined') {
    missing.push('Web Workers');
  }

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    missing.push('Web Crypto API');
  }

  if (typeof indexedDB === 'undefined') {
    missing.push('IndexedDB');
  }

  if (typeof WebAssembly === 'undefined') {
    missing.push('WebAssembly');
  }

  if (missing.length > 0) {
    return createError('browser_support', missing.join(', '), {
      recoverable: false,
      technicalDetails: `Missing: ${missing.join(', ')}`,
    });
  }

  return null;
}

/**
 * Handle page-specific OCR errors with fallback
 */
export async function handlePageOCRError(
  pageNum: number,
  err: any,
  fallbackText?: string
): Promise<{ text: string; error: ProcessingError | null }> {
  const error = createError('ocr', err.message || 'OCR failed', {
    pageNum,
    recoverable: true,
    technicalDetails: err.stack,
  });

  logError(error, { pageNum, hasFallback: !!fallbackText });

  // Return fallback or error indicator
  return {
    text: fallbackText || `[Page ${pageNum} - OCR failed: ${err.message}]`,
    error,
  };
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: ProcessingError): string {
  let message = error.userMessage;

  if (error.suggestedAction) {
    message += `\n\n${error.suggestedAction}`;
  }

  return message;
}

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: ProcessingError): boolean {
  return error.recoverable;
}

/**
 * Get error statistics for debugging
 */
export class ErrorStats {
  private errors: ProcessingError[] = [];

  addError(error: ProcessingError): void {
    this.errors.push(error);
  }

  getStats(): {
    total: number;
    byType: Record<string, number>;
    recoverable: number;
    unrecoverable: number;
  } {
    const byType: Record<string, number> = {};

    this.errors.forEach((err) => {
      byType[err.type] = (byType[err.type] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byType,
      recoverable: this.errors.filter((e) => e.recoverable).length,
      unrecoverable: this.errors.filter((e) => !e.recoverable).length,
    };
  }

  clear(): void {
    this.errors = [];
  }

  getErrors(): ProcessingError[] {
    return [...this.errors];
  }
}
