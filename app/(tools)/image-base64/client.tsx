"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Upload } from "lucide-react";

export default function ImageBase64Client() {
  const [preview, setPreview] = useState<string>("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [stripPrefix, setStripPrefix] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ sizeBytes: number; mime: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      setPreview("");
      setOutput("");
      setStatus("Invalid file type");
      setWarning("");
      return;
    }
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > 10) {
      setError(`File too large (${sizeMb.toFixed(2)} MB). Please choose an image under 10 MB.`);
      setPreview("");
      setOutput("");
      setStatus("File too large");
      setWarning("");
      return;
    }

    if (sizeMb > 5) {
      setWarning(`Large file (${sizeMb.toFixed(2)} MB). Processing may take a moment.`);
    } else {
      setWarning("");
    }

    setFileMeta({ sizeBytes: file.size, mime: file.type || "image/*" });
    setProcessing(true);
    setStatus(sizeMb > 5 ? "Processing large image..." : "Processing image...");

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setPreview(result);
        setOutput(result);
        setError("");
        setStatus(`Loaded ${file.type || "image"} (${sizeMb.toFixed(2)} MB)`);
      } else {
        setError("Could not read this file.");
        setPreview("");
        setOutput("");
        setStatus("Read failed");
        setFileMeta(null);
      }
      setProcessing(false);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
      setPreview("");
      setOutput("");
      setStatus("Read failed");
      setFileMeta(null);
      setProcessing(false);
    };
    // In browsers, progress events for FileReader are limited; a true chunked reader would be more complex.
    reader.readAsDataURL(file);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied Base64");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const displayOutput = useMemo(() => {
    if (stripPrefix && output.startsWith("data:")) {
      const parts = output.split(",");
      return parts.slice(1).join(",") || output;
    }
    return output;
  }, [output, stripPrefix]);

  const dataUriStats = useMemo(() => {
    if (!output) return null;
    const prefix = output.startsWith("data:") ? output.slice(0, output.indexOf(",") + 1) : "";
    const content = output.startsWith("data:") ? output.slice(output.indexOf(",") + 1) : output;
    return {
      totalChars: output.length,
      prefixLength: prefix.length,
      contentLength: content.length,
    };
  }, [output]);

  const handleDownloadText = () => {
    if (!displayOutput) return;
    const blob = new Blob([displayOutput], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "image-base64.txt";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded Base64");
  };

  const handleDownloadImage = () => {
    if (!output) return;
    const dataUri = output.startsWith("data:") ? output : `data:application/octet-stream;base64,${output}`;
    fetch(dataUri)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "image-from-base64";
        a.click();
        URL.revokeObjectURL(url);
        setStatus("Downloaded image");
      })
      .catch(() => setStatus("Image download failed"));
  };

  const sampleDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9Q2YSmkAAAAASUVORK5CYII=";
  const loadSample = () => {
    setPreview(sampleDataUrl);
    setOutput(sampleDataUrl);
    setError("");
    setWarning("");
    const payloadLength = sampleDataUrl.split(",")[1]?.length ?? 0;
    const approxBytes = Math.ceil(payloadLength * 0.75);
    setFileMeta({ sizeBytes: approxBytes, mime: "image/png" });
    setStatus("Loaded sample");
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const onDrag = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (event.type === "dragenter" || event.type === "dragover") setDragActive(true);
    if (event.type === "dragleave") setDragActive(false);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {error}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Image to Base64</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert images to Base64 strings locally. Drag and drop an image to get copy-ready output.
        </p>
        <p className="text-sm font-medium text-emerald-700">All processing stays in your browser.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
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
              <p className="font-semibold text-slate-900">Drop an image or click to upload</p>
              <p className="text-slate-600">PNG, JPG, GIF recommended under 5MB.</p>
            </div>
            <input
              id="img-input"
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          <div className="flex items-center gap-2">
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
                setOutput("");
                setError("");
                setWarning("");
                setStatus("Cleared");
                setFileMeta(null);
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
              disabled={!output || processing}
              aria-label="Copy Base64 output"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Base64"}
            </button>
            <button
              onClick={handleDownloadText}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!output || processing}
              aria-label="Download Base64 as text file"
            >
              <Download className="h-4 w-4" />
              Save Base64
            </button>
            <button
              onClick={handleDownloadImage}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!output || processing}
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
                  File: {(fileMeta.sizeBytes / (1024 * 1024)).toFixed(2)} MB · {fileMeta.mime}
                </p>
              ) : null}
              {dataUriStats ? (
                <p>
                  Output: {dataUriStats.totalChars.toLocaleString()} chars (prefix{" "}
                  {dataUriStats.prefixLength.toLocaleString()}, data {dataUriStats.contentLength.toLocaleString()})
                </p>
              ) : null}
            </div>
          ) : null}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={stripPrefix}
              onChange={(event) => setStripPrefix(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              aria-label="Toggle strip data URI prefix"
            />
            Strip data URI prefix
          </label>
        </div>

        <div className="space-y-3">
          <div
            className="flex items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200"
            role="region"
            aria-label="Image preview"
          >
            {preview ? (
              <Image src={preview} alt="Preview" width={240} height={240} className="max-h-60 w-auto" />
            ) : (
              <p className="text-sm text-slate-500">Preview will appear here.</p>
            )}
          </div>
          <div
            className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
            role="region"
            aria-labelledby="base64-output-heading"
          >
            <div id="base64-output-heading" className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">
              Base64 Output
            </div>
            <pre className="max-h-[220px] overflow-auto break-all whitespace-pre-wrap p-4 text-xs leading-relaxed text-slate-100">
              {processing ? "Processing..." : displayOutput || "Encoded Base64 will appear here."}
            </pre>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Click or drag an image onto the dropzone (PNG/JPG/GIF recommended).</li>
          <li>Review the preview and Base64 output; use “Strip prefix” if you only need the payload.</li>
          <li>Copy or download the Base64 string or save the decoded image.</li>
          <li>Large files (5–10 MB) show a warning; over 10 MB are blocked for performance.</li>
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
