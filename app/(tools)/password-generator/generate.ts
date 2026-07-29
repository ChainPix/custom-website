/**
 * Pure password/passphrase generation for the password-generator tool.
 * Extracted from client.tsx for unit testing (tests/unit/password-generator.spec.ts).
 * Uses WebCrypto rejection sampling for unbiased random ints.
 */

export type Settings = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
  enforceSets: boolean;
  mode: "password" | "passphrase";
  wordCount: number;
  separator: string;
  capitalize: boolean;
  numberSuffix: boolean;
};

export const symbols = "!@#$%^&*()-_=+[]{};:,.<>?/|";
export const wordList = [
  "able",
  "about",
  "above",
  "across",
  "actor",
  "adapt",
  "adult",
  "agent",
  "alarm",
  "album",
  "alert",
  "alpha",
  "amber",
  "angle",
  "apple",
  "arch",
  "arena",
  "arrow",
  "audio",
  "aware",
  "badge",
  "baker",
  "basic",
  "beach",
  "beacon",
  "beaver",
  "binary",
  "blade",
  "block",
  "bloom",
  "bonus",
  "bravo",
  "brisk",
  "broker",
  "cable",
  "cactus",
  "canvas",
  "carbon",
  "cargo",
  "carpet",
  "cause",
  "center",
  "chain",
  "chant",
  "chess",
  "cider",
  "circle",
  "clerk",
  "cloud",
  "coast",
  "code",
  "comet",
  "copper",
  "coral",
  "corner",
  "craft",
  "crisp",
  "crown",
  "cycle",
  "daily",
  "dawn",
  "debug",
  "delta",
  "dove",
  "drift",
  "eagle",
  "early",
  "ember",
  "enemy",
  "equal",
  "event",
  "extra",
  "fabric",
  "faith",
  "fancy",
  "fiber",
  "field",
  "flame",
  "flash",
  "fleet",
  "focus",
  "forest",
  "frame",
  "fresh",
  "front",
  "frost",
  "future",
  "glide",
  "globe",
  "grace",
  "grain",
  "grant",
  "green",
  "group",
  "guard",
  "habit",
  "happy",
  "harbor",
  "hazel",
  "heart",
  "honey",
  "hotel",
  "human",
  "icicle",
  "ideal",
  "index",
  "iris",
  "ivory",
  "jacket",
  "jade",
  "jazz",
  "jolly",
  "jungle",
  "karma",
  "kayak",
  "kernel",
  "kilo",
  "label",
  "laser",
  "leaf",
  "legend",
  "lemon",
  "level",
  "limit",
  "linen",
  "logic",
  "lunar",
  "magic",
  "major",
  "maple",
  "marine",
  "matrix",
  "meadow",
  "metal",
  "meteor",
  "micro",
  "mighty",
  "mosaic",
  "motor",
  "native",
  "navy",
  "nectar",
  "node",
  "north",
  "novel",
  "oasis",
  "ocean",
  "omega",
  "orbit",
  "origin",
  "paper",
  "party",
  "patch",
  "peace",
  "pearl",
  "pilot",
  "pixel",
  "plasma",
  "plume",
  "polar",
  "power",
  "prime",
  "prism",
  "proxy",
  "pulse",
  "quantum",
  "quick",
  "radar",
  "rapid",
  "raven",
  "react",
  "relay",
  "river",
  "rocket",
  "royal",
  "rune",
  "safety",
  "scale",
  "scene",
  "score",
  "script",
  "shadow",
  "signal",
  "silver",
  "simple",
  "sketch",
  "skill",
  "smile",
  "solar",
  "solid",
  "sonic",
  "spirit",
  "spoke",
  "sprint",
  "stack",
  "storm",
  "story",
  "style",
  "sunset",
  "swift",
  "talon",
  "tempo",
  "tiger",
  "toast",
  "token",
  "topic",
  "torch",
  "total",
  "tower",
  "trace",
  "tune",
  "ultra",
  "unity",
  "urban",
  "vapor",
  "velvet",
  "vivid",
  "voice",
  "voter",
  "water",
  "whale",
  "widow",
  "window",
  "winter",
  "world",
  "xenon",
  "yonder",
  "young",
  "zebra",
  "zenith",
];

const randomBuffer = new Uint32Array(1);

export function cryptoRandomInt(max: number) {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  let value = 0;
  do {
    crypto.getRandomValues(randomBuffer);
    value = randomBuffer[0] ?? 0;
  } while (value >= limit);
  return value % max;
}

export function generatePassword(settings: Settings) {
  const sets: string[] = [];
  if (settings.lowercase) sets.push("abcdefghijklmnopqrstuvwxyz");
  if (settings.uppercase) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (settings.numbers) sets.push("0123456789");
  if (settings.symbols) sets.push(symbols);
  if (!sets.length) return "";
  if (settings.enforceSets && settings.length < sets.length) return "";

  const pool = sets.join("");
  const chars: string[] = [];

  if (settings.enforceSets) {
    for (const set of sets) {
      const idx = cryptoRandomInt(set.length);
      chars.push(set[idx] ?? "");
    }
  }

  const remaining = settings.length - chars.length;
  for (let i = 0; i < remaining; i += 1) {
    const idx = cryptoRandomInt(pool.length);
    chars.push(pool[idx] ?? "");
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = cryptoRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

export function generatePassphrase(settings: Settings) {
  const count = Math.min(Math.max(settings.wordCount, 3), 8);
  const separator = settings.separator ?? "-";
  const words: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = cryptoRandomInt(wordList.length);
    let word = wordList[idx] ?? "";
    if (settings.capitalize) {
      word = word ? `${word[0]?.toUpperCase()}${word.slice(1)}` : word;
    }
    words.push(word);
  }
  let phrase = words.join(separator);
  if (settings.numberSuffix) {
    const suffix = String(cryptoRandomInt(100)).padStart(2, "0");
    phrase = separator ? `${phrase}${separator}${suffix}` : `${phrase}${suffix}`;
  }
  return phrase;
}

export function generateOutput(settings: Settings) {
  return settings.mode === "passphrase" ? generatePassphrase(settings) : generatePassword(settings);
}
