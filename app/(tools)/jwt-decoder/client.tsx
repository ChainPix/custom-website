"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

function decodeSegment(segment: string) {
  try {
    const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (err) {
    console.error("Decode segment error", err);
    return null;
  }
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp * 1000);
  return `${date.toISOString()} (${date.toLocaleString()})`;
}

export default function JwtDecoderClient() {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState<"header" | "payload" | null>(null);

  const [header, payload] = useMemo(() => {
    const parts = token.split(".");
    if (parts.length < 2) return [null, null];
    const h = decodeSegment(parts[0] ?? "");
    const p = decodeSegment(parts[1] ?? "");
    return [h, p];
  }, [token]);

  const isStructureValid = token === "" || token.split(".").length >= 2;

  const handleCopy = async (text: string, key: "header" | "payload") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
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
        <h1 className="text-3xl font-semibold text-slate-900">JWT Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Decode JWT header and payload locally without verifying the signature. Inspect claims and
          expiry quickly.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setToken("")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <textarea
          className="h-[180px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste JWT (header.payload.signature)"
        />
        {!isStructureValid ? (
          <p className="text-sm font-medium text-amber-600">Invalid JWT format. Expect header.payload.signature.</p>
        ) : (
          <p className="text-sm text-slate-600">
            Note: Signature is not verified. Do not paste sensitive tokens from production systems.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Header</p>
            <button
              onClick={() => handleCopy(header ? JSON.stringify(header, null, 2) : "", "header")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!header}
            >
              {copied === "header" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "header" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="min-h-[160px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
            {header ? JSON.stringify(header, null, 2) : "Header will appear here."}
          </pre>
        </div>

        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Payload</p>
            <button
              onClick={() => handleCopy(payload ? JSON.stringify(payload, null, 2) : "", "payload")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!payload}
            >
              {copied === "payload" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "payload" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="min-h-[160px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100">
            {payload ? JSON.stringify(payload, null, 2) : "Payload will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-slate-900">Claim highlights</p>
        <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issuer (iss)</p>
            <p className="font-medium text-slate-900">{payload?.iss ?? "N/A"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Subject (sub)</p>
            <p className="font-medium text-slate-900">{payload?.sub ?? "N/A"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Expires (exp)</p>
            <p className="font-medium text-slate-900">
              {payload?.exp ? formatDate(Number(payload.exp)) : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
