"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

function decodeSegment(segment: string): { value: Record<string, unknown> | null; error?: string } {
  try {
    const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return { value: JSON.parse(decoded) };
  } catch (err) {
    return { value: null, error: "Unable to decode segment (base64url/JSON error)." };
  }
}

function formatDate(timestamp?: number) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp * 1000);
  return `${date.toISOString()} (${date.toLocaleString()})`;
}

function formatClaim(value: unknown) {
  if (value === undefined || value === null) return "N/A";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const LARGE_CHARS = 5000;
const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJ0b29sc3RhY2siLCJzdWIiOiJ1c2VyMTIzIiwiZXhwIjo0MDAwMDAwMDAwLCJuYmYiIjoxNzAwMDAwMDAwfQ." +
  "signature-not-verified";

export default function JwtDecoderClient() {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState<"header" | "payload" | null>(null);
  const [header, setHeader] = useState<Record<string, unknown> | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [signature, setSignature] = useState<string>("");
  const [status, setStatus] = useState("Ready");
  const [warning, setWarning] = useState("");
  const [structureError, setStructureError] = useState("");
  const [headerError, setHeaderError] = useState("");
  const [payloadError, setPayloadError] = useState("");
  const [pretty, setPretty] = useState(true);

  useEffect(() => {
    setHeader(null);
    setPayload(null);
    setSignature("");
    setStructureError("");
    setHeaderError("");
    setPayloadError("");
    setStatus("Ready");

    const trimmed = token.trim();
    if (!trimmed) {
      setWarning("");
      setStatus("Awaiting input");
      return;
    }

    if (trimmed.length > LARGE_CHARS) {
      setWarning(`Large token (${trimmed.length.toLocaleString()} chars). Decoding may be slow.`);
    } else {
      setWarning("");
    }

    const parts = trimmed.split(".");
    if (parts.length < 2) {
      setStructureError("Invalid JWT format. Expect header.payload.signature.");
      setStatus("Invalid format");
      return;
    }

    const [h, p] = parts;
    setSignature(parts[2] ?? "");
    let decodedHeader: Record<string, unknown> | null = null;
    let decodedPayload: Record<string, unknown> | null = null;

    const hDecoded = decodeSegment(h ?? "");
    if (!hDecoded.value) {
      setHeaderError(hDecoded.error ?? "Failed to decode header. Check base64url encoding.");
    } else {
      decodedHeader = hDecoded.value;
    }

    const pDecoded = decodeSegment(p ?? "");
    if (!pDecoded.value) {
      setPayloadError(pDecoded.error ?? "Failed to decode payload. Check base64url encoding.");
    } else {
      decodedPayload = pDecoded.value;
    }

    setHeader(decodedHeader);
    setPayload(decodedPayload);
    setStatus("Decoded");
  }, [token]);

  const handleCopy = async (text: string, key: "header" | "payload") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopyAll = async () => {
    const obj = { header, payload, signature };
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, pretty ? 2 : 0));
      setStatus("Copied all");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownloadAll = () => {
    const obj = { header, payload, signature };
    const blob = new Blob([JSON.stringify(obj, null, pretty ? 2 : 0)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jwt-decoded.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const formatJson = (value: Record<string, unknown> | null) =>
    value ? JSON.stringify(value, null, pretty ? 2 : 0) : "";

  const expState = payload?.exp ? Number(payload.exp) : undefined;
  const nbfState = payload?.nbf ? Number(payload.nbf) : undefined;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = expState ? expState < now : false;
  const notYetValid = nbfState ? nbfState > now : false;

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning} {structureError} {headerError} {payloadError}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">JWT Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Decode JWT header and payload locally without verifying the signature. Inspect claims and
          expiry quickly.
        </p>
        <p className="text-sm text-slate-600">Note: Signature is not verified. Never paste production secrets.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setToken("")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Clear token input"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            onClick={() => setToken(SAMPLE_JWT)}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample JWT"
          >
            <Sparkles className="h-4 w-4" />
            Load sample
          </button>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={pretty}
              onChange={(e) => setPretty(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Pretty print
          </label>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!header && !payload && !signature}
          >
            <Clipboard className="h-4 w-4" />
            Copy all
          </button>
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!header && !payload && !signature}
          >
            <Download className="h-4 w-4" />
            Download JSON
          </button>
        </div>
        <textarea
            className="h-[180px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste JWT (header.payload.signature)"
            aria-label="JWT input"
        />
        {structureError ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {structureError}
          </p>
        ) : warning ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {warning}
          </p>
        ) : (
          <p className="text-sm text-slate-600">Signature is not verified. Avoid pasting secrets from production.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Header</p>
            <button
              onClick={() => handleCopy(formatJson(header), "header")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!header}
              aria-label="Copy decoded header"
            >
              {copied === "header" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "header" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="min-h-[160px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-label="Decoded JWT header"
            tabIndex={0}
          >
            {headerError
              ? headerError
              : header
                ? formatJson(header)
                : "Header will appear here."}
          </pre>
        </div>

        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Payload</p>
            <button
              onClick={() => handleCopy(formatJson(payload), "payload")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!payload}
              aria-label="Copy decoded payload"
            >
              {copied === "payload" ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied === "payload" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="min-h-[160px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-label="Decoded JWT payload"
            tabIndex={0}
          >
            {payloadError
              ? payloadError
              : payload
                ? formatJson(payload)
                : "Payload will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-slate-900">Claim highlights</p>
        <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issuer (iss)</p>
            <p className="font-medium text-slate-900">{formatClaim(payload?.iss)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Subject (sub)</p>
            <p className="font-medium text-slate-900">{formatClaim(payload?.sub)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Expires (exp)</p>
            <p className={`font-medium ${isExpired ? "text-rose-700" : "text-slate-900"}`}>
              {payload?.exp ? formatDate(Number(payload.exp)) : "N/A"}
            </p>
            {isExpired && <p className="text-xs font-medium text-rose-700">Expired</p>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Not before (nbf)</p>
            <p className={`font-medium ${notYetValid ? "text-amber-700" : "text-slate-900"}`}>
              {payload?.nbf ? formatDate(Number(payload.nbf)) : "N/A"}
            </p>
            {notYetValid && <p className="text-xs font-medium text-amber-700">Not yet valid</p>}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-600">Signature not verified. Only decode non-sensitive tokens.</p>
        {signature ? (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Signature (not verified)</p>
            <p className="break-all font-mono text-[11px] text-slate-700">{signature}</p>
          </div>
        ) : null}
      </div>
      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste a JWT or load the sample; header/payload decode automatically.</li>
          <li>Use “Pretty print” to toggle formatting; copy header/payload or download all JSON.</li>
          <li>Remember: signature is not verified—never paste sensitive production tokens.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is decoding private?</summary>
            <p className="mt-2 text-slate-700">Yes. Decoding happens in your browser; tokens are not uploaded.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is the signature checked?</summary>
            <p className="mt-2 text-slate-700">No. This tool only decodes header/payload. Do not paste sensitive tokens.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I export the decoded data?</summary>
            <p className="mt-2 text-slate-700">Yes. Copy header/payload individually or download the combined JSON.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
