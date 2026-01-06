const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

type Base64WorkerRequest =
  | {
      id: string;
      action: "encodeText";
      payload: { text: string; variant: "standard" | "url" };
    }
  | {
      id: string;
      action: "decodeText";
      payload: { base64: string };
    }
  | {
      id: string;
      action: "encodeBytes";
      payload: { bytes: Uint8Array; variant: "standard" | "url" };
    };

type Base64WorkerProgress = {
  id: string;
  type: "progress";
  progress: number;
};

type Base64WorkerDone = {
  id: string;
  type: "done";
  result: string;
};

type Base64WorkerError = {
  id: string;
  type: "error";
  error: string;
};

const toBase64Url = (value: string) => value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const bytesToBase64 = (bytes: Uint8Array, onProgress?: (progress: number) => void) => {
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

const base64ToBytes = (value: string, onProgress?: (progress: number) => void) => {
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

self.onmessage = (event: MessageEvent<Base64WorkerRequest>) => {
  const { id, action, payload } = event.data;
  const postProgress = (progress: number) => {
    const message: Base64WorkerProgress = { id, type: "progress", progress };
    self.postMessage(message);
  };

  try {
    if (action === "encodeText") {
      const bytes = textEncoder.encode(payload.text);
      const base64 = bytesToBase64(bytes, postProgress);
      const result = payload.variant === "url" ? toBase64Url(base64) : base64;
      const message: Base64WorkerDone = { id, type: "done", result };
      self.postMessage(message);
      return;
    }

    if (action === "encodeBytes") {
      const base64 = bytesToBase64(payload.bytes, postProgress);
      const result = payload.variant === "url" ? toBase64Url(base64) : base64;
      const message: Base64WorkerDone = { id, type: "done", result };
      self.postMessage(message);
      return;
    }

    if (action === "decodeText") {
      const bytes = base64ToBytes(payload.base64, postProgress);
      const result = textDecoder.decode(bytes);
      const message: Base64WorkerDone = { id, type: "done", result };
      self.postMessage(message);
      return;
    }
  } catch (err) {
    const message: Base64WorkerError = {
      id,
      type: "error",
      error: err instanceof Error ? err.message : "Worker error",
    };
    self.postMessage(message);
  }
};
