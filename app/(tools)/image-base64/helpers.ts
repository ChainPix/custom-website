export type ParsedDataUrl = {
  mime: string;
  payload: string;
};

export const parseDataUrl = (value: string): ParsedDataUrl | null => {
  if (!value.startsWith("data:")) return null;
  const [header, payload] = value.split(",");
  if (!payload) return null;
  if (!header.includes(";base64")) return null;
  const mimeMatch = header.match(/^data:([^;]+)/);
  return {
    mime: mimeMatch?.[1] ?? "application/octet-stream",
    payload,
  };
};

export const stripPrefix = (value: string) => {
  if (!value.startsWith("data:")) return value;
  const [, payload] = value.split(",");
  return payload ?? value;
};

export const base64ToBytes = (payload: string) => {
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const base64ToBlob = (payload: string, mime: string) => {
  const bytes = base64ToBytes(payload);
  return new Blob([bytes], { type: mime });
};

export const guessExtension = (mime: string) => {
  const normalized = mime.toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/png") return "png";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/svg+xml") return "svg";
  if (normalized === "image/bmp") return "bmp";
  if (normalized === "image/x-icon") return "ico";
  if (normalized === "image/heic") return "heic";
  if (normalized === "image/heif") return "heif";
  return "";
};
