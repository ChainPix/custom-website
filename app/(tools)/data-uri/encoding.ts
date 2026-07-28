/**
 * Pure data-URI encoding/decoding helpers for the data-uri tool.
 * Extracted from client.tsx so they can be unit-tested
 * (tests/unit/data-uri.spec.ts). Browser/Node-shared APIs only
 * (TextEncoder/TextDecoder/atob/btoa).
 */

export const textToBase64 = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export const toBase64Url = (base64: string) =>
  base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

export const fromBase64Url = (base64Url: string) => {
  const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  if (!padding) return normalized;
  return normalized + "=".repeat(4 - padding);
};

export const base64ToText = (base64: string, useBase64Url: boolean) => {
  const normalized = useBase64Url ? fromBase64Url(base64) : base64;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export const isTextMime = (mime: string) =>
  mime.startsWith("text/") || mime === "application/json";

export const buildLineDiff = (left: string, right: string) => {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const table = Array.from({ length: leftLines.length + 1 }, () => new Array(rightLines.length + 1).fill(0));

  for (let i = 1; i <= leftLines.length; i += 1) {
    for (let j = 1; j <= rightLines.length; j += 1) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  const diff: Array<{ type: "same" | "add" | "remove"; text: string }> = [];
  let i = leftLines.length;
  let j = rightLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      diff.push({ type: "same", text: leftLines[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      diff.push({ type: "add", text: rightLines[j - 1] });
      j -= 1;
    } else {
      diff.push({ type: "remove", text: leftLines[i - 1] });
      i -= 1;
    }
  }

  return diff.reverse();
};

export const estimateBase64Bytes = (base64: string, useBase64Url: boolean) => {
  const normalized = useBase64Url ? fromBase64Url(base64) : base64;
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
};

export const estimateDecodedBytes = (payload: string) => {
  try {
    const decoded = decodeURIComponent(payload);
    return new TextEncoder().encode(decoded).length;
  } catch (err) {
    console.warn("Decode estimate fallback", err);
    return new TextEncoder().encode(payload).length;
  }
};

export const getPayloadFromOutput = (output: string, assumeBase64: boolean) => {
  if (!output) {
    return { payload: "", isBase64: false };
  }
  if (output.startsWith("data:")) {
    const commaIndex = output.indexOf(",");
    const header = commaIndex >= 0 ? output.slice(0, commaIndex) : output;
    const payload = commaIndex >= 0 ? output.slice(commaIndex + 1) : "";
    return { payload, isBase64: header.includes(";base64") };
  }
  return { payload: output, isBase64: assumeBase64 };
};

export const isBase64UrlPayload = (payload: string) => payload.includes("-") || payload.includes("_");

export const parseDataUri = (output: string, assumeBase64: boolean, assumeBase64Url: boolean) => {
  if (!output) {
    return {
      mimeType: "n/a",
      charset: "n/a",
      isBase64: false,
      isBase64Url: false,
      payloadLength: 0,
      decodedBytes: 0,
    };
  }

  const { payload, isBase64 } = getPayloadFromOutput(output, assumeBase64);
  const isBase64Url = isBase64 && (assumeBase64Url || isBase64UrlPayload(payload));
  if (!output.startsWith("data:")) {
    return {
      mimeType: "payload only",
      charset: "n/a",
      isBase64,
      isBase64Url,
      payloadLength: payload.length,
      decodedBytes: isBase64 ? estimateBase64Bytes(payload, isBase64Url) : estimateDecodedBytes(payload),
    };
  }

  const commaIndex = output.indexOf(",");
  const header = commaIndex >= 0 ? output.slice(5, commaIndex) : output.slice(5);
  const segments = header.split(";").filter(Boolean);
  let mimeType = "text/plain";
  let charset = "n/a";

  // A real mime type always contains "/" — this also stops the ";base64"
  // flag being misread as the mime when the type is omitted (RFC 2397
  // defaults it to text/plain).
  if (segments[0] && segments[0].includes("/")) {
    mimeType = segments[0];
  }

  for (const segment of segments) {
    const [key, value] = segment.split("=");
    if (key?.toLowerCase() === "charset" && value) {
      charset = value;
    }
  }

  return {
    mimeType,
    charset,
    isBase64,
    isBase64Url,
    payloadLength: payload.length,
    decodedBytes: isBase64 ? estimateBase64Bytes(payload, isBase64Url) : estimateDecodedBytes(payload),
  };
};

export const getDecodedPreview = (output: string, assumeBase64: boolean, assumeBase64Url: boolean) => {
  const { payload, isBase64 } = getPayloadFromOutput(output, assumeBase64);
  if (!payload) return "";
  try {
    const useBase64Url = assumeBase64Url || isBase64UrlPayload(payload);
    return isBase64 ? base64ToText(payload, useBase64Url) : decodeURIComponent(payload);
  } catch (err) {
    console.warn("Preview decode failed", err);
    return "";
  }
};

export const formatJsonPreview = (text: string) => {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, 2);
  } catch (err) {
    console.warn("JSON preview failed", err);
    return text;
  }
};
