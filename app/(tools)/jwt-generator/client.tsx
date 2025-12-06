"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

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
  const [status, setStatus] = useState("Ready");
  const [secretWarning, setSecretWarning] = useState("");
  const [includeIat, setIncludeIat] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState<number | "">("");
  const [issuer, setIssuer] = useState("");
  const [audience, setAudience] = useState("");
  const [autoRegenerate, setAutoRegenerate] = useState(false);

  const decoded = useMemo(() => decodeToken(token), [token]);

  const handleGenerate = async () => {
    try {
      const parsed = JSON.parse(payloadText);
      if (!secret || secret.length < 8) {
        setSecretWarning("Secret is short; use at least 8+ characters.");
      } else {
        setSecretWarning("");
      }
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (issuer) parsed.iss = issuer;
      if (audience) parsed.aud = audience;
      if (includeIat) parsed.iat = nowSeconds;
      if (expiryMinutes !== "" && !Number.isNaN(Number(expiryMinutes))) {
        parsed.exp = nowSeconds + Number(expiryMinutes) * 60;
      }
      const signed = await signHS256(parsed, secret || "secret");
      setToken(signed);
      setError("");
      setStatus("JWT generated");
    } catch (err) {
      console.error("JWT generate error", err);
      setError("Invalid payload JSON or signing failed.");
      setToken("");
      setStatus("Generation failed");
    }
  };

  useEffect(() => {
    if (!autoRegenerate) return;
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadText, secret, includeIat, expiryMinutes, issuer, audience, autoRegenerate]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied token");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error} {secretWarning}
      </div>
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
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="JWT input and signing options">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Generate JWT"
            >
              Generate JWT
            </button>
            <button
              onClick={() => {
                setPayloadText('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
                setSecret("your-secret");
                setToken("");
                setError("");
                setStatus("Reset to defaults");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Reset payload and secret"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={autoRegenerate}
                onChange={(e) => setAutoRegenerate(e.target.checked)}
              />
              Auto-regenerate
            </label>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Samples:</span>
            <button
              type="button"
              onClick={() => {
                setPayloadText('{\n  "sub": "42",\n  "role": "admin"\n}');
                setSecret("sample-secret-123");
                setStatus("Loaded sample");
              }}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Admin sample
            </button>
            <button
              type="button"
              onClick={() => {
                setPayloadText('{\n  "user": "guest",\n  "scope": ["read"]\n}');
                setSecret("guest-secret");
                setStatus("Loaded sample");
              }}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Guest sample
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
            {secretWarning ? (
              <p className="mt-1 text-xs font-medium text-amber-600" role="alert">
                {secretWarning}
              </p>
            ) : null}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                checked={includeIat}
                onChange={(e) => setIncludeIat(e.target.checked)}
              />
              Add issued-at (iat)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Expiry (minutes)
              <input
                type="number"
                min={0}
                className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 60"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-900">
              Issuer (iss)
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. toolstack"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-900">
              Audience (aud)
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. api-users"
              />
            </label>
          </div>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Note: HS256 signing runs locally. Do not use production secrets here.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800" role="region" aria-label="Signed JWT output">
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
            {token ? (
              <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-300">
                Length: {token.length} chars
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="JWT header">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Header</p>
              <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                {decoded?.header ? JSON.stringify(decoded.header, null, 2) : "N/A"}
              </pre>
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.header) return;
                    navigator.clipboard.writeText(JSON.stringify(decoded.header, null, 2));
                    setStatus("Copied header");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  {status === "Copied header" ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.header) return;
                    const blob = new Blob([JSON.stringify(decoded.header, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "jwt-header.json";
                    link.click();
                    URL.revokeObjectURL(url);
                    setStatus("Downloaded header");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="JWT payload">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Payload</p>
              <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                {decoded?.payload ? JSON.stringify(decoded.payload, null, 2) : "N/A"}
              </pre>
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.payload) return;
                    navigator.clipboard.writeText(JSON.stringify(decoded.payload, null, 2));
                    setStatus("Copied payload");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  {status === "Copied payload" ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.payload) return;
                    const blob = new Blob([JSON.stringify(decoded.payload, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "jwt-payload.json";
                    link.click();
                    URL.revokeObjectURL(url);
                    setStatus("Downloaded payload");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  <Download className="h-3 w-3" />
                  Download
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            HS256 only. Runs locally; do not use production secrets or keys here.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste or edit your payload JSON.</li>
          <li>Add a strong secret; optionally set issuer, audience, issued-at, and expiry helpers.</li>
          <li>Generate the JWT, then copy or download the token or decoded parts.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Signing happens in your browser; nothing is uploaded.</p>
          <p><strong>Algorithm?</strong> HS256 only. For production consider RS/ES algorithms and strong secrets.</p>
          <p><strong>Secrets?</strong> Use non-production secrets here; this is for local/debugging use.</p>
        </div>
      </div>
    </main>
  );
}
