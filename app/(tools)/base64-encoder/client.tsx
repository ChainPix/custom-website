"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

export default function Base64Client() {
  const [input, setInput] = useState("");
  const [encoded, setEncoded] = useState("");
  const [decoded, setDecoded] = useState("");
  const [copied, setCopied] = useState<"enc" | "dec" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [autoMode, setAutoMode] = useState<"none" | "encode" | "decode">("none");
  const MAX_SIZE_BYTES = 512 * 1024; // 512KB guard

  const handleEncode = () => {
    try {
      setError("");
      setStatus("Encoding...");
      const bytes = new Blob([input]).size;
      if (bytes > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      setEncoded(btoa(unescape(encodeURIComponent(input))));
      setDecoded("");
      setStatus("Updated");
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to encode this input.");
      setStatus("Error");
    }
  };

  const handleDecode = () => {
    try {
      setError("");
      setStatus("Decoding...");
      const bytes = new Blob([input]).size;
      if (bytes > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const decodedText = decodeURIComponent(escape(atob(input)));
      setDecoded(decodedText);
      setEncoded("");
      setStatus("Updated");
    } catch (err) {
      console.error("Decode error", err);
      setError("Invalid Base64 string. Check padding and allowed characters.");
      setStatus("Error");
    }
  };

  const handleCopy = async (text: string, key: "enc" | "dec") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = (text: string, filename: string) => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sample = "https://example.com/api?token=abc123==";

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Base64 Encoder & Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text to/from Base64 instantly. Great for headers, payloads, and quick tests.
        </p>
        <p className="text-xs text-slate-500">Runs locally in your browser; no data is uploaded.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleEncode}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Encode
            </button>
            <button
              onClick={handleDecode}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Decode
            </button>
            <button
              onClick={() => {
                setInput("");
                setEncoded("");
                setDecoded("");
                setError("");
                setAutoMode("none");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={() => setInput(sample)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Sample
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Auto mode:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="auto-mode"
                value="none"
                checked={autoMode === "none"}
                onChange={() => setAutoMode("none")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Off
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="auto-mode"
                value="encode"
                checked={autoMode === "encode"}
                onChange={() => {
                  setAutoMode("encode");
                  handleEncode();
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Encode on change
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="auto-mode"
                value="decode"
                checked={autoMode === "decode"}
                onChange={() => {
                  setAutoMode("decode");
                  handleDecode();
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Decode on change
            </label>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => {
              const val = event.target.value;
              setInput(val);
              if (autoMode === "encode") handleEncode();
              if (autoMode === "decode") handleDecode();
            }}
            placeholder="Paste text to encode or Base64 to decode"
            aria-label="Text to encode or decode"
          />
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: Use Base64 for headers, tokens, and data URIs.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold" id="encoded-label">
                Encoded
              </p>
              <button
                onClick={() => handleCopy(encoded, "enc")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!encoded}
              >
                {copied === "enc" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "enc" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="encoded-label"
            >
              {encoded || "Encoded Base64 will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              <button
                onClick={() => handleDownload(encoded, "encoded.txt")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!encoded}
              >
                <Download className="h-4 w-4" aria-hidden /> Download
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold" id="decoded-label">
                Decoded
              </p>
              <button
                onClick={() => handleCopy(decoded, "dec")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!decoded}
              >
                {copied === "dec" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "dec" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="decoded-label"
            >
              {decoded || "Decoded text will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              <button
                onClick={() => handleDownload(decoded, "decoded.txt")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!decoded}
              >
                <Download className="h-4 w-4" aria-hidden /> Download
              </button>
            </div>
          </div>
        </div>

        <section className="space-y-2 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              <strong>When to encode?</strong> When sending binary data (e.g., headers, tokens) as text.
            </li>
            <li>
              <strong>Why did decode fail?</strong> Check padding (=) and allowed characters; malformed Base64 cannot decode.
            </li>
            <li>
              <strong>Privacy?</strong> Everything runs locally; data stays in your browser.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
