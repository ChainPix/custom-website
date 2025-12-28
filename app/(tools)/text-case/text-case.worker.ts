/// <reference lib="webworker" />

type CaseType = "camel" | "pascal" | "snake" | "kebab" | "title" | "upper" | "lower" | "sentence" | "capitalized";

const toWords = (text: string) =>
  text
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

const converters: Record<CaseType, (text: string) => string> = {
  camel: (text) => {
    const words = toWords(text.toLowerCase());
    return words
      .map((w, idx) => (idx === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join("");
  },
  pascal: (text) => {
    const words = toWords(text.toLowerCase());
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  },
  snake: (text) => toWords(text).join("_").toLowerCase(),
  kebab: (text) => toWords(text).join("-").toLowerCase(),
  title: (text) =>
    toWords(text)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  upper: (text) => text.toUpperCase(),
  lower: (text) => text.toLowerCase(),
  sentence: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  },
  capitalized: (text) =>
    toWords(text)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" "),
};

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event) => {
  const { id, text, keys } = event.data as { id: number; text: string; keys: CaseType[] };
  const outputs = keys.map((key) => [key, converters[key](text)] as const);
  ctx.postMessage({ id, outputs });
};
