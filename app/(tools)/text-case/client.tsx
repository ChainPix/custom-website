"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, Check, Download, RefreshCcw, Sparkles } from "lucide-react";

type CaseType = "camel" | "pascal" | "snake" | "kebab" | "title" | "upper" | "lower" | "sentence" | "capitalized";

const toWords = (text: string) =>
  text
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

const converters: Record<CaseType, (text: string) => string> = {
  camel: (text) => {
    const words = toWords(text.toLowerCase());
    return words
      .map((w, idx) => (idx === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join("");
  },
  pascal: (text) => {
    const words = toWords(text.toLowerCase());
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  },
  snake: (text) => toWords(text).join("_").toLowerCase(),
  kebab: (text) => toWords(text).join("-").toLowerCase(),
  title: (text) =>
    toWords(text)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  upper: (text) => text.toUpperCase(),
  lower: (text) => text.toLowerCase(),
  sentence: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  },
  capitalized: (text) =>
    toWords(text)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" "),
};

const LARGE_THRESHOLD = 50000;
const VIRTUALIZE_AFTER = 12;
const caseOrder: CaseType[] = [
  "camel",
  "pascal",
  "snake",
  "kebab",
  "title",
  "upper",
  "lower",
  "sentence",
  "capitalized",
];

type OutputEntry = readonly [CaseType, string];

export default function TextCaseClient() {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<CaseType>("camel");
  const [copiedKey, setCopiedKey] = useState<CaseType | null>(null);
  const [trimInput, setTrimInput] = useState(true);
  const [status, setStatus] = useState("Ready");
  const [showOnlySelected, setShowOnlySelected] = useState(true);
  const [outputs, setOutputs] = useState<OutputEntry[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingWorker = useRef(new Map<number, (outputs: OutputEntry[]) => void>());
  const workerRequestId = useRef(0);
  const deferredInput = useDeferredValue(input);

  const normalizedInput = useMemo(
    () => (trimInput ? deferredInput.trim() : deferredInput),
    [deferredInput, trimInput],
  );
  const visibleKeys = useMemo(() => (showOnlySelected ? [selected] : caseOrder), [showOnlySelected, selected]);
  const chars = input.length;
  const lines = useMemo(() => (input ? input.split("\n").length : 0), [input]);
  const warning = useMemo(() => {
    if (!input || chars < LARGE_THRESHOLD) return "";
    return `Large input detected (${chars.toLocaleString()} chars, ${lines.toLocaleString()} lines). Conversions may take a moment.`;
  }, [chars, input, lines]);
  const isLargeInput = normalizedInput.length >= LARGE_THRESHOLD;

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./text-case.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event) => {
      const { id, outputs: workerOutputs } = event.data as { id: number; outputs: OutputEntry[] };
      const resolver = pendingWorker.current.get(id);
      if (resolver) {
        resolver(workerOutputs);
        pendingWorker.current.delete(id);
      }
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingWorker.current.clear();
    };
  }, []);

  const buildOutputs = useCallback((text: string, keys: CaseType[]) => {
    if (!text) {
      return keys.map((key) => [key, ""] as const);
    }
    return keys.map((key) => [key, converters[key](text)] as const);
  }, []);

  const computeWithWorker = useCallback(
    (text: string, keys: CaseType[]) =>
      new Promise<OutputEntry[]>((resolve) => {
        if (!workerRef.current) {
          resolve(buildOutputs(text, keys));
          return;
        }
        const id = (workerRequestId.current += 1);
        pendingWorker.current.set(id, resolve);
        workerRef.current.postMessage({ id, text, keys });
      }),
    [buildOutputs],
  );

  const computeWithIdle = useCallback(
    (text: string, keys: CaseType[]) =>
      new Promise<OutputEntry[]>((resolve) => {
        if (!text) {
          resolve(keys.map((key) => [key, ""] as const));
          return;
        }
        if (typeof requestIdleCallback !== "function") {
          resolve(buildOutputs(text, keys));
          return;
        }
        const results: OutputEntry[] = [];
        let index = 0;
        const handle = (deadline: IdleDeadline) => {
          while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && index < keys.length) {
            const key = keys[index];
            results.push([key, converters[key](text)]);
            index += 1;
          }
          if (index < keys.length) {
            requestIdleCallback(handle, { timeout: 1200 });
          } else {
            resolve(results);
          }
        };
        requestIdleCallback(handle, { timeout: 1200 });
      }),
    [buildOutputs],
  );

  const computeOutputs = useCallback(
    async (text: string, keys: CaseType[]) => {
      if (!text) {
        return keys.map((key) => [key, ""] as const);
      }
      if (text.length >= LARGE_THRESHOLD && workerRef.current) {
        return computeWithWorker(text, keys);
      }
      if (text.length >= LARGE_THRESHOLD) {
        return computeWithIdle(text, keys);
      }
      return buildOutputs(text, keys);
    },
    [buildOutputs, computeWithIdle, computeWithWorker],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!normalizedInput) {
        setOutputs(buildOutputs("", visibleKeys));
        setIsComputing(false);
        return;
      }
      if (isLargeInput) {
        setIsComputing(true);
        const result = await (workerRef.current
          ? computeWithWorker(normalizedInput, visibleKeys)
          : computeWithIdle(normalizedInput, visibleKeys));
        if (cancelled) return;
        setOutputs(result);
        setIsComputing(false);
        return;
      }
      setOutputs(buildOutputs(normalizedInput, visibleKeys));
      setIsComputing(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [buildOutputs, computeWithIdle, computeWithWorker, isLargeInput, normalizedInput, visibleKeys]);

  const handleCopy = async (text: string, key: CaseType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopySelected = async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, [selected]);
    const entry = entries[0];
    if (!entry) return;
    handleCopy(entry[1], selected);
  };

  const handleCopyAll = async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, caseOrder);
    const outputText = entries.map(([key, value]) => `${key}: ${value}`).join("\n");
    try {
      await navigator.clipboard.writeText(outputText);
      setStatus("Copied all");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = async () => {
    const text = trimInput ? input.trim() : input;
    const entries = await computeOutputs(text, caseOrder);
    const outputText = entries.map(([key, value]) => `${key}: ${value}`).join("\n");
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "text-cases.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning}
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
              Text Case
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Text Case Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert text to camelCase, PascalCase, snake_case, kebab-case, Title Case, upper, or lower
          instantly.
        </p>
        <p className="text-sm text-slate-600">Runs fully in your browser; text is never uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="case-select">
            <span className="font-semibold text-slate-900">Case</span>
            <select
              id="case-select"
              value={selected}
              onChange={(event) => setSelected(event.target.value as CaseType)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="camel">camelCase</option>
              <option value="pascal">PascalCase</option>
              <option value="snake">snake_case</option>
              <option value="kebab">kebab-case</option>
              <option value="title">Title Case</option>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="sentence">Sentence case</option>
              <option value="capitalized">Capitalized Words</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={trimInput}
              onChange={(e) => setTrimInput(e.target.checked)}
              className="h-4 w-4 accent-slate-900"
            />
            Trim whitespace
          </label>
          <button
            onClick={() => setInput("")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={() => {
              setInput("convert THIS_sample-text to Multiple Cases easily");
              setStatus("Sample loaded");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Load sample
          </button>
        </div>
        <textarea
          className="h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste text to convert"
          aria-label="Text input"
        />
        {warning ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {warning}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: use this for variable names, headings, and quick case formatting.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {outputs.map(([key, value]) => {
          const isSelected = key === selected;
          const cardStyle =
            !showOnlySelected && outputs.length > VIRTUALIZE_AFTER
              ? { contentVisibility: "auto", containIntrinsicSize: "260px" }
              : undefined;
          return (
            <div
              key={key}
              style={cardStyle}
              className={`rounded-2xl ${
                isSelected ? "bg-slate-900 text-white ring-slate-800" : "bg-white text-slate-900 ring-slate-200"
              } shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1`}
            >
              <div className="flex items-center justify-between border-b border-slate-800/50 px-4 py-3">
                <p className="text-sm font-semibold capitalize">{key.replace("-", " ")}</p>
                <button
                  onClick={() => handleCopy(value, key)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-slate-900 text-white hover:-translate-y-0.5"
                  }`}
                >
                  {copiedKey === key ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copiedKey === key ? "Copied" : "Copy"}
                </button>
              </div>
              <pre
                className={`min-h-[120px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed ${
                  isSelected ? "text-slate-100" : "text-slate-900"
                }`}
                role="region"
                aria-label={`${key} output`}
                tabIndex={0}
              >
                {value || (isComputing ? "Converting..." : "Converted text will appear here.")}
              </pre>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <button
          onClick={handleCopySelected}
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          Copy selected
        </button>
        <button
          onClick={handleCopyAll}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          Copy all
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={!input.trim()}
        >
          <Download className="h-4 w-4" />
          Download outputs
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showOnlySelected}
            onChange={(e) => setShowOnlySelected(e.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          Show only selected case
        </label>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste text or load the sample, choose your target case, and enable trim if needed.</li>
          <li>Copy an individual case, copy all outputs, or download all cases as a text file.</li>
          <li>Use “Show only selected case” to focus on a single output.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is this private?</summary>
            <p className="mt-2 text-slate-700">Yes. Conversion runs locally in your browser; no data is sent to servers.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Which cases are supported?</summary>
            <p className="mt-2 text-slate-700">camel, pascal, snake, kebab, title, upper, lower, sentence, and capitalized words.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I download results?</summary>
            <p className="mt-2 text-slate-700">Yes. Use the “Download outputs” button to save all cases to a text file.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
