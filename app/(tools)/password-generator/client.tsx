"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Eye, EyeOff, RefreshCcw, Wand2 } from "lucide-react";

type Settings = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

const defaultSettings: Settings = {
  length: 16,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
};

const symbols = "!@#$%^&*()-_=+[]{};:,.<>?/|";

type FlagKey = Exclude<keyof Settings, "length">;

function generatePassword(settings: Settings) {
  let pool = "";
  if (settings.lowercase) pool += "abcdefghijklmnopqrstuvwxyz";
  if (settings.uppercase) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (settings.numbers) pool += "0123456789";
  if (settings.symbols) pool += symbols;
  if (!pool) return "";

  const chars = Array.from({ length: settings.length }, () => {
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx] ?? "";
  });
  return chars.join("");
}

export default function PasswordGeneratorClient() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [nonce, setNonce] = useState(0);
  const [showPassword, setShowPassword] = useState(true);

  const password = useMemo(() => generatePassword(settings), [settings, nonce]);

  const poolSize = useMemo(() => {
    let size = 0;
    if (settings.lowercase) size += 26;
    if (settings.uppercase) size += 26;
    if (settings.numbers) size += 10;
    if (settings.symbols) size += symbols.length;
    return size;
  }, [settings.lowercase, settings.uppercase, settings.numbers, settings.symbols]);

  const entropy = useMemo(() => {
    if (!poolSize) return 0;
    return Math.round(settings.length * Math.log2(poolSize));
  }, [poolSize, settings.length]);

  const strengthLabel = useMemo(() => {
    if (entropy < 40) return "Weak";
    if (entropy < 60) return "Moderate";
    if (entropy < 80) return "Strong";
    return "Very strong";
  }, [entropy]);

  useEffect(() => {
    const anySelected = settings.lowercase || settings.uppercase || settings.numbers || settings.symbols;
    if (!anySelected) {
      setError("Select at least one character set.");
      setStatus("Awaiting character set selection");
    } else {
      setError("");
      setStatus("Ready");
    }
  }, [settings.lowercase, settings.uppercase, settings.numbers, settings.symbols]);

  const toggle = (key: FlagKey) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setCopied(false);
    setStatus("Updated options");
  };

  const handleLengthChange = (value: number) => {
    setSettings((prev) => ({ ...prev, length: Math.min(Math.max(value, 6), 64) }));
    setCopied(false);
    setStatus("Updated length");
  };

  const handleCopy = async () => {
    if (!password) {
      setStatus("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setStatus("Copied");
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const regenerate = () => {
    setNonce((prev) => prev + 1);
    setCopied(false);
    setStatus("Regenerated");
  };

  const applyPreset = (preset: "strong" | "maximum" | "memorable") => {
    if (preset === "strong") {
      setSettings({ length: 16, lowercase: true, uppercase: true, numbers: true, symbols: true });
    } else if (preset === "maximum") {
      setSettings({ length: 24, lowercase: true, uppercase: true, numbers: true, symbols: true });
    } else {
      // memorable/symbol-light
      setSettings({ length: 20, lowercase: true, uppercase: true, numbers: true, symbols: false });
    }
    setNonce((prev) => prev + 1);
    setCopied(false);
    setStatus(`Preset applied: ${preset}`);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {error}
      </div>
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline underline-offset-4">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">Password Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Build strong, random passwords with custom length and character sets. Generated locally
          for privacy.
        </p>
        <p className="text-sm text-slate-600">All generation runs client-side; nothing leaves your browser.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Length</span>
            <input
              type="range"
              min={6}
              max={64}
              value={settings.length}
              onChange={(event) => handleLengthChange(Number(event.target.value))}
              className="accent-slate-900"
              aria-label="Password length"
            />
            <span className="w-10 text-right font-semibold text-slate-900">{settings.length}</span>
          </div>
          <button
            onClick={() => setSettings(defaultSettings)}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={regenerate}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
          >
            Shuffle
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
          <button
            onClick={() => applyPreset("strong")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Wand2 className="h-4 w-4" />
            Strong (16, all sets)
          </button>
          <button
            onClick={() => applyPreset("maximum")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Wand2 className="h-4 w-4" />
            Maximum (24, all sets)
          </button>
          <button
            onClick={() => applyPreset("memorable")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Wand2 className="h-4 w-4" />
            Memorable (20, no symbols)
          </button>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-900">Character sets</legend>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {(["lowercase", "uppercase", "numbers", "symbols"] as FlagKey[]).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 accent-slate-900"
                />
                <span className="capitalize font-medium text-slate-900">{key}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        )}
        {!error && (
          <div className="space-y-1 text-sm text-slate-600">
            <p>Passwords are generated locally; nothing is uploaded.</p>
            <p className="font-medium text-slate-800">
              Strength: {strengthLabel} ({entropy} bits est.)
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="password-output-label">
            Generated password
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-60"
            disabled={!password || Boolean(error)}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div
          className="p-4 text-lg font-semibold tracking-wide text-slate-50"
          role="region"
          aria-labelledby="password-output-label"
        >
          {password
            ? showPassword
              ? password
              : "•".repeat(password.length)
            : "Select at least one character set to generate a password."}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button
            onClick={regenerate}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-60"
            disabled={Boolean(error)}
          >
            Regenerate
          </button>
          <button
            onClick={() => setShowPassword((prev) => !prev)}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick a length (6–64) and toggle the character sets you need.</li>
          <li>Use presets for quick starts: Strong (16), Maximum (24), or Memorable (20, no symbols).</li>
          <li>Check the strength label to ensure your settings meet your security needs.</li>
          <li>Copy or hide/show the password before using it; regenerate until satisfied.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is this tool private?</summary>
            <p className="mt-2 text-slate-700">Yes. Everything happens in your browser; nothing is sent to a server.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">What makes a strong password?</summary>
            <p className="mt-2 text-slate-700">Use longer lengths (16+), include all character sets, and avoid reusing passwords across sites.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I see or hide the password?</summary>
            <p className="mt-2 text-slate-700">Yes. Use the Show/Hide toggle to obscure the output before copying.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
