/**
 * Pure JWT segment/key decoding helpers for the jwt-decoder tool.
 * Extracted from client.tsx for unit testing (tests/unit/jwt-decoder.spec.ts).
 * Browser/Node-shared APIs only (atob, TextDecoder).
 */

export function decodeBase64Url(segment: string): Uint8Array {
  const padded = segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "").replace(/\s+/g, "");
  return toArrayBuffer(decodeBase64(cleaned));
}

export function decodeSegment(segment: string): { value: Record<string, unknown> | null; error?: string } {
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64Url(segment);
  } catch {
    return { value: null, error: "Invalid base64url segment." };
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return { value: JSON.parse(decoded) };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { value: null, error: "Invalid JSON in decoded segment." };
    }
    return { value: null, error: "Unable to decode segment as UTF-8 JSON." };
  }
}
