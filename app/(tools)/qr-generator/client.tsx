"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

const LARGE_CHARS = 2000;

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

  const trimmedText = useMemo(() => (trim ? text.trim() : text), [text, trim]);

  const handleChange = async (value: string) => {
    setText(value);
    const payload = trim ? value.trim() : value;
    if (!payload) {
      setDataUrl("");
      setError("");
      setWarning("");
      setStatus("Awaiting input");
      return;
    }
    if (payload.length > LARGE_CHARS) {
      setWarning(`Large input (${payload.length.toLocaleString()} chars). Try shorter text for reliable scans.`);
    } else {
      setWarning("");
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
        return;
      }
    }
    try {
      const url = await QRCode.toDataURL(payload, {
        margin: 1,
        scale: Math.max(2, Math.round(size / 37)),
        errorCorrectionLevel: correction,
        color: { dark: fgColor, light: bgColor },
      });
      setDataUrl(url);
      setError("");
      setStatus("QR generated");
    } catch (err) {
      console.error("QR generate error", err);
      setDataUrl("");
      setError("Unable to generate QR code for this input.");
      setStatus("Error");
    }
  };

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

  const handleDownload = () => {
    if (!dataUrl) {
      setStatus("Nothing to download");
      return;
    }
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "qr-code.png";
    link.click();
    setStatus("Downloaded");
  };

  const loadSample = (type: "url" | "text" | "wifi") => {
    const samples: Record<typeof type, string> = {
      url: "https://toolstack-nu.vercel.app/",
      text: "Quick share text via QR",
      wifi: "WIFI:T:WPA;S:ToolStackWiFi;P:SuperSecret123;;",
    };
    const val = samples[type];
    void handleChange(val);
    setStatus(`Sample loaded: ${type}`);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error} {warning}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
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
              void handleChange("");
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
            onChange={(event) => void handleChange(event.target.value)}
            placeholder="Paste text or URL to generate a QR code"
        />
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
                if (text) void handleChange(text);
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
                if (text) void handleChange(text);
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
              onChange={(e) => setValidateUrl(e.target.checked)}
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
                if (text) void handleChange(text);
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
                if (text) void handleChange(text);
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
                if (text) void handleChange(text);
              }}
              aria-label="Background color"
              className="h-8 w-12 cursor-pointer rounded border border-slate-200 bg-white"
            />
          </label>
        </div>
        </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="text-sm font-semibold" id="qr-preview-label">QR Preview</div>
        <div
          className="flex h-64 w-64 items-center justify-center rounded-2xl bg-white"
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
              className="h-56 w-56"
            />
          ) : (
            <p className="text-slate-500">QR will appear here</p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!dataUrl}
            aria-label="Download QR code as PNG"
          >
            <Download className="h-4 w-4" />
            Download PNG
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
