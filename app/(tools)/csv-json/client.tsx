"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Mode = "csv-to-json" | "json-to-csv";

const splitCsvLine = (line: string) => {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i] ?? "";
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
};

function csvToJson(csv: string) {
  const rows = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) return [];
  const headers = splitCsvLine(rows[0]);
  return rows.slice(1).map((row) => {
    const cols = splitCsvLine(row);
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header || `col_${idx}`] = cols[idx] ?? "";
    });
    return obj;
  });
}

function jsonToCsv(jsonStr: string) {
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error("JSON should be an array of objects.");
  const data = parsed as Array<Record<string, unknown>>;
  const headers = Array.from(
    data.reduce((set: Set<string>, item) => {
      Object.keys(item || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const headerLine = headers.join(",");
  const lines = data.map((item) =>
    headers
      .map((h) => {
        const raw = item?.[h];
        const val = raw === undefined || raw === null ? "" : String(raw);
        return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      })
      .join(","),
  );
  return [headerLine, ...lines].join("\n");
}

export default function CsvJsonClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("csv-to-json");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleConvert = () => {
    try {
      setError("");
      if (mode === "csv-to-json") {
        const result = csvToJson(input);
        setOutput(JSON.stringify(result, null, 2));
      } else {
        setOutput(jsonToCsv(input));
      }
    } catch (err) {
      console.error("Conversion error", err);
      setOutput("");
      setError("Invalid input for the selected direction.");
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
        <h1 className="text-3xl font-semibold text-slate-900">CSV ⇄ JSON Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert CSV to JSON or JSON to CSV in your browser. Paste data, convert, and copy.
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
              <option value="csv-to-json">CSV → JSON</option>
              <option value="json-to-csv">JSON → CSV</option>
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
              setError("");
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
          placeholder="Paste CSV rows or JSON array depending on direction"
        />
        {error ? (
          <p className="text-sm font-medium text-amber-600">{error}</p>
        ) : (
          <p className="text-sm text-slate-600">
            Tip: For JSON → CSV, provide an array of objects. CSV must include a header row.
          </p>
        )}
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
