"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sparkles } from "lucide-react";

const algorithms = [
  { id: "SHA-256", label: "SHA-256" },
  { id: "SHA-512", label: "SHA-512" },
  { id: "SHA-1", label: "SHA-1 (legacy / insecure)" },
] as const;
type AlgorithmId = (typeof algorithms)[number]["id"];
const MAX_CHARS = 100_000;
const AUTO_HASH_DEBOUNCE_MS = 300;

async function hashText(text: string, algorithm: AlgorithmId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

class HashError extends Error {
  code: "hmac-import";
  constructor(message: string) {
    super(message);
    this.code = "hmac-import";
  }
}

async function hmacText(text: string, secret: string, algorithm: AlgorithmId) {
  const encoder = new TextEncoder();
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: { name: algorithm },
      },
      false,
      ["sign"],
    );
  } catch {
    throw new HashError(
      `HMAC key import failed. ${algorithm} may not be supported for HMAC in this browser.`,
    );
  }
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(text));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function HashGeneratorClient() {
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState<AlgorithmId>("SHA-256");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isHashing, setIsHashing] = useState(false);
  const [autoHash, setAutoHash] = useState(false);
  const [mode, setMode] = useState<"hash" | "hmac">("hash");
  const [secret, setSecret] = useState("");
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getNextRequestId = () => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  };

  const isLatestRequest = (requestId: number) => requestId === requestIdRef.current;

  const runHash = async (text: string, alg: AlgorithmId, requestId: number) => {
    if (text.length === 0) {
      if (isLatestRequest(requestId)) {
        setError("Enter text to hash.");
        setStatus("Waiting for input");
      }
      return;
    }
    if (text.length > MAX_CHARS) {
      if (isLatestRequest(requestId)) {
        setError(`Input is too large (${text.length} chars). Please stay under ${MAX_CHARS.toLocaleString()} characters.`);
        setStatus("Input too large");
      }
      return;
    }
    if (mode === "hmac" && !secret.trim()) {
      if (isLatestRequest(requestId)) {
        setError("Enter a secret key for HMAC.");
        setStatus("Waiting for secret");
      }
      return;
    }
    if (isLatestRequest(requestId)) {
      setError("");
      setStatus("Hashing…");
      setIsHashing(true);
    }
    if (!crypto?.subtle) {
      if (isLatestRequest(requestId)) {
        setError("Web Crypto is unavailable in this browser, so hashing cannot run.");
        setOutput("");
        setStatus("Error");
        setIsHashing(false);
      }
      return;
    }
    try {
      const digest =
        mode === "hmac" ? await hmacText(text, secret, alg) : await hashText(text, alg);
      if (isLatestRequest(requestId)) {
        setOutput(digest);
        setStatus(mode === "hmac" ? "HMAC generated" : "Hash generated");
      }
    } catch (err) {
      console.error("Hash error", err);
      if (isLatestRequest(requestId)) {
        if (err instanceof HashError) {
          setError(err.message);
        } else if (err instanceof DOMException && err.name === "NotSupportedError") {
          setError(`The ${alg} algorithm is not supported in this browser.`);
        } else if (err instanceof DOMException && err.name === "DataError") {
          setError("HMAC setup failed due to an unsupported algorithm configuration.");
        } else {
          setError("Hashing failed due to an unexpected error.");
        }
        setOutput("");
        setStatus("Error");
      }
    } finally {
      if (isLatestRequest(requestId)) {
        setIsHashing(false);
      }
    }
  };

  const handleHash = async () => {
    const requestId = getNextRequestId();
    await runHash(input, algorithm, requestId);
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

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mode}-${algorithm.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSample = () => {
    const sample = "Hash this sample text for quick verification.";
    setInput(sample);
    setError("");
    setStatus("Sample loaded");
    setCopied(false);
    if (autoHash) {
      const requestId = getNextRequestId();
      runHash(sample, algorithm, requestId);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (!autoHash) return;
    if (input.length === 0 || input.length > MAX_CHARS) return;
    const requestId = getNextRequestId();
    debounceRef.current = setTimeout(() => {
      runHash(input, algorithm, requestId);
    }, AUTO_HASH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, algorithm, autoHash]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
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
              Hash Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Hash Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Hash text with SHA-256 or SHA-512 directly in your browser, plus SHA-1 for legacy use only. Copy the result instantly.
        </p>
        <p className="text-sm text-slate-600">Runs locally with Web Crypto; inputs are never uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Algorithm</span>
            <select
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as AlgorithmId)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {algorithms.map((alg) => (
                <option key={alg.id} value={alg.id}>
                  {alg.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Mode</span>
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as "hash" | "hmac");
                setStatus("Ready");
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="hash">Hash</option>
              <option value="hmac">HMAC</option>
            </select>
          </label>
          <button
            onClick={handleHash}
            disabled={isHashing}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {isHashing ? "Hashing..." : "Generate hash"}
          </button>
          <button
            onClick={handleSample}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Sparkles className="h-4 w-4" />
            Sample
          </button>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setError("");
              setStatus("Cleared");
              }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoHash}
              onChange={(event) => setAutoHash(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Auto-hash as you type
          </label>
        </div>
        {mode === "hmac" && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900" htmlFor="secret">
              HMAC secret (kept local)
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Enter secret key"
            />
          </div>
        )}
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Paste text to hash"
        />
        {error ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : (
          <div className="space-y-1 text-sm text-slate-600">
            <p>Tip: Hashing runs locally using Web Crypto. Keep input under {MAX_CHARS.toLocaleString()} characters for best performance.</p>
            {algorithm === "SHA-1" && (
              <p className="text-amber-700">
                SHA-1 is considered legacy/insecure. Use SHA-256 or SHA-512 for modern security needs.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="hash-output-label">
            Hash
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!output}
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre
          className="min-h-[140px] whitespace-pre-wrap break-words p-4 text-sm leading-relaxed text-slate-100"
          role="region"
          aria-labelledby="hash-output-label"
        >
          {output || "Hash output will appear here."}
        </pre>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is hashing done locally?</summary>
            <p className="mt-2 text-slate-700">
              Yes. We use the browser&apos;s Web Crypto API, so your text never leaves the page.
            </p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Which algorithms are supported?</summary>
            <p className="mt-2 text-slate-700">
              SHA-256 and SHA-512 are available, plus SHA-1 for legacy checks only. Copy or download the output as needed.
            </p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is there a size limit?</summary>
            <p className="mt-2 text-slate-700">
              Keep input under {MAX_CHARS.toLocaleString()} characters for best performance. Larger inputs may be blocked.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
