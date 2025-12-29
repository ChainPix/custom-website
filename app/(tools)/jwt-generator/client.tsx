"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type JwtAlg = "HS256" | "RS256" | "ES256" | "EdDSA";

type KeyEntry = {
  id: string;
  kid: string;
  alg: Exclude<JwtAlg, "HS256">;
  kty: "RSA" | "EC" | "OKP";
  publicKey: CryptoKey;
  privateKey?: CryptoKey;
};

const algConfig: Record<Exclude<JwtAlg, "HS256">, { name: string; kty: KeyEntry["kty"]; hash?: string; namedCurve?: string }> = {
  RS256: { name: "RSASSA-PKCS1-v1_5", kty: "RSA", hash: "SHA-256" },
  ES256: { name: "ECDSA", kty: "EC", hash: "SHA-256", namedCurve: "P-256" },
  EdDSA: { name: "Ed25519", kty: "OKP" },
};

const stripPrivateJwk = (jwk: JsonWebKey) => {
  const { d, p, q, dp, dq, qi, oth, ...publicOnly } = jwk as JsonWebKey & {
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
    oth?: unknown;
  };
  return publicOnly;
};

const deriveAlgFromJwk = (jwk: JsonWebKey): Exclude<JwtAlg, "HS256"> | null => {
  if (jwk.alg === "RS256" || jwk.alg === "ES256" || jwk.alg === "EdDSA") return jwk.alg;
  if (jwk.kty === "RSA") return "RS256";
  if (jwk.kty === "EC" && jwk.crv === "P-256") return "ES256";
  if (jwk.kty === "OKP" && jwk.crv === "Ed25519") return "EdDSA";
  return null;
};

const createHeader = (alg: JwtAlg, kid?: string) => {
  const header: Record<string, unknown> = { alg, typ: "JWT" };
  if (kid) header.kid = kid;
  return header;
};

const toBase64Url = (input: Uint8Array) => {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    parts.push(String.fromCharCode(...input.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (input: string) => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const base64UrlDecodeToString = (value: string) => decoder.decode(fromBase64Url(value));

const safeParseJson = (value: string) => {
  try {
    return { parsed: JSON.parse(value) as Record<string, unknown>, error: "" };
  } catch {
    return { parsed: null, error: "Non-JSON content; showing raw text." };
  }
};

async function signHS256(payload: Record<string, unknown>, secret: string) {
  const header = createHeader("HS256");
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

async function signWithKey(payload: Record<string, unknown>, key: KeyEntry) {
  if (!key.privateKey) {
    throw new Error("Missing private key for signing.");
  }
  const header = createHeader(key.alg, key.kid);
  const headerEnc = toBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadEnc = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${headerEnc}.${payloadEnc}`;
  const signAlgorithm =
    key.alg === "RS256"
      ? { name: algConfig.RS256.name }
      : key.alg === "ES256"
        ? { name: algConfig.ES256.name, hash: algConfig.ES256.hash }
        : { name: algConfig.EdDSA.name };
  const sigBuffer = await crypto.subtle.sign(signAlgorithm, key.privateKey, encoder.encode(data));
  const sig = toBase64Url(new Uint8Array(sigBuffer));
  return `${data}.${sig}`;
}

function decodeToken(token: string) {
  const [h, p] = token.split(".");
  if (!h || !p) return null;
  const decodePart = (label: "header" | "payload", value: string) => {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      return { json: null, raw: "", error: `${label} is not valid base64url` };
    }
    try {
      const raw = base64UrlDecodeToString(value);
      const { parsed, error } = safeParseJson(raw);
      return { json: parsed, raw, error };
    } catch (err) {
      console.error("Decode error", err);
      return { json: null, raw: "", error: `Failed to decode ${label}` };
    }
  };
  return {
    header: decodePart("header", h),
    payload: decodePart("payload", p),
  };
}

export default function JwtGeneratorClient() {
  const [payloadText, setPayloadText] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe"\n}');
  const [algorithm, setAlgorithm] = useState<JwtAlg>("HS256");
  const [secret, setSecret] = useState("");
  const [revealSecret, setRevealSecret] = useState(false);
  const [clearSecretOnExit, setClearSecretOnExit] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("jwt-clear-secret-on-exit");
    return stored ? stored === "true" : true;
  });
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
  const [keyEntries, setKeyEntries] = useState<KeyEntry[]>([]);
  const [activeKeyId, setActiveKeyId] = useState("");
  const [jwksText, setJwksText] = useState("");
  const [jwksError, setJwksError] = useState("");
  const [finalPayload, setFinalPayload] = useState<Record<string, unknown> | null>(null);
  const [payloadDiff, setPayloadDiff] = useState<{ added: string[]; overridden: string[] }>({
    added: [],
    overridden: [],
  });
  const debounceTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const generationIdRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("jwt-clear-secret-on-exit", String(clearSecretOnExit));
    if (clearSecretOnExit) {
      window.sessionStorage.removeItem("jwt-secret");
    }
  }, [clearSecretOnExit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (clearSecretOnExit) {
      window.sessionStorage.removeItem("jwt-secret");
      return;
    }
    window.sessionStorage.setItem("jwt-secret", secret);
  }, [secret, clearSecretOnExit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!clearSecretOnExit) {
      const storedSecret = window.sessionStorage.getItem("jwt-secret");
      if (storedSecret) {
        setSecret(storedSecret);
      }
    }
  }, [clearSecretOnExit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const clearStoredSecret = () => {
      if (clearSecretOnExit) {
        window.sessionStorage.removeItem("jwt-secret");
      }
    };
    window.addEventListener("beforeunload", clearStoredSecret);
    window.addEventListener("pagehide", clearStoredSecret);
    return () => {
      window.removeEventListener("beforeunload", clearStoredSecret);
      window.removeEventListener("pagehide", clearStoredSecret);
    };
  }, [clearSecretOnExit]);

  const keysForAlgorithm = useMemo(() => keyEntries.filter((entry) => entry.alg === algorithm), [keyEntries, algorithm]);
  const activeKey = useMemo(() => keyEntries.find((entry) => entry.id === activeKeyId) ?? null, [keyEntries, activeKeyId]);

  useEffect(() => {
    if (algorithm === "HS256") return;
    const matchingActive = activeKey && activeKey.alg === algorithm;
    if (matchingActive) return;
    const fallback = keyEntries.find((entry) => entry.alg === algorithm);
    setActiveKeyId(fallback ? fallback.id : "");
  }, [algorithm, activeKey, keyEntries]);

  const handleGenerateKey = async () => {
    if (algorithm === "HS256") return;
    setJwksError("");
    try {
      const config = algConfig[algorithm];
      const keyPair =
        algorithm === "RS256"
          ? await crypto.subtle.generateKey(
              {
                name: config.name,
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: config.hash,
              },
              true,
              ["sign", "verify"],
            )
          : algorithm === "ES256"
            ? await crypto.subtle.generateKey(
                {
                  name: config.name,
                  namedCurve: config.namedCurve,
                },
                true,
                ["sign", "verify"],
              )
            : await crypto.subtle.generateKey({ name: config.name }, true, ["sign", "verify"]);
      const id = crypto.randomUUID();
      const entry: KeyEntry = {
        id,
        kid: id,
        alg: algorithm,
        kty: config.kty,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
      };
      setKeyEntries((prev) => [...prev, entry]);
      setActiveKeyId(id);
      setStatus(`Generated ${algorithm} key`);
    } catch (err) {
      console.error("Key generation error", err);
      setJwksError(`Failed to generate ${algorithm} key. This browser may not support it.`);
    }
  };

  const handleImportJwks = async () => {
    setJwksError("");
    try {
      const parsed = JSON.parse(jwksText);
      const keys = Array.isArray(parsed?.keys) ? parsed.keys : [parsed];
      const imported: KeyEntry[] = [];
      for (const jwk of keys) {
        const alg = deriveAlgFromJwk(jwk);
        if (!alg) continue;
        const config = algConfig[alg];
        const publicJwk = stripPrivateJwk(jwk);
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          publicJwk,
          config.kty === "RSA"
            ? { name: config.name, hash: config.hash }
            : config.kty === "EC"
              ? { name: config.name, namedCurve: config.namedCurve }
              : { name: config.name },
          true,
          ["verify"],
        );
        let privateKey: CryptoKey | undefined;
        if (jwk.d) {
          privateKey = await crypto.subtle.importKey(
            "jwk",
            jwk,
            config.kty === "RSA"
              ? { name: config.name, hash: config.hash }
              : config.kty === "EC"
                ? { name: config.name, namedCurve: config.namedCurve }
                : { name: config.name },
            true,
            ["sign"],
          );
        }
        const id = jwk.kid ?? crypto.randomUUID();
        imported.push({
          id,
          kid: jwk.kid ?? id,
          alg,
          kty: config.kty,
          publicKey,
          privateKey,
        });
      }
      if (!imported.length) {
        setJwksError("No compatible keys found in JWKS.");
        return;
      }
      setKeyEntries((prev) => [...prev, ...imported]);
      setActiveKeyId(imported[0].id);
      setStatus(`Imported ${imported.length} key${imported.length === 1 ? "" : "s"}`);
    } catch (err) {
      console.error("JWKS import error", err);
      setJwksError("Invalid JWKS JSON or unsupported key format.");
    }
  };

  const handleExportJwks = async (includePrivate: boolean) => {
    setJwksError("");
    try {
      const keys = await Promise.all(
        keyEntries.map(async (entry) => {
          const key = includePrivate && entry.privateKey ? entry.privateKey : entry.publicKey;
          const jwk = await crypto.subtle.exportKey("jwk", key);
          return { ...jwk, kid: entry.kid, alg: entry.alg, use: "sig" };
        }),
      );
      const jwks = JSON.stringify({ keys }, null, 2);
      setJwksText(jwks);
      setStatus(`Exported ${includePrivate ? "private" : "public"} JWKS`);
    } catch (err) {
      console.error("JWKS export error", err);
      setJwksError("Failed to export JWKS.");
    }
  };

  const handleRemoveKey = (id: string) => {
    setKeyEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (activeKeyId === id) {
      setActiveKeyId("");
    }
    setStatus("Removed key");
  };

  const decoded = useMemo(() => decodeToken(token), [token]);

  const handleGenerate = async (requestId?: number) => {
    const activeId = requestId ?? (generationIdRef.current += 1);
    if (requestId && generationIdRef.current !== requestId) return;
    try {
      const parsed = JSON.parse(payloadText);
      if (algorithm === "HS256") {
        if (!secret || secret.length < 8) {
          setSecretWarning("Secret is short; use at least 8+ characters.");
        } else {
          setSecretWarning("");
        }
      } else {
        setSecretWarning("");
      }
      const nowSeconds = Math.floor(Date.now() / 1000);
      const claimAdditions: Record<string, unknown> = {};
      if (issuer) claimAdditions.iss = issuer;
      if (audience) claimAdditions.aud = audience;
      if (includeIat) claimAdditions.iat = nowSeconds;
      if (expiryMinutes !== "" && !Number.isNaN(Number(expiryMinutes))) {
        claimAdditions.exp = nowSeconds + Number(expiryMinutes) * 60;
      }
      const added: string[] = [];
      const overridden: string[] = [];
      Object.keys(claimAdditions).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          overridden.push(key);
        } else {
          added.push(key);
        }
      });
      const finalPayloadValue = { ...parsed, ...claimAdditions };
      setFinalPayload(finalPayloadValue);
      setPayloadDiff({ added, overridden });
      let signed = "";
      if (algorithm === "HS256") {
        signed = await signHS256(finalPayloadValue, secret || "secret");
      } else {
        if (!activeKey || activeKey.alg !== algorithm) {
          throw new Error(`No ${algorithm} key selected.`);
        }
        signed = await signWithKey(finalPayloadValue, activeKey);
      }
      if (generationIdRef.current !== activeId) return;
      setToken(signed);
      setError("");
      setStatus("JWT generated");
    } catch (err) {
      if (generationIdRef.current !== activeId) return;
      console.error("JWT generate error", err);
      setError(err instanceof Error ? err.message : "Invalid payload JSON or signing failed.");
      setToken("");
      setFinalPayload(null);
      setPayloadDiff({ added: [], overridden: [] });
      setStatus("Generation failed");
    }
  };

  useEffect(() => {
    if (!autoRegenerate) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      generationIdRef.current += 1;
      return;
    }
    const requestId = (generationIdRef.current += 1);
    debounceTimerRef.current = window.setTimeout(() => {
      handleGenerate(requestId);
    }, 350);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadText, secret, includeIat, expiryMinutes, issuer, audience, algorithm, activeKeyId, autoRegenerate]);

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
              JWT Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JWT Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Create and decode JWTs locally using HS256, RS256, ES256, or EdDSA. Provide payload JSON and signing keys.
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
                setAlgorithm("HS256");
                setSecret("");
                setToken("");
                setError("");
                setFinalPayload(null);
                setPayloadDiff({ added: [], overridden: [] });
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
                setAlgorithm("HS256");
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
                setAlgorithm("HS256");
                setSecret("guest-secret");
                setStatus("Loaded sample");
              }}
              className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Guest sample
            </button>
          </div>
          <label className="block text-sm font-semibold text-slate-900">
            Algorithm
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as JwtAlg)}
            >
              <option value="HS256">HS256 (HMAC)</option>
              <option value="RS256">RS256 (RSA)</option>
              <option value="ES256">ES256 (ECDSA)</option>
              <option value="EdDSA">EdDSA (Ed25519)</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-900">
            Payload (JSON)
            <textarea
              className="mt-2 h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
              spellCheck={false}
            />
          </label>
          {algorithm === "HS256" ? (
            <label className="block text-sm font-semibold text-slate-900">
              Secret
              <input
                type={revealSecret ? "text" : "password"}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                placeholder="your-secret"
                autoComplete="new-password"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => setRevealSecret((prev) => !prev)}
                  className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  aria-pressed={revealSecret}
                >
                  {revealSecret ? "Hide secret" : "Reveal secret"}
                </button>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
                    checked={clearSecretOnExit}
                    onChange={(e) => setClearSecretOnExit(e.target.checked)}
                  />
                  Clear on refresh / tab close
                </label>
              </div>
              {secretWarning ? (
                <p className="mt-1 text-xs font-medium text-amber-600" role="alert">
                  {secretWarning}
                </p>
              ) : null}
            </label>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-900">
                  Active key
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={activeKeyId}
                    onChange={(event) => setActiveKeyId(event.target.value)}
                  >
                    <option value="">Select a key</option>
                    {keysForAlgorithm.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.kid} {entry.privateKey ? "(signing)" : "(public only)"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5"
                >
                  Generate {algorithm} key
                </button>
              </div>
              {activeKey && !activeKey.privateKey ? (
                <p className="text-xs font-medium text-amber-600">
                  Selected key is public-only. Import or generate a private key to sign.
                </p>
              ) : null}
              <div>
                <label className="block text-xs font-semibold text-slate-700">JWKS import / export</label>
                <p className="mt-1 text-[11px] text-slate-500">Supports RSA, P-256 ECDSA, and Ed25519 JWKS keys.</p>
                <textarea
                  className="mt-2 h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={jwksText}
                  onChange={(event) => setJwksText(event.target.value)}
                  placeholder='Paste JWKS JSON here ({"keys":[...]})'
                />
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleImportJwks}
                    className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Import JWKS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportJwks(false)}
                    className="rounded-full bg-white px-3 py-1 font-semibold shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    Export public JWKS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportJwks(true)}
                    className="rounded-full bg-white px-3 py-1 font-semibold text-amber-700 shadow-[var(--shadow-soft)] ring-1 ring-amber-200 transition hover:-translate-y-0.5"
                  >
                    Export private JWKS
                  </button>
                </div>
                {jwksError ? <p className="mt-2 text-xs font-medium text-amber-600">{jwksError}</p> : null}
              </div>
              {keysForAlgorithm.length ? (
                <div className="space-y-2 text-xs text-slate-700">
                  {keysForAlgorithm.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
                      <span>
                        <span className="font-semibold text-slate-900">{entry.kid}</span> · {entry.kty} ·{" "}
                        {entry.privateKey ? "signing + verify" : "public only"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKey(entry.id)}
                        className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No keys loaded yet. Generate or import a JWKS.</p>
              )}
            </div>
          )}
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
              Note: Signing runs locally. Do not use production secrets or keys here.
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

          <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="Final payload used for signing">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Final Payload Used For Signing</p>
            {finalPayload ? (
              <>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                  {payloadDiff.added.length ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Added: {payloadDiff.added.join(", ")}</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">No helper claims added</span>
                  )}
                  {payloadDiff.overridden.length ? (
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                      Overrode: {payloadDiff.overridden.join(", ")}
                    </span>
                  ) : null}
                </div>
                <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                  {JSON.stringify(finalPayload, null, 2)}
                </pre>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Generate a token to see the final payload.</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200" role="region" aria-label="JWT header">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Header</p>
              <pre className="mt-2 min-h-[120px] whitespace-pre-wrap break-words text-sm text-slate-800">
                {decoded?.header?.json
                  ? JSON.stringify(decoded.header.json, null, 2)
                  : decoded?.header?.raw || "N/A"}
              </pre>
              {decoded?.header?.error ? (
                <p className="mt-2 text-xs font-medium text-amber-600">{decoded.header.error}</p>
              ) : null}
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.header) return;
                    const value = decoded.header.json ? JSON.stringify(decoded.header.json, null, 2) : decoded.header.raw;
                    navigator.clipboard.writeText(value);
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
                    const value = decoded.header.json ? JSON.stringify(decoded.header.json, null, 2) : decoded.header.raw;
                    const mime = decoded.header.json ? "application/json" : "text/plain";
                    const filename = decoded.header.json ? "jwt-header.json" : "jwt-header.txt";
                    const blob = new Blob([value], { type: mime });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = filename;
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
                {decoded?.payload?.json
                  ? JSON.stringify(decoded.payload.json, null, 2)
                  : decoded?.payload?.raw || "N/A"}
              </pre>
              {decoded?.payload?.error ? (
                <p className="mt-2 text-xs font-medium text-amber-600">{decoded.payload.error}</p>
              ) : null}
              <div className="mt-2 flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (!decoded?.payload) return;
                    const value = decoded.payload.json ? JSON.stringify(decoded.payload.json, null, 2) : decoded.payload.raw;
                    navigator.clipboard.writeText(value);
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
                    const value = decoded.payload.json ? JSON.stringify(decoded.payload.json, null, 2) : decoded.payload.raw;
                    const mime = decoded.payload.json ? "application/json" : "text/plain";
                    const filename = decoded.payload.json ? "jwt-payload.json" : "jwt-payload.txt";
                    const blob = new Blob([value], { type: mime });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = filename;
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
            Supports HS256, RS256, ES256, and EdDSA. Runs locally; do not use production secrets or keys here.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste or edit your payload JSON.</li>
          <li>Select an algorithm, then provide a secret or signing key; optionally set issuer, audience, issued-at, and expiry helpers.</li>
          <li>Generate the JWT, then copy or download the token or decoded parts.</li>
        </ol>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Local only?</strong> Yes. Signing happens in your browser; nothing is uploaded.</p>
          <p><strong>Algorithm?</strong> HS256, RS256, ES256, and EdDSA. For production use strong keys and proper verification.</p>
          <p><strong>Secrets?</strong> Use non-production secrets here; this is for local/debugging use.</p>
        </div>
      </div>
    </main>
  );
}
