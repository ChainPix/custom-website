/// <reference lib="webworker" />

import { parseInput, serializeOutput, type ConvertOptions, type Mode } from "./conversion";

type ConvertRequest = {
  type: "convert";
  requestId: number;
  input: string;
  mode: Mode;
  options: ConvertOptions;
};

type CancelRequest = {
  type: "cancel";
  requestId: number;
};

type WorkerMessage = ConvertRequest | CancelRequest;

const canceledRequests = new Set<number>();
const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === "cancel") {
    canceledRequests.add(message.requestId);
    return;
  }

  if (message.type !== "convert") return;

  const { requestId, input, mode, options } = message;
  canceledRequests.delete(requestId);

  workerScope.postMessage({ type: "progress", requestId, stage: "Parsing..." });
  const parsed = parseInput(mode, input, options);
  if (!parsed.ok) {
    workerScope.postMessage({ type: "result", requestId, output: "", error: parsed.error, path: parsed.path });
    return;
  }
  if (canceledRequests.has(requestId)) return;

  workerScope.postMessage({ type: "progress", requestId, stage: "Serializing..." });
  const serialized = serializeOutput(mode, parsed.value, options);
  if (!serialized.ok) {
    workerScope.postMessage({ type: "result", requestId, output: "", error: serialized.error, path: serialized.path });
    return;
  }
  if (canceledRequests.has(requestId)) return;

  workerScope.postMessage({ type: "result", requestId, output: serialized.output, error: "", path: "" });
};
