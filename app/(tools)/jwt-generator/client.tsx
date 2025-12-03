"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const encoder = new TextEncoder();

const toBase64Url = (input: Uint8Array) => {
  let binary = "";
  input.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function signHS256(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerEnc = toBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadEnc = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${headerEnc}.${payloadEnc}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sig = toBase64Url(new Uint8Array(sigBuffer));
  return `${data}.${sig}`;
}

function decodeToken(token: string) {
  try {
    const [h, p] = token.split(".");
    if (!h || !p) return null;
    const decode = (str: string) =>
      JSON.parse(
        decodeURIComponent(
          atob(str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "="))
            .split("")
            .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
            .join(""),
        ),
      );
    return { header: decode(h), payload: decode(p) };
  } catch (err) {
    console.error("Decode error", err);
    return null;
  }
}

export default function JwtGeneratorClient() {
  const [payloadText, setPayloadText] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
  const [secret, setSecret] = useState("your-secret");
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const decoded = useMemo(() => decodeToken(token), [token]);

  const handleGenerate = async () => {
    try {
      const parsed = JSON.parse(payloadText);
      const signed = await signHS256(parsed, secret || "secret");
      setToken(signed);
      setError("");
    } catch (err) {
      console.error("JWT generate error", err);
      setError("Invalid payload JSON or signing failed.");
      setToken("");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
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
        <h1 className="text-3xl font-semibold text-slate-900">JWT Generator (HS256)</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Create and decode JWTs locally using HS256. Provide payload JSON and a secret to sign the token.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
            >
              Generate JWT
            </button>
            <button
              onClick={() => {
                setPayloadText('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
                setSecret("your-secret");
                setToken("");
                setError("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          <label className="block text-sm font-semibold text-slate-900">
            Payload (JSON)
            <textarea
              className="mt-2 h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-900">
            Secret
            <input
              type="text"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="your-secret"
            />
          </label>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Note: HS256 signing runs locally. Do not use production secrets here.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-semibold">Signed JWT</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!token}
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[120px] overflow-auto p-4 text-xs leading-relaxed text-slate-100">
              {token || "Generate a token to see it here."}
            </pre>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Header</p>
              <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                {decoded?.header ? JSON.stringify(decoded.header, null, 2) : "N/A"}
              </pre>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payload</p>
              <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                {decoded?.payload ? JSON.stringify(decoded.payload, null, 2) : "N/A"}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
