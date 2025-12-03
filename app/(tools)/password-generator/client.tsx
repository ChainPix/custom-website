"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

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

  const password = useMemo(() => generatePassword(settings), [settings]);

  const toggle = (key: FlagKey) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setCopied(false);
  };

  const handleLengthChange = (value: number) => {
    setSettings((prev) => ({ ...prev, length: Math.min(Math.max(value, 6), 64) }));
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
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
        <h1 className="text-3xl font-semibold text-slate-900">Password Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Build strong, random passwords with custom length and character sets. Generated locally
          for privacy.
        </p>
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
        </div>

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
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Generated password</p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="p-4 text-lg font-semibold tracking-wide text-slate-50">{password}</div>
      </div>
    </main>
  );
}
