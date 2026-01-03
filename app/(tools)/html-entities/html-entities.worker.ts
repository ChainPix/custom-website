export {};

type WorkerRequest = {
  id: number;
  text: string;
};

type WorkerResponse = {
  id: number;
  type: "progress" | "done" | "error";
  output?: string;
  progress?: number;
  entityCount?: number;
  error?: string;
};

const ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g;
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
};

const decodeChunk = (text: string) => {
  let count = 0;
  const output = text.replace(ENTITY_PATTERN, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1]?.toLowerCase() === "x";
      const numberText = isHex ? body.slice(2) : body.slice(1);
      const codePoint = isHex ? parseInt(numberText, 16) : parseInt(numberText, 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        count += 1;
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    if (NAMED_ENTITIES[body]) {
      count += 1;
    }
    return NAMED_ENTITIES[body] ?? match;
  });
  return { output, count };
};

const splitForDecode = (text: string) => {
  const lastAmp = text.lastIndexOf("&");
  if (lastAmp === -1) return { processable: text, carry: "" };
  const semiIndex = text.indexOf(";", lastAmp);
  if (semiIndex === -1) {
    return { processable: text.slice(0, lastAmp), carry: text.slice(lastAmp) };
  }
  return { processable: text, carry: "" };
};

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, text } = event.data;
  try {
    const total = text.length;
    if (!total) {
      ctx.postMessage({ id, type: "done", output: "", entityCount: 0 } satisfies WorkerResponse);
      return;
    }
    const chunkSize = 200_000;
    let offset = 0;
    let carry = "";
    let output = "";
    let entityCount = 0;
    while (offset < total) {
      const chunk = text.slice(offset, offset + chunkSize);
      const combined = carry + chunk;
      const { processable, carry: nextCarry } = splitForDecode(combined);
      const decoded = decodeChunk(processable);
      output += decoded.output;
      entityCount += decoded.count;
      carry = nextCarry;
      offset += chunk.length;
      ctx.postMessage({ id, type: "progress", progress: Math.min(1, offset / total) } satisfies WorkerResponse);
    }
    const tail = decodeChunk(carry);
    output += tail.output;
    entityCount += tail.count;
    ctx.postMessage({ id, type: "done", output, entityCount } satisfies WorkerResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker decode failed.";
    ctx.postMessage({ id, type: "error", error: message } satisfies WorkerResponse);
  }
};
