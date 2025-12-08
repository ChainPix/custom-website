"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Upload } from "lucide-react";

type Converted = {
  dataUrl: string;
  blobUrl: string;
  sizeKb: number;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10MB guard

function dataUrlToBlobUrl(dataUrl: string) {
  const byteString = atob(dataUrl.split(",")[1] || "");
  const mime = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mime });
  return URL.createObjectURL(blob);
}

export default function WebpConverterClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [inputName, setInputName] = useState("");
  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const [converted, setConverted] = useState<Converted | null>(null);
  const [status, setStatus] = useState("Awaiting image");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyDataUrl, setCopyDataUrl] = useState(false);

  const clearOutput = () => {
    if (converted?.blobUrl) URL.revokeObjectURL(converted.blobUrl);
    setConverted(null);
    setCopied(false);
    setCopyDataUrl(false);
  };

  const handleFile = (file: File) => {
    setError("");
    clearOutput();
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, GIF, etc.).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large. Please keep uploads under 10MB.");
      return;
    }
    setInputName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setInputPreview(dataUrl);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported in this browser.");
          ctx.drawImage(img, 0, 0);
          const webpDataUrl = canvas.toDataURL("image/webp", quality);
          if (!webpDataUrl.startsWith("data:image/webp")) throw new Error("Your browser does not support WebP export.");
          const blobUrl = dataUrlToBlobUrl(webpDataUrl);
          setConverted({ dataUrl: webpDataUrl, blobUrl, sizeKb: webpDataUrl.length / 1024 });
          setStatus("Converted to WebP");
        } catch (err: any) {
          setError(err?.message || "Unable to convert image to WebP.");
          clearOutput();
        }
      };
      img.onerror = () => {
        setError("Unable to load image. Please try another file.");
      };
      img.src = dataUrl;
    };
    reader.onerror = () => setError("Unable to read file.");
    reader.readAsDataURL(file);
  };

  const handleCopy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!converted) return;
    const a = document.createElement("a");
    a.href = converted.blobUrl;
    a.download = (inputName ? inputName.replace(/\.[^.]+$/, "") : "image") + ".webp";
    a.click();
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
  };

  const outputSize = useMemo(() => {
    if (!converted) return "";
    return `~${converted.sizeKb.toFixed(1)} KB`;
  }, [converted]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4">
      <div className="sr-only" aria-live="polite">
        {status} {error ? `Error: ${error}` : ""} {copied ? "Copied snippet" : ""} {copyDataUrl ? "Copied data URL" : ""}
      </div>

      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">WebP Image Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert JPG, PNG, or GIF images to WebP locally for faster web delivery. Nothing leaves your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              Quality: <span className="text-xs font-semibold text-slate-600">{Math.round(quality * 100)}%</span>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                aria-label="WebP quality"
              />
            </label>
            <button
              onClick={() => {
                setQuality(0.8);
                setInputName("");
                setInputPreview(null);
                setError("");
                setStatus("Awaiting image");
                clearOutput();
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-700 transition hover:border-slate-400 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
            onClick={() => inputRef.current?.click()}
            {...dropHandlers}
            role="button"
            aria-label="Upload image"
          >
            <Upload className="mb-3 h-6 w-6 text-slate-500" />
            <p className="font-medium">Click or drop an image to convert to WebP</p>
            <p className="text-xs text-slate-500">JPG, PNG, GIF · Max 10MB</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {inputPreview ? (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-inner">
              <p className="mb-2 text-xs font-semibold text-slate-700">Original: {inputName || "selected image"}</p>
              <img src={inputPreview} alt="Original preview" className="max-h-64 w-full rounded-lg object-contain" />
            </div>
          ) : null}

          {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="output-heading">
              WebP output
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {outputSize ? (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20">
                  {outputSize}
                </span>
              ) : null}
              <button
                onClick={() => converted && handleCopy(converted.dataUrl, setCopyDataUrl)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!converted}
                aria-label="Copy WebP data URL"
              >
                {copyDataUrl ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copyDataUrl ? "Copied URL" : "Copy URL"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!converted}
                aria-label="Download WebP"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4" role="region" aria-labelledby="output-heading">
            {converted ? (
              <img src={converted.dataUrl} alt="WebP preview" className="max-h-[480px] w-full rounded-lg object-contain" />
            ) : (
              <p className="text-sm text-slate-200">Your converted WebP preview will appear here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Drop or upload a JPG/PNG/GIF under 10MB.</li>
          <li>Adjust quality (default 80%) if needed.</li>
          <li>Copy the data URL or download the WebP file.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>Conversion runs locally in your browser; files are not uploaded.</p>
          <p>If your browser lacks WebP support, you will see an error when converting.</p>
        </div>
      </div>
    </main>
  );
}
