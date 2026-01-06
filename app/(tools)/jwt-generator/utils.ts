const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type HmacAlg = "HS256" | "HS384" | "HS512";
export type NonHmacAlg = "RS256" | "RS384" | "RS512" | "ES256" | "ES384" | "ES512" | "EdDSA";
export type JwtAlg = HmacAlg | NonHmacAlg;

export type KeyEntry = {
  id: string;
  kid: string;
  alg: NonHmacAlg;
  kty: "RSA" | "EC" | "OKP";
  publicKey: CryptoKey;
  privateKey?: CryptoKey;
};

export const algConfig: Record<NonHmacAlg, { name: string; kty: KeyEntry["kty"]; hash?: string; namedCurve?: string }> = {
  RS256: { name: "RSASSA-PKCS1-v1_5", kty: "RSA", hash: "SHA-256" },
  RS384: { name: "RSASSA-PKCS1-v1_5", kty: "RSA", hash: "SHA-384" },
  RS512: { name: "RSASSA-PKCS1-v1_5", kty: "RSA", hash: "SHA-512" },
  ES256: { name: "ECDSA", kty: "EC", hash: "SHA-256", namedCurve: "P-256" },
  ES384: { name: "ECDSA", kty: "EC", hash: "SHA-384", namedCurve: "P-384" },
  ES512: { name: "ECDSA", kty: "EC", hash: "SHA-512", namedCurve: "P-521" },
  EdDSA: { name: "Ed25519", kty: "OKP" },
};

export const stripPrivateJwk = (jwk: JsonWebKey) => {
  const { d, p, q, dp, dq, qi, oth, ...publicOnly } = jwk as JsonWebKey & {
    d?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
    oth?: unknown;
  };
  return publicOnly;
};

export const deriveAlgFromJwk = (jwk: JsonWebKey): NonHmacAlg | null => {
  if (
    jwk.alg === "RS256" ||
    jwk.alg === "RS384" ||
    jwk.alg === "RS512" ||
    jwk.alg === "ES256" ||
    jwk.alg === "ES384" ||
    jwk.alg === "ES512" ||
    jwk.alg === "EdDSA"
  ) {
    return jwk.alg;
  }
  if (jwk.kty === "RSA") return "RS256";
  if (jwk.kty === "EC" && jwk.crv === "P-256") return "ES256";
  if (jwk.kty === "EC" && jwk.crv === "P-384") return "ES384";
  if (jwk.kty === "EC" && jwk.crv === "P-521") return "ES512";
  if (jwk.kty === "OKP" && jwk.crv === "Ed25519") return "EdDSA";
  return null;
};

const createHeader = (alg: JwtAlg, kid?: string) => {
  const header: Record<string, unknown> = { alg, typ: "JWT" };
  if (kid) header.kid = kid;
  return header;
};

export const toBase64Url = (input: Uint8Array) => {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    parts.push(String.fromCharCode(...input.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const fromBase64Url = (input: string) => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const base64UrlDecodeToString = (value: string) => decoder.decode(fromBase64Url(value));

export const safeParseJson = (value: string) => {
  try {
    return { parsed: JSON.parse(value) as Record<string, unknown>, error: "" };
  } catch {
    return { parsed: null, error: "Non-JSON content; showing raw text." };
  }
};

export const parseJsonWithPosition = (value: string) => {
  try {
    return { parsed: JSON.parse(value), error: "" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    const match = message.match(/position (\d+)/i);
    if (match) {
      const position = Number(match[1]);
      const before = value.slice(0, position);
      const line = before.split("\n").length;
      const col = before.length - before.lastIndexOf("\n");
      return { parsed: null, error: `Invalid JSON at line ${line}, column ${col}.` };
    }
    return { parsed: null, error: "Invalid JSON." };
  }
};

export const toBase64 = (input: Uint8Array) => {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    parts.push(String.fromCharCode(...input.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(""));
};

export const fromBase64 = (input: string) => {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const pemToArrayBuffer = (pem: string) => {
  const cleaned = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  if (!cleaned) return null;
  return fromBase64(cleaned).buffer;
};

export const arrayBufferToPem = (buffer: ArrayBuffer, label: string) => {
  const base64 = toBase64(new Uint8Array(buffer));
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
};

export const getEcdsaSize = (alg: NonHmacAlg) => {
  if (alg === "ES256") return 32;
  if (alg === "ES384") return 48;
  if (alg === "ES512") return 66;
  return 0;
};

export const derToJose = (derSignature: ArrayBuffer, size: number) => {
  const input = new Uint8Array(derSignature);
  if (input[0] !== 0x30) {
    throw new Error("Invalid DER signature");
  }
  let offset = 2;
  if (input[1] & 0x80) {
    const lengthBytes = input[1] & 0x7f;
    offset = 2 + lengthBytes;
  }
  if (input[offset] !== 0x02) {
    throw new Error("Invalid DER signature");
  }
  const rLength = input[offset + 1];
  const r = input.slice(offset + 2, offset + 2 + rLength);
  offset = offset + 2 + rLength;
  if (input[offset] !== 0x02) {
    throw new Error("Invalid DER signature");
  }
  const sLength = input[offset + 1];
  const s = input.slice(offset + 2, offset + 2 + sLength);

  const rPadded = new Uint8Array(size);
  const sPadded = new Uint8Array(size);
  rPadded.set(r.slice(Math.max(0, r.length - size)), Math.max(0, size - r.length));
  sPadded.set(s.slice(Math.max(0, s.length - size)), Math.max(0, size - s.length));

  const jose = new Uint8Array(size * 2);
  jose.set(rPadded, 0);
  jose.set(sPadded, size);
  return jose;
};

export const joseToDer = (signature: Uint8Array, size: number) => {
  const r = signature.slice(0, size);
  const s = signature.slice(size);
  const trim = (bytes: Uint8Array) => {
    let i = 0;
    while (i < bytes.length - 1 && bytes[i] === 0) i += 1;
    return bytes.slice(i);
  };
  let rTrim = trim(r);
  let sTrim = trim(s);
  if (rTrim[0] & 0x80) rTrim = new Uint8Array([0, ...rTrim]);
  if (sTrim[0] & 0x80) sTrim = new Uint8Array([0, ...sTrim]);
  const totalLength = 2 + rTrim.length + 2 + sTrim.length;
  const lengthBytes =
    totalLength < 128
      ? new Uint8Array([totalLength])
      : new Uint8Array([0x81, totalLength]);
  const der = new Uint8Array(1 + lengthBytes.length + totalLength);
  let offset = 0;
  der[offset] = 0x30;
  offset += 1;
  der.set(lengthBytes, offset);
  offset += lengthBytes.length;
  der[offset] = 0x02;
  der[offset + 1] = rTrim.length;
  der.set(rTrim, offset + 2);
  offset += 2 + rTrim.length;
  der[offset] = 0x02;
  der[offset + 1] = sTrim.length;
  der.set(sTrim, offset + 2);
  return der;
};

export async function signHmac(payload: Record<string, unknown>, secret: string, alg: HmacAlg) {
  const header = createHeader(alg);
  const headerEnc = toBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadEnc = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${headerEnc}.${payloadEnc}`;
  const hash = alg === "HS384" ? "SHA-384" : alg === "HS512" ? "SHA-512" : "SHA-256";

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const sig = toBase64Url(new Uint8Array(sigBuffer));
  return `${data}.${sig}`;
}

export async function signWithKey(payload: Record<string, unknown>, key: KeyEntry) {
  if (!key.privateKey) {
    throw new Error("Missing private key for signing.");
  }
  const header = createHeader(key.alg, key.kid);
  const headerEnc = toBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadEnc = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const data = `${headerEnc}.${payloadEnc}`;
  const config = algConfig[key.alg];
  const signAlgorithm =
    config.kty === "RSA"
      ? { name: config.name }
      : config.kty === "EC"
        ? { name: config.name, hash: config.hash }
        : { name: config.name };
  const sigBuffer = await crypto.subtle.sign(signAlgorithm, key.privateKey, encoder.encode(data));
  const sigBytes =
    config.kty === "EC" ? derToJose(sigBuffer, getEcdsaSize(key.alg)) : new Uint8Array(sigBuffer);
  const sig = toBase64Url(sigBytes);
  return `${data}.${sig}`;
}

export function decodeToken(token: string) {
  const [h, p] = token.split(".");
  if (!h || !p) return null;
  const decodePart = (label: "header" | "payload", value: string) => {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      return { json: null, raw: "", error: `${label} is not valid base64url` };
    }
    try {
      const raw = base64UrlDecodeToString(value);
      const { parsed, error } = safeParseJson(raw);
      return { json: parsed, raw, error };
    } catch (err) {
      console.error("Decode error", err);
      return { json: null, raw: "", error: `Failed to decode ${label}` };
    }
  };
  return {
    header: decodePart("header", h),
    payload: decodePart("payload", p),
  };
}
