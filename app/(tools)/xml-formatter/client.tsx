"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  indent: number;
};

const sampleXml = `<note>
  <to>Tove</to>
  <from>Jani</from>
  <heading>Reminder</heading>
  <body>Don't forget me this weekend!</body>
</note>`;

function parseXml(xml: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error(parserError.textContent || "Invalid XML.");
  }
  return doc;
}

function serializePretty(doc: Document, indent: number) {
  const serializer = new XMLSerializer();
  const raw = serializer.serializeToString(doc);
  const tokens = raw
    .replace(/>\s+</g, "><")
    .replace(/\r?\n/g, "")
    .match(/<[^>]+>|[^<]+/g);
  if (!tokens) return raw;
  let depth = 0;
  return tokens
    .map((token) => {
      const trimmed = token.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("</")) depth = Math.max(depth - 1, 0);
      const line = `${" ".repeat(depth * indent)}${trimmed}`;
      if (/^<[^!?/][^>]*[^/]>$/.test(trimmed)) depth += 1;
      return line;
    })
    .filter(Boolean)
    .join("\n");
}

export default function XmlFormatterClient() {
  const [input, setInput] = useState(sampleXml);
  const [output, setOutput] = useState("");
  const [options, setOptions] = useState<Options>({ indent: 2 });
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Formatted successfully";
    return "Awaiting input";
  }, [error, output]);

  const handleFormat = () => {
    setError("");
    setCopied(false);
    try {
      const trimmed = input.trim();
      if (!trimmed) throw new Error("Enter XML to format.");
      if (trimmed.length > 200000) throw new Error("Input too large. Please limit to ~200KB.");
      const doc = parseXml(trimmed);
      const pretty = serializePretty(doc, options.indent);
      setOutput(pretty);
    } catch (err: any) {
      setError(err?.message || "Unable to format XML.");
      setOutput("");
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted.xml";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
      </div>

      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">XML Formatter & Validator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Beautify and validate XML with indentation options. Runs entirely in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              Indent:
              <select
                value={options.indent}
                onChange={(e) => setOptions({ indent: Number(e.target.value) })}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </label>
            <button
              onClick={() => {
                setInput(sampleXml);
                setOutput("");
                setError("");
                setOptions({ indent: 2 });
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset to sample"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            placeholder="Paste XML here..."
            aria-label="XML input"
          />

          <button
            onClick={handleFormat}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Format XML"
          >
            Format XML
          </button>
          {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="output-heading">
              Formatted XML
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy formatted XML"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download formatted XML"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <pre
            className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-labelledby="output-heading"
          >
            {output || "Your formatted XML will appear here after validation."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste your XML and choose indent size (2 or 4 spaces).</li>
          <li>Click Format to validate and beautify the XML.</li>
          <li>Copy or download the formatted XML.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>Parsing runs locally in your browser; XML is not uploaded.</p>
          <p>Very large documents are capped (~200KB) to keep the UI responsive.</p>
        </div>
      </div>
    </main>
  );
}
