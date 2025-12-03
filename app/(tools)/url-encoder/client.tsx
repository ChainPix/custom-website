"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

export default function UrlEncoderClient() {
  const [input, setInput] = useState("");
  const [encoded, setEncoded] = useState("");
  const [decoded, setDecoded] = useState("");
  const [copied, setCopied] = useState<"enc" | "dec" | null>(null);
  const [error, setError] = useState("");

  const handleEncode = () => {
    try {
      setError("");
      setEncoded(encodeURIComponent(input));
      setDecoded("");
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to encode this input.");
    }
  };

  const handleDecode = () => {
    try {
      setError("");
      setDecoded(decodeURIComponent(input));
      setEncoded("");
    } catch (err) {
      console.error("Decode error", err);
      setError("Invalid encoded string. Unable to decode.");
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

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">URL Encoder & Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Encode or decode URLs instantly. Use for query params, webhooks, and redirects.
        </p>
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
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste text or URL to encode/decode"
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
              <p className="text-sm font-semibold">Encoded</p>
              <button
                onClick={() => handleCopy(encoded, "enc")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!encoded}
              >
                {copied === "enc" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "enc" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
              {encoded || "Encoded output will appear here."}
            </pre>
          </div>

          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold">Decoded</p>
              <button
                onClick={() => handleCopy(decoded, "dec")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!decoded}
              >
                {copied === "dec" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied === "dec" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
              {decoded || "Decoded output will appear here."}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
