"use client";

import JSON5 from "json5";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

export default function JsonValidatorClient() {
  const [input, setInput] = useState("{\n  \"hello\": \"world\"\n}");
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [trimInput, setTrimInput] = useState(true);
  const [json5Mode, setJson5Mode] = useState(false);
  const [autoValidate, setAutoValidate] = useState(true);
  const [lastValidatedInput, setLastValidatedInput] = useState(input);

  const validationResult = useMemo(() => {
    const raw = trimInput ? lastValidatedInput.trim() : lastValidatedInput;
    if (!raw) return { formatted: "", parseError: "Enter JSON to validate.", warningMsg: "", stats: null };
    const warningMsg = raw.length > 200_000 ? `Large input (${raw.length.toLocaleString()} chars). Validation may be slower.` : "";
    try {
      const parsed = json5Mode ? JSON5.parse(raw) : JSON.parse(raw);
      const formatted = JSON.stringify(parsed, null, 2);
      return {
        formatted,
        parseError: "",
        warningMsg,
        stats: {
          beforeChars: lastValidatedInput.length,
          afterChars: formatted.length,
          beforeLines: lastValidatedInput.split("\n").length,
          afterLines: formatted.split("\n").length,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid JSON";
      return { formatted: "", parseError: message, warningMsg, stats: null };
    }
  }, [lastValidatedInput, trimInput, json5Mode]);

  useEffect(() => {
    if (!autoValidate) return;
    const timeoutId = window.setTimeout(() => {
      setLastValidatedInput(input);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [input, autoValidate]);

  const handleValidate = () => {
    setLastValidatedInput(input);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(validationResult.formatted || input);
      setCopied(true);
      setActionStatus("Copied");
      setTimeout(() => {
        setCopied(false);
        setActionStatus("");
      }, 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setActionStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!validationResult.formatted) return;
    const blob = new Blob([validationResult.formatted], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "validated.json";
    a.click();
    URL.revokeObjectURL(url);
    setActionStatus("Downloaded");
  };

  const loadSample = (kind: "object" | "array") => {
    const samples = {
      object: '{\n  "name": "ToolStack",\n  "active": true,\n  "items": [1, 2, 3]\n}',
      array: '[\n  {"id":1,"value":"a"},\n  {"id":2,"value":"b"}\n]',
    };
    setInput(samples[kind]);
    setActionStatus("Loaded sample");
  };

  const validationStatus = validationResult.parseError
    ? "Validation failed"
    : validationResult.formatted
      ? "Validation succeeded"
      : "Ready";
  const liveStatus = actionStatus || validationStatus;

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {liveStatus} {validationResult.warningMsg} {validationResult.parseError}
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
              JSON Validator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JSON Validator & Linter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Validate JSON, see errors with line/column hints, and pretty-print clean output. Runs
          entirely in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleValidate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Validate JSON"
            >
              Validate
            </button>
            <button
              onClick={() => {
                setInput("");
                setLastValidatedInput("");
                setActionStatus("Cleared");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Clear input and output"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={autoValidate}
                onChange={(e) => setAutoValidate(e.target.checked)}
              />
              Auto-validate
            </label>
            <div className="flex flex-wrap gap-2 text-xs text-slate-700">
              <button
                type="button"
                onClick={() => loadSample("object")}
                className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sample object
              </button>
              <button
                type="button"
                onClick={() => loadSample("array")}
                className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              >
                Sample array
              </button>
            </div>
          </div>
          <textarea
            className="h-[240px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            aria-label="JSON input"
          />
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={trimInput}
                onChange={(e) => setTrimInput(e.target.checked)}
              />
              Trim input before parsing
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={json5Mode}
                onChange={(e) => setJson5Mode(e.target.checked)}
              />
              JSON5 mode
            </label>
            {validationResult.warningMsg ? (
              <span className="font-medium text-amber-700" role="alert">
                {validationResult.warningMsg}
              </span>
            ) : null}
          </div>
          {validationResult.parseError ? (
            <p className="text-sm font-medium text-amber-600" role="alert">
              Error: {validationResult.parseError}
            </p>
          ) : (
            <p className="text-sm text-slate-600">Tip: Paste API responses or config files to check validity.</p>
          )}
        </div>

        <div
          className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-label="Validated JSON output"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Output</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!validationResult.formatted && !input}
                aria-label="Copy JSON"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!validationResult.formatted}
                aria-label="Download formatted JSON"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {validationResult.formatted || (validationResult.parseError ? "Fix errors to see formatted JSON." : "Validated JSON will appear here.")}
          </pre>
        </div>
      </div>

      {validationResult.stats ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <span>Before: {validationResult.stats.beforeChars.toLocaleString()} chars / {validationResult.stats.beforeLines} lines</span>
          <span>After: {validationResult.stats.afterChars.toLocaleString()} chars / {validationResult.stats.afterLines} lines</span>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste JSON and click Validate (or leave auto-validate on).</li>
          <li>Toggle trim/JSON5 if your input includes trailing commas/comments.</li>
          <li>Copy or download the formatted output; review before/after size.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Everything runs in your browser; no data is uploaded.</p>
          <p><strong>JSON5?</strong> Enable the toggle for JSON5 features (comments, trailing commas).</p>
          <p><strong>Schema validation?</strong> Planned: you&apos;ll paste a JSON Schema to validate structure and types.</p>
        </div>
      </div>
    </main>
  );
}
