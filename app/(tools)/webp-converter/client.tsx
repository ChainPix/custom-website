"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Upload, X, Image as ImageIcon } from "lucide-react";

type Converted = {
  dataUrl: string;
  blob: Blob;
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
  const fileParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
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

  return new Blob([...fileParts, ...centralParts, endHeader], {
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
  ): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Conversion timeout. Image may be too large or complex."));
      }, CONVERSION_TIMEOUT);

      const img = new Image();

      img.onload = () => {
        const finish = (result: { dataUrl: string; blob: Blob; width: number; height: number }) => {
          clearTimeout(timeoutId);
          resolve(result);
        };

        const fail = (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        };

        try {
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

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                fail(new Error("Unable to export WebP image."));
                return;
              }
              if (blob.type !== "image/webp") {
                fail(new Error("Your browser does not support WebP export."));
                return;
              }

              const reader = new FileReader();
              reader.onload = () => {
                finish({ dataUrl: reader.result as string, blob, width, height });
              };
              reader.onerror = () => {
                fail(new Error("Unable to read converted image."));
              };
              reader.readAsDataURL(blob);
            },
            "image/webp",
            quality
          );
        } catch (err: any) {
          fail(err);
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

              const { dataUrl: webpDataUrl, blob, width, height } = await convertImage(
                dataUrl,
                quality,
                resizeWidth,
                resizeHeight
              );

              const blobUrl = URL.createObjectURL(blob);
              const converted: Converted = {
                dataUrl: webpDataUrl,
                blob,
                blobUrl,
                sizeKb: blob.size / 1024,
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
          blob: item.converted!.blob,
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
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copiedItemId ? "Copied data URL" : ""} {isZipping ? "Preparing zip download" : ""}
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
              WebP Converter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
        <h2 className="text-2xl font-semibold text-slate-900">How to use the WebP converter</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Set your quality first using the slider or presets: Low (50%), Medium (70%), High (80% default), or Max (95% near-lossless).</li>
          <li>If needed, enable resize and set target dimensions before uploading.</li>
          <li>Drop or upload one or multiple images (JPG/PNG/GIF, max 10MB each).</li>
          <li>Download individual files or use Download All for a single zip, and copy data URLs when needed.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>All conversion runs locally in your browser; files are not uploaded to any server.</p>
          <p>File size savings show the reduction from original to WebP format.</p>
          <p>If your browser lacks WebP support, you will see an error when converting.</p>
        </div>
      </div>

      {/* SEO-Rich Content Section: What is WebP */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">What is WebP and why convert images?</h2>
          <div className="space-y-3 text-slate-700 leading-relaxed">
            <p>
              <strong className="font-semibold text-slate-900">WebP</strong> is a modern image format developed by Google that
              delivers smaller file sizes while keeping visual quality high. Compared to JPG and PNG, WebP can reduce file
              sizes by <strong className="font-semibold text-slate-900">25-70%</strong> for most web images, which improves
              page speed, Core Web Vitals, and overall user experience.
            </p>
            <p>
              Our <strong className="font-semibold text-slate-900">free WebP converter</strong> runs fully in your browser
              using the Canvas API. That means your images stay on your device, with no server uploads or tracking. You can
              batch convert multiple images, adjust quality, and resize on the fly to create optimized assets for blogs,
              product pages, and responsive layouts.
            </p>
            <p>
              WebP supports transparency like PNG and can replace heavy JPG files for photographs. The converter also
              provides real file size savings per image so you can make informed quality and compression choices before
              downloading.
            </p>
          </div>
        </div>
      </section>

      {/* SEO-Rich Content Section: Key Features */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Key features of our WebP image converter</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Batch conversion",
              body: "Convert multiple JPG, PNG, or GIF files in one upload with sequential processing to avoid memory spikes.",
              tone: "emerald",
            },
            {
              title: "Quality presets",
              body: "Low, Medium, High, and Max presets plus a slider for precise WebP quality control.",
              tone: "emerald",
            },
            {
              title: "Resize while converting",
              body: "Set width and height with optional aspect ratio lock to create thumbnails or responsive assets.",
              tone: "emerald",
            },
            {
              title: "Local processing",
              body: "Everything runs client-side in your browser. No uploads, no server storage, no tracking.",
              tone: "blue",
            },
            {
              title: "Clear savings data",
              body: "See original size, converted size, and percentage saved for every image.",
              tone: "blue",
            },
            {
              title: "Download options",
              body: "Download images one by one or as a single zip when converting multiple files.",
              tone: "blue",
            },
          ].map((feature) => (
            <div key={feature.title} className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`rounded-lg p-2 ring-1 ${
                    feature.tone === "emerald"
                      ? "bg-emerald-100 ring-emerald-200"
                      : "bg-blue-100 ring-blue-200"
                  }`}
                >
                  <Check className={`h-5 w-5 ${feature.tone === "emerald" ? "text-emerald-700" : "text-blue-700"}`} />
                </div>
                <h3 className="font-semibold text-slate-900">{feature.title}</h3>
              </div>
              <p className="text-sm text-slate-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SEO-Rich Content Section: Common Use Cases */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Common WebP conversion use cases</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-emerald-50 to-white p-5 ring-1 ring-emerald-100">
            <h3 className="text-lg font-semibold text-slate-900">E-commerce product images</h3>
            <p className="text-sm text-slate-700">
              Batch convert product photos, set Medium quality, and resize to standard dimensions like 800x800 to improve
              store performance and image consistency.
            </p>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-blue-50 to-white p-5 ring-1 ring-blue-100">
            <h3 className="text-lg font-semibold text-slate-900">Blog and marketing content</h3>
            <p className="text-sm text-slate-700">
              Compress hero images and in-article media to improve LCP scores and keep pages fast on mobile devices.
            </p>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-amber-50 to-white p-5 ring-1 ring-amber-100">
            <h3 className="text-lg font-semibold text-slate-900">App and SaaS dashboards</h3>
            <p className="text-sm text-slate-700">
              Convert UI screenshots or help center images to WebP for faster loading and lighter asset bundles.
            </p>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-purple-50 to-white p-5 ring-1 ring-purple-100">
            <h3 className="text-lg font-semibold text-slate-900">Social media variants</h3>
            <p className="text-sm text-slate-700">
              Resize multiple images at once and export optimized WebP files for quick previews and asset sharing.
            </p>
          </div>
        </div>
      </section>

      {/* SEO-Rich Content Section: WebP vs JPG/PNG */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">WebP vs JPG vs PNG: quick comparison</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl bg-white/90 p-5 ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">When WebP beats JPG</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>Smaller file sizes at similar visual quality.</li>
              <li>Great for photographs, hero images, and banners.</li>
              <li>Supports transparency (unlike JPG).</li>
            </ul>
          </div>
          <div className="space-y-3 rounded-xl bg-white/90 p-5 ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">When WebP beats PNG</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>Much smaller sizes for transparent graphics and icons.</li>
              <li>Better compression for UI elements and illustrations.</li>
              <li>Maintains alpha transparency with less weight.</li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Note: animated GIFs are converted to static WebP (first frame) due to browser Canvas limitations.
        </p>
      </section>

      {/* SEO-Rich Content Section: Why Use Our Tool */}
      <section className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-700">
        <h2 className="text-2xl font-semibold">Why use our WebP converter?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-5 ring-1 ring-emerald-400/30">
            <h3 className="text-lg font-semibold">Privacy-first conversion</h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              Your images never leave your device. The converter runs entirely in your browser with no uploads, storage, or
              tracking. Perfect for sensitive assets or internal content.
            </p>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-5 ring-1 ring-blue-400/30">
            <h3 className="text-lg font-semibold">Fast batch workflows</h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              Convert multiple images at once, download as a zip, and keep file naming consistent with custom filenames.
            </p>
          </div>
          <div className="space-y-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-5 ring-1 ring-purple-400/30">
            <h3 className="text-lg font-semibold">Quality you control</h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              Choose presets or fine-tune quality to balance size and clarity. Resize while converting to generate exact
              dimensions for responsive layouts.
            </p>
          </div>
        </div>
      </section>

      {/* SEO-Rich Content Section: FAQ */}
      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Frequently asked questions</h2>
        <div className="space-y-4">
          {[
            {
              q: "Is this WebP converter free and unlimited?",
              a: "Yes. There are no daily limits or subscriptions. You can convert as many images as you need, within the 10MB per image limit.",
            },
            {
              q: "Does the tool upload my images?",
              a: "No. All conversion happens locally in your browser. Images are never sent to a server.",
            },
            {
              q: "What formats are supported?",
              a: "Any image/* format supported by your browser, including JPG, PNG, GIF, BMP, and SVG. GIFs convert to static WebP (first frame).",
            },
            {
              q: "How much smaller are WebP files?",
              a: "Typical reductions are 25-40% for JPG and 60-80% for PNG at 80% quality. The tool shows exact savings per image.",
            },
            {
              q: "Can I resize images while converting?",
              a: "Yes. Enable resize and set a width and/or height. Keep aspect ratio on to avoid distortion.",
            },
            {
              q: "Do you preserve EXIF metadata?",
              a: "No. Canvas-based conversion strips EXIF data, which helps privacy but removes camera metadata.",
            },
          ].map((item) => (
            <details key={item.q} className="group rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-center justify-between">
                <span>{item.q}</span>
                <span className="text-slate-400 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-700 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* SEO-Rich Content Section: Related Tools */}
      <section className="space-y-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-2xl font-semibold text-slate-900">Related tools</h2>
        <p className="text-sm text-slate-700">
          Keep your image workflows in one place with these complementary tools:
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/image-base64"
            className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-900"
          >
            Image to Base64
          </Link>
          <Link
            href="/data-uri"
            className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-900"
          >
            Data URI Encoder
          </Link>
          <Link
            href="/color-converter"
            className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-900"
          >
            Color Converter
          </Link>
        </div>
      </section>
    </main>
  );
}
