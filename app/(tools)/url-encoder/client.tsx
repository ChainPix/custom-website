"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Check, Clipboard, Download, History, RefreshCcw, Sparkles, Wand2 } from "lucide-react";

type HistoryItem = {
  id: string;
  action: string;
  input: string;
  output: string;
  createdAt: string;
};

const HISTORY_KEY = "url-encoder-history";

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
  const [batchMode, setBatchMode] = useState(false);
  const [highlightMode, setHighlightMode] = useState(true);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [autoDetectNote, setAutoDetectNote] = useState("");
  const [activeOutput, setActiveOutput] = useState<"enc" | "dec" | null>(null);
  const [currentAction, setCurrentAction] = useState<"encode" | "decode">("encode");
  const [exportFormat, setExportFormat] = useState<"txt" | "json" | "csv">("txt");
  const [parseError, setParseError] = useState("");
  const [parsedBase, setParsedBase] = useState("");
  const [parsedHash, setParsedHash] = useState("");
  const [parsedParams, setParsedParams] = useState<Array<{ key: string; value: string }>>([]);
  const [inputBytes, setInputBytes] = useState(0);
  const MAX_SIZE_BYTES = 512 * 1024; // 512KB guard
  const textEncoder = useMemo(() => new TextEncoder(), []);
  const inputBytesRef = useRef(0);

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

  const normalizeForDecode = (value: string) =>
    querystringMode ? value.replace(/\+/g, " ") : value;

  const encodeValue = (value: string) => {
    const encodedValue =
      encodeMode === "full" ? encodeURI(value) : encodeURIComponent(value);
    return querystringMode ? encodedValue.replace(/%20/g, "+") : encodedValue;
  };

  const decodeValue = (value: string) => {
    const normalized = normalizeForDecode(value);
    const lenientValue = lenientDecode ? applyLenientFixes(normalized) : normalized;
    return encodeMode === "full" ? decodeURI(lenientValue) : decodeURIComponent(lenientValue);
  };

  const buildTimestamp = () =>
    new Date().toISOString().replace(/[:.]/g, "-");

  const csvEscape = (value: string) => {
    const escaped = value.replace(/"/g, "\"\"");
    return `"${escaped}"`;
  };

  const pushHistory = (action: string, inputValue: string, outputValue: string) => {
    if (!historyEnabled) return;
    const nextItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      input: inputValue,
      output: outputValue,
      createdAt: new Date().toLocaleString(),
    };
    setHistoryItems((current) => {
      const nextItems = [nextItem, ...current].slice(0, 10);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(nextItems));
      } catch (err) {
        console.error("History save failed", err);
      }
      return nextItems;
    });
  };

  const renderHighlighted = (text: string, kind: "encoded" | "decoded") => {
    if (!text) return null;
    const pattern = kind === "encoded" ? /(%[0-9A-Fa-f]{2}|\+)/g : /([ #%&=?/]+)/g;
    const parts = text.split(pattern);
    return parts.map((part, index) => {
      const isMatch = index % 2 === 1;
      if (!isMatch) return <span key={`${kind}-${index}`}>{part}</span>;
      const className =
        kind === "encoded"
          ? "rounded bg-emerald-500/20 px-1 text-emerald-200"
          : "rounded bg-amber-500/20 px-1 text-amber-200";
      return (
        <span key={`${kind}-${index}`} className={className}>
          {part}
        </span>
      );
    });
  };

  const detectAction = (value: string) => {
    const normalized = normalizeForDecode(value);
    let score = 0;
    if (/%[0-9A-Fa-f]{2}/.test(normalized)) score += 2;
    if (querystringMode && /\+/.test(value)) score += 1;
    try {
      const decodedValue = decodeValue(value);
      if (decodedValue !== value) score += 2;
    } catch {
      score -= 1;
    }
    const action = score >= 2 ? "decode" : "encode";
    const confidence = score >= 3 ? "high" : score >= 2 ? "medium" : "low";
    return { action, confidence };
  };

  const handleAutoDetect = (value: string) => {
    const result = detectAction(value);
    setAutoDetectNote(`Auto-detect: ${result.action} (${result.confidence})`);
    if (result.action === "decode") {
      handleDecode(value);
    } else {
      handleEncode(value);
    }
  };

  const handleSwap = () => {
    if (encoded && decoded) {
      setEncoded(decoded);
      setDecoded(encoded);
      setActiveOutput(activeOutput === "enc" ? "dec" : "enc");
      setStatus("Swapped");
      return;
    }
    if (encoded) {
      updateInput(encoded);
      setEncoded("");
      setDecoded("");
      setStatus("Moved encoded to input");
      return;
    }
    if (decoded) {
      updateInput(decoded);
      setEncoded("");
      setDecoded("");
      setStatus("Moved decoded to input");
    }
  };

  const buildBatchExport = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (exportFormat === "json") {
      return JSON.stringify(lines, null, 2);
    }
    if (exportFormat === "csv") {
      const header = "index,value";
      const rows = lines.map((line, index) => `${index + 1},${csvEscape(line)}`);
      return [header, ...rows].join("\n");
    }
    return text;
  };

  const updateParsedParam = (index: number, key: string, value: string) => {
    setParsedParams((current) =>
      current.map((param, idx) => (idx === index ? { key, value } : param)),
    );
  };

  const handleAddParam = () => {
    setParsedParams((current) => [...current, { key: "", value: "" }]);
  };

  const handleParseUrl = () => {
    setParseError("");
    try {
      const trimmed = input.trim();
      if (!trimmed) {
        setParseError("Paste a URL to parse.");
        return;
      }
      const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      const url = new URL(withProtocol);
      setParsedBase(`${url.origin}${url.pathname}`);
      setParsedHash(url.hash);
      const entries = Array.from(url.searchParams.entries()).map(([key, value]) => ({
        key,
        value,
      }));
      setParsedParams(entries);
    } catch (err) {
      console.error("Parse error", err);
      setParseError("Unable to parse this URL.");
    }
  };

  const handleRebuildUrl = () => {
    if (!parsedBase) return;
    try {
      const url = new URL(parsedBase);
      const params = new URLSearchParams();
      parsedParams.forEach(({ key, value }) => {
        if (!key) return;
        params.append(key, value);
      });
      url.search = params.toString();
      url.hash = parsedHash || "";
      updateInput(url.toString());
      setStatus("Rebuilt URL");
    } catch (err) {
      console.error("Rebuild error", err);
      setParseError("Unable to rebuild URL.");
    }
  };

  const applyEncodeToParam = (index: number) => {
    setParsedParams((current) =>
      current.map((param, idx) =>
        idx === index ? { ...param, value: encodeValue(param.value) } : param,
      ),
    );
  };

  const applyDecodeToParam = (index: number) => {
    setParsedParams((current) =>
      current.map((param, idx) => {
        if (idx !== index) return param;
        try {
          return { ...param, value: decodeValue(param.value) };
        } catch (err) {
          return param;
        }
      }),
    );
  };

  useEffect(() => {
    if (!historyEnabled) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryItem[];
      setHistoryItems(parsed.slice(0, 10));
    } catch (err) {
      console.error("History load failed", err);
    }
  }, [historyEnabled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isEnter = event.key === "Enter";
      const isCopy = event.key.toLowerCase() === "c";
      const hasModifier = event.metaKey || event.ctrlKey;
      if (hasModifier && isEnter) {
        event.preventDefault();
        const action = autoMode !== "none" ? autoMode : currentAction;
        if (action === "encode") handleEncode(input);
        if (action === "decode") handleDecode(input);
      }
      if (hasModifier && event.shiftKey && isCopy) {
        event.preventDefault();
        const text = activeOutput === "dec" ? decoded : encoded;
        if (text) handleCopy(text, activeOutput === "dec" ? "dec" : "enc");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeOutput,
    autoMode,
    batchMode,
    currentAction,
    decoded,
    encodeMode,
    encoded,
    historyEnabled,
    input,
    lenientDecode,
    querystringMode,
  ]);
  const handleEncode = (value: string) => {
    try {
      setError("");
      setStatus("Encoding...");
      if (inputBytesRef.current > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const normalized = batchMode
        ? value
            .split(/\r?\n/)
            .map((line) => encodeValue(line))
            .join("\n")
        : encodeValue(value);
      setEncoded(normalized);
      setDecoded("");
      setStatus("Updated");
      setCurrentAction("encode");
      setActiveOutput("enc");
      pushHistory("encode", value, normalized);
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
      const normalized = normalizeForDecode(value);
      if (inputBytesRef.current > MAX_SIZE_BYTES) {
        setError("Input too large. Please keep under 512KB.");
        setStatus("Error");
        return;
      }
      const decodedValue = batchMode
        ? normalized
            .split(/\r?\n/)
            .map((line, index) => {
              try {
                return decodeValue(line);
              } catch (err) {
                const invalidIndex = findInvalidPercentIndex(normalizeForDecode(line));
                const suffix = invalidIndex >= 0 ? ` (index ${invalidIndex})` : "";
                throw new Error(`Line ${index + 1} failed${suffix}`);
              }
            })
            .join("\n")
        : decodeValue(normalized);
      setDecoded(decodedValue);
      setEncoded("");
      setStatus("Updated");
      setCurrentAction("decode");
      setActiveOutput("dec");
      pushHistory("decode", value, decodedValue);
    } catch (err) {
      console.error("Decode error", err);
      const normalized = normalizeForDecode(value);
      const invalidIndex = findInvalidPercentIndex(normalized);
      if (err instanceof Error && err.message.startsWith("Line")) {
        setError(err.message);
      } else if (invalidIndex >= 0) {
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

  const handleDownload = (text: string, prefix: string) => {
    if (!text) return;
    const timestamp = buildTimestamp();
    const format = batchMode ? exportFormat : "txt";
    const content = batchMode ? buildBatchExport(text) : text;
    const mime =
      format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}-${timestamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sampleInput = "https://example.com/search?q=hello world&redirect=/home";
  const formattedInputKb = Math.round(inputBytes / 1024);
  const updateInput = (value: string) => {
    const bytes = textEncoder.encode(value).length;
    setInput(value);
    setInputBytes(bytes);
    inputBytesRef.current = bytes;
  };

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
              onClick={() => {
                setCurrentAction("encode");
                setAutoDetectNote("");
                handleEncode(input);
              }}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Encode
            </button>
            <button
              onClick={() => {
                setCurrentAction("decode");
                setAutoDetectNote("");
                handleDecode(input);
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Decode
            </button>
            <button
              onClick={() => handleAutoDetect(input)}
              className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Wand2 className="h-4 w-4" />
              Auto-detect
            </button>
            <button
              onClick={handleSwap}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Swap
            </button>
            <button
              onClick={() => {
                updateInput("");
                setEncoded("");
                setDecoded("");
                setError("");
                setAutoMode("none");
                setAutoDetectNote("");
                setParseError("");
                setParsedParams([]);
                setParsedBase("");
                setParsedHash("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={() => updateInput(sampleInput)}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Sparkles className="h-4 w-4" />
              Sample
            </button>
          </div>
          {autoDetectNote ? (
            <div className="text-xs text-slate-500">{autoDetectNote}</div>
          ) : null}
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
                  setCurrentAction("encode");
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
                  setCurrentAction("decode");
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
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Power options:</span>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={(event) => setBatchMode(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Batch mode
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={highlightMode}
                onChange={(event) => setHighlightMode(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Highlight changes
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={historyEnabled}
                onChange={(event) => setHistoryEnabled(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Save history
            </label>
          </div>
          <div className="text-xs text-slate-500">
            Shortcuts: Ctrl/Cmd + Enter runs, Ctrl/Cmd + Shift + C copies output.
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => {
              const val = event.target.value;
              updateInput(val);
              if (autoMode === "encode") handleEncode(val);
              if (autoMode === "decode") handleDecode(val);
            }}
            placeholder={
              batchMode
                ? "Paste text to encode/decode (one value per line)"
                : "Paste text or URL to encode/decode"
            }
            aria-label="Text input to encode or decode"
          />
          <div
            className={`text-xs ${inputBytes > MAX_SIZE_BYTES ? "text-amber-600" : "text-slate-500"}`}
            aria-live="polite"
          >
            {formattedInputKb} KB / 512 KB
          </div>
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
              {encoded
                ? highlightMode
                  ? renderHighlighted(encoded, "encoded")
                  : encoded
                : "Encoded output will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              {batchMode ? (
                <select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as "txt" | "json" | "csv")}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80"
                  aria-label="Export format"
                >
                  <option value="txt">.txt</option>
                  <option value="json">.json</option>
                  <option value="csv">.csv</option>
                </select>
              ) : null}
              <button
                onClick={() => handleDownload(encoded, "encoded")}
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
              {decoded
                ? highlightMode
                  ? renderHighlighted(decoded, "decoded")
                  : decoded
                : "Decoded output will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              <button
                onClick={() => handleDownload(decoded, "decoded")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!decoded}
              >
                <Download className="h-4 w-4" aria-hidden /> Download
              </button>
            </div>
          </div>
        </div>

        <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Parse URL helper</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleParseUrl}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              >
                Parse URL
              </button>
              <button
                onClick={handleRebuildUrl}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Rebuild URL
              </button>
              <button
                onClick={handleAddParam}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Add param
              </button>
            </div>
          </div>
          {parseError ? <p className="text-sm font-medium text-amber-600">{parseError}</p> : null}
          {parsedParams.length ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">
                Base: <span className="font-medium text-slate-700">{parsedBase || "-"}</span>
              </div>
              <div className="grid gap-2">
                {parsedParams.map((param, index) => (
                  <div
                    key={`${param.key}-${index}`}
                    className="grid gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 sm:grid-cols-[1.2fr_2fr_auto]"
                  >
                    <input
                      value={param.key}
                      onChange={(event) => updateParsedParam(index, event.target.value, param.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
                      placeholder="key"
                    />
                    <input
                      value={param.value}
                      onChange={(event) => updateParsedParam(index, param.key, event.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
                      placeholder="value"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => applyEncodeToParam(index)}
                        className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        Encode
                      </button>
                      <button
                        onClick={() => applyDecodeToParam(index)}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                      >
                        Decode
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Parse a URL to edit query params and rebuild it.</p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <History className="h-4 w-4" />
              History
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setHistoryItems([]);
                  try {
                    localStorage.removeItem(HISTORY_KEY);
                  } catch (err) {
                    console.error("History clear failed", err);
                  }
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                disabled={!historyItems.length}
              >
                Clear
              </button>
            </div>
          </div>
          {!historyEnabled ? (
            <p className="text-sm text-slate-600">Enable “Save history” to keep recent transformations.</p>
          ) : historyItems.length ? (
            <div className="grid gap-2 text-xs text-slate-600">
              {historyItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateInput(item.input)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold uppercase">{item.action}</span>
                    <span>{item.createdAt}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-700">{item.input}</div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No saved history yet.</p>
          )}
        </section>

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
