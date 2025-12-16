"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Upload, X, Image as ImageIcon } from "lucide-react";

type Converted = {
  dataUrl: string;
  blobUrl: string;
  sizeKb: number;
  originalSizeKb: number;
  width: number;
  height: number;
};

type ConversionItem = {
  id: string;
  inputName: string;
  inputPreview: string;
  originalSizeKb: number;
  converted: Converted | null;
  error: string;
  isProcessing: boolean;
};

const MAX_BYTES = 10 * 1024 * 1024; // 10MB guard
const CONVERSION_TIMEOUT = 30000; // 30 seconds
const QUALITY_PRESETS = {
  low: { value: 0.5, label: "Low (50%)" },
  medium: { value: 0.7, label: "Medium (70%)" },
  high: { value: 0.8, label: "High (80%)" },
  max: { value: 0.95, label: "Max (95%)" },
};

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
  const [enableResize, setEnableResize] = useState(false);
  const [targetWidth, setTargetWidth] = useState("");
  const [targetHeight, setTargetHeight] = useState("");
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [customFilename, setCustomFilename] = useState("");
  const [items, setItems] = useState<ConversionItem[]>([]);
  const [status, setStatus] = useState("Awaiting image");
  const [copied, setCopied] = useState(false);
  const [copyDataUrl, setCopyDataUrl] = useState(false);

  const clearAllOutputs = () => {
    items.forEach((item) => {
      if (item.converted?.blobUrl) URL.revokeObjectURL(item.converted.blobUrl);
    });
    setItems([]);
    setCopied(false);
    setCopyDataUrl(false);
  };

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Please choose an image file (JPG, PNG, GIF, etc.).";
    }
    if (file.size === 0) {
      return "File is empty (0 bytes). Please choose a valid image file.";
    }
    if (file.size > MAX_BYTES) {
      return "File is too large. Please keep uploads under 10MB.";
    }
    return null;
  };

  const convertImage = async (
    dataUrl: string,
    quality: number,
    targetWidth?: number,
    targetHeight?: number
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Conversion timeout. Image may be too large or complex."));
      }, CONVERSION_TIMEOUT);

      const img = new Image();

      img.onload = () => {
        try {
          clearTimeout(timeoutId);

          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Apply resize if enabled
          if (targetWidth && targetHeight) {
            width = targetWidth;
            height = targetHeight;
          } else if (targetWidth) {
            width = targetWidth;
            height = maintainAspect ? Math.round((img.height * targetWidth) / img.width) : img.height;
          } else if (targetHeight) {
            height = targetHeight;
            width = maintainAspect ? Math.round((img.width * targetHeight) / img.height) : img.width;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported in this browser.");

          ctx.drawImage(img, 0, 0, width, height);
          const webpDataUrl = canvas.toDataURL("image/webp", quality);

          if (!webpDataUrl.startsWith("data:image/webp")) {
            throw new Error("Your browser does not support WebP export.");
          }

          resolve({ dataUrl: webpDataUrl, width, height });
        } catch (err: any) {
          clearTimeout(timeoutId);
          reject(err);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error("Unable to load image. Please try another file."));
      };

      img.src = dataUrl;
    });
  };

  const handleFiles = async (files: FileList) => {
    const filesArray = Array.from(files);
    const newItems: ConversionItem[] = [];

    for (const file of filesArray) {
      const error = validateFile(file);
      if (error) {
        // Add error item
        newItems.push({
          id: Math.random().toString(36).substr(2, 9),
          inputName: file.name,
          inputPreview: "",
          originalSizeKb: file.size / 1024,
          converted: null,
          error,
          isProcessing: false,
        });
        continue;
      }

      // Create item with processing state
      const item: ConversionItem = {
        id: Math.random().toString(36).substr(2, 9),
        inputName: file.name,
        inputPreview: "",
        originalSizeKb: file.size / 1024,
        converted: null,
        error: "",
        isProcessing: true,
      };
      newItems.push(item);
    }

    setItems((prev) => [...prev, ...newItems]);
    setStatus(`Processing ${filesArray.length} image(s)...`);

    // Process each file
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const item = newItems[i];

      if (item.error) continue; // Skip files with errors

      try {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = async () => {
            try {
              const dataUrl = reader.result as string;

              // Update preview
              setItems((prev) =>
                prev.map((it) =>
                  it.id === item.id ? { ...it, inputPreview: dataUrl } : it
                )
              );

              // Convert image
              const resizeWidth = enableResize && targetWidth ? parseInt(targetWidth) : undefined;
              const resizeHeight = enableResize && targetHeight ? parseInt(targetHeight) : undefined;

              const { dataUrl: webpDataUrl, width, height } = await convertImage(
                dataUrl,
                quality,
                resizeWidth,
                resizeHeight
              );

              const blobUrl = dataUrlToBlobUrl(webpDataUrl);
              const converted: Converted = {
                dataUrl: webpDataUrl,
                blobUrl,
                sizeKb: webpDataUrl.length / 1024,
                originalSizeKb: item.originalSizeKb,
                width,
                height,
              };

              setItems((prev) =>
                prev.map((it) =>
                  it.id === item.id ? { ...it, converted, isProcessing: false } : it
                )
              );

              resolve();
            } catch (err: any) {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === item.id
                    ? { ...it, error: err?.message || "Unable to convert image to WebP.", isProcessing: false }
                    : it
                )
              );
              reject(err);
            }
          };
          reader.onerror = () => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, error: "Unable to read file.", isProcessing: false } : it
              )
            );
            reject(new Error("Unable to read file."));
          };
          reader.readAsDataURL(file);
        });
      } catch (err) {
        console.error("File processing error:", err);
      }
    }

    const successCount = newItems.filter((it) => !it.error).length;
    setStatus(
      successCount > 0
        ? `Converted ${successCount} of ${filesArray.length} image(s)`
        : "Conversion failed"
    );
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

  const handleDownload = (item: ConversionItem) => {
    if (!item.converted) return;
    const a = document.createElement("a");
    a.href = item.converted.blobUrl;
    const filename = customFilename
      ? customFilename + ".webp"
      : (item.inputName ? item.inputName.replace(/\.[^.]+$/, "") : "image") + ".webp";
    a.download = filename;
    a.click();
  };

  const handleDownloadAll = () => {
    items.forEach((item) => {
      if (item.converted) {
        handleDownload(item);
      }
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.converted?.blobUrl) {
        URL.revokeObjectURL(item.converted.blobUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.add("border-blue-400", "bg-blue-50/50");
    },
    onDragLeave: (e: React.DragEvent) => {
      e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/50");
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove("border-blue-400", "bg-blue-50/50");
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFiles(files);
    },
  };

  const successfulConversions = items.filter((it) => it.converted).length;
  const hasConversions = items.length > 0;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied snippet" : ""} {copyDataUrl ? "Copied data URL" : ""}
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

      {/* Control Panel */}
      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        {/* Quality Controls */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Quality: <span className="text-xs font-semibold text-slate-600">{Math.round(quality * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))}
              className="flex-1 min-w-[120px]"
              aria-label="WebP quality"
            />
          </div>

          {/* Quality Presets */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(QUALITY_PRESETS).map(([key, { value, label }]) => (
              <button
                key={key}
                onClick={() => setQuality(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  quality === value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                aria-label={`Set quality to ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Resize Options */}
        <div className="border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={enableResize}
              onChange={(e) => setEnableResize(e.target.checked)}
              className="rounded"
            />
            Resize images during conversion
          </label>

          {enableResize && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                Width:
                <input
                  type="number"
                  value={targetWidth}
                  onChange={(e) => setTargetWidth(e.target.value)}
                  placeholder="Auto"
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  min="1"
                />
                px
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                Height:
                <input
                  type="number"
                  value={targetHeight}
                  onChange={(e) => setTargetHeight(e.target.value)}
                  placeholder="Auto"
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  min="1"
                />
                px
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => setMaintainAspect(e.target.checked)}
                  className="rounded"
                />
                Maintain aspect ratio
              </label>
            </div>
          )}
        </div>

        {/* Custom Filename */}
        <div className="border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Custom filename (optional):
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="Leave empty to use original"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1 text-sm"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setQuality(0.8);
              setEnableResize(false);
              setTargetWidth("");
              setTargetHeight("");
              setMaintainAspect(true);
              setCustomFilename("");
              setStatus("Awaiting image");
              clearAllOutputs();
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            aria-label="Reset all settings"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset All
          </button>

          {successfulConversions > 1 && (
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              aria-label="Download all converted images"
            >
              <Download className="h-4 w-4" />
              Download All ({successfulConversions})
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-12 text-center text-sm text-slate-700 transition hover:border-slate-400 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200"
        onClick={() => inputRef.current?.click()}
        {...dropHandlers}
        role="button"
        aria-label="Upload images"
      >
        <Upload className="mb-3 h-8 w-8 text-slate-500" />
        <p className="text-base font-medium">Click or drop images to convert to WebP</p>
        <p className="mt-1 text-xs text-slate-500">JPG, PNG, GIF · Max 10MB per file · Multiple files supported</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
          }}
        />
      </div>

      {/* Status */}
      {hasConversions && (
        <p className="text-sm text-slate-600">
          {status} · {successfulConversions} successful conversion{successfulConversions !== 1 ? "s" : ""}
        </p>
      )}

      {/* Conversion Items */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200"
            >
              <div className="flex items-start gap-4">
                {/* Input Preview */}
                <div className="flex-shrink-0">
                  {item.inputPreview ? (
                    <img
                      src={item.inputPreview}
                      alt={`Original: ${item.inputName}`}
                      className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Info & Actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.inputName}</p>
                      <p className="text-xs text-slate-600">Original: {item.originalSizeKb.toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex-shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {item.isProcessing && (
                    <p className="mt-2 text-xs font-medium text-blue-600">Converting...</p>
                  )}

                  {item.error && (
                    <p className="mt-2 text-xs font-medium text-amber-600">{item.error}</p>
                  )}

                  {item.converted && (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <img
                          src={item.converted.dataUrl}
                          alt="WebP preview"
                          className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-green-700">
                            ✓ Converted: {item.converted.sizeKb.toFixed(1)} KB
                          </p>
                          <p className="text-xs text-slate-600">
                            Saved {((1 - item.converted.sizeKb / item.converted.originalSizeKb) * 100).toFixed(0)}% ·{" "}
                            {item.converted.width}×{item.converted.height}px
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCopy(item.converted!.dataUrl, setCopyDataUrl)}
                          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                          aria-label="Copy data URL"
                        >
                          {copyDataUrl ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                          {copyDataUrl ? "Copied!" : "Copy URL"}
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-700"
                          aria-label="Download WebP"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Drop or upload one or multiple images (JPG/PNG/GIF, max 10MB each).</li>
          <li>Adjust quality (30-100%, default 80%) using the slider or preset buttons.</li>
          <li>Optionally enable resize and set target dimensions.</li>
          <li>Copy data URLs or download individual/all WebP files.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>All conversion runs locally in your browser; files are not uploaded to any server.</p>
          <p>File size savings show the reduction from original to WebP format.</p>
          <p>If your browser lacks WebP support, you will see an error when converting.</p>
        </div>
      </div>
    </main>
  );
}
