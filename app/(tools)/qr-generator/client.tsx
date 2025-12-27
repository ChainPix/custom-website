"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

const LARGE_CHARS = 2000;
const DEBOUNCE_MS = 220;

const getScanDifficulty = (length: number, level: "L" | "M" | "Q" | "H") => {
  if (!length) return { label: "--", tone: "text-slate-500", badge: "bg-slate-100 text-slate-600" };
  const multiplier = { L: 1, M: 1.15, Q: 1.35, H: 1.6 }[level];
  const score = length * multiplier;
  if (score <= 300) return { label: "Easy", tone: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700" };
  if (score <= 900) return { label: "Medium", tone: "text-amber-600", badge: "bg-amber-50 text-amber-700" };
  return { label: "Hard", tone: "text-rose-600", badge: "bg-rose-50 text-rose-700" };
};

const sanitizeFilenameBase = (value: string) => {
  const trimmed = value.trim().replace(/\.(png|svg)$/i, "");
  const cleaned = trimmed.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return cleaned.replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "qr-code";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const getSuggestedFilenameBase = (payload: string) => {
  if (!payload) return "qr-code";
  if (payload.startsWith("WIFI:")) {
    const match = payload.match(/S:([^;]+);/);
    const ssid = match?.[1] ? slugify(match[1]) : "";
    return ssid ? `wifi-${ssid}` : "wifi-qr";
  }
  try {
    const url = new URL(payload);
    const host = slugify(url.hostname.replace(/^www\./, ""));
    return host ? `link-${host}` : "link-qr";
  } catch {
    return "text-qr";
  }
};

export default function QrGeneratorClient() {
  const [text, setText] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [size, setSize] = useState(224);
  const [correction, setCorrection] = useState<"L" | "M" | "Q" | "H">("M");
  const [validateUrl, setValidateUrl] = useState(false);
  const [trim, setTrim] = useState(true);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [generationMode, setGenerationMode] = useState<"live" | "manual">("live");
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportTransparent, setExportTransparent] = useState(false);
  const [filenameBase, setFilenameBase] = useState("qr-code");
  const [isExporting, setIsExporting] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const exportRequestIdRef = useRef(0);
  const pendingExportsRef = useRef(
    new Map<number, { resolve: (data: string) => void; reject: (error: Error) => void }>()
  );
  const filenameDirtyRef = useRef(false);
  const payload = trim ? text.trim() : text;
  const hasPayload = payload.length > 0;
  const difficulty = getScanDifficulty(payload.length, correction);
  const suggestedFilenameBase = getSuggestedFilenameBase(payload);

  useEffect(() => {
    const worker = new Worker(new URL("./qr-worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { requestId, purpose, data, error: workerError } = event.data as {
        requestId: number;
        purpose: "preview" | "export";
        format: "png" | "svg";
        data?: string;
        error?: string;
      };
      if (purpose === "preview") {
        if (requestId !== requestIdRef.current) return;
        setIsGenerating(false);
        if (workerError) {
          setDataUrl("");
          setError(workerError);
          setStatus("Error");
          return;
        }
        setDataUrl(data ?? "");
        setError("");
        setStatus("QR generated");
        return;
      }
      const pending = pendingExportsRef.current.get(requestId);
      if (!pending) return;
      pendingExportsRef.current.delete(requestId);
      if (workerError) {
        pending.reject(new Error(workerError));
        return;
      }
      pending.resolve(data ?? "");
    };

    worker.onerror = (err) => {
      console.error("QR worker error", err);
      setIsGenerating(false);
      setDataUrl("");
      setError("Unable to generate QR code for this input.");
      setStatus("Error");
      pendingExportsRef.current.forEach(({ reject }) => {
        reject(new Error("QR export failed."));
      });
      pendingExportsRef.current.clear();
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const getPreviewOptions = useCallback(
    () => ({
      margin: 1,
      scale: Math.max(2, Math.round(size / 37)),
      errorCorrectionLevel: correction,
      color: { dark: fgColor, light: bgColor },
    }),
    [size, correction, fgColor, bgColor]
  );

  const getExportOptions = useCallback(
    (transparent: boolean) => ({
      margin: 1,
      width: size,
      errorCorrectionLevel: correction,
      color: { dark: fgColor, light: transparent ? "#00000000" : bgColor },
    }),
    [size, correction, fgColor, bgColor]
  );

  const generateQr = useCallback(
    (value?: string) => {
      const payload = trim ? (value ?? text).trim() : value ?? text;
      if (!payload) {
        setDataUrl("");
        setError("");
        setStatus("Awaiting input");
        setIsGenerating(false);
        return;
      }
      if (validateUrl) {
        try {
          // eslint-disable-next-line no-new
          new URL(payload);
          setError("");
        } catch {
          setError("This doesn't look like a valid URL.");
          setDataUrl("");
          setStatus("Invalid URL");
          setIsGenerating(false);
          return;
        }
      }
      const worker = workerRef.current;
      if (!worker) {
        setError("QR generator is unavailable.");
        setStatus("Error");
        setIsGenerating(false);
        return;
      }
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsGenerating(true);
      setStatus("Generating...");
      worker.postMessage({
        requestId,
        purpose: "preview",
        format: "png",
        payload,
        options: getPreviewOptions(),
      });
    },
    [text, trim, validateUrl, getPreviewOptions]
  );

  useEffect(() => {
    if (!payload) {
      setWarning("");
      return;
    }
    if (payload.length > LARGE_CHARS) {
      setWarning(`Large input (${payload.length.toLocaleString()} chars). Try shorter text for reliable scans.`);
    } else {
      setWarning("");
    }
  }, [payload]);

  useEffect(() => {
    if (generationMode !== "live") return;
    if (!payload) {
      setDataUrl("");
      setError("");
      setStatus("Awaiting input");
      setIsGenerating(false);
      return;
    }
    const timeout = window.setTimeout(() => generateQr(payload), DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [payload, size, correction, fgColor, bgColor, validateUrl, generationMode, generateQr]);

  const markManualDirty = useCallback(() => {
    if (generationMode !== "manual") return;
    if (!payload) {
      setStatus("Awaiting input");
      return;
    }
    setStatus("Ready to generate");
  }, [generationMode, payload]);

  const handleChange = (value: string) => {
    const nextPayload = trim ? value.trim() : value;
    setText(value);
    setError("");
    if (!nextPayload) {
      setDataUrl("");
      setWarning("");
      setStatus("Awaiting input");
      setIsGenerating(false);
      return;
    }
    if (generationMode === "manual") {
      setStatus("Ready to generate");
    }
  };

  useEffect(() => {
    if (generationMode === "manual") {
      markManualDirty();
    }
  }, [generationMode, markManualDirty]);

  useEffect(() => {
    if (!payload) {
      filenameDirtyRef.current = false;
    }
    if (!filenameDirtyRef.current) {
      setFilenameBase(suggestedFilenameBase);
    }
  }, [payload, suggestedFilenameBase]);

  const buildExportFilename = useCallback(
    (extension: "png" | "svg") => {
      const base = sanitizeFilenameBase(filenameBase || suggestedFilenameBase);
      return `${base}.${extension}`;
    },
    [filenameBase, suggestedFilenameBase]
  );

  const requestExport = useCallback(
    (format: "png" | "svg") => {
      const currentPayload = trim ? text.trim() : text;
      if (!currentPayload) {
        setStatus("Awaiting input");
        return Promise.resolve("");
      }
      if (validateUrl) {
        try {
          // eslint-disable-next-line no-new
          new URL(currentPayload);
        } catch {
          setError("This doesn't look like a valid URL.");
          setStatus("Invalid URL");
          return Promise.resolve("");
        }
      }
      setError("");
      const worker = workerRef.current;
      if (!worker) {
        setError("QR generator is unavailable.");
        setStatus("Error");
        return Promise.resolve("");
      }
      const requestId = exportRequestIdRef.current + 1;
      exportRequestIdRef.current = requestId;
      return new Promise<string>((resolve, reject) => {
        pendingExportsRef.current.set(requestId, { resolve, reject });
        worker.postMessage({
          requestId,
          purpose: "export",
          format,
          payload: currentPayload,
          options: getExportOptions(exportTransparent),
        });
      });
    },
    [text, trim, validateUrl, exportTransparent, getExportOptions]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied text");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownloadPng = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setStatus("Preparing PNG...");
    try {
      const exportDataUrl = await requestExport("png");
      if (!exportDataUrl) return;
      const link = document.createElement("a");
      link.href = exportDataUrl;
      link.download = buildExportFilename("png");
      link.click();
      setStatus("Downloaded PNG");
    } catch (err) {
      console.error("PNG export failed", err);
      setStatus("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setStatus("Preparing SVG...");
    try {
      const svgMarkup = await requestExport("svg");
      if (!svgMarkup) return;
      const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildExportFilename("svg");
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Downloaded SVG");
    } catch (err) {
      console.error("SVG export failed", err);
      setStatus("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (isExporting) return;
    if (!navigator.clipboard?.write) {
      setStatus("Clipboard unavailable");
      return;
    }
    setIsExporting(true);
    setStatus("Copying image...");
    try {
      const exportDataUrl = await requestExport("png");
      if (!exportDataUrl) return;
      const response = await fetch(exportDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setStatus("QR image copied");
    } catch (err) {
      console.error("Copy image failed", err);
      setStatus("Copy failed");
    } finally {
      setIsExporting(false);
    }
  };

  const loadSample = (type: "url" | "text" | "wifi") => {
    const samples: Record<typeof type, string> = {
      url: "https://toolstack-nu.vercel.app/",
      text: "Quick share text via QR",
      wifi: "WIFI:T:WPA;S:ToolStackWiFi;P:SuperSecret123;;",
    };
    const val = samples[type];
    handleChange(val);
    setStatus(`Sample loaded: ${type}`);
    if (generationMode === "manual") {
      setStatus("Ready to generate");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error} {warning}
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
              QR Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">QR Code Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Create QR codes from text or URLs and download them instantly. Generation runs locally in
          your browser.
        </p>
        <p className="text-sm text-slate-600">Private and client-side: QR codes are generated locally and not uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadSample("url")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample URL"
          >
            <Sparkles className="h-4 w-4" />
            Sample URL
          </button>
          <button
            onClick={() => loadSample("text")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample text"
          >
            <Sparkles className="h-4 w-4" />
            Sample Text
          </button>
          <button
            onClick={() => loadSample("wifi")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample Wi-Fi string"
          >
            <Sparkles className="h-4 w-4" />
            Sample Wi-Fi
          </button>
          <button
            onClick={() => {
              handleChange("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Clear input"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
            aria-label="Copy input text"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied text" : "Copy text"}
          </button>
        </div>
        <textarea
          className="h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Paste text or URL to generate a QR code"
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Generate mode</span>
          <button
            type="button"
            onClick={() => setGenerationMode("live")}
            aria-pressed={generationMode === "live"}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              generationMode === "live"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5"
            }`}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => setGenerationMode("manual")}
            aria-pressed={generationMode === "manual"}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              generationMode === "manual"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:-translate-y-0.5"
            }`}
          >
            Manual
          </button>
          {generationMode === "manual" && (
            <button
              type="button"
              onClick={() => generateQr()}
              disabled={!hasPayload || isGenerating}
              className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Generate QR code"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : warning ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {warning}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: use for share links, wifi creds, or short notes. All generation stays in your browser.
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Size</span>
            <input
              type="range"
              min={128}
              max={384}
              step={16}
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                markManualDirty();
              }}
              aria-label="QR size"
            />
            <span className="w-12 text-right text-xs text-slate-700">{size}px</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Error correction</span>
            <select
              value={correction}
              onChange={(e) => {
                setCorrection(e.target.value as "L" | "M" | "Q" | "H");
                markManualDirty();
              }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="L">L (low)</option>
              <option value="M">M (med)</option>
              <option value="Q">Q (quartile)</option>
              <option value="H">H (high)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={validateUrl}
              onChange={(e) => {
                setValidateUrl(e.target.checked);
                markManualDirty();
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Validate as URL
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => {
                setTrim(e.target.checked);
                markManualDirty();
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Trim input
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-900">Foreground</span>
            <input
              type="color"
              value={fgColor}
              onChange={(e) => {
                setFgColor(e.target.value);
                markManualDirty();
              }}
              aria-label="Foreground color"
              className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-900">Background</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => {
                setBgColor(e.target.value);
                markManualDirty();
              }}
              aria-label="Background color"
              className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={exportTransparent}
              onChange={(e) => setExportTransparent(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Transparent export
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="font-semibold text-slate-900">Filename</span>
            <input
              type="text"
              value={filenameBase}
              onChange={(event) => {
                filenameDirtyRef.current = true;
                setFilenameBase(event.target.value);
              }}
              onBlur={(event) => setFilenameBase(sanitizeFilenameBase(event.target.value))}
              placeholder={suggestedFilenameBase}
              className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Export filename"
            />
            <span className="text-[10px] text-slate-500">.png/.svg</span>
          </label>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-900">Scan difficulty</span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${difficulty.badge}`}
              title="Based on input length and error correction level."
            >
              {difficulty.label}
            </span>
          </div>
        </div>
        </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="text-sm font-semibold" id="qr-preview-label">QR Preview</div>
        <div
          className="flex items-center justify-center rounded-2xl bg-white"
          style={{ width: size, height: size }}
          role="region"
          aria-labelledby="qr-preview-label"
          tabIndex={0}
        >
          {dataUrl ? (
            <Image
              src={dataUrl}
              alt="Generated QR code"
              width={size}
              height={size}
              unoptimized
              className="h-full w-full"
            />
          ) : (
            <p className="text-slate-500">QR will appear here</p>
          )}
        </div>
        <div className={`text-xs font-semibold ${difficulty.tone}`}>
          Scan difficulty: {difficulty.label}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleDownloadPng}
            disabled={!hasPayload || isExporting}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!hasPayload || isExporting}
            aria-label="Download QR code as PNG"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </button>
          <button
            onClick={handleDownloadSvg}
            disabled={!hasPayload || isExporting}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!hasPayload || isExporting}
            aria-label="Download QR code as SVG"
          >
            <Download className="h-4 w-4" />
            Download SVG
          </button>
          <button
            onClick={handleCopyImage}
            disabled={!hasPayload || isExporting}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!hasPayload || isExporting}
            aria-label="Copy QR image to clipboard"
          >
            <Clipboard className="h-4 w-4" />
            Copy Image
          </button>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste text/URL (or load a sample), adjust size and error correction, and pick colors.</li>
          <li>Enable URL validation when you only expect links; trim input if pasting with extra spaces.</li>
          <li>Copy your input or download the generated PNG once the preview appears.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is this private?</summary>
            <p className="mt-2 text-slate-700">Yes. QR codes are generated locally in your browser; nothing is uploaded.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I validate URLs?</summary>
            <p className="mt-2 text-slate-700">Yes. Toggle “Validate as URL” to block malformed links.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I change colors and size?</summary>
            <p className="mt-2 text-slate-700">Yes. Adjust size slider and color pickers; choose error correction level for density.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
