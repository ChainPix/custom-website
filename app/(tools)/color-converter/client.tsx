"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import colorName from "color-name";

type Color = {
  hex: string;
  rgb: string;
  hsl: string;
  rgba: string;
  hsla: string;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type ContrastResult = {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
};

type NamedColor = {
  name: string;
  hex: string;
  rgb: Rgb;
};

const WHITE_RGB: Rgb = { r: 255, g: 255, b: 255 };
const BLACK_RGB: Rgb = { r: 0, g: 0, b: 0 };

const PALETTE_SCALE = [
  { key: 50, delta: 40 },
  { key: 100, delta: 32 },
  { key: 200, delta: 24 },
  { key: 300, delta: 16 },
  { key: 400, delta: 8 },
  { key: 500, delta: 0 },
  { key: 600, delta: -8 },
  { key: 700, delta: -16 },
  { key: 800, delta: -24 },
  { key: 900, delta: -32 },
] as const;

const CSS_NAMED_COLORS: NamedColor[] = Object.entries(
  colorName as Record<string, [number, number, number]>
).map(([name, rgb]) => ({
  name,
  rgb: { r: rgb[0], g: rgb[1], b: rgb[2] },
  hex: `#${[rgb[0], rgb[1], rgb[2]]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase(),
}));

const TAILWIND_BASE = [
  { name: "slate-500", hex: "#64748B" },
  { name: "gray-500", hex: "#6B7280" },
  { name: "zinc-500", hex: "#71717A" },
  { name: "neutral-500", hex: "#737373" },
  { name: "stone-500", hex: "#78716C" },
  { name: "red-500", hex: "#EF4444" },
  { name: "orange-500", hex: "#F97316" },
  { name: "amber-500", hex: "#F59E0B" },
  { name: "yellow-500", hex: "#EAB308" },
  { name: "lime-500", hex: "#84CC16" },
  { name: "green-500", hex: "#22C55E" },
  { name: "emerald-500", hex: "#10B981" },
  { name: "teal-500", hex: "#14B8A6" },
  { name: "cyan-500", hex: "#06B6D4" },
  { name: "sky-500", hex: "#0EA5E9" },
  { name: "blue-500", hex: "#3B82F6" },
  { name: "indigo-500", hex: "#6366F1" },
  { name: "violet-500", hex: "#8B5CF6" },
  { name: "purple-500", hex: "#A855F7" },
  { name: "fuchsia-500", hex: "#D946EF" },
  { name: "pink-500", hex: "#EC4899" },
  { name: "rose-500", hex: "#F43F5E" },
] as const;

const TAILWIND_COLORS: NamedColor[] = TAILWIND_BASE.map((entry) => {
  const rgb = hexToRgb(entry.hex);
  return {
    name: entry.name,
    hex: entry.hex.toUpperCase(),
    rgb: rgb ?? { r: 0, g: 0, b: 0 },
  };
});

function rotateHue(hue: number, delta: number) {
  const next = (hue + delta) % 360;
  return next < 0 ? next + 360 : next;
}

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

function srgbToLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: Rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: Rgb, background: Rgb) {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getContrastResult(foreground: Rgb, background: Rgb): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

function findNearestLightnessForContrast(
  hue: number,
  saturation: number,
  lightness: number,
  background: Rgb,
  targetRatio = 4.5
) {
  let bestLightness: number | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (let next = 0; next <= 100; next += 1) {
    const rgb = hslToRgb(hue, saturation, next);
    if (contrastRatio(rgb, background) >= targetRatio) {
      const delta = Math.abs(next - lightness);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestLightness = next;
      }
    }
  }

  return bestLightness;
}

function colorDistance(a: Rgb, b: Rgb) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function findNearestColor(target: Rgb, palette: NamedColor[]) {
  let best = palette[0];
  let bestDistance = colorDistance(target, best.rgb);

  for (let i = 1; i < palette.length; i += 1) {
    const candidate = palette[i];
    const distance = colorDistance(target, candidate.rgb);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}

function StatusPill({ pass }: { pass: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        pass ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
      }`}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  );
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
      rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`,
    };
  }

  const rgbParsed = parseRgb(trimmed);
  if (rgbParsed) {
    const hsl = rgbToHsl(rgbParsed.r, rgbParsed.g, rgbParsed.b);
    return {
      hex: rgbToHex(rgbParsed.r, rgbParsed.g, rgbParsed.b),
      rgb: `rgb(${rgbParsed.r}, ${rgbParsed.g}, ${rgbParsed.b})`,
      hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      rgba: `rgba(${rgbParsed.r}, ${rgbParsed.g}, ${rgbParsed.b}, 1)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`,
    };
  }

  const hslParsed = parseHsl(trimmed);
  if (hslParsed) {
    const rgb = hslToRgb(hslParsed.h, hslParsed.s, hslParsed.l);
    return {
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      hsl: `hsl(${hslParsed.h}, ${hslParsed.s}%, ${hslParsed.l}%)`,
      rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
      hsla: `hsla(${hslParsed.h}, ${hslParsed.s}%, ${hslParsed.l}%, 1)`,
    };
  }

  return null;
}

export default function ColorConverterClient() {
  const [input, setInput] = useState("#2563eb");
  const [color, setColor] = useState<Color | null>(() => computeColor("#2563eb"));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<keyof Color | null>(null);
  const [copiedExport, setCopiedExport] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready");
  const [trimInput, setTrimInput] = useState(true);
  const [uppercaseHex, setUppercaseHex] = useState(true);
  const [alpha, setAlpha] = useState(100);

  const cleanedInput = useMemo(() => (trimInput ? input.trim() : input), [input, trimInput]);
  const baseRgb = useMemo(() => (color ? hexToRgb(color.hex) : null), [color]);
  const contrastData = useMemo(() => {
    if (!baseRgb) return null;
    return {
      white: getContrastResult(baseRgb, WHITE_RGB),
      black: getContrastResult(baseRgb, BLACK_RGB),
    };
  }, [baseRgb]);

  const nearestNames = useMemo(() => {
    if (!baseRgb) return null;
    return {
      css: findNearestColor(baseRgb, CSS_NAMED_COLORS),
      tailwind: findNearestColor(baseRgb, TAILWIND_COLORS),
    };
  }, [baseRgb]);

  const paletteData = useMemo(() => {
    if (!color) return null;
    const hsl = parseHsl(color.hsl);
    if (!hsl) return null;
    const baseRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    const baseHex = rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b);
    const scale = PALETTE_SCALE.map((stop) => {
      const nextL = clamp(hsl.l + stop.delta, 0, 100);
      const rgb = hslToRgb(hsl.h, hsl.s, nextL);
      return { key: stop.key, hex: rgbToHex(rgb.r, rgb.g, rgb.b) };
    });
    const complementaryRgb = hslToRgb(rotateHue(hsl.h, 180), hsl.s, hsl.l);
    const triadicRgb = [
      hslToRgb(rotateHue(hsl.h, 120), hsl.s, hsl.l),
      hslToRgb(rotateHue(hsl.h, 240), hsl.s, hsl.l),
    ];
    const analogousRgb = [
      hslToRgb(rotateHue(hsl.h, -30), hsl.s, hsl.l),
      hslToRgb(rotateHue(hsl.h, 30), hsl.s, hsl.l),
    ];
    return {
      base: baseHex,
      complementary: rgbToHex(complementaryRgb.r, complementaryRgb.g, complementaryRgb.b),
      triadic: triadicRgb.map((rgb) => rgbToHex(rgb.r, rgb.g, rgb.b)),
      analogous: analogousRgb.map((rgb) => rgbToHex(rgb.r, rgb.g, rgb.b)),
      scale,
    };
  }, [color]);

  const exportBlocks = useMemo(() => {
    if (!paletteData) return null;
    const scaleMap: Record<string, string> = {};
    paletteData.scale.forEach((stop) => {
      scaleMap[String(stop.key)] = stop.hex;
    });
    const tailwindLines = paletteData.scale
      .map((stop) => `          ${stop.key}: "${stop.hex}",`)
      .join('\n');
    const tailwind = `module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
${tailwindLines}
        }
      }
    }
  }
};`;
    const cssScale = paletteData.scale.map((stop) => `  --brand-${stop.key}: ${stop.hex};`).join('\n');
    const css = `:root {
${cssScale}
  --brand-base: ${paletteData.base};
  --brand-complementary: ${paletteData.complementary};
  --brand-triadic-1: ${paletteData.triadic[0]};
  --brand-triadic-2: ${paletteData.triadic[1]};
  --brand-analogous-1: ${paletteData.analogous[0]};
  --brand-analogous-2: ${paletteData.analogous[1]};
}`;
    const json = JSON.stringify({
      base: paletteData.base,
      complementary: paletteData.complementary,
      triadic: paletteData.triadic,
      analogous: paletteData.analogous,
      scale: scaleMap,
    }, null, 2);
    return { tailwind, css, json };
  }, [paletteData]);

  const applyAlpha = (base: Color | null, alphaPercent: number) => {
    if (!base) return null;
    const a = clamp(alphaPercent, 0, 100) / 100;
    return {
      ...base,
      rgba: base.rgb.replace("rgb", "rgba").replace(")", `, ${a})`),
      hsla: base.hsl.replace("hsl", "hsla").replace(")", `, ${a})`),
    };
  };

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

  const handleCopyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedExport(label);
      setTimeout(() => setCopiedExport(null), 1200);
      setStatus(`${label} copied`);
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleChange = (value: string) => {
    setInput(value);
    const parsed = computeColor(trimInput ? value.trim() : value);
    let next = parsed;
    setCopied(null);
    setCopiedExport(null);
    if (parsed && uppercaseHex) {
      next = { ...parsed, hex: parsed.hex.toUpperCase() };
    }
    next = applyAlpha(next, alpha);
    setColor(next);
    setCopied(null);
    if (next) {
      setError("");
      setStatus("Converted");
    } else {
      setError("Invalid color format. Try hex (#2563eb), rgb(37, 99, 235), or hsl(221, 79%, 53%).");
      setStatus("Invalid input");
    }
  };

  const handleCopyAll = async () => {
    if (!color) return;
    const content = `HEX: ${color.hex}\nRGB: ${color.rgb}\nHSL: ${color.hsl}\nRGBA: ${color.rgba}\nHSLA: ${color.hsla}`;
    try {
      await navigator.clipboard.writeText(content);
      setStatus("Copied all");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!color) return;
    const content = `HEX: ${color.hex}\nRGB: ${color.rgb}\nHSL: ${color.hsl}\nRGBA: ${color.rgba}\nHSLA: ${color.hsla}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "color.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const presets = ["#2563eb", "#14b8a6", "#f97316", "#f43f5e", "#22c55e", "#0ea5e9"];

  const adjustToAa = (background: "white" | "black") => {
    if (!color) return;
    const hsl = parseHsl(color.hsl);
    if (!hsl) return;
    const bg = background === "white" ? WHITE_RGB : BLACK_RGB;
    const nextLightness = findNearestLightnessForContrast(hsl.h, hsl.s, hsl.l, bg, 4.5);
    if (nextLightness === null) {
      setStatus("No AA adjustment found");
      return;
    }
    const rgb = hslToRgb(hsl.h, hsl.s, nextLightness);
    handleChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    setStatus(`Adjusted to AA on ${background}`);
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
              Color Converter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Color Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert between HEX, RGB, and HSL formats with live preview. Paste any format and copy all
          outputs.
        </p>
        <p className="text-sm text-slate-600">Runs locally in your browser; colors are not uploaded.</p>
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
          <input
            type="color"
            value={color?.hex ?? "#2563eb"}
            onChange={(e) => handleChange(e.target.value)}
            aria-label="Pick a color"
            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white shadow-sm"
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
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => handleChange(preset)}
                className="h-8 w-8 rounded-full ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                style={{ background: preset }}
                aria-label={`Use preset ${preset}`}
              />
            ))}
          </div>
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
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <span className="font-semibold text-slate-900">Alpha</span>
            <input
              type="range"
              min={0}
              max={100}
              value={alpha}
              onChange={(e) => {
                const next = Number(e.target.value);
                setAlpha(next);
                if (color) {
                  const a = clamp(next, 0, 100) / 100;
                  setColor({
                    ...color,
                    rgba: color.rgb.replace("rgb", "rgba").replace(")", `, ${a})`),
                    hsla: color.hsl.replace("hsl", "hsla").replace(")", `, ${a})`),
                  });
                }
              }}
              aria-label="Alpha slider"
            />
            <span className="w-10 text-right text-xs text-slate-700">{alpha}%</span>
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
            <div
              className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
              role="region"
              aria-label="Color values"
            >
              {(["hex", "rgb", "hsl", "rgba", "hsla"] as Array<keyof Color>).map((key) => (
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleCopyAll}
                  className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
                  disabled={!color}
                  aria-label="Copy all color formats"
                >
                  Copy all
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
                  disabled={!color}
                  aria-label="Download color formats"
                >
                  <Download className="h-4 w-4" />
                  Download outputs
                </button>
              </div>
            </div>
          </div>
        )}
        {color && contrastData ? (
          <section className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200" aria-label="Contrast checker">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Contrast checker</h2>
              <p className="text-xs text-slate-500">WCAG 2.1 ratios</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">On white</span>
                  <span className="text-xs text-slate-600">Contrast {contrastData.white.ratio.toFixed(2)}:1</span>
                </div>
                <div className="grid gap-2 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>AA normal (4.5)</span>
                    <StatusPill pass={contrastData.white.aaNormal} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AA large (3.0)</span>
                    <StatusPill pass={contrastData.white.aaLarge} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AAA normal (7.0)</span>
                    <StatusPill pass={contrastData.white.aaaNormal} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AAA large (4.5)</span>
                    <StatusPill pass={contrastData.white.aaaLarge} />
                  </div>
                </div>
                <button
                  onClick={() => adjustToAa("white")}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Adjust to AA
                </button>
              </div>
              <div className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">On black</span>
                  <span className="text-xs text-slate-600">Contrast {contrastData.black.ratio.toFixed(2)}:1</span>
                </div>
                <div className="grid gap-2 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>AA normal (4.5)</span>
                    <StatusPill pass={contrastData.black.aaNormal} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AA large (3.0)</span>
                    <StatusPill pass={contrastData.black.aaLarge} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AAA normal (7.0)</span>
                    <StatusPill pass={contrastData.black.aaaNormal} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>AAA large (4.5)</span>
                    <StatusPill pass={contrastData.black.aaaLarge} />
                  </div>
                </div>
                <button
                  onClick={() => adjustToAa("black")}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                >
                  Adjust to AA
                </button>
              </div>
            </div>
          </section>
        ) : null}
        {color && paletteData && exportBlocks ? (
          <section className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200" aria-label="Palette generator">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Palette generator</h2>
              <p className="text-xs text-slate-500">Complementary, triadic, analogous, plus tints/shades</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold text-slate-700">Complementary</p>
                <div className="grid gap-2">
                  {[paletteData.base, paletteData.complementary].map((hex, index) => (
                    <div key={`complement-${index}-${hex}`} className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-lg ring-1 ring-slate-200" style={{ background: hex }} />
                      <span className="text-xs font-semibold text-slate-700">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold text-slate-700">Triadic</p>
                <div className="grid gap-2">
                  {[paletteData.base, ...paletteData.triadic].map((hex, index) => (
                    <div key={`triadic-${index}-${hex}`} className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-lg ring-1 ring-slate-200" style={{ background: hex }} />
                      <span className="text-xs font-semibold text-slate-700">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold text-slate-700">Analogous</p>
                <div className="grid gap-2">
                  {[paletteData.base, ...paletteData.analogous].map((hex, index) => (
                    <div key={`analogous-${index}-${hex}`} className="flex items-center gap-2">
                      <span className="h-8 w-8 rounded-lg ring-1 ring-slate-200" style={{ background: hex }} />
                      <span className="text-xs font-semibold text-slate-700">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Tints & shades scale</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {paletteData.scale.map((stop) => (
                  <div key={stop.key} className="flex items-center gap-2 rounded-lg bg-white px-2 py-2 ring-1 ring-slate-200">
                    <span className="h-7 w-7 rounded-md ring-1 ring-slate-200" style={{ background: stop.hex }} />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">{stop.key}</p>
                      <p className="text-xs font-semibold text-slate-700">{stop.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Tailwind config</p>
                  <button
                    onClick={() => handleCopyText(exportBlocks.tailwind, 'Tailwind')}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copiedExport === 'Tailwind' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-60 overflow-auto rounded-lg bg-white p-2 text-[11px] text-slate-700 ring-1 ring-slate-200">{exportBlocks.tailwind}</pre>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">CSS variables</p>
                  <button
                    onClick={() => handleCopyText(exportBlocks.css, 'CSS variables')}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copiedExport === 'CSS variables' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-60 overflow-auto rounded-lg bg-white p-2 text-[11px] text-slate-700 ring-1 ring-slate-200">{exportBlocks.css}</pre>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">JSON</p>
                  <button
                    onClick={() => handleCopyText(exportBlocks.json, 'JSON')}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                  >
                    {copiedExport === 'JSON' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="max-h-60 overflow-auto rounded-lg bg-white p-2 text-[11px] text-slate-700 ring-1 ring-slate-200">{exportBlocks.json}</pre>
              </div>
            </div>
          </section>
        ) : null}
        {color && nearestNames ? (
          <section className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200" aria-label="Color naming">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Color naming</h2>
              <p className="text-xs text-slate-500">Closest CSS + Tailwind matches</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold text-slate-700">CSS named color</p>
                <div className="flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-xl ring-1 ring-slate-200"
                    style={{ background: nearestNames.css.hex }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{nearestNames.css.name}</p>
                    <p className="text-xs text-slate-600">{nearestNames.css.hex}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-semibold text-slate-700">Closest Tailwind color</p>
                <div className="flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-xl ring-1 ring-slate-200"
                    style={{ background: nearestNames.tailwind.hex }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{nearestNames.tailwind.name}</p>
                    <p className="text-xs text-slate-600">{nearestNames.tailwind.hex}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Enter a color or pick from presets/picker; trim/uppercase toggles adjust formatting.</li>
          <li>Use the alpha slider to generate RGBA/HSLA variants; copy individual formats or all, or download.</li>
          <li>Live preview updates as you change inputs; everything runs in your browser.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <div className="space-y-2 text-sm text-slate-700">
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Is this private?</summary>
            <p className="mt-2 text-slate-700">Yes. Conversions happen locally in your browser; nothing is uploaded.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Which formats can I copy?</summary>
            <p className="mt-2 text-slate-700">HEX, RGB, HSL, plus RGBA/HSLA with your chosen alpha. Copy individually or all at once.</p>
          </details>
          <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
            <summary className="cursor-pointer font-medium text-slate-900">Can I download the values?</summary>
            <p className="mt-2 text-slate-700">Yes. Use “Download outputs” to save all formats in a text file.</p>
          </details>
        </div>
      </section>
    </main>
  );
}
