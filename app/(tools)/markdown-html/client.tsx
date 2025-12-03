"use client";

import Link from "next/link";
import { useState } from "react";
import { marked } from "marked";
import TurndownService from "turndown";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Mode = "md-to-html" | "html-to-md";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export default function MarkdownHtmlClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("md-to-html");
  const [copied, setCopied] = useState(false);

  const handleConvert = () => {
    try {
      if (mode === "md-to-html") {
        setOutput(marked.parse(input) as string);
      } else {
        setOutput(turndown.turndown(input));
      }
    } catch (err) {
      console.error("Conversion error", err);
      setOutput("");
    }
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
        <h1 className="text-3xl font-semibold text-slate-900">Markdown ⇄ HTML Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert Markdown to HTML or HTML back to Markdown. Runs in your browser for fast previews
          and copy-ready markup.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Direction</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="md-to-html">Markdown → HTML</option>
              <option value="html-to-md">HTML → Markdown</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Convert
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <textarea
          className="h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste Markdown or HTML depending on direction"
        />
        <p className="text-sm text-slate-600">
          Tip: use Markdown → HTML for previews and HTML → Markdown to clean pasted content.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Output</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!output}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="min-h-[180px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
          {output || "Converted output will appear here."}
        </pre>
      </div>
    </main>
  );
}
