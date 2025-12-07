"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Shuffle, Wand2 } from "lucide-react";

type Row = {
  match: string;
  index: number;
  groups: string[];
};

const flagOptions = [
  { key: "i", label: "Ignore case (i)" },
  { key: "m", label: "Multiline (m)" },
  { key: "s", label: "Dotall (s)" },
] as const;

const SAMPLE_SIMPLE = {
  pattern: "(\\w+)@(\\w+)",
  text: "email me at hello@fastformat.com and info@tools.dev",
};

const SAMPLE_GROUPS = {
  pattern: "(https?):\\/\\/([^/]+)\\/(\\S+)",
  text: "Links: https://toolstack.dev/path/to/page and http://example.com/other",
};

const toCsv = (rows: Row) => {
  const maxGroups = Math.max(0, ...rows.map((r) => r.groups.length));
  const header = ["match", "index", ...Array.from({ length: maxGroups }, (_, i) => `group${i + 1}`)];
  const lines = rows.map((r) => {
    const cols = [r.match, String(r.index), ...r.groups, ...Array(Math.max(0, maxGroups - r.groups.length)).fill("")];
    return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
  });
  return [header.join(","), ...lines].join("\n");
};

export default function RegexExtractorClient() {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+)");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [text, setText] = useState("email me at hello@fastformat.com and info@tools.dev");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [copied, setCopied] = useState(false);
  const MAX_LEN = 30000;
  const MAX_MATCHES = 500;

  const results = useMemo(() => {
    if (!pattern) {
      setWarning("Enter a regex pattern.");
      return [];
    }
    try {
      const regex = new RegExp(pattern, flags.join(""));
      const matches: Row[] = [];
      if (text.length > MAX_LEN) {
        setWarning("Large input; results may be truncated.");
      } else {
        setWarning("");
      }
      for (const m of text.slice(0, MAX_LEN).matchAll(regex)) {
        matches.push({
          match: m[0] ?? "",
          index: m.index ?? 0,
          groups: (m as RegExpExecArray).slice(1) as string[],
        });
        if (matches.length >= MAX_MATCHES) {
          setWarning("Results truncated at 500 matches.");
          break;
        }
      }
      if (!matches.length && !warning) {
        setWarning("No matches found.");
      }
      return matches;
    } catch (err) {
      console.error("Regex error", err);
      setWarning("Invalid regex pattern.");
      return [];
    }
  }, [pattern, flags, text]);

  const isPatternValid = useMemo(() => {
    try {
      if (!pattern) return false;
      new RegExp(pattern, flags.join(""));
      return true;
    } catch {
      return false;
    }
  }, [pattern, flags]);

  const toggleFlag = (flag: string) => {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  };

  const applySample = (variant: "simple" | "groups") => {
    if (variant === "simple") {
      setPattern(SAMPLE_SIMPLE.pattern);
      setText(SAMPLE_SIMPLE.text);
    } else {
      setPattern(SAMPLE_GROUPS.pattern);
      setText(SAMPLE_GROUPS.text);
    }
    setFlags(["g"]);
    setStatus("Loaded sample");
  };

  const handleSwap = () => {
    setPattern(text);
    setText(pattern);
    setStatus("Swapped pattern and text");
  };

  const copyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Regex Extractor</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Extract regex matches and capture groups. View results in a structured table.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <input
            type="text"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Regex pattern"
            aria-label="Regex pattern"
          />
          <div className="flex flex-wrap gap-2">
            {flagOptions.map((flag) => (
              <label
                key={flag.key}
                className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-slate-900"
                  checked={flags.includes(flag.key)}
                  onChange={() => toggleFlag(flag.key)}
                  aria-label={`Toggle flag ${flag.label}`}
                />
                {flag.label}
              </label>
            ))}
            <label className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <input type="checkbox" className="h-4 w-4 accent-slate-900" checked disabled />
              Global (g) always on
            </label>
          </div>
          <button
            onClick={() => {
              setPattern("(\\w+)@(\\w+)");
              setFlags(["g"]);
              setText("email me at hello@fastformat.com and info@tools.dev");
              setStatus("Reset to default");
              setWarning("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset pattern and text"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={() => applySample("simple")}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample for emails"
          >
            Sample: emails
          </button>
          <button
            onClick={() => applySample("groups")}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample for URLs"
          >
            Sample: URLs
          </button>
          <button
            onClick={handleSwap}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Swap pattern and text"
          >
            <Shuffle className="h-4 w-4" />
            Swap pattern/text
          </button>
          <button
            onClick={() => {
              setPattern((prev) => prev.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
              setStatus("Escaped pattern");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Escape pattern characters"
          >
            <Wand2 className="h-4 w-4" />
            Escape pattern
          </button>
        </div>
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste text to extract matches"
          aria-label="Input text to extract from"
        />
        {!isPatternValid ? (
          <p className="text-sm font-medium text-amber-600">Invalid regex pattern.</p>
        ) : (
          <p className="text-sm text-slate-600">Matches found: {results.length}</p>
        )}
        {warning ? <p className="text-sm font-medium text-amber-600">{warning}</p> : null}
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="regex-extractor-results"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span id="regex-extractor-results">Results</span>
            <span className="text-xs font-medium text-slate-300">Matches: {results.length}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => copyContent(pattern)}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
              aria-label="Copy regex pattern"
            >
              <Clipboard className="h-4 w-4" /> Copy pattern
            </button>
            <button
              onClick={() => copyContent(toCsv(results))}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
              disabled={!results.length}
              aria-label="Copy results as CSV"
            >
              <Clipboard className="h-4 w-4" /> Copy CSV
            </button>
            <button
              onClick={() => downloadContent(JSON.stringify(results, null, 2), "regex-results.json")}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
              disabled={!results.length}
              aria-label="Download results as JSON"
            >
              <Download className="h-4 w-4" /> Save JSON
            </button>
            <button
              onClick={() => downloadContent(toCsv(results), "regex-results.csv")}
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
              disabled={!results.length}
              aria-label="Download results as CSV"
            >
              <Download className="h-4 w-4" /> Save CSV
            </button>
            {copied ? <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[11px] font-semibold">Copied</span> : null}
          </div>
        </div>
        <div className="max-h-[320px] overflow-auto">
          {results.length ? (
            <table className="w-full text-sm leading-relaxed">
              <thead className="border-b border-slate-800 bg-slate-800/40 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-4 py-2 text-left">Match</th>
                  <th className="px-4 py-2 text-left">Index</th>
                  {results.length
                    ? Array.from({ length: Math.max(...results.map((r) => r.groups.length), 0) }).map((_, i) => (
                        <th key={i} className="px-4 py-2 text-left">
                          Group {i + 1}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {results.map((row, idx) => (
                  <tr key={`${row.index}-${idx}`} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2 font-semibold text-emerald-200">{row.match}</td>
                    <td className="px-4 py-2 text-slate-200">{row.index}</td>
                    {results.length
                      ? Array.from({ length: Math.max(...results.map((r) => r.groups.length), 0) }).map((_, i) => (
                          <td key={i} className="px-4 py-2 text-slate-100">
                            {row.groups[i] ?? ""}
                          </td>
                        ))
                      : null}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-300">No matches yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a regex pattern (or load a sample) and set flags; global is always on.</li>
          <li>Paste text, then copy or download matches as JSON/CSV; use escape helper if needed.</li>
          <li>Warnings appear for invalid patterns or very large inputs; matches are capped to stay responsive.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Extraction happens in your browser; data is not uploaded.</p>
          <p><strong>What can I export?</strong> Copy pattern, copy/save results as JSON or CSV.</p>
          <p><strong>Limits?</strong> Large inputs may be truncated and matches capped to keep the tool fast.</p>
        </div>
      </div>
    </main>
  );
}
