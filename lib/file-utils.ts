/**
 * File Utilities for PDF Processing
 * Hashing, formatting, and validation helpers
 */

/**
 * Generate SHA-256 hash of file for checkpointing and deduplication
 * Uses Web Crypto API for fast, secure hashing
 */
export async function hashFile(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (err) {
    console.error('Failed to hash file:', err);
    // Fallback to simple hash based on file properties
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}

/**
 * Format file size for human-readable display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Estimate OCR processing time based on page count
 * @param pageCount Number of pages to process
 * @param avgTimePerPage Average time in seconds (default: 4s)
 */
export function estimateOCRTime(pageCount: number, avgTimePerPage: number = 4): number {
  return pageCount * avgTimePerPage;
}

/**
 * Validate PDF file
 */
export function validatePDFFile(file: File, maxSizeBytes: number): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (file.type !== 'application/pdf') {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a PDF file.',
    };
  }

  // Check file size
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty (0 bytes). Please upload a valid PDF.',
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${formatFileSize(maxSizeBytes)}. Current: ${formatFileSize(file.size)}`,
    };
  }

  return { valid: true };
}

/**
 * Detect if user is on iOS device
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Detect if user is on mobile device
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get optimal settings based on device capabilities
 */
export function getOptimalSettings(): {
  maxFileSize: number;
  ocrScale: number;
  chunkSize: number;
  maxCanvasDimension: number;
} {
  if (isIOS()) {
    // iOS has stricter memory limits and slower WASM
    return {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      ocrScale: 1.5, // Lower resolution for faster OCR
      chunkSize: 3, // Smaller chunks
      maxCanvasDimension: 1536, // Smaller canvas
    };
  }

  if (isMobile()) {
    // General mobile optimization
    return {
      maxFileSize: 75 * 1024 * 1024, // 75MB
      ocrScale: 1.75,
      chunkSize: 4,
      maxCanvasDimension: 1792,
    };
  }

  // Desktop default
  return {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    ocrScale: 2.0,
    chunkSize: 5,
    maxCanvasDimension: 2048,
  };
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create blob from text content
 */
export function createTextBlob(content: string, mimeType: string = 'text/plain'): Blob {
  return new Blob([content], { type: mimeType });
}

/**
 * Sanitize filename for download
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and special characters
  return fileName
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * Get file extension
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Remove file extension from filename
 */
export function removeFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return fileName;
  return fileName.substring(0, lastDotIndex);
}

/**
 * Calculate processing progress percentage
 */
export function calculateProgress(
  completedPages: number,
  totalPages: number
): number {
  if (totalPages === 0) return 0;
  return Math.round((completedPages / totalPages) * 100);
}

/**
 * Estimate remaining time based on current progress
 */
export function estimateRemainingTime(
  completedPages: number,
  totalPages: number,
  elapsedSeconds: number
): number {
  if (completedPages === 0) return 0;
  const avgTimePerPage = elapsedSeconds / completedPages;
  const remainingPages = totalPages - completedPages;
  return remainingPages * avgTimePerPage;
}

/**
 * Format estimated time remaining
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds < 10) return 'Almost done...';
  if (seconds < 60) return `About ${Math.round(seconds / 10) * 10} seconds remaining`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes === 1) return 'About 1 minute remaining';
  return `About ${minutes} minutes remaining`;
}

/**
 * Check if browser supports required features
 */
export function checkBrowserSupport(): {
  supported: boolean;
  missing: string[];
} {
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

  return {
    supported: missing.length === 0,
    missing,
  };
}
