export type EncodeMode = "component" | "full";

export type UrlCodecOptions = {
  encodeMode: EncodeMode;
  querystringMode: boolean;
  lenientDecode: boolean;
};

export type DecodeResult =
  | { ok: true; value: string }
  | { ok: false; error: string; invalidIndex?: number };

export type DetectResult = {
  action: "encode" | "decode";
  confidence: "high" | "medium" | "low";
};

export const normalizeForDecode = (value: string, querystringMode: boolean) =>
  querystringMode ? value.replace(/\+/g, " ") : value;

export const applyLenientFixes = (value: string) =>
  value.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");

export const findInvalidPercentIndex = (value: string) => {
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== "%") continue;
    const hex = value.slice(i + 1, i + 3);
    if (!/^[0-9A-Fa-f]{2}$/.test(hex)) return i;
    i += 2;
  }
  return -1;
};

export const encodeValue = (value: string, options: Pick<UrlCodecOptions, "encodeMode" | "querystringMode">) => {
  const encoded =
    options.encodeMode === "full" ? encodeURI(value) : encodeURIComponent(value);
  return options.querystringMode ? encoded.replace(/%20/g, "+") : encoded;
};

export const decodeValue = (value: string, options: UrlCodecOptions) => {
  const normalized = normalizeForDecode(value, options.querystringMode);
  const lenientValue = options.lenientDecode ? applyLenientFixes(normalized) : normalized;
  return options.encodeMode === "full" ? decodeURI(lenientValue) : decodeURIComponent(lenientValue);
};

export const safeDecodeValue = (value: string, options: UrlCodecOptions): DecodeResult => {
  try {
    return { ok: true, value: decodeValue(value, options) };
  } catch {
    const normalized = normalizeForDecode(value, options.querystringMode);
    const invalidIndex = findInvalidPercentIndex(normalized);
    if (invalidIndex >= 0) {
      return {
        ok: false,
        error: `Invalid % sequence at index ${invalidIndex}. Use % followed by two hex digits.`,
        invalidIndex,
      };
    }
    return {
      ok: false,
      error: "Invalid encoded string. Unable to decode. Ensure characters are properly % encoded.",
    };
  }
};

export const detectAction = (value: string, options: UrlCodecOptions): DetectResult => {
  const normalized = normalizeForDecode(value, options.querystringMode);
  let score = 0;
  if (/%[0-9A-Fa-f]{2}/.test(normalized)) score += 2;
  if (options.querystringMode && /\+/.test(value)) score += 1;
  const decoded = safeDecodeValue(value, options);
  if (decoded.ok && decoded.value !== value) score += 2;
  if (!decoded.ok) score -= 1;
  const action = score >= 2 ? "decode" : "encode";
  const confidence = score >= 3 ? "high" : score >= 2 ? "medium" : "low";
  return { action, confidence };
};
