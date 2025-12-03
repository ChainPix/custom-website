"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, RefreshCcw, Upload } from "lucide-react";

const encodeText = (text: string, mime: string) => {
  const base64 = btoa(unescape(encodeURIComponent(text)));
  return `data:${mime};base64,${base64}`;
};

export default function DataUriClient() {
  const [mime, setMime] = useState("text/plain");
  const [text, setText] = useState("Hello, world!");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = () => {
    try {
      setOutput(encodeText(text, mime || "text/plain"));
      setError("");
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to generate data URI. Check encoding.");
      setOutput("");
    }
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setOutput(reader.result);
        setMime(file.type || "application/octet-stream");
        setError("");
      } else {
        setError("Could not read this file.");
      }
    };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
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
        <h1 className="text-3xl font-semibold text-slate-900">Data URI Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text or files into data URIs. Choose a MIME type or drop a file, then copy the generated URI.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setMime("text/plain");
                setText("Hello, world!");
                setOutput("");
                setError("");
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
              disabled={!output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy URI"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              MIME Type
              <input
                type="text"
                value={mime}
                onChange={(event) => setMime(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="text/plain, image/png, application/json"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Generate from text
              <button
                onClick={handleGenerate}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              >
                Build URI
              </button>
            </label>
          </div>
          <textarea
            className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Enter text to encode as data URI"
          />
          <label
            htmlFor="data-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-center text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-400"
          >
            <Upload className="h-5 w-5 text-slate-500" />
            <span className="font-medium text-slate-900">Or drop a file</span>
            <input
              id="data-file"
              type="file"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">Tip: For JSON, use application/json; for text, use text/plain.</p>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold">Data URI</div>
          <pre className="max-h-[300px] overflow-auto p-4 text-xs leading-relaxed text-slate-100">
            {output || "Generated data URI will appear here."}
          </pre>
        </div>
      </div>
    </main>
  );
}
