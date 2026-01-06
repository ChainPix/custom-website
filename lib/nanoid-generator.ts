export const defaultAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
export const hexAlphabet = "0123456789abcdef";
export const lowerAlphabet = "abcdefghijklmnopqrstuvwxyz";
export const alnumAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const crockfordAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const ambiguousChars = new Set(["0", "O", "1", "I", "l"]);

export type GenerationMode = "nanoid" | "simple";
export type RandomFill = (bytes: Uint8Array) => void;

export const clampLength = (value: number) => Math.min(Math.max(value, 4), 32);
export const clampCount = (value: number) => Math.min(Math.max(value, 1), 50);

export const getAlphabetValidation = (alphabet: string, excludeAmbiguous: boolean) => {
  const issues: string[] = [];

  if (alphabet.trim().length < 2) {
    issues.push("Alphabet must have at least 2 non-space characters.");
  } else if (alphabet.length < 2) {
    issues.push("Alphabet must have at least 2 characters.");
  }

  if (/\s/.test(alphabet)) {
    issues.push("Alphabet cannot include whitespace characters.");
  }

  const seen = new Set<string>();
  let hasDuplicates = false;
  for (const char of alphabet) {
    if (seen.has(char)) {
      hasDuplicates = true;
      break;
    }
    seen.add(char);
  }

  if (hasDuplicates) {
    issues.push("Alphabet must not contain duplicate characters.");
  }

  if (issues.length) {
    return { issues, effectiveAlphabet: defaultAlphabet };
  }

  const filtered = excludeAmbiguous
    ? [...alphabet].filter((char) => !ambiguousChars.has(char)).join("")
    : alphabet;

  if (filtered.length < 2) {
    return {
      issues: ["Alphabet too small after excluding ambiguous characters."],
      effectiveAlphabet: defaultAlphabet,
    };
  }

  return { issues: [], effectiveAlphabet: filtered };
};

const defaultRandomFill: RandomFill = (bytes) => {
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return;
  }
  throw new Error("Secure random unavailable.");
};

export const randomNanoId = (
  size: number,
  alphabet: string,
  mode: GenerationMode,
  randomFill: RandomFill = defaultRandomFill
) => {
  if (mode === "simple") {
    const arr = new Uint8Array(size);
    randomFill(arr);
    const chars = [];
    for (let i = 0; i < size; i += 1) {
      chars.push(alphabet[arr[i] % alphabet.length] ?? "");
    }
    return chars.join("");
  }

  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / alphabet.length);
  let id = "";
  while (id.length < size) {
    const bytes = new Uint8Array(step);
    randomFill(bytes);
    for (let i = 0; i < step && id.length < size; i += 1) {
      const index = bytes[i] & mask;
      if (index < alphabet.length) id += alphabet[index];
    }
  }
  return id;
};
