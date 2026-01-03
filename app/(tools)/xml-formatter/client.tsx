"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type Options = {
  indent: number;
  inlineMixedContent: boolean;
};

type XmlParseLocation = {
  line: number;
  column: number;
};

const sampleXml = `<note>
  <to>Tove</to>
  <from>Jani</from>
  <heading>Reminder</heading>
  <body>Don't forget me this weekend!</body>
  <p>Hello, <b>world</b>!</p>
</note>`;

function extractErrorLocation(message: string): XmlParseLocation | null {
  const patterns = [
    /line\s+number\s+(\d+)\s*,\s*column\s+(\d+)/i,
    /line\s+(\d+)\s+column\s+(\d+)/i,
    /lineNumber\s*:\s*(\d+)\s*columnNumber\s*:\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const line = Number(match[1]);
      const column = Number(match[2]);
      if (Number.isFinite(line) && Number.isFinite(column)) return { line, column };
    }
  }
  return null;
}

function parseXml(xml: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const message = parserError.textContent || "Invalid XML.";
    const location = extractErrorLocation(message);
    throw Object.assign(new Error(message), { location });
  }
  return doc;
}

function serializePretty(doc: Document, indent: number, inlineMixedContent: boolean) {
  const serializer = new XMLSerializer();
  const indentUnit = " ".repeat(indent);

  const isWhitespaceText = (node: ChildNode) =>
    node.nodeType === Node.TEXT_NODE && !node.nodeValue?.trim();

  const serializeAttributes = (element: Element) => {
    if (!element.attributes.length) return "";
    const parts = Array.from(element.attributes).map((attr) => {
      const escaped = attr.value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
      return `${attr.name}="${escaped}"`;
    });
    return ` ${parts.join(" ")}`;
  };

  const serializeDoctype = (doctype: DocumentType) => {
    if (!doctype) return "";
    let id = "";
    if (doctype.publicId) {
      id = ` PUBLIC "${doctype.publicId}"`;
      if (doctype.systemId) id += ` "${doctype.systemId}"`;
    } else if (doctype.systemId) {
      id = ` SYSTEM "${doctype.systemId}"`;
    }
    return `<!DOCTYPE ${doctype.name}${id}>`;
  };

  const serializeInline = (node: ChildNode) => serializer.serializeToString(node);

  const serializeNode = (node: ChildNode, depth: number): string => {
    const pad = indentUnit.repeat(depth);
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const element = node as Element;
        const attrs = serializeAttributes(element);
        const openTag = `<${element.tagName}${attrs}>`;
        const closeTag = `</${element.tagName}>`;
        const children = Array.from(element.childNodes).filter((child) => !isWhitespaceText(child));
        if (!children.length) {
          return `${pad}<${element.tagName}${attrs}/>`;
        }
        const hasElementChild = children.some((child) => child.nodeType === Node.ELEMENT_NODE);
        const hasTextChild = children.some((child) => child.nodeType === Node.TEXT_NODE);
        const hasMixedContent = hasElementChild && hasTextChild;
        const onlyInlineText = children.every(
          (child) =>
            child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE
        );
        if (onlyInlineText || (hasMixedContent && inlineMixedContent)) {
          const inline = children.map(serializeInline).join("");
          return `${pad}${openTag}${inline}${closeTag}`;
        }
        const lines = children
          .map((child) => serializeNode(child, depth + 1))
          .filter(Boolean)
          .join("\n");
        return `${pad}${openTag}\n${lines}\n${pad}${closeTag}`;
      }
      case Node.TEXT_NODE:
      case Node.CDATA_SECTION_NODE:
      case Node.COMMENT_NODE:
      case Node.PROCESSING_INSTRUCTION_NODE:
        return `${pad}${serializeInline(node)}`;
      case Node.DOCUMENT_TYPE_NODE:
        return `${pad}${serializeDoctype(node as DocumentType)}`;
      default:
        return "";
    }
  };

  const nodes = Array.from(doc.childNodes).filter((child) => !isWhitespaceText(child));
  return nodes.map((node) => serializeNode(node, 0)).filter(Boolean).join("\n");
}

export default function XmlFormatterClient() {
  const [input, setInput] = useState(sampleXml);
  const [output, setOutput] = useState("");
  const [options, setOptions] = useState<Options>({ indent: 2, inlineMixedContent: true });
  const [error, setError] = useState("");
  const [errorLocation, setErrorLocation] = useState<XmlParseLocation | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Formatted successfully";
    return "Awaiting input";
  }, [error, output]);

  const handleFormat = () => {
    setError("");
    setErrorLocation(null);
    setCopied(false);
    try {
      const trimmed = input.trim();
      if (!trimmed) throw new Error("Enter XML to format.");
      if (trimmed.length > 200000) throw new Error("Input too large. Please limit to ~200KB.");
      const doc = parseXml(trimmed);
      const pretty = serializePretty(doc, options.indent, options.inlineMixedContent);
      setOutput(pretty);
    } catch (err: any) {
      setError(err?.message || "Unable to format XML.");
      const location = err?.location || null;
      setErrorLocation(location);
      setOutput("");
      if (location) highlightError(location);
    }
  };

  const highlightError = (location: XmlParseLocation) => {
    const target = inputRef.current;
    if (!target) return;
    const lines = input.split(/\r?\n/);
    const lineIndex = Math.max(location.line - 1, 0);
    if (lineIndex >= lines.length) return;
    const columnIndex = Math.max(location.column - 1, 0);
    const offset =
      lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length, 0) + lineIndex;
    const start = Math.min(offset + columnIndex, input.length);
    const lineLength = lines[lineIndex]?.length ?? 0;
    const highlightLength = Math.max(1, Math.min(20, lineLength - columnIndex));
    const end = Math.min(start + highlightLength, input.length);
    target.focus();
    target.setSelectionRange(start, end);
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
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
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
              XML Formatter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
                onChange={(e) => setOptions((prev) => ({ ...prev, indent: Number(e.target.value) }))}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.inlineMixedContent}
                onChange={(e) =>
                  setOptions((prev) => ({ ...prev, inlineMixedContent: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              Inline text nodes (mixed content safe)
            </label>
            <button
              onClick={() => {
                setInput(sampleXml);
                setOutput("");
                setError("");
                setOptions({ indent: 2, inlineMixedContent: true });
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
            ref={inputRef}
          />

          <button
            onClick={handleFormat}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Format XML"
          >
            Format XML
          </button>
          {error ? (
            <div className="space-y-2 text-sm text-amber-600">
              <p className="font-medium">{error}</p>
              {errorLocation ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-700">
                  <span>
                    Line {errorLocation.line}, Column {errorLocation.column}
                  </span>
                  <button
                    onClick={() => highlightError(errorLocation)}
                    className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                    type="button"
                  >
                    Jump to error
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-600">{status}</p>
          )}
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
