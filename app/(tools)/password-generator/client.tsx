"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Eye, EyeOff, RefreshCcw, Wand2 } from "lucide-react";
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import { dictionary, translations } from "@zxcvbn-ts/language-en";

import { generateOutput, symbols, type Settings } from "./generate";

const defaultSettings: Settings = {
  length: 16,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
  enforceSets: false,
  mode: "password",
  wordCount: 4,
  separator: "-",
  capitalize: false,
  numberSuffix: true,
};


type FlagKey = "lowercase" | "uppercase" | "numbers" | "symbols";


zxcvbnOptions.setOptions({
  translations,
  dictionary,
});

const sourceFilePath = "app/(tools)/password-generator/client.tsx";
const sourceUrlBase = process.env.NEXT_PUBLIC_REPO_URL ?? "";
const sourceUrl = sourceUrlBase ? `${sourceUrlBase}/blob/main/${sourceFilePath}` : "";

export default function PasswordGeneratorClient() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const [nonce, setNonce] = useState(0);
  const [showPassword, setShowPassword] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [bulkResults, setBulkResults] = useState<string[]>([]);
  const [bulkCount, setBulkCount] = useState(10);
  const lastGeneratedRef = useRef<string>("");
  const [generated, setGenerated] = useState("");
  const [isShuffling, setIsShuffling] = useState(false);
  const [copyPulse, setCopyPulse] = useState(false);
  const [strengthPulse, setStrengthPulse] = useState(false);

  useEffect(() => {
    if (!isMounted) return;
    setGenerated(generateOutput(settings));
  }, [isMounted, settings, nonce]);

  const poolSize = useMemo(() => {
    if (settings.mode !== "password") return 0;
    let size = 0;
    if (settings.lowercase) size += 26;
    if (settings.uppercase) size += 26;
    if (settings.numbers) size += 10;
    if (settings.symbols) size += symbols.length;
    return size;
  }, [settings.mode, settings.lowercase, settings.uppercase, settings.numbers, settings.symbols]);

  const entropy = useMemo(() => {
    if (!poolSize) return 0;
    return Math.round(settings.length * Math.log2(poolSize));
  }, [poolSize, settings.length]);

  const strengthLabel = useMemo(() => {
    if (settings.mode !== "password") return "Passphrase";
    if (entropy < 40) return "Weak";
    if (entropy < 60) return "Moderate";
    if (entropy < 80) return "Strong";
    return "Very strong";
  }, [entropy, settings.mode]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const analysis = useMemo(() => {
    if (!isMounted || !generated || error) return null;
    return zxcvbn(generated);
  }, [isMounted, generated, error]);

  const crackTime = analysis?.crackTimesDisplay.offlineFastHashing1e10PerSecond;
  const score = analysis?.score ?? 0;
  const meterWidth = `${((score + 1) / 5) * 100}%`;
  const meterColor =
    score >= 4
      ? "bg-sky-500"
      : score >= 3
        ? "bg-emerald-500"
        : score >= 2
          ? "bg-yellow-500"
          : score >= 1
            ? "bg-orange-500"
            : "bg-rose-500";
  const outputLabel = settings.mode === "passphrase" ? "Generated passphrase" : "Generated password";

  useEffect(() => {
    if (!analysis) return;
    setStrengthPulse(true);
    const timer = setTimeout(() => setStrengthPulse(false), 350);
    return () => clearTimeout(timer);
  }, [analysis?.score]);

  useEffect(() => {
    if (settings.mode !== "password") {
      setError("");
      setStatus("Ready");
      return;
    }
    const anySelected = settings.lowercase || settings.uppercase || settings.numbers || settings.symbols;
    const requiredSets = [settings.lowercase, settings.uppercase, settings.numbers, settings.symbols].filter(Boolean)
      .length;

    if (!anySelected) {
      setError("Select at least one character set.");
      setStatus("Awaiting character set selection");
    } else if (settings.enforceSets && settings.length < requiredSets) {
      setError("Increase length to include each selected character set.");
      setStatus("Length too short for strict mode");
    } else {
      setError("");
      setStatus("Ready");
    }
  }, [
    settings.lowercase,
    settings.uppercase,
    settings.numbers,
    settings.symbols,
    settings.enforceSets,
    settings.length,
    settings.mode,
  ]);

  useEffect(() => {
    if (!generated || error) return;
    if (lastGeneratedRef.current === generated) return;
    lastGeneratedRef.current = generated;
    setHistory((prev) => [generated, ...prev].slice(0, 10));
  }, [generated, error]);

  useEffect(() => {
    if (!isMounted) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
          return;
        }
      }
      const key = event.key.toLowerCase();
      if (key === "r") {
        event.preventDefault();
        setNonce((prev) => prev + 1);
        setCopied(false);
        setStatus("Regenerated");
        setIsShuffling(true);
        setTimeout(() => setIsShuffling(false), 350);
      }
      if (key === "c") {
        event.preventDefault();
        if (!generated) return;
        copyValue(generated);
      }
      if (key === "h") {
        event.preventDefault();
        setShowPassword((prev) => !prev);
        setStatus("Toggled visibility");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMounted, generated]);

  const toggle = (key: FlagKey) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setCopied(false);
    setStatus("Updated options");
  };

  const toggleEnforceSets = () => {
    setSettings((prev) => ({ ...prev, enforceSets: !prev.enforceSets }));
    setCopied(false);
    setStatus("Updated strict mode");
  };

  const handleLengthChange = (value: number) => {
    setSettings((prev) => ({ ...prev, length: Math.min(Math.max(value, 6), 64) }));
    setCopied(false);
    setStatus("Updated length");
  };

  const handleWordCountChange = (value: number) => {
    setSettings((prev) => ({ ...prev, wordCount: Math.min(Math.max(value, 3), 8) }));
    setCopied(false);
    setStatus("Updated word count");
  };

  const handleSeparatorChange = (value: string) => {
    setSettings((prev) => ({ ...prev, separator: value }));
    setCopied(false);
    setStatus("Updated separator");
  };

  const toggleCapitalize = () => {
    setSettings((prev) => ({ ...prev, capitalize: !prev.capitalize }));
    setCopied(false);
    setStatus("Updated capitalization");
  };

  const toggleNumberSuffix = () => {
    setSettings((prev) => ({ ...prev, numberSuffix: !prev.numberSuffix }));
    setCopied(false);
    setStatus("Updated number suffix");
  };

  const copyValue = async (value: string) => {
    if (!value) {
      setStatus("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setStatus("Copied");
      setCopyPulse(true);
      setTimeout(() => setCopied(false), 1200);
      setTimeout(() => setCopyPulse(false), 300);
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleCopy = async () => {
    await copyValue(generated);
  };

  const regenerate = () => {
    setNonce((prev) => prev + 1);
    setCopied(false);
    setStatus("Regenerated");
    setIsShuffling(true);
    setTimeout(() => setIsShuffling(false), 350);
  };

  const generateBulk = () => {
    if (error) {
      setStatus("Fix settings before bulk generation");
      return;
    }
    const next = Array.from({ length: bulkCount }, () => generateOutput(settings));
    setBulkResults(next);
    setStatus(`Generated ${bulkCount}`);
  };

  const exportBulk = (format: "txt" | "csv" | "json") => {
    if (!bulkResults.length) {
      setStatus("Nothing to export");
      return;
    }
    const baseName = settings.mode === "passphrase" ? "passphrases" : "passwords";
    let content = "";
    let mime = "text/plain";
    if (format === "json") {
      content = JSON.stringify(bulkResults, null, 2);
      mime = "application/json";
    } else if (format === "csv") {
      const rows = bulkResults.map((item) => `"${item.replace(/"/g, "\"\"")}"`);
      content = ["value", ...rows].join("\n");
      mime = "text/csv";
    } else {
      content = bulkResults.join("\n");
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Exported ${format.toUpperCase()}`);
  };

  const applyPreset = (preset: "strong" | "maximum" | "memorable") => {
    if (preset === "strong") {
      setSettings((prev) => ({
        length: 16,
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: true,
        enforceSets: prev.enforceSets,
        mode: "password",
        wordCount: prev.wordCount,
        separator: prev.separator,
        capitalize: prev.capitalize,
        numberSuffix: prev.numberSuffix,
      }));
    } else if (preset === "maximum") {
      setSettings((prev) => ({
        length: 24,
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: true,
        enforceSets: prev.enforceSets,
        mode: "password",
        wordCount: prev.wordCount,
        separator: prev.separator,
        capitalize: prev.capitalize,
        numberSuffix: prev.numberSuffix,
      }));
    } else {
      // memorable/symbol-light
      setSettings((prev) => ({
        length: 20,
        lowercase: true,
        uppercase: true,
        numbers: true,
        symbols: false,
        enforceSets: prev.enforceSets,
        mode: "password",
        wordCount: prev.wordCount,
        separator: prev.separator,
        capitalize: prev.capitalize,
        numberSuffix: prev.numberSuffix,
      }));
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
              Password Generator
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Password Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Build strong, random passwords with custom length and character sets. Generated locally
          for privacy.
        </p>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Uses cryptographically secure randomness (Web Crypto API)
        </span>
        <p className="text-sm text-slate-600">All generation runs client-side; nothing leaves your browser.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-900">Mode</span>
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => {
                setSettings((prev) => ({ ...prev, mode: "password" }));
                setStatus("Mode: password");
              }}
              className={`rounded-full px-3 py-1 transition ${
                settings.mode === "password" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Password
            </button>
            <button
              onClick={() => {
                setSettings((prev) => ({ ...prev, mode: "passphrase" }));
                setStatus("Mode: passphrase");
              }}
              className={`rounded-full px-3 py-1 transition ${
                settings.mode === "passphrase" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Passphrase
            </button>
          </div>
          <div className="group relative text-xs text-slate-500">
            <span className="cursor-help rounded-full border border-slate-200 px-2 py-1">Keyboard shortcuts</span>
            <div className="absolute right-0 top-full z-10 mt-2 hidden w-56 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg group-hover:block">
              <p className="font-semibold text-slate-900">Shortcuts</p>
              <p>R: Regenerate</p>
              <p>C: Copy</p>
              <p>H: Hide/Show</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {settings.mode === "password" ? (
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
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Words</span>
              <input
                type="range"
                min={3}
                max={8}
                value={settings.wordCount}
                onChange={(event) => handleWordCountChange(Number(event.target.value))}
                className="accent-slate-900"
                aria-label="Passphrase word count"
              />
              <span className="w-10 text-right font-semibold text-slate-900">{settings.wordCount}</span>
            </div>
          )}
          <button
            onClick={() => setSettings(defaultSettings)}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={regenerate}
            className={`rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 ${isShuffling ? "animate-pulse" : ""}`}
          >
            Shuffle
          </button>
        </div>

        {settings.mode === "password" ? (
          <>
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
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.enforceSets}
                onChange={toggleEnforceSets}
                className="h-4 w-4 accent-slate-900"
              />
              <span className="font-medium text-slate-900">Enforce at least one character from each selected set</span>
            </label>
            <p className="text-xs text-slate-500">
              Strict mode requires the length to be at least the number of selected sets.
            </p>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Separator</span>
              <input
                type="text"
                value={settings.separator}
                onChange={(event) => handleSeparatorChange(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="-"
              />
            </label>
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.capitalize}
                  onChange={toggleCapitalize}
                  className="h-4 w-4 accent-slate-900"
                />
                <span className="font-medium text-slate-900">Capitalize words</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.numberSuffix}
                  onChange={toggleNumberSuffix}
                  className="h-4 w-4 accent-slate-900"
                />
                <span className="font-medium text-slate-900">Add number suffix</span>
              </label>
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        )}
        {!error && (
          <div className="space-y-1 text-sm text-slate-600">
            <p>Passwords are generated locally; nothing is uploaded.</p>
            <p className="font-medium text-slate-800">
              Strength: {strengthLabel}
              {settings.mode === "password" ? ` (${entropy} bits est.)` : ""}
            </p>
            {analysis && (
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${meterColor} transition-all duration-500 ease-out ${strengthPulse ? "animate-pulse" : ""}`}
                    style={{ width: meterWidth }}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Time to crack (fast offline hash): ~{crackTime}
                </p>
                {analysis.feedback.warning && (
                  <p className="text-xs font-medium text-amber-700">
                    {analysis.feedback.warning}
                  </p>
                )}
                {analysis.feedback.suggestions.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {analysis.feedback.suggestions.join(" ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold" id="password-output-label">
            {outputLabel}
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-60"
            disabled={!generated || Boolean(error)}
          >
            {copied ? (
              <Check className={`h-4 w-4 transition-transform duration-200 ${copyPulse ? "scale-125" : "scale-100"}`} />
            ) : (
              <Clipboard className={`h-4 w-4 transition-transform duration-200 ${copyPulse ? "scale-125" : "scale-100"}`} />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div
          className="p-4 text-lg font-semibold tracking-wide text-slate-50"
          role="region"
          aria-labelledby="password-output-label"
        >
          {generated
            ? showPassword
              ? generated
              : "â€¢".repeat(generated.length)
            : settings.mode === "password"
              ? "Select at least one character set to generate a password."
              : "Adjust passphrase settings to generate a passphrase."}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-4 py-3">
          <button
            onClick={regenerate}
            className={`rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-60 ${isShuffling ? "animate-pulse" : ""}`}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent history</h2>
            <span className="text-xs text-slate-500">Session only</span>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Generate a few items to build a history.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  onClick={() => copyValue(item)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-300"
                >
                  <span className="truncate font-medium text-slate-900">{item}</span>
                  <span className="text-xs text-slate-500">Click to copy</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Bulk generation</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Count</span>
              <select
                value={bulkCount}
                onChange={(event) => setBulkCount(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
            <button
              onClick={generateBulk}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5"
            >
              Generate
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
            <span className="font-semibold text-slate-900">Export</span>
            <button
              onClick={() => exportBulk("txt")}
              className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              .txt
            </button>
            <button
              onClick={() => exportBulk("csv")}
              className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              .csv
            </button>
            <button
              onClick={() => exportBulk("json")}
              className="rounded-full bg-white px-3 py-1.5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              .json
            </button>
          </div>
          {bulkResults.length === 0 ? (
            <p className="text-sm text-slate-500">Generate a batch to preview and export.</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
              {bulkResults.map((item, index) => (
                <div key={`${item}-${index}`} className="truncate">
                  {item}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Switch between Password and Passphrase mode based on your needs.</li>
          <li>Pick a length (6-64) and toggle the character sets you need.</li>
          <li>Use presets for quick starts: Strong (16), Maximum (24), or Memorable (20, no symbols).</li>
          <li>Generate in bulk for QA or admin workflows and export in TXT, CSV, or JSON.</li>
          <li>Copy or hide/show the output before using it; regenerate until satisfied.</li>
        </ul>
      </section>

      <section className="space-y-6 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">Mini-guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <h3 className="text-base font-semibold text-slate-900">How long should a password be in 2025?</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Everyday accounts: 14-16 characters.</li>
              <li>High-value or admin accounts: 20+ characters.</li>
              <li>Length beats extra symbols for real-world strength.</li>
            </ul>
          </article>
          <article className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Password vs passphrase</h3>
            <p className="text-sm text-slate-700">
              Passwords are compact and work well when length is limited. Passphrases are easier to remember, scale to
              longer lengths, and are ideal for shared or personal accounts.
            </p>
          </article>
          <article className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Why entropy matters</h3>
            <p className="text-sm text-slate-700">
              Entropy estimates the search space an attacker must try. More unique characters and more length increase
              entropy and make offline cracking vastly harder.
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">What this tool does NOT do</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>No network calls.</li>
            <li>No analytics on password content.</li>
            <li>No storage.</li>
            <li>No logging.</li>
          </ul>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <h3 className="text-base font-semibold text-slate-900">Open auditability</h3>
          <p>
            Source file:{" "}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-slate-900 underline underline-offset-4"
              >
                {sourceFilePath}
              </a>
            ) : (
              <span className="font-mono text-xs text-slate-900">{sourceFilePath}</span>
            )}
          </p>
          <p>
            Generation functions:{" "}
            <span className="font-mono text-xs text-slate-900">
              generateOutput(), generatePassword(), generatePassphrase()
            </span>
          </p>
          <p className="text-xs text-slate-500">Auditable in under 2 minutes.</p>
        </div>
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
            <summary className="cursor-pointer font-medium text-slate-900">How long should a password be in 2025?</summary>
            <p className="mt-2 text-slate-700">Aim for 14-16 characters for most accounts and 20+ for critical or admin access.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Password vs passphrase: which should I use?</summary>
            <p className="mt-2 text-slate-700">Passphrases are easier to remember and can be longer. Passwords are compact and fit strict length limits.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I generate multiple passwords at once?</summary>
            <p className="mt-2 text-slate-700">Yes. Use Bulk generation to create 10, 50, or 100 items and export as TXT, CSV, or JSON.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I see or hide the password?</summary>
            <p className="mt-2 text-slate-700">Yes. Use the Show/Hide toggle to obscure the output before copying.</p>
          </details>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Related tools</h2>
        <p className="text-sm text-slate-700">
          Keep your security workflow in one place with these complementary tools:
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/uuid-generator"
            className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-900"
          >
            UUID Generator
          </Link>
          <Link
            href="/hash-generator"
            className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-900"
          >
            Hash Generator
          </Link>
          <Link
            href="/nanoid-generator"
            className="rounded-full bg-white px-4 py-1.5 font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-900"
          >
            NanoID Generator
          </Link>
        </div>
      </section>
    </main>
  );
}
