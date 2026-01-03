"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [base64Variant, setBase64Variant] = useState<"standard" | "url">("standard");
  const [fileSource, setFileSource] = useState<File | null>(null);
  const [includeDataUri, setIncludeDataUri] = useState(true);
  const [downloadName, setDownloadName] = useState("decoded.bin");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("");
  const MAX_SIZE_BYTES = 512 * 1024; // 512KB guard
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder("utf-8", { fatal: true });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const bytesToBase64 = (bytes: Uint8Array) => {
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
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

  const handleEncode = (value = input) => {
    try {
      setError("");
      setStatus("Encoding...");
      const inputBytes = textEncoder.encode(value);
      if (inputBytes.byteLength > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      setLastAction("encode");
      setEncoded(encodeBytesForVariant(inputBytes));
      if (clearOtherOnConvert) {
        setDecoded("");
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewMime("");
      }
      setStatus("Updated");
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to encode this input.");
      setStatus("Error");
    }
  };

  const handleDecode = (value = input) => {
    try {
      setError("");
      setStatus("Decoding...");
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
      const decodedBytes = base64ToBytes(assessment.normalized);
      const decodedText = textDecoder.decode(decodedBytes);
      setDecoded(decodedText);
      if (parsed.isDataUri && parsed.mime) {
        const blob = new Blob([decodedBytes], { type: parsed.mime });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPreviewMime(parsed.mime);
      }
      if (clearOtherOnConvert) {
        setEncoded("");
      }
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
    } catch (err) {
      console.error("Copy failed", err);
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
  const inputBytes = fileSource ? fileSource.size : textEncoder.encode(input).length;
  const encodedBytes = textEncoder.encode(encoded).length;
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
      if (file.size > MAX_SIZE_BYTES) {
        setError("File too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const buffer = await file.arrayBuffer();
      const standardBase64 = bytesToBase64(new Uint8Array(buffer));
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
      handleDecode(input);
    } else {
      handleEncode(input);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleEncode()}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Encode
            </button>
            <button
              onClick={() => handleDecode()}
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
              onClick={() => {
                setInput("");
                setEncoded("");
                setDecoded("");
                setError("");
                setAutoMode("none");
                setFileSource(null);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setPreviewMime("");
                }
              }}
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
                  handleEncode();
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
                  handleDecode();
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
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => {
              const val = event.target.value;
              setInput(val);
              if (autoMode === "encode") handleEncode(val);
              if (autoMode === "decode") handleDecode(val);
            }}
            placeholder="Paste text to encode or Base64 to decode"
            aria-label="Text to encode or decode"
          />
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
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold" id="encoded-label">
                Encoded
              </p>
              <button
                onClick={() => handleCopy(encoded, "enc")}
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
              {encoded || "Encoded Base64 will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              <button
                onClick={() => handleDownload(encoded, "encoded.txt")}
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
