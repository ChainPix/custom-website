"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import QRCode from "qrcode";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

export default function QrGeneratorClient() {
  const [text, setText] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (value: string) => {
    setText(value);
    if (!value) {
      setDataUrl("");
      setError("");
      return;
    }
    try {
      const url = await QRCode.toDataURL(value, { margin: 1, scale: 6 });
      setDataUrl(url);
      setError("");
    } catch (err) {
      console.error("QR generate error", err);
      setDataUrl("");
      setError("Unable to generate QR code for this input.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">QR Code Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Create QR codes from text or URLs and download them instantly. Generation runs locally in
          your browser.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              void handleChange("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!text}
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
          <p className="text-sm font-medium text-amber-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: use for share links, wifi creds, or short notes.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="text-sm font-semibold">QR Preview</div>
        <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-white">
          {dataUrl ? (
            <Image src={dataUrl} alt="QR code" width={224} height={224} unoptimized className="h-56 w-56" />
          ) : (
            <p className="text-slate-500">QR will appear here</p>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={dataUrl || "#"}
            download="qr-code.png"
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-disabled={!dataUrl}
          >
            <Download className="h-4 w-4" />
            Download PNG
          </a>
        </div>
      </div>
    </main>
  );
}
