"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Clipboard, Download } from "lucide-react";

const MAX_SIZE_BYTES = 512 * 1024;
const WORKER_THRESHOLD = 64 * 1024;
const textEncoder = new TextEncoder();
const strictTextDecoder = new TextDecoder("utf-8", { fatal: true });
const fallbackTextDecoder = new TextDecoder("utf-8");
const HISTORY_STORAGE_KEY = "base64-history";
const HISTORY_EVENT = "base64-history-change";
const EMPTY_HISTORY: HistoryEntry[] = [];
let cachedHistoryRaw: string | null = null;
let cachedHistorySnapshot: HistoryEntry[] = EMPTY_HISTORY;

type HistoryEntry = {
  id: string;
  action: "encode" | "decode";
  input: string;
  output: string;
  variant: "standard" | "url";
  decodeMode: "lenient" | "strict";
  timestamp: number;
};

const readHistorySnapshot = (): HistoryEntry[] => {
  if (typeof window === "undefined") {
    return EMPTY_HISTORY;
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw === cachedHistoryRaw) {
      return cachedHistorySnapshot;
    }

    cachedHistoryRaw = raw;
    cachedHistorySnapshot = raw ? (JSON.parse(raw) as HistoryEntry[]) : EMPTY_HISTORY;
    return cachedHistorySnapshot;
  } catch (err) {
    console.error("History load failed", err);
    cachedHistoryRaw = null;
    cachedHistorySnapshot = EMPTY_HISTORY;
    return EMPTY_HISTORY;
  }
};

export default function Base64Client() {
  const [base64Value, setBase64Value] = useState("");
  const [textValue, setTextValue] = useState("");
  const [copied, setCopied] = useState<"base64" | "text" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [decodeMode, setDecodeMode] = useState<"lenient" | "strict">("lenient");
  const [lastAction, setLastAction] = useState<"encode" | "decode" | null>(null);
  const [base64Variant, setBase64Variant] = useState<"standard" | "url">("standard");
  const [fileSource, setFileSource] = useState<File | null>(null);
  const [includeDataUri, setIncludeDataUri] = useState(true);
  const [downloadName, setDownloadName] = useState("decoded.bin");
  const [wrapOutput, setWrapOutput] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = useSyncExternalStore(
    (onStoreChange) => {
      const handleChange = () => onStoreChange();
      window.addEventListener("storage", handleChange);
      window.addEventListener(HISTORY_EVENT, handleChange);
      return () => {
        window.removeEventListener("storage", handleChange);
        window.removeEventListener(HISTORY_EVENT, handleChange);
      };
    },
    readHistorySnapshot,
    () => EMPTY_HISTORY,
  );
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workProgress, setWorkProgress] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const syncTokenRef = useRef(0);

  const clearPreview = useCallback(() => {
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    setPreviewMime("");
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.ts", import.meta.url));
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const bytesToBase64 = (bytes: Uint8Array) => {
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const estimateBase64Size = (byteLength: number) => Math.ceil(byteLength / 3) * 4;

  const wrapBase64Output = (value: string, width = 76) => {
    if (!value || value.startsWith("data:")) return value;
    const stripped = value.replace(/\s+/g, "");
    let wrapped = "";
    for (let i = 0; i < stripped.length; i += width) {
      wrapped += stripped.slice(i, i + width);
      if (i + width < stripped.length) {
        wrapped += "\n";
      }
    }
    return wrapped;
  };

  const base64ToBytes = (value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const decodeBytesToText = (bytes: Uint8Array) => {
    try {
      return strictTextDecoder.decode(bytes);
    } catch {
      return fallbackTextDecoder.decode(bytes);
    }
  };

  const toBase64Url = (value: string) => value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const showToast = (message: string, tone: "success" | "error") => {
    setToast({ message, tone });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 1800);
  };

  const parseDataUri = (value: string) => {
    if (!value.startsWith("data:")) {
      return { isDataUri: false, isBase64: false, mime: "", data: value };
    }
    const commaIndex = value.indexOf(",");
    if (commaIndex === -1) {
      return { isDataUri: true, isBase64: false, mime: "", data: "" };
    }
    const meta = value.slice(5, commaIndex);
    const data = value.slice(commaIndex + 1);
    const isBase64 = meta.endsWith(";base64");
    const mime = meta.replace(/;base64$/, "") || "application/octet-stream";
    return { isDataUri: true, isBase64, mime, data };
  };

  const truncateForHistory = (value: string, limit = 5000) => {
    if (value.length <= limit) return value;
    return `${value.slice(0, limit)}...`;
  };

  const persistHistory = useCallback((nextHistory: HistoryEntry[]) => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      window.dispatchEvent(new Event(HISTORY_EVENT));
    } catch (err) {
      console.error("History save failed", err);
    }
  }, []);

  const addHistoryEntry = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const prev = history;
    const alreadyLatest =
      prev[0] &&
      prev[0].action === entry.action &&
      prev[0].input === truncateForHistory(entry.input) &&
      prev[0].output === truncateForHistory(entry.output) &&
      prev[0].variant === entry.variant &&
      prev[0].decodeMode === entry.decodeMode;
    if (alreadyLatest) {
      return;
    }

    const next = [
      {
        ...entry,
        input: truncateForHistory(entry.input),
        output: truncateForHistory(entry.output),
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      },
      ...prev,
    ].slice(0, 10);
    persistHistory(next);
  }, [history, persistHistory]);

  const runWorker = (
    message:
      | { action: "encodeText"; payload: { text: string; variant: "standard" | "url" } }
      | { action: "decodeText"; payload: { base64: string } }
      | { action: "encodeBytes"; payload: { bytes: Uint8Array; variant: "standard" | "url" } },
    transfer?: Transferable[],
  ) =>
    new Promise<string>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        reject(new Error("Worker unavailable"));
        return;
      }
      const id = crypto.randomUUID();
      const handleMessage = (event: MessageEvent) => {
        const data = event.data as {
          id: string;
          type: "progress" | "done" | "error";
          progress?: number;
          result?: string;
          error?: string;
        };
        if (data.id !== id) return;
        if (data.type === "progress") {
          setWorkProgress(data.progress ?? 0);
          return;
        }
        worker.removeEventListener("message", handleMessage);
        setIsWorking(false);
        setWorkProgress(null);
        if (data.type === "done" && typeof data.result === "string") {
          resolve(data.result);
        } else {
          reject(new Error(data.error || "Worker failed"));
        }
      };
      worker.addEventListener("message", handleMessage);
      setIsWorking(true);
      setWorkProgress(0);
      worker.postMessage({ id, ...message }, transfer ?? []);
    });

  const assessBase64 = (value: string, mode: "lenient" | "strict") => {
    if (!value) {
      return { valid: null as boolean | null, errorIndex: null as number | null, reason: "", normalized: "" };
    }

    let normalized = "";
    const indexMap: number[] = [];
    let hasUrlChars = false;
    let hasStdChars = false;

    for (let i = 0; i < value.length; i += 1) {
      const char = value[i];
      if (/\s/.test(char)) {
        if (mode === "strict") {
          return { valid: false, errorIndex: i, reason: "Whitespace is not allowed in strict mode.", normalized: "" };
        }
        continue;
      }

      if (/[A-Za-z0-9]/.test(char) || char === "=") {
        normalized += char;
        indexMap.push(i);
        continue;
      }

      if (char === "+" || char === "/") {
        if (hasUrlChars) {
          return { valid: false, errorIndex: i, reason: "Mixed Base64 and Base64URL characters.", normalized: "" };
        }
        hasStdChars = true;
        normalized += char;
        indexMap.push(i);
        continue;
      }

      if (char === "-" || char === "_") {
        if (hasStdChars) {
          return { valid: false, errorIndex: i, reason: "Mixed Base64 and Base64URL characters.", normalized: "" };
        }
        hasUrlChars = true;
        normalized += char;
        indexMap.push(i);
        continue;
      }

      return { valid: false, errorIndex: i, reason: "Invalid character in Base64 input.", normalized: "" };
    }

    if (!normalized) {
      return { valid: null, errorIndex: null, reason: "", normalized: "" };
    }

    let normalizedStd = normalized.replace(/-/g, "+").replace(/_/g, "/");

    if (mode === "lenient") {
      const mod = normalizedStd.length % 4;
      if (mod === 1) {
        return {
          valid: false,
          errorIndex: indexMap[Math.max(normalizedStd.length - 1, 0)] ?? value.length - 1,
          reason: "Invalid Base64 length.",
          normalized: "",
        };
      }
      if (mod) {
        normalizedStd += "=".repeat(4 - mod);
      }
      return { valid: true, errorIndex: null, reason: "", normalized: normalizedStd };
    }

    const firstPad = normalizedStd.indexOf("=");
    if (firstPad !== -1) {
      const rest = normalizedStd.slice(firstPad);
      const nonPadIndex = rest.search(/[^=]/);
      if (nonPadIndex !== -1) {
        return {
          valid: false,
          errorIndex: indexMap[firstPad + nonPadIndex] ?? value.length - 1,
          reason: "Invalid Base64 padding.",
          normalized: "",
        };
      }
    }

    const validPadding = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalizedStd);
    if (!validPadding) {
      return {
        valid: false,
        errorIndex: indexMap[Math.max(normalizedStd.length - 1, 0)] ?? value.length - 1,
        reason: "Invalid Base64 padding.",
        normalized: "",
      };
    }

    return { valid: true, errorIndex: null, reason: "", normalized: normalizedStd };
  };

  const syncFromText = useCallback(
    async (value: string, options?: { recordHistory?: boolean }) => {
      const token = ++syncTokenRef.current;
      setError("");
      setStatus(value ? "Encoding..." : "Ready");
      setLastAction("encode");
      clearPreview();

      if (!value) {
        setBase64Value("");
        setIsWorking(false);
        setWorkProgress(null);
        return;
      }

      try {
        const inputBytes = textEncoder.encode(value);
        if (inputBytes.byteLength > MAX_SIZE_BYTES) {
          if (syncTokenRef.current !== token) return;
          setError("Input too large. Please keep under 512KB.");
          setStatus("Error");
          setBase64Value("");
          return;
        }

        const estimatedOutputSize = estimateBase64Size(inputBytes.byteLength);
        if (estimatedOutputSize > MAX_SIZE_BYTES) {
          if (syncTokenRef.current !== token) return;
          setError("Encoded output would exceed 512KB. Please use a smaller input.");
          setStatus("Error");
          setBase64Value("");
          return;
        }

        const rawEncoded =
          inputBytes.byteLength > WORKER_THRESHOLD
            ? await runWorker({ action: "encodeText", payload: { text: value, variant: base64Variant } })
            : base64Variant === "url"
              ? toBase64Url(bytesToBase64(inputBytes))
              : bytesToBase64(inputBytes);
        const nextBase64 = wrapOutput ? wrapBase64Output(rawEncoded) : rawEncoded;

        if (syncTokenRef.current !== token) return;

        setBase64Value(nextBase64);
        setStatus("Updated");

        if (options?.recordHistory) {
          addHistoryEntry({
            action: "encode",
            input: value,
            output: nextBase64,
            variant: base64Variant,
            decodeMode,
          });
        }
      } catch (err) {
        if (syncTokenRef.current !== token) return;
        console.error("Encode error", err);
        setError("Unable to encode this input.");
        setStatus("Error");
        setBase64Value("");
      }
    },
    [addHistoryEntry, base64Variant, clearPreview, decodeMode, wrapOutput],
  );

  const syncFromBase64 = useCallback(
    async (value: string, options?: { recordHistory?: boolean }) => {
      const token = ++syncTokenRef.current;
      setError("");
      setStatus(value ? "Decoding..." : "Ready");
      setLastAction("decode");
      clearPreview();

      if (!value) {
        setTextValue("");
        setIsWorking(false);
        setWorkProgress(null);
        return;
      }

      try {
        if (value.length > MAX_SIZE_BYTES) {
          if (syncTokenRef.current !== token) return;
          setError("Input too large. Please keep under 512KB.");
          setStatus("Error");
          setTextValue("");
          return;
        }

        const parsed = parseDataUri(value);
        if (parsed.isDataUri && !parsed.isBase64) {
          if (syncTokenRef.current !== token) return;
          setError("Data URI is not base64-encoded.");
          setStatus("Error");
          setTextValue("");
          return;
        }

        const assessment = assessBase64(parsed.data, decodeMode);
        if (!assessment.valid) {
          if (syncTokenRef.current !== token) return;
          const suffix =
            assessment.errorIndex !== null ? ` First bad character at index ${assessment.errorIndex}.` : "";
          setError(`${assessment.reason || "Invalid Base64 string."}${suffix}`);
          setStatus("Error");
          setTextValue("");
          return;
        }

        let decodedText = "";
        let decodedBytes: Uint8Array | null = null;

        if (!parsed.isDataUri && assessment.normalized.length > WORKER_THRESHOLD) {
          decodedText = await runWorker({ action: "decodeText", payload: { base64: assessment.normalized } });
        } else {
          decodedBytes = base64ToBytes(assessment.normalized);
          decodedText = decodeBytesToText(decodedBytes);
        }

        if (syncTokenRef.current !== token) return;

        if (parsed.isDataUri && parsed.mime) {
          const previewBytes = decodedBytes ?? base64ToBytes(assessment.normalized);
          const blob = new Blob([new Uint8Array(previewBytes)], { type: parsed.mime });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewMime(parsed.mime);
        }

        setTextValue(decodedText);
        setStatus("Updated");

        if (options?.recordHistory) {
          addHistoryEntry({
            action: "decode",
            input: value,
            output: decodedText,
            variant: base64Variant,
            decodeMode,
          });
        }
      } catch {
        if (syncTokenRef.current !== token) return;
        const message = "Invalid Base64 string. Check padding and allowed characters.";
        setError(message);
        setStatus("Error");
        setTextValue("");
      }
    },
    [addHistoryEntry, base64Variant, clearPreview, decodeMode],
  );

  const handleBase64Change = (value: string) => {
    setBase64Value(value);
    setFileSource(null);
    void syncFromBase64(value);
  };

  const handleTextChange = (value: string) => {
    setTextValue(value);
    setFileSource(null);
    void syncFromText(value);
  };

  const handleDecodeModeChange = (mode: "lenient" | "strict") => {
    setDecodeMode(mode);
    if (lastAction === "decode" && base64Value) {
      void syncFromBase64(base64Value);
    }
  };

  const handleBase64VariantChange = (variant: "standard" | "url") => {
    setBase64Variant(variant);
    if (lastAction === "encode" && textValue) {
      void syncFromText(textValue);
    }
  };

  const handleWrapOutputChange = (nextWrapOutput: boolean) => {
    setWrapOutput(nextWrapOutput);
    if (lastAction === "encode" && textValue) {
      void syncFromText(textValue);
    }
  };

  const handleCopy = async (text: string, key: "base64" | "text") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
      showToast("Copied!", "success");
    } catch (err) {
      console.error("Copy failed", err);
      showToast("Clipboard blocked. Enable permissions to copy.", "error");
    }
  };

  const handleDownload = (text: string, filename: string) => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileEncode = async (file: File) => {
    try {
      syncTokenRef.current += 1;
      setError("");
      setStatus("Encoding...");
      setLastAction("encode");
      clearPreview();

      if (file.size > MAX_SIZE_BYTES) {
        setError("File too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }

      const estimatedOutputSize = estimateBase64Size(file.size);
      if (estimatedOutputSize > MAX_SIZE_BYTES) {
        setError("Encoded output would exceed 512KB. Please use a smaller file.");
        setStatus("Error");
        return;
      }

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const standardBase64 =
        bytes.byteLength > WORKER_THRESHOLD
          ? await runWorker({ action: "encodeBytes", payload: { bytes, variant: "standard" } }, [bytes.buffer])
          : bytesToBase64(bytes);

      const encodedValue = base64Variant === "url" ? toBase64Url(standardBase64) : standardBase64;
      const formattedBase64 = wrapOutput ? wrapBase64Output(encodedValue) : encodedValue;
      const output = includeDataUri
        ? `data:${file.type || "application/octet-stream"};base64,${standardBase64}`
        : formattedBase64;

      setBase64Value(output);
      try {
        setTextValue(decodeBytesToText(bytes));
      } catch {
        setTextValue("");
      }

      if (file.type) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setPreviewMime(file.type);
      }

      addHistoryEntry({
        action: "encode",
        input: `File: ${file.name} (${file.type || "application/octet-stream"})`,
        output,
        variant: base64Variant,
        decodeMode,
      });
      setStatus("Updated");
    } catch (err) {
      console.error("File encode error", err);
      setError("Unable to encode this file.");
      setStatus("Error");
    }
  };

  const handleHistoryRestore = (entry: HistoryEntry) => {
    setBase64Variant(entry.variant);
    setDecodeMode(entry.decodeMode);
    setLastAction(entry.action);
    clearPreview();

    if (entry.action === "encode") {
      setTextValue(entry.input);
      setBase64Value(entry.output);
    } else {
      setBase64Value(entry.input);
      setTextValue(entry.output);
    }

    setStatus("History restored");
  };

  const handleDownloadDecodedFile = () => {
    try {
      const parsed = parseDataUri(base64Value);
      if (parsed.isDataUri && !parsed.isBase64) {
        setError("Data URI is not base64-encoded.");
        setStatus("Error");
        return;
      }
      const assessment = assessBase64(parsed.data, decodeMode);
      if (!assessment.valid) {
        const suffix =
          assessment.errorIndex !== null ? ` First bad character at index ${assessment.errorIndex}.` : "";
        setError(`${assessment.reason || "Invalid Base64 string."}${suffix}`);
        setStatus("Error");
        return;
      }
      const bytes = base64ToBytes(assessment.normalized);
      const mime = parsed.isDataUri ? parsed.mime : "application/octet-stream";
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName || "decoded.bin";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus("Updated");
    } catch (err) {
      console.error("Download decode error", err);
      setError("Unable to decode and download this Base64 input.");
      setStatus("Error");
    }
  };

  const base64Bytes = textEncoder.encode(base64Value).length;
  const textBytes = textEncoder.encode(textValue).length;
  const expansionRatio =
    textBytes > 0 && base64Bytes > 0
      ? lastAction === "decode"
        ? `${(textBytes / base64Bytes).toFixed(2)}x`
        : `${(base64Bytes / textBytes).toFixed(2)}x`
      : "--";
  const parsedForAssessment = parseDataUri(base64Value);
  const base64Assessment = parsedForAssessment.isDataUri && !parsedForAssessment.isBase64
    ? { valid: false as boolean, errorIndex: 0, reason: "Data URI is not base64-encoded.", normalized: "" }
    : assessBase64(parsedForAssessment.data, decodeMode);
  const detectedMime = parsedForAssessment.isDataUri ? parsedForAssessment.mime : "";

  return (
    <main className="space-y-8">
      {toast ? (
        <div
          className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)] ${
            toast.tone === "success" ? "bg-slate-900 text-white" : "bg-amber-600 text-white"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite">
        {status} {error}
      </div>

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
              Base64 Encoder
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Base64 Encoder & Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Edit either side. Base64 updates the decoded text, and plain text updates the Base64 output.
        </p>
        <p className="text-xs text-slate-500">Runs locally in your browser; no data is uploaded.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Base64 / Base64URL</p>
              <p className="text-xs text-slate-300">Paste encoded input here to decode it.</p>
            </div>
            <button
              onClick={() => handleCopy(base64Value, "base64")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!base64Value}
            >
              {copied === "base64" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "base64" ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            value={base64Value}
            onChange={(event) => handleBase64Change(event.target.value)}
            onBlur={() => {
              if (base64Value && textValue) {
                addHistoryEntry({
                  action: "decode",
                  input: base64Value,
                  output: textValue,
                  variant: base64Variant,
                  decodeMode,
                });
              }
            }}
            placeholder="Paste Base64, Base64URL, or a data URI"
            aria-label="Base64 input"
            className="min-h-[220px] w-full resize-y border-0 bg-slate-950/70 px-4 py-4 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500"
          />
          <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
            <button
              onClick={() => handleDownload(base64Value, "encoded.txt")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!base64Value}
            >
              <Download className="h-4 w-4" aria-hidden /> Download
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl bg-amber-50 shadow-[var(--shadow-soft)] ring-1 ring-amber-200">
          <div className="flex items-center justify-between border-b border-amber-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Decoded Text</p>
              <p className="text-xs text-slate-600">Edit plain text here to re-encode it.</p>
            </div>
            <button
              onClick={() => handleCopy(textValue, "text")}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
              disabled={!textValue}
            >
              {copied === "text" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "text" ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            value={textValue}
            onChange={(event) => handleTextChange(event.target.value)}
            onBlur={() => {
              if (textValue && base64Value) {
                addHistoryEntry({
                  action: "encode",
                  input: textValue,
                  output: base64Value,
                  variant: base64Variant,
                  decodeMode,
                });
              }
            }}
            placeholder="Decoded text appears here. You can edit it directly."
            aria-label="Decoded text"
            className="min-h-[220px] w-full resize-y border-0 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400"
          />
          <div className="flex items-center justify-end gap-2 border-t border-amber-200 px-4 py-2">
            <button
              onClick={() => handleDownload(textValue, "decoded.txt")}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
              disabled={!textValue}
            >
              <Download className="h-4 w-4" aria-hidden /> Download
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Decode mode:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="decode-mode"
                value="lenient"
                checked={decodeMode === "lenient"}
                onChange={() => handleDecodeModeChange("lenient")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Lenient
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="decode-mode"
                value="strict"
                checked={decodeMode === "strict"}
                onChange={() => handleDecodeModeChange("strict")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Strict
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Output format:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="base64-variant"
                value="standard"
                checked={base64Variant === "standard"}
                onChange={() => handleBase64VariantChange("standard")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Base64 (+/ with =)
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="base64-variant"
                value="url"
                checked={base64Variant === "url"}
                onChange={() => handleBase64VariantChange("url")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Base64URL (-_ without padding)
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={wrapOutput}
                onChange={(event) => handleWrapOutputChange(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Wrap generated Base64 at 76 chars
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-3 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">File mode</span>
              <span>{fileSource ? fileSource.name : "No file selected"}</span>
            </div>
            <label
              className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) {
                  setFileSource(file);
                  void handleFileEncode(file);
                }
              }}
            >
              Drag and drop file or click to choose
              <input
                type="file"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setFileSource(file);
                    void handleFileEncode(file);
                  }
                }}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeDataUri}
                onChange={(event) => setIncludeDataUri(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Include data URI (auto MIME)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={downloadName}
                onChange={(event) => setDownloadName(event.target.value)}
                placeholder="decoded.bin"
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-inner shadow-slate-100 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button
                type="button"
                onClick={handleDownloadDecodedFile}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_12px_24px_-18px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              >
                Decode Base64 to file
              </button>
            </div>
            {detectedMime ? <p>Detected MIME: {detectedMime}</p> : null}
          </div>

          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: paste on either side depending on what you already have.</p>
          )}

          {isWorking ? (
            <div className="rounded-xl bg-slate-900/5 px-3 py-2 text-xs text-slate-700">
              Processing... {workProgress !== null ? `${Math.round(workProgress * 100)}%` : ""}
            </div>
          ) : null}

          <div className="grid gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <span>Base64 bytes</span>
              <span className="font-semibold text-slate-800">{base64Bytes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Decoded text bytes</span>
              <span className="font-semibold text-slate-800">{textBytes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expansion ratio</span>
              <span className="font-semibold text-slate-800">{expansionRatio}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Base64 validity</span>
              <span className="font-semibold text-slate-800">
                {base64Assessment.valid === null
                  ? "--"
                  : base64Assessment.valid
                    ? "Valid Base64"
                    : `Invalid (index ${base64Assessment.errorIndex ?? "?"})`}
              </span>
            </div>
          </div>

          {previewUrl ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Preview ({previewMime})</p>
              {previewMime.startsWith("image/") ? (
                <Image
                  src={previewUrl}
                  alt="Decoded preview"
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-h-64 w-full rounded-lg object-contain"
                />
              ) : previewMime.startsWith("audio/") ? (
                <audio src={previewUrl} controls className="w-full" />
              ) : previewMime === "application/pdf" ? (
                <iframe src={previewUrl} title="Decoded PDF preview" className="h-64 w-full rounded-lg" />
              ) : (
                <p>No inline preview available for this MIME type.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setHistoryOpen((current) => !current)}
              className="flex w-full items-center justify-between text-left"
              aria-expanded={historyOpen}
            >
              <span>
                <span className="block text-lg font-semibold text-slate-900">History</span>
                <span className="block text-sm text-slate-600">
                  {history.length ? `${history.length} saved conversions` : "No saved conversions yet"}
                </span>
              </span>
              <span className="text-sm font-medium text-slate-500">{historyOpen ? "Hide" : "Show"}</span>
            </button>
            {historyOpen ? (
              history.length ? (
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleHistoryRestore(entry)}
                      className="flex w-full flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300"
                    >
                      <span className="font-semibold text-slate-800">
                        {entry.action === "encode" ? "Encode" : "Decode"} · {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      <span className="line-clamp-2">{entry.input}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">No history available yet.</p>
              )
            ) : null}
          </section>

          <section className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li>
                <strong>When to encode?</strong> When sending binary data such as headers, tokens, or file content as text.
              </li>
              <li>
                <strong>Why did decode fail?</strong> Check padding and allowed characters, or switch to lenient mode for pasted content with whitespace.
              </li>
              <li>
                <strong>Privacy?</strong> Everything runs locally in your browser.
              </li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
