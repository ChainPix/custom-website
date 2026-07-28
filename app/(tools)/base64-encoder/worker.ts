import {
  base64ToBytes,
  bytesToBase64,
  decodeBytesToText,
  toBase64Url,
} from "./codec";

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

const textEncoder = new TextEncoder();

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
      const result = decodeBytesToText(bytes);
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
