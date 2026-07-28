/**
 * Pure hashing/encoding helpers for the hash-generator tool, shared with the
 * client and covered by tests/unit/hash-generator.spec.ts (known RFC/NIST
 * test vectors). Uses WebCrypto (crypto.subtle), available in browsers and
 * Node 18+.
 */

export const algorithms = [
  { id: "SHA-256", label: "SHA-256" },
  { id: "SHA-512", label: "SHA-512" },
  { id: "SHA-1", label: "SHA-1 (legacy / insecure)" },
] as const;
export type AlgorithmId = (typeof algorithms)[number]["id"];

export const outputFormats = ["hex", "base64", "base64url"] as const;
export type OutputFormat = (typeof outputFormats)[number];

export const hexCases = ["lowercase", "uppercase"] as const;
export type HexCase = (typeof hexCases)[number];

export function bytesToHex(bytes: Uint8Array, hexCase: HexCase) {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return hexCase === "uppercase" ? hex.toUpperCase() : hex;
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hashText(text: string, algorithm: AlgorithmId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return new Uint8Array(hashBuffer);
}

export class HashError extends Error {
  code: "hmac-import";
  constructor(message: string) {
    super(message);
    this.code = "hmac-import";
  }
}

export async function hmacText(text: string, secret: string, algorithm: AlgorithmId) {
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
