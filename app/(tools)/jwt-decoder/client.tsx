"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

function decodeBase64Url(segment: string): Uint8Array {
  const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "").replace(/\s+/g, "");
  return decodeBase64(cleaned).buffer;
}

function decodeSegment(segment: string): { value: Record<string, unknown> | null; error?: string } {
  try {
    const bytes = decodeBase64Url(segment);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
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
  const deferredToken = useDeferredValue(token);
  const [copied, setCopied] = useState<"header" | "payload" | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [pretty, setPretty] = useState(true);
  const [verificationMode, setVerificationMode] = useState<"secret" | "publicKey" | "jwks">("secret");
  const [secret, setSecret] = useState("");
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [jwksUrl, setJwksUrl] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "verifying" | "valid" | "invalid" | "unverified" | "error"
  >("idle");
  const [verifyMessage, setVerifyMessage] = useState("");

  const result = useMemo(() => {
    const base = {
      state: "empty" as const,
      errors: {} as { structure?: string; header?: string; payload?: string },
      header: null as Record<string, unknown> | null,
      payload: null as Record<string, unknown> | null,
      signature: "",
      tokenType: "unknown" as "JWS" | "JWE" | "invalid" | "unknown",
      parts: [] as string[],
      signingInput: "",
    };

    const trimmed = deferredToken.trim();
    if (!trimmed) return base;

    const parts = trimmed.split(".");
    if (parts.length !== 3 && parts.length !== 5) {
      return {
        ...base,
        state: "invalid",
        tokenType: "invalid",
        errors: { structure: "Invalid token format. Expected 3-part JWS or 5-part JWE." },
      };
    }

    const isJwe = parts.length === 5;
    const [h, p] = parts;
    const next = {
      ...base,
      tokenType: isJwe ? "JWE" : "JWS",
      signature: isJwe ? "" : (parts[2] ?? ""),
      parts,
      signingInput: isJwe ? "" : `${parts[0] ?? ""}.${parts[1] ?? ""}`,
    };

    const hDecoded = decodeSegment(h ?? "");
    if (!hDecoded.value) {
      next.errors.header = hDecoded.error ?? "Failed to decode header. Check base64url encoding.";
    } else {
      next.header = hDecoded.value;
    }

    if (isJwe) {
      next.errors.payload = "Encrypted payload. Decrypt the token to view claims.";
      return {
        ...next,
        state: "jwe",
      };
    }

    const pDecoded = decodeSegment(p ?? "");
    if (!pDecoded.value) {
      next.errors.payload = pDecoded.error ?? "Failed to decode payload. Check base64url encoding.";
    } else {
      next.payload = pDecoded.value;
    }

    const hasErrors = Boolean(next.errors.header || next.errors.payload);
    return {
      ...next,
      state: hasErrors ? "partial" : "decoded",
    };
  }, [deferredToken]);

  useEffect(() => {
    setActionMessage("");
    setVerifyStatus("idle");
    setVerifyMessage("");
    const trimmed = deferredToken.trim();
    if (!trimmed) {
      setWarning("");
      return;
    }

    if (trimmed.length > LARGE_CHARS) {
      setWarning(`Large token (${trimmed.length.toLocaleString()} chars). Decoding may be slow.`);
    } else {
      setWarning("");
    }
  }, [deferredToken]);

  const handleCopy = async (text: string, key: "header" | "payload") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const handleCopyAll = async () => {
    const obj = { header: result.header, payload: result.payload, signature: result.signature };
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, pretty ? 2 : 0));
      setActionMessage("Copied all");
    } catch (err) {
      console.error("Copy failed", err);
      setActionMessage("Copy failed");
    }
  };

  const handleDownloadAll = () => {
    const obj = { header: result.header, payload: result.payload, signature: result.signature };
    const blob = new Blob([JSON.stringify(obj, null, pretty ? 2 : 0)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "jwt-decoded.json";
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage("Downloaded");
  };

  const formatJson = (value: Record<string, unknown> | null) =>
    value ? JSON.stringify(value, null, pretty ? 2 : 0) : "";
  const headerText = useMemo(() => formatJson(result.header), [result.header, pretty]);
  const payloadText = useMemo(() => formatJson(result.payload), [result.payload, pretty]);

  const expState = result.payload?.exp ? Number(result.payload.exp) : undefined;
  const nbfState = result.payload?.nbf ? Number(result.payload.nbf) : undefined;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = expState ? expState < now : false;
  const notYetValid = nbfState ? nbfState > now : false;
  const jweNotice =
    result.state === "jwe"
      ? "This looks like JWE (encrypted). Payload can’t be decoded without decryption."
      : "";
  const alg = typeof result.header?.alg === "string" ? result.header.alg : "";
  const stateMessage = useMemo(() => {
    switch (result.state) {
      case "empty":
        return "Awaiting input";
      case "invalid":
        return "Invalid format";
      case "partial":
        return "Partially decoded";
      case "decoded":
        return "Decoded";
      case "jwe":
        return "JWE detected";
      default:
        return "Ready";
    }
  }, [result.state]);

  useEffect(() => {
    if (alg.startsWith("HS")) {
      setVerificationMode("secret");
      return;
    }
    if (alg.startsWith("RS") || alg.startsWith("ES")) {
      setVerificationMode("publicKey");
    }
  }, [alg]);

  const handleVerify = async () => {
    setVerifyStatus("verifying");
    setVerifyMessage("");

    if (result.state === "empty") {
      setVerifyStatus("unverified");
      setVerifyMessage("Paste a token to verify.");
      return;
    }

    if (result.tokenType !== "JWS") {
      setVerifyStatus("unverified");
      setVerifyMessage("Only JWS signatures can be verified.");
      return;
    }

    if (!alg) {
      setVerifyStatus("unverified");
      setVerifyMessage("Missing alg in header.");
      return;
    }

    if (!result.signingInput || result.parts.length !== 3) {
      setVerifyStatus("unverified");
      setVerifyMessage("Missing signing input.");
      return;
    }

    let signatureBytes: Uint8Array;
    try {
      signatureBytes = decodeBase64Url(result.parts[2] ?? "");
    } catch (err) {
      setVerifyStatus("error");
      setVerifyMessage("Signature is not valid base64url.");
      return;
    }

    try {
      const data = new TextEncoder().encode(result.signingInput);

      if (verificationMode === "secret") {
        if (!["HS256", "HS384", "HS512"].includes(alg)) {
          setVerifyStatus("unverified");
          setVerifyMessage("HMAC verification only supports HS256/384/512.");
          return;
        }
        if (!secret.trim()) {
          setVerifyStatus("unverified");
          setVerifyMessage("Paste a secret to verify.");
          return;
        }
        const hash = alg === "HS256" ? "SHA-256" : alg === "HS384" ? "SHA-384" : "SHA-512";
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: { name: hash } },
          false,
          ["verify"]
        );
        const ok = await crypto.subtle.verify("HMAC", key, signatureBytes, data);
        setVerifyStatus(ok ? "valid" : "invalid");
        return;
      }

      if (verificationMode === "publicKey") {
        if (!["RS256", "ES256"].includes(alg)) {
          setVerifyStatus("unverified");
          setVerifyMessage("Public key verification only supports RS256/ES256.");
          return;
        }
        if (!publicKeyPem.trim()) {
          setVerifyStatus("unverified");
          setVerifyMessage("Paste a public key (PEM) to verify.");
          return;
        }
        const keyData = pemToArrayBuffer(publicKeyPem);
        const algorithm =
          alg === "RS256"
            ? ({ name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } } as const)
            : ({ name: "ECDSA", namedCurve: "P-256" } as const);
        const key = await crypto.subtle.importKey("spki", keyData, algorithm, false, ["verify"]);
        const verifyAlg = alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: "SHA-256" };
        const ok = await crypto.subtle.verify(verifyAlg, key, signatureBytes, data);
        setVerifyStatus(ok ? "valid" : "invalid");
        return;
      }

      if (!jwksUrl.trim()) {
        setVerifyStatus("unverified");
        setVerifyMessage("Provide a JWKS URL to verify.");
        return;
      }
      const kid = typeof result.header?.kid === "string" ? result.header.kid : "";
      if (!kid) {
        setVerifyStatus("unverified");
        setVerifyMessage("Missing kid in header for JWKS lookup.");
        return;
      }
      const response = await fetch(jwksUrl);
      if (!response.ok) {
        setVerifyStatus("error");
        setVerifyMessage("Failed to fetch JWKS.");
        return;
      }
      const jwks = (await response.json()) as { keys?: Array<Record<string, unknown>> };
      const keyData = jwks.keys?.find((key) => (key as { kid?: string }).kid === kid) as
        | JsonWebKey
        | undefined;
      if (!keyData) {
        setVerifyStatus("unverified");
        setVerifyMessage("No matching key found for kid.");
        return;
      }
      if (!["RS256", "ES256"].includes(alg)) {
        setVerifyStatus("unverified");
        setVerifyMessage("JWKS verification only supports RS256/ES256.");
        return;
      }
      const jwkAlg =
        alg === "RS256"
          ? ({ name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } } as const)
          : ({ name: "ECDSA", namedCurve: "P-256" } as const);
      const key = await crypto.subtle.importKey("jwk", keyData, jwkAlg, false, ["verify"]);
      const verifyAlg = alg === "RS256" ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: "SHA-256" };
      const ok = await crypto.subtle.verify(verifyAlg, key, signatureBytes, data);
      setVerifyStatus(ok ? "valid" : "invalid");
    } catch (err) {
      console.error("Verification failed", err);
      setVerifyStatus("error");
      setVerifyMessage("Verification failed. Check inputs and algorithm.");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {stateMessage} {actionMessage} {warning} {result.errors.structure} {result.errors.header}{" "}
        {result.errors.payload} {verifyMessage}
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
              JWT Decoder
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
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
            disabled={!result.header && !result.payload && !result.signature}
          >
            <Clipboard className="h-4 w-4" />
            Copy all
          </button>
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!result.header && !result.payload && !result.signature}
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
        {result.errors.structure ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {result.errors.structure}
          </p>
        ) : jweNotice ? (
          <p className="text-sm font-medium text-blue-700" role="alert">
            {jweNotice}
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
              onClick={() => handleCopy(headerText, "header")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!result.header}
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
            {result.errors.header
              ? result.errors.header
              : result.header
                ? headerText
                : "Header will appear here."}
          </pre>
        </div>

        <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold">Payload</p>
            <button
              onClick={() => handleCopy(payloadText, "payload")}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!result.payload}
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
            {result.errors.payload
              ? result.errors.payload
              : result.payload
                ? payloadText
                : "Payload will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <p className="text-sm font-semibold text-slate-900">Claim highlights</p>
        <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issuer (iss)</p>
            <p className="font-medium text-slate-900">{formatClaim(result.payload?.iss)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Subject (sub)</p>
            <p className="font-medium text-slate-900">{formatClaim(result.payload?.sub)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Expires (exp)</p>
            <p className={`font-medium ${isExpired ? "text-rose-700" : "text-slate-900"}`}>
              {result.payload?.exp ? formatDate(Number(result.payload.exp)) : "N/A"}
            </p>
            {isExpired && <p className="text-xs font-medium text-rose-700">Expired</p>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Not before (nbf)</p>
            <p className={`font-medium ${notYetValid ? "text-amber-700" : "text-slate-900"}`}>
              {result.payload?.nbf ? formatDate(Number(result.payload.nbf)) : "N/A"}
            </p>
            {notYetValid && <p className="text-xs font-medium text-amber-700">Not yet valid</p>}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-600">Signature not verified. Only decode non-sensitive tokens.</p>
        {result.tokenType === "JWS" && result.signature ? (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Signature (not verified)</p>
            <p className="break-all font-mono text-[11px] text-slate-700">{result.signature}</p>
          </div>
        ) : null}
      </div>

      <section className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Signature verification</h2>
          <p className="text-xs text-slate-500">Runs locally in your browser</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Algorithm (alg)</p>
          <p className="font-medium text-slate-900">{alg || "Unknown"}</p>
        </div>
        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="radio"
              name="verify-mode"
              value="secret"
              checked={verificationMode === "secret"}
              onChange={() => setVerificationMode("secret")}
            />
            HMAC secret (HS256/384/512)
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="radio"
              name="verify-mode"
              value="publicKey"
              checked={verificationMode === "publicKey"}
              onChange={() => setVerificationMode("publicKey")}
            />
            Public key (RS256/ES256)
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="radio"
              name="verify-mode"
              value="jwks"
              checked={verificationMode === "jwks"}
              onChange={() => setVerificationMode("jwks")}
            />
            JWKS URL (by kid)
          </label>
        </div>
        {verificationMode === "secret" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-700">
              Warning: Do not paste production secrets. Verification happens locally but secrets remain sensitive.
            </p>
            <textarea
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              placeholder="Paste HMAC secret"
              aria-label="HMAC secret"
            />
          </div>
        ) : null}
        {verificationMode === "publicKey" ? (
          <textarea
            value={publicKeyPem}
            onChange={(event) => setPublicKeyPem(event.target.value)}
            className="h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            placeholder="-----BEGIN PUBLIC KEY-----"
            aria-label="Public key PEM"
          />
        ) : null}
        {verificationMode === "jwks" ? (
          <input
            type="url"
            value={jwksUrl}
            onChange={(event) => setJwksUrl(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            placeholder="https://example.com/.well-known/jwks.json"
            aria-label="JWKS URL"
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleVerify}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={verifyStatus === "verifying"}
          >
            {verifyStatus === "verifying" ? "Verifying..." : "Verify signature"}
          </button>
          <div className="text-sm font-medium">
            {verifyStatus === "valid" && <span className="text-emerald-700">✅ Valid</span>}
            {verifyStatus === "invalid" && <span className="text-rose-700">❌ Invalid</span>}
            {verifyStatus === "unverified" && (
              <span className="text-amber-700">⚠️ Cannot verify</span>
            )}
            {verifyStatus === "error" && <span className="text-rose-700">⚠️ Error</span>}
            {verifyStatus === "idle" && <span className="text-slate-500">No verification yet</span>}
          </div>
        </div>
        {verifyMessage ? <p className="text-xs text-slate-600">{verifyMessage}</p> : null}
      </section>
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
