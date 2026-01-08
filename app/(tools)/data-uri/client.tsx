"use client";

import Link from "next/link";
import { useState } from "react";
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
  const MAX_TEXT = 20000;
  const MAX_FILE = 5 * 1024 * 1024;
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
      setOutput(encodeText(trimmed, mime || "text/plain", useBase64));
      setError("");
      setIsFileMode(false);
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
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setOutput(reader.result);
        setMime(chosenMime);
        setMimeTouched(true);
        setError("");
        setIsFileMode(true);
        setUseBase64(true);
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
    </main>
  );
}
