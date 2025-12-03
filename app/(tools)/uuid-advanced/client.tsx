"use client";

import Link from "next/link";
import { useState } from "react";
import { v1 as uuidv1, v4 as uuidv4, v5 as uuidv5 } from "uuid";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Version = "v1" | "v4" | "v5";

export default function UuidAdvancedClient() {
  const [version, setVersion] = useState<Version>("v4");
  const [namespace, setNamespace] = useState("6ba7b810-9dad-11d1-80b4-00c04fd430c8"); // DNS namespace
  const [name, setName] = useState("example.com");
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = () => {
    try {
      const total = Math.min(Math.max(count, 1), 50);
      const list: string[] = [];
      for (let i = 0; i < total; i += 1) {
        if (version === "v1") {
          list.push(uuidv1());
        } else if (version === "v4") {
          list.push(uuidv4());
        } else {
          list.push(uuidv5(name || "example", namespace));
        }
      }
      setUuids(list);
      setCopied(false);
      setError("");
    } catch (err) {
      console.error("UUID generation error", err);
      setError("Invalid namespace or name for v5 generation.");
      setUuids([]);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(uuids.join("\n"));
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
        <h1 className="text-3xl font-semibold text-slate-900">UUID v1/v5 Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Create UUID v1 (time-based), v4 (random), or v5 (namespace + name). Generate in bulk and copy instantly.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <select
            value={version}
            onChange={(event) => setVersion(event.target.value as Version)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="v1">UUID v1 (time-based)</option>
            <option value="v4">UUID v4 (random)</option>
            <option value="v5">UUID v5 (namespace/name)</option>
          </select>
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Count</span>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <button
            onClick={generate}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Generate
          </button>
          <button
            onClick={() => {
              setVersion("v4");
              setNamespace("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
              setName("example.com");
              setCount(5);
              setUuids([]);
              setCopied(false);
              setError("");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        {version === "v5" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Namespace UUID
              <input
                type="text"
                value={namespace}
                onChange={(event) => setNamespace(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Namespace UUID (e.g., DNS namespace)"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="example.com"
              />
            </label>
          </div>
        ) : null}
        {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : null}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">UUIDs</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
            disabled={!uuids.length}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
        </div>
        <pre className="max-h-[240px] overflow-auto p-4 text-sm leading-relaxed text-slate-100">
          {uuids.length ? uuids.join("\n") : "UUIDs will appear here after generation."}
        </pre>
      </div>
    </main>
  );
}
