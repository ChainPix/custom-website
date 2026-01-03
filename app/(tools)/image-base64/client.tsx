"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Upload } from "lucide-react";

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

const OUTPUT_PREVIEW_CHARS = 140;
const OUTPUT_COLLAPSE_THRESHOLD = 2000;
const MAX_FILE_MB = 10;
const WARNING_MB = 5;
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

const formatInflation = (base64Bytes: number, originalBytes: number) => {
  if (!originalBytes) return "0%";
  const ratio = base64Bytes / originalBytes;
  const pct = (ratio - 1) * 100;
  return `${pct.toFixed(0)}%`;
};

const extractRawBase64 = (dataUrl: string) => {
  if (!dataUrl) return "";
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const [, payload] = dataUrl.split(",");
  return payload ?? "";
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

const base64ToBytes = (payload: string) => {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const parseDataUrl = (value: string) => {
  if (!value.startsWith("data:")) return null;
  const [header, payload] = value.split(",");
  if (!payload) return null;
  if (!header.includes(";base64")) return null;
  const mimeMatch = header.match(/^data:([^;]+)/);
  return {
    mime: mimeMatch?.[1] ?? "application/octet-stream",
    payload,
  };
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
  const matches = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
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

const mimeToExtension = (mime: string) => {
  const normalized = mime.toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/svg+xml") return "svg";
  if (normalized === "image/bmp") return "bmp";
  if (normalized === "image/x-icon") return "ico";
  if (normalized === "image/heic") return "heic";
  if (normalized === "image/heif") return "heif";
  return "";
};

export default function ImageBase64Client() {
  const [activeTab, setActiveTab] = useState<ToolTab>("encode");
  const [encodeMode, setEncodeMode] = useState<EncodeMode>("single");
  const [outputMode, setOutputMode] = useState<OutputMode>("data-url");
  const [preview, setPreview] = useState<string>("");
  const [outputDataUrl, setOutputDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ sizeBytes: number; mime: string } | null>(null);
  const [outputMeta, setOutputMeta] = useState<{ sizeBytes: number; mime: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [maxWidth, setMaxWidth] = useState(1280);
  const [maxHeight, setMaxHeight] = useState(1280);
  const [quality, setQuality] = useState(0.86);
  const [convertPngToWebp, setConvertPngToWebp] = useState(false);
  const [decodeInput, setDecodeInput] = useState("");
  const [decodeError, setDecodeError] = useState("");
  const [decodeWarning, setDecodeWarning] = useState("");
  const [decodeMeta, setDecodeMeta] = useState<DecodeMeta | null>(null);
  const [decodedBlob, setDecodedBlob] = useState<Blob | null>(null);
  const [decodePreviewUrl, setDecodePreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, PendingJob>>(new Map());
  const requestIdRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const decodeObjectUrlRef = useRef<string | null>(null);

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
    const shouldResize = resizeEnabled;
    const shouldConvertPng = convertPngToWebp && file.type === "image/png";
    const targetMime = shouldConvertPng ? "image/webp" : file.type || "image/*";
    const shouldApplyQuality = targetMime === "image/jpeg" || targetMime === "image/webp";
    const shouldReencode = shouldResize || shouldConvertPng || (shouldApplyQuality && quality < 0.99);

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
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
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
        shouldApplyQuality ? quality : undefined
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

  const handleSingleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      setPreview("");
      setOutputDataUrl("");
      setStatus("Invalid file type");
      setWarning("");
      return;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_MB) {
      setError(`File too large (${sizeMb.toFixed(2)} MB). Please choose an image under ${MAX_FILE_MB} MB.`);
      setPreview("");
      setOutputDataUrl("");
      setStatus("File too large");
      setWarning("");
      return;
    }

    if (sizeMb > WARNING_MB) {
      setWarning(`Large file (${sizeMb.toFixed(2)} MB). Processing may take a moment.`);
    } else {
      setWarning("");
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    setFileMeta({ sizeBytes: file.size, mime: file.type || "image/*" });
    setOutputMeta(null);
    setProcessing(true);
    setProgress(0);
    setOutputDataUrl("");
    setOutputExpanded(false);
    setStatus(sizeMb > WARNING_MB ? "Processing large image..." : "Processing image...");

    try {
      const prepared = await prepareImageForEncode(file, true);
      if (prepared.previewUrl) {
        objectUrlRef.current = prepared.previewUrl;
        setPreview(prepared.previewUrl);
      }
      setOutputMeta({ sizeBytes: prepared.outputBytes, mime: prepared.mime });
      const dataUrl = await requestEncode(prepared.buffer, prepared.mime, (loaded, total) => {
        const nextProgress = Math.round((loaded / total) * 100);
        setProgress(nextProgress);
        setStatus(`Encoding... ${nextProgress}%`);
      });
      setOutputDataUrl(dataUrl);
      setError("");
      setStatus("Encoding complete");
    } catch (err) {
      console.error("Failed to read file", err);
      setError(err instanceof Error ? err.message : "Failed to read file.");
      setPreview("");
      setOutputDataUrl("");
      setStatus("Read failed");
      setFileMeta(null);
      setOutputMeta(null);
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const handleBatchFiles = async (files: File[]) => {
    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (!validFiles.length) {
      setError("Please select image files.");
      setStatus("Invalid file type");
      return;
    }
    setError("");
    setWarning("");
    setProcessing(true);
    setStatus("Processing batch...");
    setBatchEntries([]);
    const results: BatchEntry[] = [];
    for (let index = 0; index < validFiles.length; index += 1) {
      const file = validFiles[index];
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) {
        setWarning(`Skipped ${file.name}: larger than ${MAX_FILE_MB} MB.`);
        continue;
      }
      setBatchProgress({ current: index + 1, total: validFiles.length, percent: 0 });
      try {
        const prepared = await prepareImageForEncode(file, false);
        const dataUrl = await requestEncode(prepared.buffer, prepared.mime, (loaded, total) => {
          const percent = Math.round((loaded / total) * 100);
          setBatchProgress({ current: index + 1, total: validFiles.length, percent });
        });
        const rawBase64 = extractRawBase64(dataUrl);
        results.push({
          id: crypto.randomUUID(),
          name: file.name,
          mime: prepared.mime,
          originalBytes: file.size,
          base64Chars: rawBase64.length,
          dataUrl,
          rawBase64,
        });
      } catch (err) {
        console.error("Batch encode failed", err);
        setWarning(`Failed on ${file.name}.`);
      }
    }
    setBatchEntries(results);
    setProcessing(false);
    setBatchProgress(null);
    setStatus("Batch complete");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied output");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const rawBase64 = useMemo(() => extractRawBase64(outputDataUrl), [outputDataUrl]);

  const displayOutput = useMemo(() => {
    return formatOutput(outputDataUrl, rawBase64, outputMode);
  }, [outputDataUrl, rawBase64, outputMode]);

  const outputPreview = useMemo(() => {
    if (!displayOutput) return "";
    if (displayOutput.length <= OUTPUT_COLLAPSE_THRESHOLD || outputExpanded) {
      return displayOutput;
    }
    const head = displayOutput.slice(0, OUTPUT_PREVIEW_CHARS);
    const tail = displayOutput.slice(-OUTPUT_PREVIEW_CHARS);
    return `${head}...${tail}`;
  }, [displayOutput, outputExpanded]);

  const dataUriStats = useMemo(() => {
    if (!outputDataUrl) return null;
    const prefix = outputDataUrl.startsWith("data:")
      ? outputDataUrl.slice(0, outputDataUrl.indexOf(",") + 1)
      : "";
    const content = outputDataUrl.startsWith("data:")
      ? outputDataUrl.slice(outputDataUrl.indexOf(",") + 1)
      : outputDataUrl;
    return {
      totalChars: outputDataUrl.length,
      prefixLength: prefix.length,
      contentLength: content.length,
    };
  }, [outputDataUrl]);

  const outputMemoryBytes = useMemo(() => {
    if (!rawBase64) return 0;
    return base64CharsToBytes(rawBase64.length);
  }, [rawBase64]);

  const handleDownloadText = () => {
    if (!displayOutput) return;
    const blob = new Blob([displayOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "image-output.txt";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded output");
  };

  const handleDownloadImage = () => {
    if (!outputDataUrl) return;
    const parsed = parseDataUrl(outputDataUrl);
    if (!parsed) {
      setStatus("Image download failed");
      setError("Invalid Base64 data.");
      return;
    }
    try {
      const bytes = base64ToBytes(parsed.payload);
      const blob = new Blob([bytes], { type: parsed.mime });
      const url = URL.createObjectURL(blob);
      const ext = mimeToExtension(parsed.mime);
      const a = document.createElement("a");
      a.href = url;
      a.download = ext ? `image-from-base64.${ext}` : "image-from-base64";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Downloaded image");
    } catch (err) {
      console.error("Image download failed", err);
      setStatus("Image download failed");
      setError("Could not decode this Base64 payload.");
    }
  };

  const handleDecode = () => {
    setDecodeError("");
    setDecodeWarning("");
    setDecodeMeta(null);
    setDecodedBlob(null);
    if (decodeObjectUrlRef.current) {
      URL.revokeObjectURL(decodeObjectUrlRef.current);
      decodeObjectUrlRef.current = null;
      setDecodePreviewUrl("");
    }
    const parsed = parseDataUrl(decodeInput.trim());
    const payload = parsed?.payload ?? decodeInput.trim();
    const mime = parsed?.mime ?? "application/octet-stream";
    const validation = validateBase64Payload(payload);
    if (!validation.valid || !validation.payload) {
      setDecodeError(validation.error ?? "Invalid Base64 payload.");
      setStatus("Decode failed");
      return;
    }
    try {
      const base64Bytes = base64CharsToBytes(validation.payload.length);
      const bytes = base64ToBytes(validation.payload);
      const detectedMime = detectMimeFromBytes(bytes);
      const outputMime = parsed?.mime ?? detectedMime ?? mime;
      if (parsed?.mime && detectedMime && parsed.mime !== detectedMime) {
        setDecodeWarning(`MIME mismatch: header says ${parsed.mime}, detected ${detectedMime}.`);
      } else if (parsed?.mime && !parsed.mime.startsWith("image/")) {
        setDecodeWarning(`Header MIME is ${parsed.mime}, which may not be an image.`);
      } else if (detectedMime && !detectedMime.startsWith("image/")) {
        setDecodeWarning(`Detected MIME is ${detectedMime}, which may not be an image.`);
      }
      const blob = new Blob([bytes], { type: outputMime });
      const url = URL.createObjectURL(blob);
      decodeObjectUrlRef.current = url;
      setDecodedBlob(blob);
      setDecodePreviewUrl(url);
      setDecodeMeta({
        mime: outputMime,
        detectedMime: detectedMime ?? undefined,
        sizeBytes: bytes.length,
        base64Bytes,
      });
      setStatus("Decoded image");
    } catch (err) {
      console.error("Decode failed", err);
      setDecodeError("Could not decode this Base64 payload.");
      setStatus("Decode failed");
    }
  };

  const handleDecodeDownload = () => {
    if (!decodedBlob || !decodeMeta) return;
    const url = URL.createObjectURL(decodedBlob);
    const ext = mimeToExtension(decodeMeta.mime);
    const a = document.createElement("a");
    a.href = url;
    a.download = ext ? `decoded-image.${ext}` : "decoded-image";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded decoded image");
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (encodeMode === "batch") {
      void handleBatchFiles(Array.from(files));
      return;
    }
    void handleSingleFile(files[0]);
  };

  const sampleDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9Q2YSmkAAAAASUVORK5CYII=";
  const loadSample = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(sampleDataUrl);
    setOutputDataUrl(sampleDataUrl);
    setError("");
    setWarning("");
    setProgress(null);
    setOutputExpanded(false);
    const payloadLength = sampleDataUrl.split(",")[1]?.length ?? 0;
    const approxBytes = Math.ceil(payloadLength * 0.75);
    setFileMeta({ sizeBytes: approxBytes, mime: "image/png" });
    setOutputMeta({ sizeBytes: approxBytes, mime: "image/png" });
    setStatus("Loaded sample");
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  const onDrag = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (event.type === "dragenter" || event.type === "dragover") setDragActive(true);
    if (event.type === "dragleave") setDragActive(false);
  };

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

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {error}
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
          {activeTab === "encode" ? "Image to Base64" : "Base64 to Image"}
        </h1>
        <p className="max-w-3xl text-base text-slate-700">
          {activeTab === "encode"
            ? "Convert images to Base64 strings locally. Drag and drop an image to get copy-ready output."
            : "Paste a Base64 string to preview and download the decoded image locally."}
        </p>
        <p className="text-sm font-medium text-emerald-700">All processing stays in your browser.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab("encode")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "encode"
              ? "bg-slate-900 text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)]"
              : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          Image to Base64
        </button>
        <button
          onClick={() => setActiveTab("decode")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "decode"
              ? "bg-slate-900 text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)]"
              : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          Base64 to Image
        </button>
      </div>

      {activeTab === "encode" ? (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEncodeMode("single")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  encodeMode === "single" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Single image
              </button>
              <button
                onClick={() => setEncodeMode("batch")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  encodeMode === "batch" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                Batch mode
              </button>
            </div>

            <label
              htmlFor="img-input"
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed ${
                dragActive ? "border-slate-500 bg-slate-50" : "border-slate-300 bg-white"
              } px-4 py-6 text-center text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400`}
              onDragEnter={onDrag}
              onDragOver={onDrag}
              onDragLeave={onDrag}
              onDrop={onDrop}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Upload image by clicking or dragging a file"
            >
              <Upload className="h-5 w-5 text-slate-500" />
              <div>
                <p className="font-semibold text-slate-900">
                  {encodeMode === "batch" ? "Drop images or click to upload" : "Drop an image or click to upload"}
                </p>
                <p className="text-slate-600">PNG, JPG, GIF recommended under 5MB.</p>
              </div>
              <input
                id="img-input"
                type="file"
                accept="image/*"
                multiple={encodeMode === "batch"}
                className="hidden"
                ref={fileInputRef}
                onChange={(event) => handleFiles(event.target.files)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={loadSample}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                aria-label="Use built-in sample image"
              >
                Sample PNG
              </button>
              <button
                onClick={() => {
                  setPreview("");
                  setOutputDataUrl("");
                  setError("");
                  setWarning("");
                  setProgress(null);
                  setOutputExpanded(false);
                  setStatus("Cleared");
                  setFileMeta(null);
                  setOutputMeta(null);
                  setBatchEntries([]);
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
                disabled={!displayOutput || processing}
                aria-label="Copy output"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy output"}
              </button>
              <button
                onClick={handleDownloadText}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
                disabled={!displayOutput || processing}
                aria-label="Download output as text file"
              >
                <Download className="h-4 w-4" />
                Save output
              </button>
              <button
                onClick={handleDownloadImage}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
                disabled={!outputDataUrl || processing}
                aria-label="Download decoded image"
              >
                <Download className="h-4 w-4" />
                Save image
              </button>
            </div>
            {error ? (
              <p className="text-sm font-medium text-amber-600">{error}</p>
            ) : (
              <p className="text-sm text-slate-600">Tip: Great for embeds or data URIs.</p>
            )}
            {warning ? <p className="text-sm font-medium text-amber-600">{warning}</p> : null}
            {fileMeta || dataUriStats ? (
              <div className="text-xs text-slate-600">
                {fileMeta ? (
                  <p>
                    Source: {formatBytes(fileMeta.sizeBytes)} · {fileMeta.mime}
                  </p>
                ) : null}
                {outputMeta ? (
                  <p>
                    Output image: {formatBytes(outputMeta.sizeBytes)} · {outputMeta.mime}
                  </p>
                ) : null}
                {dataUriStats ? (
                  <p>
                    Base64: {dataUriStats.contentLength.toLocaleString()} chars · ~{formatBytes(outputMemoryBytes)} in
                    memory
                  </p>
                ) : null}
                {progress !== null ? <p>Encoding: {progress}%</p> : null}
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
                    onClick={() => setOutputMode(mode.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      outputMode === mode.value
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
                  checked={resizeEnabled}
                  onChange={(event) => setResizeEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Resize before encode
              </label>
              {resizeEnabled ? (
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Max width: {maxWidth}px</span>
                    <input
                      type="range"
                      min={320}
                      max={4096}
                      step={32}
                      value={maxWidth}
                      onChange={(event) => setMaxWidth(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Max height: {maxHeight}px</span>
                    <input
                      type="range"
                      min={320}
                      max={4096}
                      step={32}
                      value={maxHeight}
                      onChange={(event) => setMaxHeight(Number(event.target.value))}
                      className="w-full"
                    />
                  </div>
                  <p>Keeps aspect ratio and fits within the limits.</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                <span>Quality (JPEG/WebP): {quality.toFixed(2)}</span>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.02}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="w-full"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={convertPngToWebp}
                  onChange={(event) => setConvertPngToWebp(event.target.checked)}
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
              {preview ? (
                <Image
                  src={preview}
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
            {encodeMode === "batch" ? (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                  <span>Batch results</span>
                  {batchProgress ? (
                    <span className="text-xs text-slate-500">
                      {batchProgress.current}/{batchProgress.total} · {batchProgress.percent}%
                    </span>
                  ) : null}
                </div>
                {batchEntries.length ? (
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
                        {batchEntries.map((entry) => {
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
                                      formatOutput(entry.dataUrl, entry.rawBase64, outputMode)
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
                    onClick={() => setOutputExpanded((prev) => !prev)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-500"
                    disabled={!displayOutput || displayOutput.length <= OUTPUT_COLLAPSE_THRESHOLD}
                    aria-label={outputExpanded ? "Collapse output" : "Expand output"}
                  >
                    {outputExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>
                <pre className="max-h-[220px] overflow-auto break-all whitespace-pre-wrap p-4 text-xs leading-relaxed text-slate-100">
                  {processing ? "Processing..." : outputPreview || "Encoded output will appear here."}
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
                value={decodeInput}
                onChange={(event) => setDecodeInput(event.target.value)}
                rows={8}
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none"
                placeholder="data:image/png;base64,iVBORw0... or raw Base64 payload"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDecode}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              >
                Decode & preview
              </button>
              <button
                onClick={() => {
                  setDecodeInput("");
                  setDecodeError("");
                  setDecodeWarning("");
                  setDecodeMeta(null);
                  setDecodedBlob(null);
                  setDecodePreviewUrl("");
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
                disabled={!decodedBlob}
              >
                Save image
              </button>
            </div>
            {decodeError ? <p className="text-sm font-medium text-amber-600">{decodeError}</p> : null}
            {decodeWarning ? <p className="text-sm font-medium text-amber-600">{decodeWarning}</p> : null}
            {decodeMeta ? (
              <div className="text-xs text-slate-600">
                <p>Detected MIME: {decodeMeta.detectedMime ?? decodeMeta.mime}</p>
                <p>Decoded size: {formatBytes(decodeMeta.sizeBytes)}</p>
                <p>Approx Base64 memory: {formatBytes(decodeMeta.base64Bytes)}</p>
              </div>
            ) : null}
            {decodeMeta && decodeMeta.base64Bytes > WARNING_MB * 1024 * 1024 ? (
              <p className="text-xs font-medium text-amber-600">
                This string is about {formatBytes(decodeMeta.base64Bytes)} in memory.
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div
              className="flex items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              role="region"
              aria-label="Decoded image preview"
            >
              {decodePreviewUrl ? (
                <Image
                  src={decodePreviewUrl}
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
