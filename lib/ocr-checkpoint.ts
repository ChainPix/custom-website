/**
 * IndexedDB Checkpoint Store for OCR Progress
 * Allows resuming interrupted OCR operations after page reload/crash
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OCRCheckpoint {
  fileHash: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  completedPages: number[];
  pageTexts: Record<number, string>;
  category: 'text-based' | 'image-based' | 'mixed';
  lastUpdated: number;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

interface OCRCheckpointDB extends DBSchema {
  checkpoints: {
    key: string; // fileHash
    value: OCRCheckpoint;
    indexes: {
      'by-status': string;
      'by-date': number;
    };
  };
}

let db: IDBPDatabase<OCRCheckpointDB> | null = null;
const DB_NAME = 'ocr-checkpoints';
const DB_VERSION = 1;
const STORE_NAME = 'checkpoints';

/**
 * Initialize IndexedDB database
 */
export async function initCheckpointDB(): Promise<IDBPDatabase<OCRCheckpointDB>> {
  if (db) return db;

  try {
    db = await openDB<OCRCheckpointDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'fileHash' });

          // Create indexes for efficient querying
          store.createIndex('by-status', 'status');
          store.createIndex('by-date', 'lastUpdated');
        }
      },
      blocked() {
        console.warn('IndexedDB upgrade blocked by another tab');
      },
      blocking() {
        console.warn('This tab is blocking an IndexedDB upgrade');
      },
    });

    return db;
  } catch (err) {
    console.error('Failed to initialize IndexedDB:', err);
    throw new Error('Could not initialize checkpoint database');
  }
}

/**
 * Save OCR checkpoint to IndexedDB
 */
export async function saveCheckpoint(checkpoint: OCRCheckpoint): Promise<void> {
  try {
    if (!db) await initCheckpointDB();

    await db!.put(STORE_NAME, {
      ...checkpoint,
      lastUpdated: Date.now(),
    });
  } catch (err) {
    console.error('Failed to save checkpoint:', err);
    throw new Error('Could not save OCR checkpoint');
  }
}

/**
 * Load OCR checkpoint from IndexedDB by file hash
 */
export async function loadCheckpoint(fileHash: string): Promise<OCRCheckpoint | undefined> {
  try {
    if (!db) await initCheckpointDB();

    const checkpoint = await db!.get(STORE_NAME, fileHash);
    return checkpoint;
  } catch (err) {
    console.error('Failed to load checkpoint:', err);
    return undefined;
  }
}

/**
 * Delete OCR checkpoint from IndexedDB
 */
export async function deleteCheckpoint(fileHash: string): Promise<void> {
  try {
    if (!db) await initCheckpointDB();

    await db!.delete(STORE_NAME, fileHash);
  } catch (err) {
    console.error('Failed to delete checkpoint:', err);
    throw new Error('Could not delete OCR checkpoint');
  }
}

/**
 * List all checkpoints (optionally filter by status)
 */
export async function listCheckpoints(
  status?: 'in_progress' | 'completed' | 'failed' | 'cancelled'
): Promise<OCRCheckpoint[]> {
  try {
    if (!db) await initCheckpointDB();

    if (status) {
      return await db!.getAllFromIndex(STORE_NAME, 'by-status', status);
    }

    return await db!.getAll(STORE_NAME);
  } catch (err) {
    console.error('Failed to list checkpoints:', err);
    return [];
  }
}

/**
 * Clear old checkpoints (older than specified days)
 */
export async function clearOldCheckpoints(daysOld: number = 7): Promise<number> {
  try {
    if (!db) await initCheckpointDB();

    const cutoffDate = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const allCheckpoints = await db!.getAll(STORE_NAME);

    let deletedCount = 0;
    for (const checkpoint of allCheckpoints) {
      if (checkpoint.lastUpdated < cutoffDate) {
        await db!.delete(STORE_NAME, checkpoint.fileHash);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (err) {
    console.error('Failed to clear old checkpoints:', err);
    return 0;
  }
}

/**
 * Update checkpoint status
 */
export async function updateCheckpointStatus(
  fileHash: string,
  status: OCRCheckpoint['status'],
  error?: string
): Promise<void> {
  try {
    if (!db) await initCheckpointDB();

    const checkpoint = await db!.get(STORE_NAME, fileHash);
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    await db!.put(STORE_NAME, {
      ...checkpoint,
      status,
      error,
      lastUpdated: Date.now(),
    });
  } catch (err) {
    console.error('Failed to update checkpoint status:', err);
    throw new Error('Could not update checkpoint status');
  }
}

/**
 * Get checkpoint statistics
 */
export async function getCheckpointStats(): Promise<{
  total: number;
  inProgress: number;
  completed: number;
  failed: number;
  cancelled: number;
}> {
  try {
    if (!db) await initCheckpointDB();

    const allCheckpoints = await db!.getAll(STORE_NAME);

    return {
      total: allCheckpoints.length,
      inProgress: allCheckpoints.filter((c) => c.status === 'in_progress').length,
      completed: allCheckpoints.filter((c) => c.status === 'completed').length,
      failed: allCheckpoints.filter((c) => c.status === 'failed').length,
      cancelled: allCheckpoints.filter((c) => c.status === 'cancelled').length,
    };
  } catch (err) {
    console.error('Failed to get checkpoint stats:', err);
    return {
      total: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };
  }
}

/**
 * Close the database connection
 */
export function closeCheckpointDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
