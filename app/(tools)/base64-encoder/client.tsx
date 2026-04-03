"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

export default function Base64Client() {
  const [input, setInput] = useState("");
  const [encoded, setEncoded] = useState("");
  const [decoded, setDecoded] = useState("");
  const [copied, setCopied] = useState<"enc" | "dec" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [autoMode, setAutoMode] = useState<"none" | "encode" | "decode">("none");
  const [decodeMode, setDecodeMode] = useState<"lenient" | "strict">("lenient");
  const [clearOtherOnConvert, setClearOtherOnConvert] = useState(false);
  const [lastAction, setLastAction] = useState<"encode" | "decode" | null>(null);
  const [convertMode, setConvertMode] = useState<"encode" | "decode">("encode");
  const [base64Variant, setBase64Variant] = useState<"standard" | "url">("standard");
  const [fileSource, setFileSource] = useState<File | null>(null);
  const [includeDataUri, setIncludeDataUri] = useState(true);
  const [downloadName, setDownloadName] = useState("decoded.bin");
  const [wrapOutput, setWrapOutput] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("");
  const [history, setHistory] = useState<
    Array<{
      id: string;
      action: "encode" | "decode";
      input: string;
      output: string;
      variant: "standard" | "url";
      decodeMode: "lenient" | "strict";
      timestamp: number;
    }>
  >([]);
  const [shareUrl, setShareUrl] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workProgress, setWorkProgress] = useState<number | null>(null);
  const MAX_SIZE_BYTES = 512 * 1024; // 512KB guard
  const WORKER_THRESHOLD = 64 * 1024; // 64KB threshold for worker
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder("utf-8", { fatal: true });
  const workerRef = useRef<Worker | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("base64-history");
      if (raw) {
        const parsed = JSON.parse(raw) as typeof history;
        setHistory(parsed);
      }
    } catch (err) {
      console.error("History load failed", err);
    }
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setEncoded("");
    setDecoded("");
    setError("");
    setAutoMode("none");
    setFileSource(null);
    setShareUrl("");
    setStatus("Ready");
    setIsWorking(false);
    setWorkProgress(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPreviewMime("");
    }
  }, [previewUrl]);

  useEffect(() => {
    const loadFromHash = async () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#b64=")) return;
      try {
        const payload = hash.replace(/^#b64=/, "");
        const raw = await decompressSharePayload(payload);
        const parsed = JSON.parse(raw) as {
          input: string;
          encoded: string;
          decoded: string;
          base64Variant: "standard" | "url";
          decodeMode: "lenient" | "strict";
        };
        setInput(parsed.input || "");
        setEncoded(parsed.encoded || "");
        setDecoded(parsed.decoded || "");
        setBase64Variant(parsed.base64Variant || "standard");
        setDecodeMode(parsed.decodeMode || "lenient");
        setShareUrl(window.location.href);
        setStatus("Loaded from share link");
      } catch (err) {
        console.error("Share link load failed", err);
      }
    };
    void loadFromHash();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (convertMode === "decode") {
          void handleDecode(input);
        } else {
          void handleEncode(input);
        }
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        handleClear();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [convertMode, input, handleClear]);

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

  const toBase64Url = (value: string) => value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const toBase64Standard = (value: string) => {
    let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const mod = normalized.length % 4;
    if (mod) {
      normalized += "=".repeat(4 - mod);
    }
    return normalized;
  };

  const showToast = (message: string, tone: "success" | "error") => {
    setToast({ message, tone });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 1800);
  };

  const bytesToBase64Url = (bytes: Uint8Array) => {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return toBase64Url(btoa(binary));
  };

  const base64UrlToBytes = (value: string) => {
    const normalized = toBase64Standard(value);
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
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
    return `${value.slice(0, limit)}…`;
  };

  const persistHistory = (nextHistory: typeof history) => {
    try {
      localStorage.setItem("base64-history", JSON.stringify(nextHistory));
    } catch (err) {
      console.error("History save failed", err);
    }
  };

  const addHistoryEntry = (entry: Omit<(typeof history)[number], "id" | "timestamp">) => {
    setHistory((prev) => {
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
      return next;
    });
  };

  const compressSharePayload = async (payload: string) => {
    if ("CompressionStream" in window) {
      const stream = new CompressionStream("gzip");
      const writer = stream.writable.getWriter();
      writer.write(textEncoder.encode(payload));
      writer.close();
      const response = new Response(stream.readable);
      const buffer = new Uint8Array(await response.arrayBuffer());
      return bytesToBase64Url(buffer);
    }
    return bytesToBase64Url(textEncoder.encode(payload));
  };

  const decompressSharePayload = async (payload: string) => {
    const bytes = base64UrlToBytes(payload);
    if ("DecompressionStream" in window) {
      const stream = new DecompressionStream("gzip");
      const writer = stream.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const response = new Response(stream.readable);
      return await response.text();
    }
    return textDecoder.decode(bytes);
  };

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
        const data = event.data as { id: string; type: "progress" | "done" | "error"; progress?: number; result?: string; error?: string };
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

  const encodeBytesForVariant = (bytes: Uint8Array) => {
    const base64 = bytesToBase64(bytes);
    return base64Variant === "url" ? toBase64Url(base64) : base64;
  };

  const handleEncode = async (value = input) => {
    try {
      setError("");
      setStatus("Encoding...");
      setConvertMode("encode");
      setIsWorking(false);
      setWorkProgress(null);
      const inputBytes = textEncoder.encode(value);
      if (inputBytes.byteLength > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const estimatedOutputSize = estimateBase64Size(inputBytes.byteLength);
      if (estimatedOutputSize > MAX_SIZE_BYTES) {
        setError("Encoded output would exceed 512KB. Please use a smaller input.");
        setStatus("Error");
        return;
      }
      setLastAction("encode");
      const encodedValue =
        inputBytes.byteLength > WORKER_THRESHOLD
          ? await runWorker({ action: "encodeText", payload: { text: value, variant: base64Variant } })
          : encodeBytesForVariant(inputBytes);
      setEncoded(encodedValue);
      if (clearOtherOnConvert) {
        setDecoded("");
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewMime("");
      }
      addHistoryEntry({
        action: "encode",
        input: value,
        output: encodedValue,
        variant: base64Variant,
        decodeMode,
      });
      setStatus("Updated");
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to encode this input.");
      setStatus("Error");
    }
  };

  const handleDecode = async (value = input) => {
    try {
      setError("");
      setStatus("Decoding...");
      setConvertMode("decode");
      setIsWorking(false);
      setWorkProgress(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewMime("");
      }
      if (value.length > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const parsed = parseDataUri(value);
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
      setLastAction("decode");
      let decodedText = "";
      if (!parsed.isDataUri && assessment.normalized.length > WORKER_THRESHOLD) {
        decodedText = await runWorker({ action: "decodeText", payload: { base64: assessment.normalized } });
      } else {
        const decodedBytes = base64ToBytes(assessment.normalized);
        decodedText = textDecoder.decode(decodedBytes);
        if (parsed.isDataUri && parsed.mime) {
          const blob = new Blob([decodedBytes], { type: parsed.mime });
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewMime(parsed.mime);
        }
      }
      setDecoded(decodedText);
      if (clearOtherOnConvert) {
        setEncoded("");
      }
      addHistoryEntry({
        action: "decode",
        input: value,
        output: decodedText,
        variant: base64Variant,
        decodeMode,
      });
      setStatus("Updated");
    } catch (err) {
      console.error("Decode error", err);
      setError("Invalid Base64 string. Check padding and allowed characters.");
      setStatus("Error");
    }
  };

  const handleCopy = async (text: string, key: "enc" | "dec") => {
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

  const sample = "https://example.com/api?token=abc123==";
  const encodedDisplay = wrapOutput ? wrapBase64Output(encoded) : encoded;
  const inputBytes = fileSource ? fileSource.size : textEncoder.encode(input).length;
  const encodedBytes = textEncoder.encode(encodedDisplay).length;
  const decodedBytes = textEncoder.encode(decoded).length;
  const outputBytes = lastAction === "encode" ? encodedBytes : lastAction === "decode" ? decodedBytes : 0;
  const expansionRatio =
    lastAction && inputBytes > 0 ? `${(outputBytes / inputBytes).toFixed(2)}x` : "—";
  const outputLabel = lastAction === "encode" ? "Output bytes (encode)" : "Output bytes (decode)";
  const parsedForAssessment = parseDataUri(input);
  const base64Assessment = parsedForAssessment.isDataUri && !parsedForAssessment.isBase64
    ? { valid: false as boolean, errorIndex: 0, reason: "Data URI is not base64-encoded.", normalized: "" }
    : assessBase64(parsedForAssessment.data, decodeMode);
  const detectedMime = parsedForAssessment.isDataUri ? parsedForAssessment.mime : "";

  const handleFileEncode = async (file: File) => {
    try {
      setError("");
      setStatus("Encoding...");
      setConvertMode("encode");
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
      const output = includeDataUri
        ? `data:${file.type || "application/octet-stream"};base64,${standardBase64}`
        : encodedValue;
      setLastAction("encode");
      setEncoded(output);
      if (clearOtherOnConvert) {
        setDecoded("");
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewMime("");
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

  const handleConvertVariant = () => {
    try {
      if (!input.trim()) {
        return;
      }
      const parsed = parseDataUri(input);
      if (parsed.isDataUri) {
        setError("Convert Base64/Base64URL expects raw Base64, not a data URI.");
        setStatus("Error");
        return;
      }
      const assessment = assessBase64(input, "lenient");
      if (!assessment.valid) {
        const suffix =
          assessment.errorIndex !== null ? ` First bad character at index ${assessment.errorIndex}.` : "";
        setError(`${assessment.reason || "Invalid Base64 string."}${suffix}`);
        setStatus("Error");
        return;
      }
      if (base64Variant === "standard") {
        setInput(toBase64Url(assessment.normalized));
        setBase64Variant("url");
      } else {
        setInput(toBase64Standard(assessment.normalized));
        setBase64Variant("standard");
      }
      setStatus("Updated");
    } catch (err) {
      console.error("Convert variant error", err);
      setError("Unable to convert the Base64 string.");
      setStatus("Error");
    }
  };

  const handleDetect = () => {
    if (!input.trim()) {
      return;
    }
    const parsed = parseDataUri(input);
    const assessment = parsed.isDataUri && !parsed.isBase64
      ? { valid: false as boolean, errorIndex: 0, reason: "Data URI is not base64-encoded.", normalized: "" }
      : assessBase64(parsed.data, "lenient");
    if (assessment.valid) {
      void handleDecode(input);
    } else {
      void handleEncode(input);
    }
  };

  const handleNormalizeInput = () => {
    const normalized = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n")
      .trim();
    setInput(normalized);
    setFileSource(null);
    setError("");
    setStatus("Normalized");
    if (autoMode === "encode") void handleEncode(normalized);
    if (autoMode === "decode") void handleDecode(normalized);
  };

  const handleSwapToInput = (value: string, label: string) => {
    if (!value) return;
    setInput(value);
    setFileSource(null);
    setStatus(`Loaded ${label} into input`);
  };

  const handleShare = async () => {
    try {
      const payload = JSON.stringify({
        input,
        encoded,
        decoded,
        base64Variant,
        decodeMode,
      });
      const compressed = await compressSharePayload(payload);
      const url = `${window.location.origin}${window.location.pathname}#b64=${compressed}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setStatus("Share link copied");
    } catch (err) {
      console.error("Share link error", err);
      setError("Unable to generate share link.");
      setStatus("Error");
    }
  };

  const handleHistoryRestore = (entry: (typeof history)[number]) => {
    setInput(entry.input);
    if (entry.action === "encode") {
      setEncoded(entry.output);
      if (clearOtherOnConvert) {
        setDecoded("");
      }
    } else {
      setDecoded(entry.output);
      if (clearOtherOnConvert) {
        setEncoded("");
      }
    }
    setBase64Variant(entry.variant);
    setDecodeMode(entry.decodeMode);
    setLastAction(entry.action);
    setStatus("History restored");
  };

  const handleDownloadDecodedFile = () => {
    try {
      const parsed = parseDataUri(input);
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
              Base64 Encoder
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Base64 Encoder & Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text to/from Base64 instantly. Great for headers, payloads, and quick tests.
        </p>
        <p className="text-xs text-slate-500">Runs locally in your browser; no data is uploaded.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => {
              const val = event.target.value;
              setInput(val);
              if (autoMode === "encode") void handleEncode(val);
              if (autoMode === "decode") void handleDecode(val);
            }}
            placeholder="Paste text to encode or Base64 to decode"
            aria-label="Text to encode or decode"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void handleEncode()}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Encode
            </button>
            <button
              onClick={() => void handleDecode()}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Decode
            </button>
            <button
              onClick={handleDetect}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Detect
            </button>
            <button
              onClick={handleConvertVariant}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Convert Base64 ↔ Base64URL
            </button>
            <button
              onClick={handleShare}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!input && !encoded && !decoded}
            >
              Share
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={() => setInput(sample)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Sample
            </button>
            <button
              onClick={handleNormalizeInput}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Normalize input
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Auto mode:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="auto-mode"
                value="none"
                checked={autoMode === "none"}
                onChange={() => setAutoMode("none")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Off
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="auto-mode"
                value="encode"
                checked={autoMode === "encode"}
                onChange={() => {
                  setAutoMode("encode");
                  setConvertMode("encode");
                  void handleEncode();
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Encode on change
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="auto-mode"
                value="decode"
                checked={autoMode === "decode"}
                onChange={() => {
                  setAutoMode("decode");
                  setConvertMode("decode");
                  void handleDecode();
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Decode on change
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Decode mode:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="decode-mode"
                value="lenient"
                checked={decodeMode === "lenient"}
                onChange={() => setDecodeMode("lenient")}
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
                onChange={() => setDecodeMode("strict")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Strict
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={clearOtherOnConvert}
                onChange={(event) => setClearOtherOnConvert(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Clear other panel on convert
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
                onChange={() => setBase64Variant("standard")}
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
                onChange={() => setBase64Variant("url")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Base64URL (-_ without padding)
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={wrapOutput}
                onChange={(event) => setWrapOutput(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Wrap output at 76 chars
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
              Drag & drop file or click to choose
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
                Decode Base64 → Download file
              </button>
            </div>
            {detectedMime ? <p>Detected MIME: {detectedMime}</p> : null}
          </div>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: Use Base64 for headers, tokens, and data URIs.</p>
          )}
          {isWorking ? (
            <div className="rounded-xl bg-slate-900/5 px-3 py-2 text-xs text-slate-700">
              Processing… {workProgress !== null ? `${Math.round(workProgress * 100)}%` : ""}
            </div>
          ) : null}
          {shareUrl ? (
            <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Share link</p>
              <p className="break-all">{shareUrl}</p>
            </div>
          ) : null}
          <div className="grid gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <div className="flex items-center justify-between">
              <span>Input bytes</span>
              <span className="font-semibold text-slate-800">{inputBytes}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{outputLabel}</span>
              <span className="font-semibold text-slate-800">{lastAction ? outputBytes : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expansion ratio</span>
              <span className="font-semibold text-slate-800">{lastAction ? expansionRatio : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Base64 validity</span>
              <span className="font-semibold text-slate-800">
                {base64Assessment.valid === null
                  ? "—"
                  : base64Assessment.valid
                    ? "Valid Base64 ✅"
                    : `Invalid ❌ (index ${base64Assessment.errorIndex ?? "?"})`}
              </span>
            </div>
          </div>
          {previewUrl ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Preview ({previewMime})</p>
              {previewMime.startsWith("image/") ? (
                <img src={previewUrl} alt="Decoded preview" className="max-h-64 w-full rounded-lg object-contain" />
              ) : previewMime.startsWith("audio/") ? (
                <audio src={previewUrl} controls className="w-full" />
              ) : previewMime === "application/pdf" ? (
                <iframe src={previewUrl} title="Decoded PDF preview" className="h-64 w-full rounded-lg" />
              ) : (
                <p>No inline preview available for this MIME type.</p>
              )}
            </div>
          ) : null}
          {history.length ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">History (last 10)</p>
              <div className="space-y-2">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleHistoryRestore(entry)}
                    className="flex w-full flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-slate-300"
                  >
                    <span className="font-semibold text-slate-800">
                      {entry.action === "encode" ? "Encode" : "Decode"} · {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <span className="line-clamp-2">{entry.input}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold" id="encoded-label">
                Encoded
              </p>
              <button
                onClick={() => handleCopy(encodedDisplay, "enc")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!encoded}
              >
                {copied === "enc" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "enc" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="encoded-label"
            >
              {encodedDisplay || "Encoded Base64 will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              <button
                onClick={() => handleSwapToInput(encoded, "encoded output")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!encoded}
              >
                Use as input
              </button>
              <button
                onClick={() => handleDownload(encodedDisplay, "encoded.txt")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!encoded}
              >
                <Download className="h-4 w-4" aria-hidden /> Download
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold" id="decoded-label">
                Decoded
              </p>
              <button
                onClick={() => handleCopy(decoded, "dec")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!decoded}
              >
                {copied === "dec" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "dec" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="decoded-label"
            >
              {decoded || "Decoded text will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              <button
                onClick={() => handleSwapToInput(decoded, "decoded output")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!decoded}
              >
                Use as input
              </button>
              <button
                onClick={() => handleDownload(decoded, "decoded.txt")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!decoded}
              >
                <Download className="h-4 w-4" aria-hidden /> Download
              </button>
            </div>
          </div>
        </div>

        <section className="space-y-2 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              <strong>When to encode?</strong> When sending binary data (e.g., headers, tokens) as text.
            </li>
            <li>
              <strong>Why did decode fail?</strong> Check padding (=) and allowed characters; malformed Base64 cannot decode.
            </li>
            <li>
              <strong>Privacy?</strong> Everything runs locally; data stays in your browser.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
