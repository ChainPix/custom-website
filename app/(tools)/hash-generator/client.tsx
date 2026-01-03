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
const outputFormats = ["hex", "base64", "base64url"] as const;
type OutputFormat = (typeof outputFormats)[number];
const hexCases = ["lowercase", "uppercase"] as const;
type HexCase = (typeof hexCases)[number];

function bytesToHex(bytes: Uint8Array, hexCase: HexCase) {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return hexCase === "uppercase" ? hex.toUpperCase() : hex;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashText(text: string, algorithm: AlgorithmId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return new Uint8Array(hashBuffer);
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
  return new Uint8Array(signature);
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
  const [showSecret, setShowSecret] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("hex");
  const [hexCase, setHexCase] = useState<HexCase>("lowercase");
  const [expectedHash, setExpectedHash] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [salt, setSalt] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeCompare = (value: string) => {
    const trimmed = value.trim();
    if (outputFormat === "hex") {
      return trimmed.toLowerCase();
    }
    if (outputFormat === "base64url") {
      return trimmed.replace(/=+$/g, "");
    }
    return trimmed;
  };

  const formatOutput = (bytes: Uint8Array) => {
    if (outputFormat === "base64") {
      return bytesToBase64(bytes);
    }
    if (outputFormat === "base64url") {
      return bytesToBase64Url(bytes);
    }
    return bytesToHex(bytes, hexCase);
  };

  const buildInput = (text: string) => `${prefix}${text}${suffix}${salt}`;

  const buildCommand = (text: string, alg: AlgorithmId) => {
    const normalized = buildInput(text);
    const escaped = normalized.replace(/'/g, "'\\''");
    const algoMap: Record<AlgorithmId, string> = {
      "SHA-256": "256",
      "SHA-512": "512",
      "SHA-1": "1",
    };
    return `echo -n '${escaped}' | shasum -a ${algoMap[alg]}`;
  };

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
    const lines = batchMode ? text.split(/\r?\n/) : [text];
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
      const digests = [];
      for (const line of lines) {
        const payload = buildInput(line);
        const bytes =
          mode === "hmac" ? await hmacText(payload, secret, alg) : await hashText(payload, alg);
        digests.push(formatOutput(bytes));
      }
      if (isLatestRequest(requestId)) {
        setOutput(digests.join("\n"));
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
  }, [
    input,
    algorithm,
    autoHash,
    mode,
    secret,
    outputFormat,
    hexCase,
    batchMode,
    salt,
    prefix,
    suffix,
  ]);

  const comparisonLabel = (() => {
    if (!expectedHash.trim() || !output.trim()) return "Enter a hash to compare.";
    const matches = normalizeCompare(expectedHash) === normalizeCompare(output);
    return matches ? "✅ Match" : "❌ Mismatch";
  })();

  const canCopyCommand = mode === "hash" && !batchMode && input.length > 0;
  const compareDisabled = batchMode;

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
          <label className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Format</span>
            <select
              value={outputFormat}
              onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {outputFormats.map((format) => (
                <option key={format} value={format}>
                  {format.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          {outputFormat === "hex" && (
            <label className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Hex case</span>
              <select
                value={hexCase}
                onChange={(event) => setHexCase(event.target.value as HexCase)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {hexCases.map((hex) => (
                  <option key={hex} value={hex}>
                    {hex === "lowercase" ? "Lowercase" : "Uppercase"}
                  </option>
                ))}
              </select>
            </label>
          )}
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
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Security status</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
            SHA-256 ✅ recommended
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
            SHA-512 ✅ recommended
          </span>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-200">
            SHA-1 ⚠️ legacy
          </span>
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 ring-1 ring-rose-200">
            MD5 ❌ broken/insecure (not supported)
          </span>
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(event) => setBatchMode(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Batch (one hash per line)
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Prefix</span>
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Optional prefix"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Suffix</span>
            <input
              value={suffix}
              onChange={(event) => setSuffix(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Optional suffix"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Salt</span>
            <input
              value={salt}
              onChange={(event) => setSalt(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Optional salt"
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Salting appends extra data to your input. It helps reduce hash reuse across identical inputs, but it is not encryption
          and doesn&apos;t replace proper password hashing or key management.
        </p>
        {mode === "hmac" && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-900" htmlFor="secret">
              HMAC secret (kept local)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="secret"
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Enter secret key"
              />
              <button
                type="button"
                onClick={() => setShowSecret((prev) => !prev)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
              >
                {showSecret ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => setSecret("")}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
              >
                Clear secret
              </button>
            </div>
          </div>
        )}
        <textarea
          className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={batchMode ? "Paste one line per hash" : "Paste text to hash"}
        />
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-900" htmlFor="expected-hash">
            Compare against expected hash
          </label>
          <input
            id="expected-hash"
            value={expectedHash}
            onChange={(event) => setExpectedHash(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder={
              compareDisabled ? "Compare mode is disabled for batch hashing." : `Paste ${outputFormat.toUpperCase()} hash to compare`
            }
            disabled={compareDisabled}
          />
          <p className="text-sm text-slate-600">
            {compareDisabled ? "Compare is available for single-hash mode only." : comparisonLabel}
          </p>
        </div>
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
            {batchMode ? "Hashes" : "Hash"}
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
              {copied ? "Copied" : "Copy hash"}
            </button>
            <button
              onClick={async () => {
                if (!canCopyCommand) return;
                try {
                  await navigator.clipboard.writeText(buildCommand(input, algorithm));
                  setStatus("Command copied");
                } catch (err) {
                  console.error("Copy failed", err);
                }
              }}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
              disabled={!canCopyCommand}
            >
              <Clipboard className="h-4 w-4" />
              Copy command
            </button>
          </div>
        </div>
        {!canCopyCommand && (
          <p className="px-4 pb-3 text-xs text-slate-300">
            Copy command is available for single-line hash mode only.
          </p>
        )}
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
