"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const encodeEntities = (text: string) =>
  text.replace(/[\u00A0-\u9999<>&"'`]/gim, (i) => `&#${i.charCodeAt(0)};`);

const decodeEntities = (text: string) => {
  const doc = new DOMParser().parseFromString(text, "text/html");
  return doc.documentElement.textContent ?? "";
};

export default function HtmlEntitiesClient() {
  const [input, setInput] = useState("<p>Hello & welcome!</p>");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleEncode = () => {
    try {
      setOutput(encodeEntities(input));
      setError("");
    } catch (err) {
      console.error("Encode error", err);
      setError("Unable to encode this input.");
      setOutput("");
    }
  };

  const handleDecode = () => {
    try {
      setOutput(decodeEntities(input));
      setError("");
    } catch (err) {
      console.error("Decode error", err);
      setError("Unable to decode entities in this input.");
      setOutput("");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output || input);
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
        <h1 className="text-3xl font-semibold text-slate-900">HTML Entity Encoder/Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Escape or unescape HTML entities to keep content safe or readable. Runs entirely in your browser.
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
                setOutput("");
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
            placeholder="Paste text or HTML to encode/decode"
          />
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: encode before embedding user input; decode to review stored entities.
            </p>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Output</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output && !input}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {output || "Result will appear here."}
          </pre>
        </div>
      </div>
    </main>
  );
}
