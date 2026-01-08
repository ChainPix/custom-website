"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw, Upload } from "lucide-react";

const textToBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const base64ToText = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const isTextMime = (mime: string) =>
  mime.startsWith("text/") || mime === "application/json";

const buildLineDiff = (left: string, right: string) => {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const table = Array.from({ length: leftLines.length + 1 }, () => new Array(rightLines.length + 1).fill(0));

  for (let i = 1; i <= leftLines.length; i += 1) {
    for (let j = 1; j <= rightLines.length; j += 1) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  const diff: Array<{ type: "same" | "add" | "remove"; text: string }> = [];
  let i = leftLines.length;
  let j = rightLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      diff.push({ type: "same", text: leftLines[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      diff.push({ type: "add", text: rightLines[j - 1] });
      j -= 1;
    } else {
      diff.push({ type: "remove", text: leftLines[i - 1] });
      i -= 1;
    }
  }

  return diff.reverse();
};

const estimateBase64Bytes = (base64: string) => {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
};

const estimateDecodedBytes = (payload: string) => {
  try {
    const decoded = decodeURIComponent(payload);
    return new TextEncoder().encode(decoded).length;
  } catch (err) {
    console.warn("Decode estimate fallback", err);
    return new TextEncoder().encode(payload).length;
  }
};

const getPayloadFromOutput = (output: string, assumeBase64: boolean) => {
  if (!output) {
    return { payload: "", isBase64: false };
  }
  if (output.startsWith("data:")) {
    const commaIndex = output.indexOf(",");
    const header = commaIndex >= 0 ? output.slice(0, commaIndex) : output;
    const payload = commaIndex >= 0 ? output.slice(commaIndex + 1) : "";
    return { payload, isBase64: header.includes(";base64") };
  }
  return { payload: output, isBase64: assumeBase64 };
};

const parseDataUri = (output: string, assumeBase64: boolean) => {
  if (!output) {
    return {
      mimeType: "n/a",
      charset: "n/a",
      isBase64: false,
      payloadLength: 0,
      decodedBytes: 0,
    };
  }

  const { payload, isBase64 } = getPayloadFromOutput(output, assumeBase64);
  if (!output.startsWith("data:")) {
    return {
      mimeType: "payload only",
      charset: "n/a",
      isBase64,
      payloadLength: payload.length,
      decodedBytes: isBase64 ? estimateBase64Bytes(payload) : estimateDecodedBytes(payload),
    };
  }

  const commaIndex = output.indexOf(",");
  const header = commaIndex >= 0 ? output.slice(5, commaIndex) : output.slice(5);
  const segments = header.split(";").filter(Boolean);
  let mimeType = "text/plain";
  let charset = "n/a";

  if (segments[0] && !segments[0].includes("=")) {
    mimeType = segments[0];
  }

  for (const segment of segments) {
    const [key, value] = segment.split("=");
    if (key?.toLowerCase() === "charset" && value) {
      charset = value;
    }
  }

  return {
    mimeType,
    charset,
    isBase64,
    payloadLength: payload.length,
    decodedBytes: isBase64 ? estimateBase64Bytes(payload) : estimateDecodedBytes(payload),
  };
};

const getDecodedPreview = (output: string, assumeBase64: boolean) => {
  const { payload, isBase64 } = getPayloadFromOutput(output, assumeBase64);
  if (!payload) return "";
  try {
    return isBase64 ? base64ToText(payload) : decodeURIComponent(payload);
  } catch (err) {
    console.warn("Preview decode failed", err);
    return "";
  }
};

const formatJsonPreview = (text: string) => {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch (err) {
    console.warn("JSON preview failed", err);
    return text;
  }
};

const createHistoryId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type HistoryEntry = {
  id: string;
  label: string;
  createdAt: number;
  output: string;
  mimeType: string;
  isBase64: boolean;
  payloadLength: number;
  decodedBytes: number;
  source: "text" | "file";
  inputText?: string;
};

const encodeText = (text: string, mime: string, base64: boolean) => {
  if (base64) {
    const encoded = textToBase64(text);
    return `data:${mime};base64,${encoded}`;
  }
  return `data:${mime},${encodeURIComponent(text)}`;
};

export default function DataUriClient() {
  const [mime, setMime] = useState("text/plain");
  const [mimeTouched, setMimeTouched] = useState(false);
  const [text, setText] = useState("Hello, world!");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedDecoded, setCopiedDecoded] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [useBase64, setUseBase64] = useState(true);
  const [stripPrefix, setStripPrefix] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileMode, setIsFileMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [compareLeftId, setCompareLeftId] = useState<string>("");
  const [compareRightId, setCompareRightId] = useState<string>("");
  const MAX_TEXT = 20000;
  const MAX_FILE = 5 * 1024 * 1024;
  const SIZE_WARNING = 1_000_000;
  const inspector = parseDataUri(output, useBase64);
  const previewText = getDecodedPreview(output, useBase64);
  const previewMime = inspector.mimeType;
  const showImage = previewMime.startsWith("image/");
  const showAudio = previewMime.startsWith("audio/");
  const showVideo = previewMime.startsWith("video/");
  const showPdf = previewMime === "application/pdf";
  const showText =
    previewMime.startsWith("text/") || previewMime === "application/json";
  const formattedText =
    previewMime === "application/json" ? formatJsonPreview(previewText) : previewText;
  const showPreview =
    output && (showImage || showAudio || showVideo || showPdf || showText);
  const snippetItems = [
    { key: "img", label: "Image tag", text: `<img src="${output}" alt="Data URI" />` },
    { key: "bg", label: "CSS background", text: `background-image: url("${output}");` },
    {
      key: "download",
      label: "HTML download link",
      text: `<a href="${output}" download="file">Download</a>`,
    },
    { key: "md", label: "Markdown image", text: `![Alt text](${output})` },
    {
      key: "fetch",
      label: "Fetch to blob",
      text: `fetch("${output}").then(r => r.blob()).then(blob => {\n  // use blob\n});`,
    },
  ];
  const mimeForEstimate = mime || "text/plain";
  const textBytes = new TextEncoder().encode(text).length;
  const base64Length = Math.ceil(textBytes / 3) * 4;
  const urlEncodedLength = encodeURIComponent(text).length;
  const payloadLengthEstimate = useBase64 ? base64Length : urlEncodedLength;
  const headerLength = `data:${mimeForEstimate}${useBase64 ? ";base64" : ""},`.length;
  const estimatedUriLength = headerLength + payloadLengthEstimate;
  const payloadFromOutput = output ? getPayloadFromOutput(output, useBase64).payload : "";
  const livePayloadBytes = isFileMode && output ? inspector.decodedBytes : textBytes;
  const livePayloadLength = isFileMode && output ? payloadFromOutput.length : payloadLengthEstimate;
  const liveUriLength = isFileMode && output ? output.length : estimatedUriLength;
  const showSizeWarning = liveUriLength > SIZE_WARNING;
  const compareLeft = history.find((entry) => entry.id === compareLeftId) || null;
  const compareRight = history.find((entry) => entry.id === compareRightId) || null;
  const compareReady =
    compareLeft && compareRight && compareLeft.id !== compareRight.id;
  const compareIsText =
    compareReady && isTextMime(compareLeft.mimeType) && isTextMime(compareRight.mimeType);
  const compareLeftText = compareIsText
    ? getDecodedPreview(compareLeft.output, compareLeft.isBase64)
    : "";
  const compareRightText = compareIsText
    ? getDecodedPreview(compareRight.output, compareRight.isBase64)
    : "";
  const diffTooLarge =
    compareIsText && compareLeftText.length + compareRightText.length > 20000;
  const diffLines = useMemo(() => {
    if (!compareIsText || diffTooLarge) return [];
    return buildLineDiff(compareLeftText, compareRightText);
  }, [compareIsText, compareLeftText, compareRightText, diffTooLarge]);

  const handleGenerate = () => {
    const trimmed = text;
    if (!trimmed) {
      setError("Enter text to encode.");
      setOutput("");
      return;
    }
    if (trimmed.length > MAX_TEXT) {
      setError("Text is too large to encode. Please shorten it.");
      setOutput("");
      return;
    }
    try {
      const selectedMime = mime || "text/plain";
      const nextOutput = encodeText(trimmed, selectedMime, useBase64);
      const parsed = parseDataUri(nextOutput, useBase64);
      setOutput(nextOutput);
      setError("");
      setIsFileMode(false);
      setHistory((prev) => [
        {
          id: createHistoryId(),
          label: `Text · ${selectedMime}`,
          createdAt: Date.now(),
          output: nextOutput,
          mimeType: parsed.mimeType,
          isBase64: parsed.isBase64,
          payloadLength: parsed.payloadLength,
          decodedBytes: parsed.decodedBytes,
          source: "text",
          inputText: trimmed,
        },
        ...prev,
      ].slice(0, 10));
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to generate data URI. Check encoding.");
      setOutput("");
    }
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE) {
      setError("File is too large. Limit: 5 MB.");
      return;
    }
    const chosenMime = mimeTouched ? mime : file.type || mime;
    if (!chosenMime) {
      setError("Unknown file type. Please provide a MIME type first.");
      return;
    }
    const fileLabel = file.name ? `File · ${file.name}` : "File upload";
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const parsed = parseDataUri(reader.result, true);
        setOutput(reader.result);
        setMime(chosenMime);
        setMimeTouched(true);
        setError("");
        setIsFileMode(true);
        setUseBase64(true);
        setHistory((prev) => [
          {
            id: createHistoryId(),
            label: fileLabel,
            createdAt: Date.now(),
            output: reader.result,
            mimeType: parsed.mimeType,
            isBase64: parsed.isBase64,
            payloadLength: parsed.payloadLength,
            decodedBytes: parsed.decodedBytes,
            source: "file",
          },
          ...prev,
        ].slice(0, 10));
      } else {
        setError("Could not read this file.");
      }
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const handleCopy = async () => {
    try {
      const { payload } = getPayloadFromOutput(output, useBase64);
      const textToCopy = stripPrefix ? payload : output;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setError("Copy failed. Check clipboard permissions.");
    }
  };

  const handleCopySnippet = async (snippet: { key: string; text: string }) => {
    try {
      await navigator.clipboard.writeText(snippet.text);
      setCopiedSnippet(snippet.key);
      setTimeout(() => setCopiedSnippet(null), 1200);
    } catch (err) {
      console.error("Snippet copy failed", err);
      setError("Snippet copy failed. Check clipboard permissions.");
    }
  };

  const handleLoadHistory = (entry: HistoryEntry) => {
    setOutput(entry.output);
    setMime(entry.mimeType === "payload only" ? mime : entry.mimeType);
    setMimeTouched(true);
    setUseBase64(entry.isBase64);
    setIsFileMode(entry.source === "file");
    if (entry.source === "text" && entry.inputText) {
      setText(entry.inputText);
    }
    setError("");
  };

  const handleDownload = (textToDownload: string, filename: string) => {
    const blob = new Blob([textToDownload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {error || (output ? "Data URI generated" : "Ready")}
        {copied ? "Copied URI" : ""}
        {copiedDecoded ? "Copied decoded text" : ""}
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
              Data URI
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Data URI Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text or files into data URIs. Choose a MIME type or drop a file, then copy the generated URI.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
            onClick={() => {
              setMime("text/plain");
              setMimeTouched(false);
              setText("Hello, world!");
              setOutput("");
              setError("");
              setCopied(false);
              setUseBase64(true);
              setIsFileMode(false);
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            aria-label="Reset inputs"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={!output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy URI"}
            </button>
            <button
              onClick={() => {
                if (!output) return;
                const { payload } = getPayloadFromOutput(output, useBase64);
                const textToDownload = stripPrefix ? payload : output;
                const filename = stripPrefix ? "payload.txt" : "data-uri.txt";
                handleDownload(textToDownload, filename);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={!output}
            >
              {stripPrefix ? "Download payload" : "Download URI"}
            </button>
            {stripPrefix ? (
              <button
                onClick={() => {
                  if (!output) return;
                  handleDownload(output, "data-uri.txt");
                }}
                className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
                disabled={!output}
              >
                Download full URI
              </button>
            ) : null}
            <button
              onClick={() => {
                if (!output) return;
                try {
                  const { payload, isBase64 } = getPayloadFromOutput(output, useBase64);
                  if (!payload) return;
                  const decoded = isBase64 ? base64ToText(payload) : decodeURIComponent(payload);
                  navigator.clipboard.writeText(decoded);
                  setCopiedDecoded(true);
                  setTimeout(() => setCopiedDecoded(false), 1200);
                } catch (err) {
                  console.error("Decode copy failed", err);
                  setError("Could not decode for copy.");
                }
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={!output}
            >
              {copiedDecoded ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedDecoded ? "Copied decoded" : "Copy decoded"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              MIME Type
              <input
                type="text"
                value={mime}
                onChange={(event) => {
                  setMime(event.target.value);
                  setMimeTouched(true);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                placeholder="text/plain, image/png, application/json"
                aria-label="MIME type"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Generate from text
              <button
                onClick={handleGenerate}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                aria-label="Generate data URI from text"
              >
                Build URI
              </button>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={useBase64}
              onChange={(e) => setUseBase64(e.target.checked)}
              disabled={isFileMode}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Use base64 encoding"
            />
            Use base64 encoding for text (recommended for binary data)
          </label>
          {isFileMode ? (
            <p className="text-xs text-slate-500">
              Note: Files are always loaded as base64 data URIs.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={stripPrefix}
              onChange={(e) => setStripPrefix(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Strip data URI prefix"
            />
            Strip data URI prefix (show only payload)
          </label>
          <textarea
            className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Enter text to encode as data URI"
            aria-label="Text to encode"
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
            <div className="flex flex-wrap gap-3">
              <span>Payload bytes: {formatBytes(livePayloadBytes)}</span>
              <span>Payload length: {livePayloadLength.toLocaleString()} chars</span>
              <span>Data URI length: {liveUriLength.toLocaleString()} chars</span>
              <span>Estimated HTML size impact: {formatBytes(liveUriLength)}</span>
            </div>
            {showSizeWarning ? (
              <p className="mt-1 text-amber-600">
                Large data URIs can break in some browsers, emails, or CSS. Consider keeping under ~1-2 MB.
              </p>
            ) : null}
          </div>
          <label
            htmlFor="data-file"
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-4 text-center text-sm text-slate-700 transition ${
              isDragging
                ? "border-slate-500 bg-slate-100/80"
                : "border-slate-300 bg-slate-50/70 hover:-translate-y-0.5 hover:border-slate-400"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const droppedFiles = event.dataTransfer.files;
              if (droppedFiles.length > 1) {
                setError("Please drop a single file at a time.");
                return;
              }
              const droppedFile = droppedFiles?.[0];
              handleFile(droppedFile);
            }}
          >
            <Upload className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-900">Or drop a file</span>
            <input
              id="data-file"
              type="file"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
              aria-label="Upload file to convert to data URI"
            />
          </label>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: For JSON, use application/json; for text, use text/plain.</p>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Data URI</div>
          <pre className="max-h-[300px] overflow-auto p-4 text-xs leading-relaxed text-slate-100">
            {output
              ? stripPrefix
                ? output.split(",").slice(1).join(",")
                : output
              : "Generated data URI will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter text (or drop a small file) and set the MIME type; choose base64 if needed.</li>
          <li>Generate the data URI, then copy it, copy decoded text, or download the URI.</li>
          <li>Use strip-prefix to view just the payload (no `data:` prefix).</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Everything happens in your browser.</p>
          <p><strong>What can I encode?</strong> Text or small files up to 5 MB; provide a MIME type for accuracy.</p>
          <p><strong>Can I copy or download?</strong> Yes. Copy the data URI, copy decoded text, or download the URI as a text file.</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Inspector</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">MIME type</p>
            <p className="font-medium text-slate-900">{inspector.mimeType}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Charset</p>
            <p className="font-medium text-slate-900">{inspector.charset}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Base64</p>
            <p className="font-medium text-slate-900">{inspector.isBase64 ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Payload length</p>
            <p className="font-medium text-slate-900">{inspector.payloadLength.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Decoded bytes (est.)</p>
            <p className="font-medium text-slate-900">{inspector.decodedBytes.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
        {showPreview ? (
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            {showImage ? (
              <img src={output} alt="Preview" className="max-h-72 rounded-lg border border-slate-200" />
            ) : null}
            {showAudio ? <audio controls src={output} className="w-full" /> : null}
            {showVideo ? (
              <video controls src={output} className="w-full max-h-72 rounded-lg border border-slate-200" />
            ) : null}
            {showPdf ? (
              <iframe src={output} className="h-72 w-full rounded-lg border border-slate-200" title="PDF preview" />
            ) : null}
            {showText ? (
              <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                {formattedText || "No preview available."}
              </pre>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Generate a supported data URI to see a preview.</p>
        )}
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Developer snippets</h2>
        <p className="mt-2 text-sm text-slate-600">
          Quick-copy snippets for common usage patterns.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {snippetItems.map((snippet) => (
            <button
              key={snippet.key}
              onClick={() => handleCopySnippet(snippet)}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
              disabled={!output}
            >
              <span>{snippet.label}</span>
              {copiedSnippet === snippet.key ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Clipboard className="h-4 w-4 text-slate-500" />
              )}
            </button>
          ))}
        </div>
        {!output ? (
          <p className="mt-2 text-xs text-slate-500">
            Generate a data URI to enable snippets.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">History & compare</h2>
        {history.length ? (
          <div className="mt-3 space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
              >
                <div>
                  <p className="font-medium text-slate-900">{entry.label}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleTimeString()} · {entry.mimeType} ·{" "}
                    {formatBytes(entry.decodedBytes)} ({entry.payloadLength.toLocaleString()} chars)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleLoadHistory(entry)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => setCompareLeftId(entry.id)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5"
                  >
                    Compare A
                  </button>
                  <button
                    onClick={() => setCompareRightId(entry.id)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5"
                  >
                    Compare B
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Generate or upload to build a history.</p>
        )}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <p className="text-sm font-semibold text-slate-900">Payload diff</p>
          {compareReady ? (
            compareIsText ? (
              diffTooLarge ? (
                <p className="mt-2 text-xs text-slate-600">
                  Diff is too large to render. Try shorter payloads.
                </p>
              ) : diffLines.length ? (
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
                  {diffLines.map((line, index) => {
                    const prefix =
                      line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  ";
                    const tone =
                      line.type === "add"
                        ? "text-emerald-700"
                        : line.type === "remove"
                          ? "text-rose-600"
                          : "text-slate-700";
                    return (
                      <div key={`${line.type}-${index}`} className={tone}>
                        {prefix}
                        {line.text || " "}
                      </div>
                    );
                  })}
                </pre>
              ) : (
                <p className="mt-2 text-xs text-slate-600">No differences detected.</p>
              )
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                Diff is available for text or JSON payloads only.
              </p>
            )
          ) : (
            <p className="mt-2 text-xs text-slate-600">
              Pick two history entries to compare.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
