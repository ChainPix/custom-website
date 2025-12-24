"use client";

import Link from "next/link";
import { useRef, useState } from "react";
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

function dataUrlToBlob(dataUrl: string) {
  const byteString = atob(dataUrl.split(",")[1] || "");
  const mime = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

function dataUrlToBlobUrl(dataUrl: string) {
  return URL.createObjectURL(dataUrlToBlob(dataUrl));
}

function sanitizeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/[. ]+$/, "").trim();
}

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function getItemFilename(item: ConversionItem, customFilename: string) {
  const baseName = customFilename
    ? stripExtension(customFilename)
    : item.inputName
      ? stripExtension(item.inputName)
      : "image";
  const safeBase = sanitizeFilename(baseName) || "image";
  return `${safeBase}.webp`;
}

async function buildZip(entries: { name: string; blob: Blob }[]) {
  const encoder = new TextEncoder();
  const fileParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  const writeHeader = (view: DataView, offset: number, value: number, bytes: number) => {
    if (bytes === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
  };

  const crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  const crc32 = (data: Uint8Array) => {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const crc = crc32(data);
    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const localView = new DataView(localHeader);
    writeHeader(localView, 0, 0x04034b50, 4);
    writeHeader(localView, 4, 20, 2);
    writeHeader(localView, 6, 0, 2);
    writeHeader(localView, 8, 0, 2);
    writeHeader(localView, 10, 0, 2);
    writeHeader(localView, 12, 0, 2);
    writeHeader(localView, 14, crc, 4);
    writeHeader(localView, 18, data.length, 4);
    writeHeader(localView, 22, data.length, 4);
    writeHeader(localView, 26, nameBytes.length, 2);
    writeHeader(localView, 28, 0, 2);
    new Uint8Array(localHeader, 30, nameBytes.length).set(nameBytes);

    fileParts.push(new Uint8Array(localHeader), data);

    const centralHeader = new ArrayBuffer(46 + nameBytes.length);
    const centralView = new DataView(centralHeader);
    writeHeader(centralView, 0, 0x02014b50, 4);
    writeHeader(centralView, 4, 20, 2);
    writeHeader(centralView, 6, 20, 2);
    writeHeader(centralView, 8, 0, 2);
    writeHeader(centralView, 10, 0, 2);
    writeHeader(centralView, 12, 0, 2);
    writeHeader(centralView, 14, 0, 2);
    writeHeader(centralView, 16, crc, 4);
    writeHeader(centralView, 20, data.length, 4);
    writeHeader(centralView, 24, data.length, 4);
    writeHeader(centralView, 28, nameBytes.length, 2);
    writeHeader(centralView, 30, 0, 2);
    writeHeader(centralView, 32, 0, 2);
    writeHeader(centralView, 34, 0, 2);
    writeHeader(centralView, 36, 0, 2);
    writeHeader(centralView, 38, 0, 4);
    writeHeader(centralView, 42, offset, 4);
    new Uint8Array(centralHeader, 46, nameBytes.length).set(nameBytes);

    centralParts.push(new Uint8Array(centralHeader));

    offset += localHeader.byteLength + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = new ArrayBuffer(22);
  const endView = new DataView(endHeader);
  writeHeader(endView, 0, 0x06054b50, 4);
  writeHeader(endView, 4, 0, 2);
  writeHeader(endView, 6, 0, 2);
  writeHeader(endView, 8, entries.length, 2);
  writeHeader(endView, 10, entries.length, 2);
  writeHeader(endView, 12, centralSize, 4);
  writeHeader(endView, 16, offset, 4);
  writeHeader(endView, 20, 0, 2);

  return new Blob([...fileParts, ...centralParts, new Uint8Array(endHeader)], {
    type: "application/zip",
  });
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
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const clearAllOutputs = () => {
    items.forEach((item) => {
      if (item.converted?.blobUrl) URL.revokeObjectURL(item.converted.blobUrl);
    });
    setItems([]);
    setCopiedItemId(null);
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
    const totalCount = filesArray.length;
    let processedCount = 0;
    let successCount = 0;

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
    setStatus(`Processing 0 of ${totalCount} image(s)...`);

    // Process each file
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const item = newItems[i];

      if (item.error) {
        processedCount += 1;
        setStatus(`Processing ${processedCount} of ${totalCount} image(s)...`);
        continue;
      }

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
              successCount += 1;
              processedCount += 1;
              setStatus(`Processing ${processedCount} of ${totalCount} image(s)...`);

              resolve();
            } catch (err: any) {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === item.id
                    ? { ...it, error: err?.message || "Unable to convert image to WebP.", isProcessing: false }
                    : it
                )
              );
              processedCount += 1;
              setStatus(`Processing ${processedCount} of ${totalCount} image(s)...`);
              reject(err);
            }
          };
          reader.onerror = () => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, error: "Unable to read file.", isProcessing: false } : it
              )
            );
            processedCount += 1;
            setStatus(`Processing ${processedCount} of ${totalCount} image(s)...`);
            reject(new Error("Unable to read file."));
          };
          reader.readAsDataURL(file);
        });
      } catch (err) {
        console.error("File processing error:", err);
      }
    }

    setStatus(
      successCount > 0
        ? `Converted ${successCount} of ${totalCount} image(s)`
        : "Conversion failed"
    );
  };

  const handleCopy = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItemId(itemId);
      setTimeout(() => setCopiedItemId(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = (item: ConversionItem) => {
    if (!item.converted) return;
    const a = document.createElement("a");
    a.href = item.converted.blobUrl;
    const filename = getItemFilename(item, customFilename);
    a.download = filename;
    a.click();
  };

  const handleDownloadAll = async () => {
    const convertedItems = items.filter((item) => item.converted);
    if (convertedItems.length === 0) return;
    if (convertedItems.length === 1) {
      handleDownload(convertedItems[0]);
      return;
    }

    setIsZipping(true);
    setStatus("Preparing zip download...");

    try {
      const usedNames = new Set<string>();
      const entries = convertedItems.map((item, index) => {
        const baseName = customFilename
          ? `${stripExtension(customFilename)}-${index + 1}`
          : item.inputName
            ? stripExtension(item.inputName)
            : `image-${index + 1}`;
        const safeBase = sanitizeFilename(baseName) || `image-${index + 1}`;
        let filename = `${safeBase}.webp`;
        let suffix = 1;
        while (usedNames.has(filename)) {
          filename = `${safeBase}-${suffix}.webp`;
          suffix += 1;
        }
        usedNames.add(filename);

        return {
          name: filename,
          blob: dataUrlToBlob(item.converted!.dataUrl),
        };
      });

      const zipBlob = await buildZip(entries);
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipBase = sanitizeFilename(stripExtension(customFilename));
      const zipName = zipBase
        ? `${zipBase}-webp.zip`
        : "webp-conversions.zip";
      const a = document.createElement("a");
      a.href = zipUrl;
      a.download = zipName;
      a.click();
      setStatus(`Download started for ${convertedItems.length} image(s).`);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
    } catch (err) {
      console.error("Unable to build zip", err);
      setStatus("Unable to build zip download.");
    } finally {
      setIsZipping(false);
    }
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
        {status} {copiedItemId ? "Copied data URL" : ""} {isZipping ? "Preparing zip download" : ""}
      </div>

      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          Back to tools
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
              disabled={isZipping}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Download all converted images"
            >
              <Download className="h-4 w-4" />
              {isZipping ? "Preparing Zip..." : `Download All (${successfulConversions})`}
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
        <p className="mt-1 text-xs text-slate-500">JPG, PNG, GIF - Max 10MB per file - Multiple files supported</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
              e.currentTarget.value = "";
            }
          }}
        />
      </div>

      {/* Status */}
      {hasConversions && (
        <p className="text-sm text-slate-600">
          {status} - {successfulConversions} successful conversion{successfulConversions !== 1 ? "s" : ""}
        </p>
      )}

      {/* Conversion Items */}
      {items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
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
                            Converted: {item.converted.sizeKb.toFixed(1)} KB
                          </p>
                          <p className="text-xs text-slate-600">
                            Saved {((1 - item.converted.sizeKb / item.converted.originalSizeKb) * 100).toFixed(0)}% -{" "}
                            {item.converted.width}x{item.converted.height}px
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCopy(item.converted!.dataUrl, item.id)}
                          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                          aria-label="Copy data URL"
                        >
                          {copiedItemId === item.id ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                          {copiedItemId === item.id ? "Copied!" : "Copy URL"}
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
