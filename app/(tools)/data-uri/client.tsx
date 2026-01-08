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

const encodeText = (text: string, mime: string, base64: boolean) => {
  if (base64) {
    const encoded = textToBase64(text);
    return `data:${mime};base64,${encoded}`;
  }
  return `data:${mime},${encodeURIComponent(text)}`;
};

export default function DataUriClient() {
  const [mime, setMime] = useState("text/plain");
  const [text, setText] = useState("Hello, world!");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedDecoded, setCopiedDecoded] = useState(false);
  const [error, setError] = useState("");
  const [useBase64, setUseBase64] = useState(true);
  const [stripPrefix, setStripPrefix] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const MAX_TEXT = 20000;
  const MAX_FILE = 5 * 1024 * 1024;

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
    const chosenMime = mime || file.type;
    if (!chosenMime) {
      setError("Unknown file type. Please provide a MIME type first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setOutput(reader.result);
        setMime(chosenMime);
        setError("");
      } else {
        setError("Could not read this file.");
      }
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
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
              setText("Hello, world!");
              setOutput("");
              setError("");
              setCopied(false);
              setUseBase64(true);
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
                const blob = new Blob([output], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "data-uri.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={!output}
            >
              Download URI
            </button>
            <button
              onClick={() => {
                if (!output) return;
                const parts = output.split(",");
                if (parts.length < 2) return;
                try {
                  const decoded = parts[0].includes(";base64")
                    ? base64ToText(parts[1])
                    : decodeURIComponent(parts[1]);
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
                onChange={(event) => setMime(event.target.value)}
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
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Use base64 encoding"
            />
            Use base64 encoding for text (recommended for binary data)
          </label>
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
              const droppedFile = event.dataTransfer.files?.[0];
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
    </main>
  );
}
