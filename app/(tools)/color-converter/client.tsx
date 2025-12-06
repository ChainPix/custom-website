"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

type Color = {
  hex: string;
  rgb: string;
  hsl: string;
};

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  if (![3, 6].includes(clean.length)) return null;
  const normalized = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(normalized, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number) {
  h /= 360;
  s /= 100;
  l /= 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function parseRgb(text: string) {
  const match = text.match(/rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i);
  if (!match) return null;
  const [r, g, b] = match.slice(1).map((n) => Number(n));
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

function parseHsl(text: string) {
  const match = text.match(/hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)/i);
  if (!match) return null;
  const [h, s, l] = match.slice(1).map((n) => Number(n));
  if ([h, s, l].some((n) => Number.isNaN(n))) return null;
  return { h, s, l };
}

function computeColor(input: string): Color | null {
  const trimmed = input.trim();
  const hexMatch = trimmed.match(/^#?[0-9a-fA-F]{3,6}$/);
  if (hexMatch) {
    const rgb = hexToRgb(trimmed);
    if (!rgb) return null;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return {
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    };
  }

  const rgbParsed = parseRgb(trimmed);
  if (rgbParsed) {
    const hsl = rgbToHsl(rgbParsed.r, rgbParsed.g, rgbParsed.b);
    return {
      hex: rgbToHex(rgbParsed.r, rgbParsed.g, rgbParsed.b),
      rgb: `rgb(${rgbParsed.r}, ${rgbParsed.g}, ${rgbParsed.b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    };
  }

  const hslParsed = parseHsl(trimmed);
  if (hslParsed) {
    const rgb = hslToRgb(hslParsed.h, hslParsed.s, hslParsed.l);
    return {
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      hsl: `hsl(${hslParsed.h}, ${hslParsed.s}%, ${hslParsed.l}%)`,
    };
  }

  return null;
}

export default function ColorConverterClient() {
  const [input, setInput] = useState("#2563eb");
  const [color, setColor] = useState<Color | null>(() => computeColor("#2563eb"));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<keyof Color | null>(null);
  const [status, setStatus] = useState("Ready");
  const [trimInput, setTrimInput] = useState(true);
  const [uppercaseHex, setUppercaseHex] = useState(true);

  const cleanedInput = useMemo(() => (trimInput ? input.trim() : input), [input, trimInput]);

  const handleCopy = async (value: string, key: keyof Color) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleChange = (value: string) => {
    setInput(value);
    const parsed = computeColor(trimInput ? value.trim() : value);
    setColor(parsed);
    setCopied(null);
    if (parsed) {
      const next = uppercaseHex ? { ...parsed, hex: parsed.hex.toUpperCase() } : parsed;
      setColor(next);
      setError("");
      setStatus("Converted");
    } else {
      setError("Invalid color format. Try hex (#2563eb), rgb(37, 99, 235), or hsl(221, 79%, 53%).");
      setStatus("Invalid input");
    }
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
        <h1 className="text-3xl font-semibold text-slate-900">Color Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert between HEX, RGB, and HSL formats with live preview. Paste any format and copy all
          outputs.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(event) => handleChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 md:w-2/3"
            placeholder="Enter color (e.g., #2563eb, rgb(37,99,235), hsl(221,79%,53%))"
            aria-label="Color input"
          />
          <button
            onClick={() => {
              handleChange("#2563eb");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Reset to default color"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={() => handleChange("#14b8a6")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            aria-label="Load sample color"
          >
            <RefreshCcw className="h-4 w-4" />
            Sample
          </button>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={trimInput}
              onChange={(e) => handleChange(e.target.checked ? input.trim() : input)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Trim input
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={uppercaseHex}
              onChange={(e) => {
                setUppercaseHex(e.target.checked);
                if (color) {
                  setColor({ ...color, hex: e.target.checked ? color.hex.toUpperCase() : color.hex.toLowerCase() });
                }
              }}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Uppercase hex
          </label>
        </div>
        {!color ? (
          <p className="text-sm font-medium text-amber-600" role="alert">
            {error}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200" role="region" aria-label="Color preview">
              <div className="h-32 rounded-xl border border-slate-200 shadow-inner" style={{ background: color.hex }} />
              <p className="text-sm text-slate-600">Live preview</p>
            </div>
            <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              {(["hex", "rgb", "hsl"] as Array<keyof Color>).map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-200"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{key.toUpperCase()}</p>
                    <p className="font-semibold text-slate-900">{color[key]}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(color[key], key)}
                    className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copied === key ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    {copied === key ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
