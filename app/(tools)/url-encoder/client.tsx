"use client";

import Link from "next/link";
import { ArrowLeftRight, Check, Clipboard, Download, History, RefreshCcw, Sparkles, Wand2 } from "lucide-react";
import { useUrlCodec } from "./use-url-codec";

export default function UrlEncoderClient() {
  const {
    core,
    autoMode,
    encodeMode,
    querystringMode,
    lenientDecode,
    batchMode,
    highlightMode,
    historyEnabled,
    historyItems,
    autoDetectNote,
    exportFormat,
    parseError,
    parsedBase,
    parsedParams,
    inputBytes,
    formattedInputKb,
    MAX_SIZE_BYTES,
    setAutoMode,
    setEncodeMode,
    setQuerystringMode,
    setLenientDecode,
    setBatchMode,
    setHighlightMode,
    setHistoryEnabled,
    setAutoDetectNote,
    setExportFormat,
    updateInput,
    handleEncode,
    handleDecode,
    handleAutoDetect,
    handleSwap,
    handleCopy,
    handleDownload,
    handleParseUrl,
    handleRebuildUrl,
    updateParsedParam,
    handleAddParam,
    applyEncodeToParam,
    applyDecodeToParam,
    clearAll,
    clearHistory,
  } = useUrlCodec();

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

  const sampleInput = "https://example.com/search?q=hello world&redirect=/home";

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {core.status} {core.error}
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
                setAutoDetectNote("");
                handleEncode(core.input);
              }}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Encode
            </button>
            <button
              onClick={() => {
                setAutoDetectNote("");
                handleDecode(core.input);
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Decode
            </button>
            <button
              onClick={() => handleAutoDetect(core.input)}
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
              onClick={clearAll}
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
                  setAutoDetectNote("");
                  handleEncode(core.input);
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
                  setAutoDetectNote("");
                  handleDecode(core.input);
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
            value={core.input}
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
          {core.error ? (
            <p className="text-sm font-medium text-amber-600">{core.error}</p>
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
                onClick={() => handleCopy(core.encoded, "enc")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!core.encoded}
              >
                {core.copied === "enc" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {core.copied === "enc" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="encoded-label"
            >
              {core.encoded
                ? highlightMode
                  ? renderHighlighted(core.encoded, "encoded")
                  : core.encoded
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
                onClick={() => handleDownload(core.encoded, "encoded")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!core.encoded}
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
                onClick={() => handleCopy(core.decoded, "dec")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!core.decoded}
              >
                {core.copied === "dec" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {core.copied === "dec" ? "Copied" : "Copy"}
              </button>
            </div>
            <pre
              className="min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
              role="region"
              aria-labelledby="decoded-label"
            >
              {core.decoded
                ? highlightMode
                  ? renderHighlighted(core.decoded, "decoded")
                  : core.decoded
                : "Decoded output will appear here."}
            </pre>
            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-2">
              <button
                onClick={() => handleDownload(core.decoded, "decoded")}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!core.decoded}
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

        <section className="space-y-2 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
          <ol className="space-y-2 text-sm text-slate-700">
            <li>
              <strong>Pick a mode:</strong> Component for params, Full URL to keep the scheme and path readable.
            </li>
            <li>
              <strong>Paste your input:</strong> Use batch mode for one value per line.
            </li>
            <li>
              <strong>Run encode/decode:</strong> Auto-detect can choose for you.
            </li>
            <li>
              <strong>Export or copy:</strong> Use keyboard shortcuts for faster workflows.
            </li>
          </ol>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-700">Examples</div>
            <div className="mt-2 grid gap-2">
              <div>
                Component encode:{" "}
                <span className="font-medium text-slate-700">
                  hello world &rarr; hello%20world
                </span>
              </div>
              <div>
                Full URL encode:{" "}
                <span className="font-medium text-slate-700">
                  https://example.com/a b?c=d &rarr; https://example.com/a%20b?c=d
                </span>
              </div>
              <div>
                Querystring mode:{" "}
                <span className="font-medium text-slate-700">q=hello world &rarr; q=hello+world</span>
              </div>
              <div>
                Decode:{" "}
                <span className="font-medium text-slate-700">
                  https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dcats &rarr; https://example.com/search?q=cats
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <History className="h-4 w-4" />
              History
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
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
