export {};

type WorkerRequest = {
  id: number;
  buffer: ArrayBuffer;
  mime: string;
};

type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number }
  | { id: number; type: "done"; dataUrl: string }
  | { id: number; type: "error"; message: string };

const CHUNK_SIZE = 256 * 1024;

const encodeChunk = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const encodeBase64 = (buffer: ArrayBuffer, onProgress: (loaded: number, total: number) => void) => {
  const bytes = new Uint8Array(buffer);
  const total = bytes.length;
  const parts: string[] = [];
  let offset = 0;
  let carry: number[] = [];

  while (offset < total) {
    const sliceEnd = Math.min(offset + CHUNK_SIZE, total);
    const chunk = bytes.slice(offset, sliceEnd);
    const combined = new Uint8Array(carry.length + chunk.length);
    combined.set(carry);
    combined.set(chunk, carry.length);

    const remainder = combined.length % 3;
    const usableLength = combined.length - remainder;
    const usable = combined.slice(0, usableLength);
    carry = remainder ? Array.from(combined.slice(usableLength)) : [];

    if (usable.length > 0) {
      parts.push(encodeChunk(usable));
    }

    offset = sliceEnd;
    onProgress(offset, total);
  }

  if (carry.length > 0) {
    parts.push(encodeChunk(new Uint8Array(carry)));
  }

  return parts.join("");
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, buffer, mime } = event.data;
  try {
    const base64 = encodeBase64(buffer, (loaded, total) => {
      self.postMessage({ id, type: "progress", loaded, total } satisfies WorkerResponse);
    });
    const dataUrl = `data:${mime};base64,${base64}`;
    self.postMessage({ id, type: "done", dataUrl } satisfies WorkerResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to encode";
    self.postMessage({ id, type: "error", message } satisfies WorkerResponse);
  }
};
