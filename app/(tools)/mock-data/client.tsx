"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

type SchemaKey = "user" | "transaction";
type Format = "json" | "csv" | "sql";

type Options = {
  count: number;
  format: Format;
  pretty: boolean;
  schema: SchemaKey;
};

type RecordMap = Record<string, string | number>;

const schemaOptions: Record<
  SchemaKey,
  { label: string; fields: () => RecordMap }
> = {
  user: {
    label: "User profile",
    fields: () => ({
      id: randomId(),
      name: randomName(),
      email: randomEmail(),
      city: randomCity(),
      jobTitle: randomJob(),
      createdAt: randomDateIso(),
    }),
  },
  transaction: {
    label: "Transaction",
    fields: () => ({
      id: randomId(),
      userId: randomId(),
      amount: randomAmount(),
      currency: "USD",
      status: randomStatus(),
      createdAt: randomDateIso(),
    }),
  },
};

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

const names = ["Alex", "Taylor", "Sam", "Jordan", "Casey", "Morgan", "Riley", "Jamie"];
function randomName() {
  const first = names[Math.floor(Math.random() * names.length)];
  const last = names[Math.floor(Math.random() * names.length)];
  return `${first} ${last}`;
}

const jobs = ["Engineer", "Designer", "Product Manager", "Analyst", "Support", "QA", "DevOps", "Marketing"];
function randomJob() {
  return jobs[Math.floor(Math.random() * jobs.length)];
}

const cities = ["New York", "San Francisco", "Austin", "London", "Berlin", "Toronto", "Sydney", "Singapore"];
function randomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

function randomEmail() {
  const handle = Math.random().toString(36).slice(2, 8);
  return `${handle}@example.com`;
}

function randomDateIso() {
  const now = Date.now();
  const past = now - 1000 * 60 * 60 * 24 * 365;
  const ts = Math.floor(Math.random() * (now - past) + past);
  return new Date(ts).toISOString();
}

function randomAmount() {
  return parseFloat((Math.random() * 500).toFixed(2));
}

const statuses = ["pending", "paid", "failed", "refunded"];
function randomStatus() {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function toCsv(rows: RecordMap[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

function toSql(rows: RecordMap[], table = "sample") {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const values = rows
    .map((row) => {
      const vals = headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "number") return val.toString();
          return `'${String(val).replace(/'/g, "''")}'`;
        })
        .join(", ");
      return `(${vals})`;
    })
    .join(",\n");
  return `INSERT INTO ${table} (${headers.join(", ")}) VALUES\n${values};`;
}

function generateData(opts: Options) {
  if (!Number.isFinite(opts.count) || opts.count <= 0) throw new Error("Count must be greater than 0.");
  if (opts.count > 500) throw new Error("Count capped at 500 for performance.");
  const maker = schemaOptions[opts.schema]?.fields;
  if (!maker) throw new Error("Unknown schema.");
  const rows: RecordMap[] = Array.from({ length: opts.count }, () => maker());
  if (opts.format === "csv") return toCsv(rows);
  if (opts.format === "sql") return toSql(rows, opts.schema);
  return opts.pretty ? JSON.stringify(rows, null, 2) : JSON.stringify(rows);
}

export default function MockDataClient() {
  const [options, setOptions] = useState<Options>({ count: 10, format: "json", pretty: true, schema: "user" });
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Generated successfully";
    return "Awaiting generation";
  }, [error, output]);

  const handleGenerate = () => {
    setError("");
    setCopied(false);
    try {
      const result = generateData(options);
      setOutput(result);
    } catch (err: any) {
      setError(err?.message || "Unable to generate data.");
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
    const ext = options.format === "json" ? "json" : options.format === "csv" ? "csv" : "sql";
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock-data.${ext}`;
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
        <h1 className="text-3xl font-semibold text-slate-900">Mock Data Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate realistic sample data in JSON, CSV, or SQL for testing and prototyping. Runs locally in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Schema
              <select
                value={options.schema}
                onChange={(e) => setOptions((prev) => ({ ...prev, schema: e.target.value as SchemaKey }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                {Object.entries(schemaOptions).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Format
              <select
                value={options.format}
                onChange={(e) => setOptions((prev) => ({ ...prev, format: e.target.value as Format }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="sql">SQL</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Count (max 500)
              <input
                type="number"
                min={1}
                max={500}
                value={options.count}
                onChange={(e) => setOptions((prev) => ({ ...prev, count: Number(e.target.value) }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              />
            </label>
          </div>

          {options.format === "json" ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={options.pretty}
                onChange={() => setOptions((prev) => ({ ...prev, pretty: !prev.pretty }))}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Pretty-print JSON"
              />
              Pretty-print JSON
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              aria-label="Generate mock data"
            >
              Generate
            </button>
            <button
              onClick={() => {
                setOptions({ count: 10, format: "json", pretty: true, schema: "user" });
                setOutput("");
                setError("");
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset options"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="output-heading">
              Output
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy output"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download output"
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
            {output || "Your generated data will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick a schema (user or transaction) and format (JSON, CSV, or SQL).</li>
          <li>Set a record count (capped at 500) and click Generate.</li>
          <li>Copy or download the output for your tests or prototypes.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>All data is generated locally in your browser; nothing is uploaded.</p>
          <p>For larger datasets or custom schemas, generate in smaller batches or adjust the code client-side.</p>
        </div>
      </div>
    </main>
  );
}
