/// <reference lib="webworker" />

import {
  parseJsonTableInput,
  type JsonTableParseOptions,
  type JsonTableParseResult,
} from "./parse";

type JsonTableWorkerRequest = JsonTableParseOptions & {
  id: number;
  input: string;
};

type JsonTableWorkerResponse = {
  id: number;
  payload: JsonTableParseResult;
};

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<JsonTableWorkerRequest>) => {
  const payload = parseJsonTableInput(event.data.input, event.data);
  const response: JsonTableWorkerResponse = { id: event.data.id, payload };
  workerScope.postMessage(response);
};
