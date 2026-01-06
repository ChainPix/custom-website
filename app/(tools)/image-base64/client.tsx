"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { Check, Clipboard, Download, RefreshCcw, Upload } from "lucide-react";
import {
  base64ToBlob,
  base64ToBytes,
  guessExtension,
  parseDataUrl,
  stripPrefix,
} from "./helpers";

type WorkerRequest = {
  id: number;
  buffer: ArrayBuffer;
  mime: string;
};

type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number }
  | { id: number; type: "done"; dataUrl: string }
  | { id: number; type: "error"; message: string };

type OutputMode = "data-url" | "raw" | "css" | "html" | "json" | "markdown";

type ToolTab = "encode" | "decode";

type EncodeMode = "single" | "batch";

type BatchEntry = {
  id: string;
  name: string;
  mime: string;
  originalBytes: number;
  base64Chars: number;
  dataUrl: string;
  rawBase64: string;
};

type PendingJob = {
  resolve: (dataUrl: string) => void;
  reject: (error: Error) => void;
  onProgress?: (loaded: number, total: number) => void;
};

type DecodeMeta = {
  mime: string;
  detectedMime?: string;
  sizeBytes: number;
  base64Bytes: number;
};

type HistoryEntry = {
  id: string;
  kind: "encode" | "decode";
  label: string;
  payload: string;
  mime: string;
  sizeBytes: number;
  createdAt: number;
};

type State = {
  activeTab: ToolTab;
  encodeMode: EncodeMode;
  outputMode: OutputMode;
  preview: string;
  outputDataUrl: string;
  copied: boolean;
  copyError: string;
  error: string;
  status: string;
  warning: string;
  dragActive: boolean;
  fileMeta: { sizeBytes: number; mime: string } | null;
  outputMeta: { sizeBytes: number; mime: string } | null;
  fileName: string;
  processing: boolean;
  progress: number | null;
  outputExpanded: boolean;
  batchEntries: BatchEntry[];
  batchProgress: { current: number; total: number; percent: number } | null;
  resizeEnabled: boolean;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  convertPngToWebp: boolean;
  decodeInput: string;
  decodeError: string;
  decodeWarning: string;
  decodeMeta: DecodeMeta | null;
  decodedBlob: Blob | null;
  decodePreviewUrl: string;
  history: HistoryEntry[];
  historyStatus: "idle" | "loading" | "error";
  snippetMode: "js" | "node" | "python";
};

type Action =
  | { type: "set"; payload: Partial<State> }
  | { type: "resetEncode" }
  | { type: "resetDecode" }
  | { type: "appendHistory"; payload: HistoryEntry }
  | { type: "setHistory"; payload: HistoryEntry[] };

const OUTPUT_PREVIEW_CHARS = 140;
const OUTPUT_COLLAPSE_THRESHOLD = 2000;
const MAX_FILE_MB = 10;
const WARNING_MB = 5;
const HISTORY_LIMIT = 20;

const OUTPUT_MODES: { value: OutputMode; label: string }[] = [
  { value: "data-url", label: "Data URL (full)" },
  { value: "raw", label: "Raw Base64" },
  { value: "css", label: "CSS background-image" },
  { value: "html", label: "HTML img tag" },
  { value: "json", label: "JSON field snippet" },
  { value: "markdown", label: "Markdown image embed" },
];

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const base64CharsToBytes = (chars: number) => Math.ceil(chars * 0.75);

const stripExtension = (name: string) => {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return name;
  return name.slice(0, lastDot);
};

const formatInflation = (base64Bytes: number, originalBytes: number) => {
  if (!originalBytes) return "0%";
  const ratio = base64Bytes / originalBytes;
  const pct = (ratio - 1) * 100;
  return `${pct.toFixed(0)}%`;
};

const formatOutput = (dataUrl: string, rawBase64: string, mode: OutputMode) => {
  if (!dataUrl && !rawBase64) return "";
  switch (mode) {
    case "raw":
      return rawBase64;
    case "css":
      return `background-image: url("${dataUrl}")`;
    case "html":
      return `<img src="${dataUrl}" alt="Image" />`;
    case "json":
      return `{"image":${JSON.stringify(dataUrl)}}`;
    case "markdown":
      return `![Image](${dataUrl})`;
    case "data-url":
    default:
      return dataUrl;
  }
};

const validateBase64Payload = (value: string) => {
  const cleaned = value.replace(/\s+/g, "");
  if (!cleaned) return { valid: false, error: "Paste a Base64 string to decode." };
  if (/[^A-Za-z0-9+/=]/.test(cleaned)) {
    return { valid: false, error: "Base64 contains invalid characters." };
  }
  if (cleaned.length % 4 !== 0) {
    return { valid: false, error: "Base64 length must be a multiple of 4." };
  }
  const paddingIndex = cleaned.indexOf("=");
  if (paddingIndex !== -1 && paddingIndex < cleaned.length - 2) {
    return { valid: false, error: "Base64 padding is in the wrong place." };
  }
  if (paddingIndex !== -1) {
    const padding = cleaned.slice(paddingIndex);
    if (!/^=+$/.test(padding) || padding.length > 2) {
      return { valid: false, error: "Base64 padding is invalid." };
    }
  }
  return { valid: true, payload: cleaned };
};

const detectMimeFromBytes = (bytes: Uint8Array) => {
  if (bytes.length < 4) return null;
  const matches = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (matches([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (matches([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (matches([0x52, 0x49, 0x46, 0x46]) && bytes.length > 12) {
    const webpHeader = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (webpHeader === "WEBP") return "image/webp";
  }
  if (matches([0x42, 0x4d])) return "image/bmp";
  if (matches([0x00, 0x00, 0x01, 0x00])) return "image/x-icon";
  const ascii = new TextDecoder().decode(bytes.slice(0, 200)).trim();
  if (ascii.startsWith("<svg") || ascii.includes("<svg")) return "image/svg+xml";
  return null;
};

const initialState: State = {
  activeTab: "encode",
  encodeMode: "single",
  outputMode: "data-url",
  preview: "",
  outputDataUrl: "",
  copied: false,
  copyError: "",
  error: "",
  status: "Ready",
  warning: "",
  dragActive: false,
  fileMeta: null,
  outputMeta: null,
  fileName: "",
  processing: false,
  progress: null,
  outputExpanded: false,
  batchEntries: [],
  batchProgress: null,
  resizeEnabled: false,
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.86,
  convertPngToWebp: false,
  decodeInput: "",
  decodeError: "",
  decodeWarning: "",
  decodeMeta: null,
  decodedBlob: null,
  decodePreviewUrl: "",
  history: [],
  historyStatus: "idle",
  snippetMode: "js",
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "set":
      return { ...state, ...action.payload };
    case "resetEncode":
      return {
        ...state,
        preview: "",
        outputDataUrl: "",
        error: "",
        warning: "",
        copyError: "",
        progress: null,
        outputExpanded: false,
        status: "Cleared",
        fileMeta: null,
        outputMeta: null,
        fileName: "",
        batchEntries: [],
        batchProgress: null,
      };
    case "resetDecode":
      return {
        ...state,
        decodeInput: "",
        decodeError: "",
        decodeWarning: "",
        decodeMeta: null,
        decodedBlob: null,
        decodePreviewUrl: "",
        copyError: "",
      };
    case "appendHistory":
      return { ...state, history: [action.payload, ...state.history].slice(0, HISTORY_LIMIT) };
    case "setHistory":
      return { ...state, history: action.payload };
    default:
      return state;
  }
};

const DB_NAME = "image-base64-history";
const STORE_NAME = "entries";

const openHistoryDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const writeHistory = async (entry: HistoryEntry) => {
  if (typeof indexedDB === "undefined") return;
  const db = await openHistoryDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

const fetchHistory = async () => {
  if (typeof indexedDB === "undefined") return [] as HistoryEntry[];
  const db = await openHistoryDb();
  const entries = await new Promise<HistoryEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as HistoryEntry[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, HISTORY_LIMIT);
};

const clearHistory = async () => {
  if (typeof indexedDB === "undefined") return;
  const db = await openHistoryDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

const snippets = {
  js: `// Browser: file input -> Base64\nconst fileInput = document.querySelector("input[type=file]");\nfileInput.addEventListener("change", async (event) => {\n  const file = event.target.files[0];\n  const buffer = await file.arrayBuffer();\n  const bytes = new Uint8Array(buffer);\n  let binary = "";\n  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));\n  const base64 = btoa(binary);\n  const dataUrl = \`data:\${file.type};base64,\${base64}\`;\n  console.log(dataUrl);\n});`,
  node: `// Node: fs.readFileSync -> Base64\nconst fs = require("fs");\nconst path = require("path");\nconst filePath = path.resolve("./image.png");\nconst data = fs.readFileSync(filePath);\nconst base64 = data.toString("base64");\nconst dataUrl = "data:image/png;base64," + base64;\nconsole.log(dataUrl);`,
  python: `# Python: Base64 encode\nimport base64\nfrom pathlib import Path\n\nfile_path = Path("./image.png")\ndata = file_path.read_bytes()\nbase64_str = base64.b64encode(data).decode("utf-8")\ndata_url = f"data:image/png;base64,{base64_str}"\nprint(data_url)`,
};

export default function ImageBase64Client() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, PendingJob>>(new Map());
  const requestIdRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const decodeObjectUrlRef = useRef<string | null>(null);

  const updateState = (patch: Partial<State>) => dispatch({ type: "set", payload: patch });

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./image-base64.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const pending = pendingRef.current.get(message.id);
      if (!pending) return;
      if (message.type === "progress") {
        pending.onProgress?.(message.loaded, message.total);
        return;
      }
      if (message.type === "error") {
        pendingRef.current.delete(message.id);
        pending.reject(new Error(message.message));
        return;
      }
      pendingRef.current.delete(message.id);
      pending.resolve(message.dataUrl);
    };
    workerRef.current = worker;
    return worker;
  };

  const requestEncode = (buffer: ArrayBuffer, mime: string, onProgress?: (loaded: number, total: number) => void) => {
    const worker = ensureWorker();
    const nextId = requestIdRef.current + 1;
    requestIdRef.current = nextId;
    return new Promise<string>((resolve, reject) => {
      pendingRef.current.set(nextId, { resolve, reject, onProgress });
      worker.postMessage({ id: nextId, buffer, mime } satisfies WorkerRequest, [buffer]);
    });
  };

  const prepareImageForEncode = async (file: File, withPreview: boolean) => {
    const shouldResize = state.resizeEnabled;
    const shouldConvertPng = state.convertPngToWebp && file.type === "image/png";
    const targetMime = shouldConvertPng ? "image/webp" : file.type || "image/*";
    const shouldApplyQuality = targetMime === "image/jpeg" || targetMime === "image/webp";
    const shouldReencode = shouldResize || shouldConvertPng || (shouldApplyQuality && state.quality < 0.99);

    if (!shouldReencode) {
      const buffer = await file.arrayBuffer();
      return {
        buffer,
        mime: file.type || "image/*",
        previewUrl: withPreview ? URL.createObjectURL(file) : "",
        outputBytes: file.size,
      };
    }

    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    let targetWidth = width;
    let targetHeight = height;
    if (shouldResize) {
      const scale = Math.min(state.maxWidth / width, state.maxHeight / height, 1);
      targetWidth = Math.max(1, Math.round(width * scale));
      targetHeight = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      throw new Error("Canvas not available for resize.");
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close?.();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(new Error("Failed to encode resized image."));
            return;
          }
          resolve(result);
        },
        targetMime,
        shouldApplyQuality ? state.quality : undefined
      );
    });
    const buffer = await blob.arrayBuffer();
    return {
      buffer,
      mime: targetMime,
      previewUrl: withPreview ? URL.createObjectURL(blob) : "",
      outputBytes: blob.size,
    };
  };

  const addHistoryEntry = async (entry: HistoryEntry) => {
    try {
      await writeHistory(entry);
      dispatch({ type: "appendHistory", payload: entry });
    } catch (err) {
      console.error("History write failed", err);
    }
  };

  const handleSingleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      updateState({
        error: "Please select an image file.",
        preview: "",
        outputDataUrl: "",
        status: "Invalid file type",
        warning: "",
      });
      return;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_MB) {
      updateState({
        error: `File too large (${sizeMb.toFixed(2)} MB). Please choose an image under ${MAX_FILE_MB} MB.`,
        preview: "",
        outputDataUrl: "",
        status: "File too large",
        warning: "",
      });
      return;
    }

    updateState({
      warning: sizeMb > WARNING_MB ? `Large file (${sizeMb.toFixed(2)} MB). Processing may take a moment.` : "",
    });

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    updateState({
      fileMeta: { sizeBytes: file.size, mime: file.type || "image/*" },
      outputMeta: null,
      fileName: file.name,
      copyError: "",
      processing: true,
      progress: 0,
      outputDataUrl: "",
      outputExpanded: false,
      status: sizeMb > WARNING_MB ? "Processing large image..." : "Processing image...",
    });

    try {
      const prepared = await prepareImageForEncode(file, true);
      if (prepared.previewUrl) {
        objectUrlRef.current = prepared.previewUrl;
        updateState({ preview: prepared.previewUrl });
      }
      updateState({ outputMeta: { sizeBytes: prepared.outputBytes, mime: prepared.mime } });
      const dataUrl = await requestEncode(prepared.buffer, prepared.mime, (loaded, total) => {
        const nextProgress = Math.round((loaded / total) * 100);
        updateState({ progress: nextProgress, status: `Encoding... ${nextProgress}%` });
      });
      updateState({ outputDataUrl: dataUrl, error: "", status: "Encoding complete" });
      await addHistoryEntry({
        id: crypto.randomUUID(),
        kind: "encode",
        label: file.name,
        payload: dataUrl,
        mime: prepared.mime,
        sizeBytes: prepared.outputBytes,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error("Failed to read file", err);
      updateState({
        error: err instanceof Error ? err.message : "Failed to read file.",
        preview: "",
        outputDataUrl: "",
        status: "Read failed",
        fileMeta: null,
        outputMeta: null,
      });
    } finally {
      updateState({ processing: false, progress: null });
    }
  };

  const handleBatchFiles = async (files: File[]) => {
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!validFiles.length) {
      updateState({ error: "Please select image files.", status: "Invalid file type" });
      return;
    }
    updateState({
      error: "",
      warning: "",
      processing: true,
      status: "Processing batch...",
      batchEntries: [],
    });

    const results: BatchEntry[] = [];
    for (let index = 0; index < validFiles.length; index += 1) {
      const file = validFiles[index];
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) {
        updateState({ warning: `Skipped ${file.name}: larger than ${MAX_FILE_MB} MB.` });
        continue;
      }
      updateState({ batchProgress: { current: index + 1, total: validFiles.length, percent: 0 } });
      try {
        const prepared = await prepareImageForEncode(file, false);
        const dataUrl = await requestEncode(prepared.buffer, prepared.mime, (loaded, total) => {
          const percent = Math.round((loaded / total) * 100);
          updateState({ batchProgress: { current: index + 1, total: validFiles.length, percent } });
        });
        const rawBase64 = stripPrefix(dataUrl);
        results.push({
          id: crypto.randomUUID(),
          name: file.name,
          mime: prepared.mime,
          originalBytes: file.size,
          base64Chars: rawBase64.length,
          dataUrl,
          rawBase64,
        });
        await addHistoryEntry({
          id: crypto.randomUUID(),
          kind: "encode",
          label: file.name,
          payload: dataUrl,
          mime: prepared.mime,
          sizeBytes: prepared.outputBytes,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.error("Batch encode failed", err);
        updateState({ warning: `Failed on ${file.name}.` });
      }
    }
    updateState({ batchEntries: results, processing: false, batchProgress: null, status: "Batch complete" });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayOutput);
      updateState({ copied: true, status: "Copied output", copyError: "" });
      setTimeout(() => updateState({ copied: false }), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      updateState({
        status: "Copy failed",
        copyError: "Clipboard blocked. Use Cmd/Ctrl+C or allow clipboard access in your browser.",
      });
    }
  };

  const handleDownloadText = () => {
    if (!displayOutput) return;
    const blob = new Blob([displayOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = state.fileName ? stripExtension(state.fileName) : "image";
    a.download = `${baseName}-base64.txt`;
    a.click();
    URL.revokeObjectURL(url);
    updateState({ status: "Downloaded output" });
  };

  const handleDownloadImage = () => {
    if (!state.outputDataUrl) return;
    const parsed = parseDataUrl(state.outputDataUrl);
    if (!parsed) {
      updateState({ status: "Image download failed", error: "Invalid Base64 data." });
      return;
    }
    try {
      const blob = base64ToBlob(parsed.payload, parsed.mime);
      const url = URL.createObjectURL(blob);
      const ext = guessExtension(parsed.mime);
      const a = document.createElement("a");
      a.href = url;
      const baseName = state.fileName ? stripExtension(state.fileName) : "image-from-base64";
      a.download = ext ? `${baseName}.${ext}` : baseName;
      a.click();
      URL.revokeObjectURL(url);
      updateState({ status: "Downloaded image" });
    } catch (err) {
      console.error("Image download failed", err);
      updateState({ status: "Image download failed", error: "Could not decode this Base64 payload." });
    }
  };

  const handleDecodeFromValue = async (value: string, addToHistory = true) => {
    updateState({ decodeError: "", decodeWarning: "", decodeMeta: null, decodedBlob: null });
    if (decodeObjectUrlRef.current) {
      URL.revokeObjectURL(decodeObjectUrlRef.current);
      decodeObjectUrlRef.current = null;
      updateState({ decodePreviewUrl: "" });
    }
    const parsed = parseDataUrl(value.trim());
    const payload = parsed?.payload ?? value.trim();
    const mime = parsed?.mime ?? "application/octet-stream";
    const validation = validateBase64Payload(payload);
    if (!validation.valid || !validation.payload) {
      updateState({ decodeError: validation.error ?? "Invalid Base64 payload.", status: "Decode failed" });
      return;
    }
    try {
      const base64Bytes = base64CharsToBytes(validation.payload.length);
      const bytes = base64ToBytes(validation.payload);
      const detectedMime = detectMimeFromBytes(bytes);
      const outputMime = parsed?.mime ?? detectedMime ?? mime;
      if (parsed?.mime && detectedMime && parsed.mime !== detectedMime) {
        updateState({ decodeWarning: `MIME mismatch: header says ${parsed.mime}, detected ${detectedMime}.` });
      } else if (parsed?.mime && !parsed.mime.startsWith("image/")) {
        updateState({ decodeWarning: `Header MIME is ${parsed.mime}, which may not be an image.` });
      } else if (detectedMime && !detectedMime.startsWith("image/")) {
        updateState({ decodeWarning: `Detected MIME is ${detectedMime}, which may not be an image.` });
      }
      const blob = base64ToBlob(validation.payload, outputMime);
      const url = URL.createObjectURL(blob);
      decodeObjectUrlRef.current = url;
      updateState({
        decodedBlob: blob,
        decodePreviewUrl: url,
        decodeMeta: {
          mime: outputMime,
          detectedMime: detectedMime ?? undefined,
          sizeBytes: bytes.length,
          base64Bytes,
        },
        status: "Decoded image",
      });
      if (addToHistory) {
        await addHistoryEntry({
          id: crypto.randomUUID(),
          kind: "decode",
          label: parsed?.mime ? "Data URL" : "Base64 payload",
          payload: value.trim(),
          mime: outputMime,
          sizeBytes: bytes.length,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("Decode failed", err);
      updateState({ decodeError: "Could not decode this Base64 payload.", status: "Decode failed" });
    }
  };

  const handleDecode = () => {
    void handleDecodeFromValue(state.decodeInput);
  };

  const handleDecodeDownload = () => {
    if (!state.decodedBlob || !state.decodeMeta) return;
    const url = URL.createObjectURL(state.decodedBlob);
    const ext = guessExtension(state.decodeMeta.mime);
    const a = document.createElement("a");
    a.href = url;
    a.download = ext ? `decoded-image.${ext}` : "decoded-image";
    a.click();
    URL.revokeObjectURL(url);
    updateState({ status: "Downloaded decoded image" });
  };

  const handlePasteImage = async () => {
    if (!navigator.clipboard?.read) {
      updateState({ error: "Clipboard image paste is not supported in this browser." });
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const ext = guessExtension(blob.type) || "png";
        const file = new File([blob], `pasted-image.${ext}`, { type: blob.type });
        updateState({ encodeMode: "single" });
        await handleSingleFile(file);
        return;
      }
      updateState({ error: "Clipboard does not contain an image." });
    } catch (err) {
      console.error("Clipboard paste failed", err);
      updateState({ error: "Clipboard access was blocked. Allow clipboard permissions and try again." });
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (state.encodeMode === "batch") {
      void handleBatchFiles(Array.from(files));
      return;
    }
    void handleSingleFile(files[0]);
  };

  const loadSample = () => {
    const sampleDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9Q2YSmkAAAAASUVORK5CYII=";
    const payloadLength = stripPrefix(sampleDataUrl).length;
    const approxBytes = base64CharsToBytes(payloadLength);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    updateState({
      preview: sampleDataUrl,
      outputDataUrl: sampleDataUrl,
      error: "",
      warning: "",
      progress: null,
      outputExpanded: false,
      fileMeta: { sizeBytes: approxBytes, mime: "image/png" },
      outputMeta: { sizeBytes: approxBytes, mime: "image/png" },
      fileName: "sample.png",
      status: "Loaded sample",
    });
  };

  const loadHistoryEntry = async (entry: HistoryEntry) => {
    if (entry.kind === "encode") {
      updateState({
        activeTab: "encode",
        outputDataUrl: entry.payload,
        preview: entry.payload,
        outputMeta: { sizeBytes: entry.sizeBytes, mime: entry.mime },
        fileName: entry.label,
        status: "Loaded from history",
      });
      return;
    }
    updateState({ activeTab: "decode", decodeInput: entry.payload, status: "Loaded from history" });
    await handleDecodeFromValue(entry.payload, false);
  };

  useEffect(() => {
    const load = async () => {
      updateState({ historyStatus: "loading" });
      try {
        const entries = await fetchHistory();
        dispatch({ type: "setHistory", payload: entries });
        updateState({ historyStatus: "idle" });
      } catch (err) {
        console.error("History load failed", err);
        updateState({ historyStatus: "error" });
      }
    };
    void load();
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (decodeObjectUrlRef.current) {
        URL.revokeObjectURL(decodeObjectUrlRef.current);
      }
      workerRef.current?.terminate();
    };
  }, []);

  const rawBase64 = useMemo(() => stripPrefix(state.outputDataUrl), [state.outputDataUrl]);

  const displayOutput = useMemo(() => {
    return formatOutput(state.outputDataUrl, rawBase64, state.outputMode);
  }, [state.outputDataUrl, rawBase64, state.outputMode]);

  const outputPreview = useMemo(() => {
    if (!displayOutput) return "";
    if (displayOutput.length <= OUTPUT_COLLAPSE_THRESHOLD || state.outputExpanded) {
      return displayOutput;
    }
    const head = displayOutput.slice(0, OUTPUT_PREVIEW_CHARS);
    const tail = displayOutput.slice(-OUTPUT_PREVIEW_CHARS);
    return `${head}...${tail}`;
  }, [displayOutput, state.outputExpanded]);

  const dataUriStats = useMemo(() => {
    if (!state.outputDataUrl) return null;
    const prefix = state.outputDataUrl.startsWith("data:")
      ? state.outputDataUrl.slice(0, state.outputDataUrl.indexOf(",") + 1)
      : "";
    const content = state.outputDataUrl.startsWith("data:")
      ? state.outputDataUrl.slice(state.outputDataUrl.indexOf(",") + 1)
      : state.outputDataUrl;
    return {
      totalChars: state.outputDataUrl.length,
      prefixLength: prefix.length,
      contentLength: content.length,
    };
  }, [state.outputDataUrl]);

  const outputMemoryBytes = useMemo(() => {
    if (!rawBase64) return 0;
    return base64CharsToBytes(rawBase64.length);
  }, [rawBase64]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {state.status} {state.warning} {state.error}
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
              Image to Base64
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">
          {state.activeTab === "encode" ? "Image to Base64" : "Base64 to Image"}
        </h1>
        <p className="max-w-3xl text-base text-slate-700">
          {state.activeTab === "encode"
            ? "Convert images to Base64 strings locally. Drag and drop an image to get copy-ready output."
            : "Paste a Base64 string to preview and download the decoded image locally."}
        </p>
        <p className="text-sm font-medium text-emerald-700">All processing stays in your browser.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => updateState({ activeTab: "encode" })}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            state.activeTab === "encode"
              ? "bg-slate-900 text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)]"
              : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          Image to Base64
        </button>
        <button
          onClick={() => updateState({ activeTab: "decode" })}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            state.activeTab === "decode"
              ? "bg-slate-900 text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)]"
              : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          Base64 to Image
        </button>
      </div>

      {state.activeTab === "encode" ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => updateState({ encodeMode: "single" })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  state.encodeMode === "single"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Single image
              </button>
              <button
                onClick={() => updateState({ encodeMode: "batch" })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  state.encodeMode === "batch"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Batch mode
              </button>
            </div>

            <label
              htmlFor="img-input"
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed ${
                state.dragActive ? "border-slate-500 bg-slate-50" : "border-slate-300 bg-white"
              } px-4 py-6 text-center text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400`}
              onDragEnter={(event) => {
                event.preventDefault();
                updateState({ dragActive: true });
              }}
              onDragOver={(event) => {
                event.preventDefault();
                updateState({ dragActive: true });
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                updateState({ dragActive: false });
              }}
              onDrop={(event) => {
                event.preventDefault();
                updateState({ dragActive: false });
                handleFiles(event.dataTransfer.files);
              }}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload image by clicking or dragging a file"
            >
              <Upload className="h-5 w-5 text-slate-500" />
              <div>
                <p className="font-semibold text-slate-900">
                  {state.encodeMode === "batch" ? "Drop images or click to upload" : "Drop an image or click to upload"}
                </p>
                <p className="text-slate-600">PNG, JPG, GIF recommended under 5MB.</p>
              </div>
              <input
                id="img-input"
                type="file"
                accept="image/*"
                multiple={state.encodeMode === "batch"}
                className="hidden"
                ref={fileInputRef}
                onChange={(event) => handleFiles(event.target.files)}
              />
            </label>
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-2 backdrop-blur md:static md:bg-transparent md:p-0">
              <button
                onClick={loadSample}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Use built-in sample image"
              >
                Sample PNG
              </button>
              <button
                onClick={handlePasteImage}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Paste image from clipboard"
              >
                Paste image
              </button>
              <button
                onClick={() => {
                  dispatch({ type: "resetEncode" });
                  if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                  }
                }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Clear preview and output"
              >
                <RefreshCcw className="h-4 w-4" />
                Clear
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
                disabled={!displayOutput || state.processing}
                aria-label="Copy output"
              >
                {state.copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {state.copied ? "Copied" : "Copy output"}
              </button>
              <button
                onClick={handleDownloadText}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
                disabled={!displayOutput || state.processing}
                aria-label="Download output as text file"
              >
                <Download className="h-4 w-4" />
                Save output
              </button>
              <button
                onClick={handleDownloadImage}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
                disabled={!state.outputDataUrl || state.processing}
                aria-label="Download decoded image"
              >
                <Download className="h-4 w-4" />
                Save image
              </button>
            </div>
            {state.copyError ? <p className="text-xs font-medium text-amber-600">{state.copyError}</p> : null}
            {state.error ? (
              <p className="text-sm font-medium text-amber-600">{state.error}</p>
            ) : (
              <p className="text-sm text-slate-600">Tip: Great for embeds or data URIs.</p>
            )}
            {state.warning ? <p className="text-sm font-medium text-amber-600">{state.warning}</p> : null}
            {state.fileMeta || dataUriStats ? (
              <div className="text-xs text-slate-600">
                {state.fileMeta ? (
                  <p>
                    Source: {formatBytes(state.fileMeta.sizeBytes)} · {state.fileMeta.mime}
                  </p>
                ) : null}
                {state.outputMeta ? (
                  <p>
                    Output image: {formatBytes(state.outputMeta.sizeBytes)} · {state.outputMeta.mime}
                  </p>
                ) : null}
                {dataUriStats ? (
                  <p>
                    Base64: {dataUriStats.contentLength.toLocaleString()} chars · ~{formatBytes(outputMemoryBytes)} in
                    memory
                  </p>
                ) : null}
                {state.progress !== null ? <p>Encoding: {state.progress}%</p> : null}
              </div>
            ) : null}
            {outputMemoryBytes > WARNING_MB * 1024 * 1024 ? (
              <p className="text-xs font-medium text-amber-600">
                This string is about {formatBytes(outputMemoryBytes)} in memory.
              </p>
            ) : null}
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output mode</p>
              <div className="flex flex-wrap gap-2">
                {OUTPUT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => updateState({ outputMode: mode.value })}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      state.outputMode === mode.value
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compression helpers</p>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={state.resizeEnabled}
                  onChange={(event) => updateState({ resizeEnabled: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Resize before encode
              </label>
              {state.resizeEnabled ? (
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Max width: {state.maxWidth}px</span>
                    <input
                      type="range"
                      min={320}
                      max={4096}
                      step={32}
                      value={state.maxWidth}
                      onChange={(event) => updateState({ maxWidth: Number(event.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Max height: {state.maxHeight}px</span>
                    <input
                      type="range"
                      min={320}
                      max={4096}
                      step={32}
                      value={state.maxHeight}
                      onChange={(event) => updateState({ maxHeight: Number(event.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <p>Keeps aspect ratio and fits within the limits.</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                <span>Quality (JPEG/WebP): {state.quality.toFixed(2)}</span>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.02}
                  value={state.quality}
                  onChange={(event) => updateState({ quality: Number(event.target.value) })}
                  className="w-full"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={state.convertPngToWebp}
                  onChange={(event) => updateState({ convertPngToWebp: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Convert PNG to WebP before encoding
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className="flex items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              role="region"
              aria-label="Image preview"
            >
              {state.preview ? (
                <Image
                  src={state.preview}
                  alt="Preview"
                  width={240}
                  height={240}
                  className="max-h-60 w-auto"
                  unoptimized
                />
              ) : (
                <p className="text-sm text-slate-500">Preview will appear here.</p>
              )}
            </div>
            {state.encodeMode === "batch" ? (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span>Batch results</span>
                  {state.batchProgress ? (
                    <span className="text-xs text-slate-500">
                      {state.batchProgress.current}/{state.batchProgress.total} · {state.batchProgress.percent}%
                    </span>
                  ) : null}
                </div>
                {state.batchEntries.length ? (
                  <div className="mt-3 overflow-auto">
                    <table className="min-w-full text-left text-xs text-slate-700">
                      <thead className="text-[11px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2 py-1">File</th>
                          <th className="px-2 py-1">MIME</th>
                          <th className="px-2 py-1">Original</th>
                          <th className="px-2 py-1">Base64 size</th>
                          <th className="px-2 py-1">Inflation</th>
                          <th className="px-2 py-1">Copy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {state.batchEntries.map((entry) => {
                          const base64Bytes = base64CharsToBytes(entry.base64Chars);
                          return (
                            <tr key={entry.id}>
                              <td className="px-2 py-2">{entry.name}</td>
                              <td className="px-2 py-2">{entry.mime}</td>
                              <td className="px-2 py-2">{formatBytes(entry.originalBytes)}</td>
                              <td className="px-2 py-2">{formatBytes(base64Bytes)}</td>
                              <td className="px-2 py-2">{formatInflation(base64Bytes, entry.originalBytes)}</td>
                              <td className="px-2 py-2">
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      formatOutput(entry.dataUrl, entry.rawBase64, state.outputMode)
                                    )
                                  }
                                  className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Copy
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Batch outputs will appear here.</p>
                )}
              </div>
            ) : (
              <div
                className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
                role="region"
                aria-labelledby="base64-output-heading"
              >
                <div
                  id="base64-output-heading"
                  className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-sm font-semibold"
                >
                  <span>Output</span>
                  <button
                    onClick={() => updateState({ outputExpanded: !state.outputExpanded })}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-500"
                    disabled={!displayOutput || displayOutput.length <= OUTPUT_COLLAPSE_THRESHOLD}
                    aria-label={state.outputExpanded ? "Collapse output" : "Expand output"}
                  >
                    {state.outputExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>
                <pre className="max-h-[220px] overflow-auto break-all whitespace-pre-wrap p-4 text-xs leading-relaxed text-slate-100">
                  {state.processing ? "Processing..." : outputPreview || "Encoded output will appear here."}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <div className="space-y-2">
              <label htmlFor="base64-input" className="text-sm font-semibold text-slate-900">
                Paste Base64 or Data URL
              </label>
              <textarea
                id="base64-input"
                value={state.decodeInput}
                onChange={(event) => updateState({ decodeInput: event.target.value })}
                rows={8}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none"
                placeholder="data:image/png;base64,iVBORw0... or raw Base64 payload"
              />
            </div>
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-2 backdrop-blur md:static md:bg-transparent md:p-0">
              <button
                onClick={handleDecode}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              >
                Decode & preview
              </button>
              <button
                onClick={() => {
                  dispatch({ type: "resetDecode" });
                  if (decodeObjectUrlRef.current) {
                    URL.revokeObjectURL(decodeObjectUrlRef.current);
                    decodeObjectUrlRef.current = null;
                  }
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
              >
                Clear
              </button>
              <button
                onClick={handleDecodeDownload}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 disabled:opacity-50"
                disabled={!state.decodedBlob}
              >
                Save image
              </button>
            </div>
            {state.decodeError ? <p className="text-sm font-medium text-amber-600">{state.decodeError}</p> : null}
            {state.decodeWarning ? <p className="text-sm font-medium text-amber-600">{state.decodeWarning}</p> : null}
            {state.decodeMeta ? (
              <div className="text-xs text-slate-600">
                <p>Detected MIME: {state.decodeMeta.detectedMime ?? state.decodeMeta.mime}</p>
                <p>Decoded size: {formatBytes(state.decodeMeta.sizeBytes)}</p>
                <p>Approx Base64 memory: {formatBytes(state.decodeMeta.base64Bytes)}</p>
              </div>
            ) : null}
            {state.decodeMeta && state.decodeMeta.base64Bytes > WARNING_MB * 1024 * 1024 ? (
              <p className="text-xs font-medium text-amber-600">
                This string is about {formatBytes(state.decodeMeta.base64Bytes)} in memory.
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div
              className="flex items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              role="region"
              aria-label="Decoded image preview"
            >
              {state.decodePreviewUrl ? (
                <Image
                  src={state.decodePreviewUrl}
                  alt="Decoded preview"
                  width={240}
                  height={240}
                  className="max-h-60 w-auto"
                  unoptimized
                />
              ) : (
                <p className="text-sm text-slate-500">Decoded preview will appear here.</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-900 p-4 text-xs text-slate-200">
              <p className="font-semibold text-white">Validation</p>
              <p>We check padding, invalid characters, and image MIME signatures.</p>
              <p>Use a full data URL to preserve MIME details.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">API / CLI snippets</h2>
            <div className="flex gap-2">
              {(["js", "node", "python"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateState({ snippetMode: mode })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    state.snippetMode === mode
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <pre className="mt-3 max-h-[200px] overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
            {snippets[state.snippetMode]}
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(snippets[state.snippetMode])}
            className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Copy snippet
          </button>
        </div>

        <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">History</h2>
            <button
              onClick={async () => {
                await clearHistory();
                updateState({ history: [] });
              }}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
            >
              Clear all
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Stored locally in IndexedDB on this device only.</p>
          {state.historyStatus === "loading" ? (
            <p className="mt-3 text-xs text-slate-500">Loading history...</p>
          ) : state.history.length ? (
            <div className="mt-3 space-y-2">
              {state.history.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">{entry.label}</span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {entry.kind === "encode" ? "Encode" : "Decode"} · {entry.mime} · {formatBytes(entry.sizeBytes)}
                    </span>
                    <button
                      onClick={() => loadHistoryEntry(entry)}
                      className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white"
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No history yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Switch between Image → Base64 and Base64 → Image using the tabs.</li>
          <li>Choose output mode (data URL, raw Base64, CSS/HTML/JSON/Markdown snippets).</li>
          <li>Batch mode supports multiple files and gives size inflation stats.</li>
          <li>Use compression helpers to resize or convert PNG → WebP before encoding.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes, images never leave your browser.</p>
          <p><strong>Why Base64?</strong> Useful for data URIs and embedding small assets without hosting.</p>
          <p><strong>Formats?</strong> Common web formats (PNG/JPG/GIF) and other image/* types supported by your browser.</p>
          <p><strong>Size limits?</strong> Over ~10 MB is blocked; 5–10 MB shows a warning to prevent slowdowns.</p>
        </div>
      </div>
    </main>
  );
}
