"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type DragEvent } from "react";

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
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [decodeMode, setDecodeMode] = useState<"lenient" | "strict">("lenient");
  const [lastAction, setLastAction] = useState<"encode" | "decode" | null>(null);
  const [base64Variant, setBase64Variant] = useState<"standard" | "url">("standard");
  const [dragTarget, setDragTarget] = useState<"text" | "base64" | null>(null);
  const [wrapOutput] = useState(false);
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
  const [isWorking, setIsWorking] = useState(false);
  const [workProgress, setWorkProgress] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
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

  const isTextLikeFile = (file: File) => {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    if (type.startsWith("text/")) return true;
    if (
      [
        "application/json",
        "application/xml",
        "application/javascript",
        "application/x-javascript",
        "application/typescript",
        "application/x-sh",
        "application/x-httpd-php",
        "application/x-yaml",
        "application/yaml",
        "application/toml",
        "image/svg+xml",
      ].includes(type)
    ) {
      return true;
    }
    return /\.(txt|text|md|markdown|csv|tsv|json|xml|html|htm|js|jsx|ts|tsx|css|scss|sass|less|yml|yaml|toml|ini|conf|config|env|log|sql|svg)$/i.test(name);
  };

  const extractTextFromFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    if (isTextLikeFile(file)) {
      return await file.text();
    }

    if (type === "application/pdf" || name.endsWith(".pdf")) {
      const { extractTextPages } = await import("@/lib/pdf-intelligence");
      const pages = await extractTextPages(file);
      return pages.map((page) => page.text).join("\n\n");
    }

    if (
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      const { extractDocxText } = await import("../resume-analyzer/parsers/docx");
      const buffer = await file.arrayBuffer();
      return await extractDocxText(buffer);
    }

    throw new Error("Unsupported file type. Drop a text, XML, JSON, DOCX, or PDF file.");
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
    void syncFromBase64(value);
  };

  const handleTextChange = (value: string) => {
    setTextValue(value);
    void syncFromText(value);
  };

  const handleTextareaDragOver = (target: "text" | "base64", event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (dragTarget !== target) {
      setDragTarget(target);
    }
  };

  const handleTextareaDrop = async (target: "text" | "base64", event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setDragTarget(null);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      const droppedText = event.dataTransfer.getData("text");
      if (!droppedText) return;
      if (target === "text") {
        setTextValue(droppedText);
        await syncFromText(droppedText, { recordHistory: true });
      } else {
        setBase64Value(droppedText);
        await syncFromBase64(droppedText, { recordHistory: true });
      }
      return;
    }

    try {
      setError("");
      setStatus(`Reading ${file.name}...`);
      const extractedText = await extractTextFromFile(file);
      clearPreview();
      if (target === "text") {
        setTextValue(extractedText);
        await syncFromText(extractedText, { recordHistory: true });
      } else {
        setTextValue(extractedText);
        await syncFromText(extractedText, { recordHistory: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to read the dropped file.";
      setError(message);
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

  return (
    <main className="space-y-8">
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
      </header>

      <section className="grid items-stretch gap-5 lg:grid-cols-2">
        <div className="flex h-full flex-col rounded-2xl bg-amber-50 shadow-[var(--shadow-soft)] ring-1 ring-amber-200">
          <div className="border-b border-amber-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Text</p>
              <p className="text-xs text-slate-600">Paste normal text here to encode it as Base64.</p>
            </div>
          </div>
          <textarea
            value={textValue}
            onChange={(event) => handleTextChange(event.target.value)}
            onDragOver={(event) => handleTextareaDragOver("text", event)}
            onDragLeave={() => setDragTarget((current) => (current === "text" ? null : current))}
            onDrop={(event) => void handleTextareaDrop("text", event)}
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
            placeholder="Paste or edit plain text, or drop TXT, MD, JSON, XML, CSV, DOCX, or PDF files here"
            aria-label="Text input"
            className={`min-h-[220px] w-full flex-1 resize-y border-0 px-4 py-4 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 ${
              dragTarget === "text" ? "bg-amber-100 ring-2 ring-amber-300" : "bg-amber-50"
            }`}
          />
          <div className="border-t border-amber-200 px-4 py-2 text-xs text-slate-600">
            Plain text input
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Base64 / Base64URL</p>
              <p className="text-xs text-slate-300">Paste encoded input here to decode it.</p>
            </div>
          </div>
          <textarea
            value={base64Value}
            onChange={(event) => handleBase64Change(event.target.value)}
            onDragOver={(event) => handleTextareaDragOver("base64", event)}
            onDragLeave={() => setDragTarget((current) => (current === "base64" ? null : current))}
            onDrop={(event) => void handleTextareaDrop("base64", event)}
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
            placeholder="Base64 output appears here, or paste Base64/Base64URL/data URI, or drop TXT, MD, JSON, XML, CSV, DOCX, or PDF files to encode"
            aria-label="Base64 input"
            className={`min-h-[220px] w-full flex-1 resize-y border-0 px-4 py-4 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 ${
              dragTarget === "base64" ? "bg-slate-900 ring-2 ring-slate-500" : "bg-slate-950/70"
            }`}
          />
          <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-300">
            Base64 input
          </div>
        </div>
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          {(error || isWorking) ? (
            <div className="rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : null}
              {isWorking ? (
                <div className="text-xs text-slate-700">
                  Processing... {workProgress !== null ? `${Math.round(workProgress * 100)}%` : ""}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2 rounded-2xl bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 sm:grid-cols-4">
            <div className="flex items-center justify-between gap-2 sm:block">
              <span>Base64 bytes</span>
              <span className="font-semibold text-slate-800 sm:block">{base64Bytes}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <span>Text bytes</span>
              <span className="font-semibold text-slate-800 sm:block">{textBytes}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <span>Ratio</span>
              <span className="font-semibold text-slate-800 sm:block">{expansionRatio}</span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <span>Base64 validity</span>
              <span className="font-semibold text-slate-800 sm:block">
                {base64Assessment.valid === null
                  ? "--"
                  : base64Assessment.valid
                    ? "Valid"
                    : `Invalid (${base64Assessment.errorIndex ?? "?"})`}
              </span>
            </div>
          </div>

          {previewUrl ? (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 text-xs text-slate-600 shadow-[var(--shadow-soft)]">
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

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
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
