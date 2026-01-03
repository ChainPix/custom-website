"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

export default function UrlEncoderClient() {
  const [input, setInput] = useState("");
  const [encoded, setEncoded] = useState("");
  const [decoded, setDecoded] = useState("");
  const [copied, setCopied] = useState<"enc" | "dec" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [autoMode, setAutoMode] = useState<"none" | "encode" | "decode">("none");
  const [encodeMode, setEncodeMode] = useState<"component" | "full">("component");
  const [querystringMode, setQuerystringMode] = useState(false);
  const [lenientDecode, setLenientDecode] = useState(false);
  const MAX_SIZE_BYTES = 512 * 1024; // 512KB guard

  const findInvalidPercentIndex = (value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      if (value[i] !== "%") continue;
      const hex = value.slice(i + 1, i + 3);
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return i;
      i += 2;
    }
    return -1;
  };

  const applyLenientFixes = (value: string) =>
    value.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");

  const handleEncode = (value: string) => {
    try {
      setError("");
      setStatus("Encoding...");
      const bytes = new Blob([value]).size;
      if (bytes > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const encodedValue =
        encodeMode === "full" ? encodeURI(value) : encodeURIComponent(value);
      const normalized = querystringMode ? encodedValue.replace(/%20/g, "+") : encodedValue;
      setEncoded(normalized);
      setDecoded("");
      setStatus("Updated");
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to encode this input.");
      setStatus("Error");
    }
  };

  const handleDecode = (value: string) => {
    try {
      setError("");
      setStatus("Decoding...");
      const normalized = querystringMode ? value.replace(/\+/g, " ") : value;
      const bytes = new Blob([normalized]).size;
      if (bytes > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const lenientValue = lenientDecode ? applyLenientFixes(normalized) : normalized;
      const decodedValue =
        encodeMode === "full" ? decodeURI(lenientValue) : decodeURIComponent(lenientValue);
      setDecoded(decodedValue);
      setEncoded("");
      setStatus("Updated");
    } catch (err) {
      console.error("Decode error", err);
      const normalized = querystringMode ? value.replace(/\+/g, " ") : value;
      const invalidIndex = findInvalidPercentIndex(normalized);
      if (invalidIndex >= 0) {
        setError(`Invalid % sequence at index ${invalidIndex}. Use % followed by two hex digits.`);
      } else {
        setError("Invalid encoded string. Unable to decode. Ensure characters are properly % encoded.");
      }
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

  const sampleInput = "https://example.com/search?q=hello world&redirect=/home";

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
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
              URL Encoder
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">URL Encoder & Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Encode or decode URLs instantly. Use for query params, webhooks, and redirects.
        </p>
        <div className="text-xs text-slate-500">
          Runs in your browser; no data is sent to a server.
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleEncode(input)}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Encode
            </button>
            <button
              onClick={() => handleDecode(input)}
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
              onClick={() => setInput(sampleInput)}
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
                  handleEncode(input);
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
                  handleDecode(input);
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Decode on change
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Encoding mode:</span>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="encode-mode"
                value="component"
                checked={encodeMode === "component"}
                onChange={() => setEncodeMode("component")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Component
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="encode-mode"
                value="full"
                checked={encodeMode === "full"}
                onChange={() => setEncodeMode("full")}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Full URL
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Querystring mode:</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={querystringMode}
                onChange={(event) => setQuerystringMode(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Spaces as +, + decodes to space
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Decode options:</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={lenientDecode}
                onChange={(event) => setLenientDecode(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Lenient decode
            </label>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => {
              const val = event.target.value;
              setInput(val);
              if (autoMode === "encode") handleEncode(val);
              if (autoMode === "decode") handleDecode(val);
            }}
            placeholder="Paste text or URL to encode/decode"
            aria-label="Text input to encode or decode"
          />
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: Use encode for query params and webhook data.</p>
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
              {encoded || "Encoded output will appear here."}
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
              {decoded || "Decoded output will appear here."}
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
              <strong>When should I encode?</strong> Before placing user input in query params, form data, or webhooks.
            </li>
            <li>
              <strong>Why did decode fail?</strong> Make sure the string is properly percent-encoded (spaces as %20).
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
