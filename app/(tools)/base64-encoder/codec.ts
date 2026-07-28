/**
 * Pure chunked Base64 codec helpers for the base64-encoder tool, shared by
 * worker.ts and covered by tests/unit/base64-encoder.spec.ts. Chunking keeps
 * String.fromCharCode argument counts and atob inputs bounded for large
 * payloads; chunk size stays divisible by 4 so base64 boundaries align.
 */

const textEncoder = new TextEncoder();
const strictTextDecoder = new TextDecoder("utf-8", { fatal: true });
const fallbackTextDecoder = new TextDecoder("utf-8");

export const toBase64Url = (value: string) => value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const bytesToBase64 = (bytes: Uint8Array, onProgress?: (progress: number) => void) => {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    if (onProgress) {
      onProgress(Math.min(1, (i + chunkSize) / bytes.length));
    }
  }
  return btoa(binary);
};

export const base64ToBytes = (value: string, onProgress?: (progress: number) => void) => {
  const chunkSize = 0x8000;
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let i = 0; i < value.length; i += chunkSize) {
    const part = value.slice(i, i + chunkSize);
    const binary = atob(part);
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j += 1) {
      bytes[j] = binary.charCodeAt(j);
    }
    chunks.push(bytes);
    total += bytes.length;
    if (onProgress) {
      onProgress(Math.min(1, (i + chunkSize) / value.length));
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
};

export const decodeBytesToText = (bytes: Uint8Array) => {
  try {
    return strictTextDecoder.decode(bytes);
  } catch {
    return fallbackTextDecoder.decode(bytes);
  }
};

export const encodeTextToBase64 = (text: string, variant: "standard" | "url", onProgress?: (progress: number) => void) => {
  const base64 = bytesToBase64(textEncoder.encode(text), onProgress);
  return variant === "url" ? toBase64Url(base64) : base64;
};

export const decodeBase64ToText = (base64: string, onProgress?: (progress: number) => void) =>
  decodeBytesToText(base64ToBytes(base64, onProgress));
