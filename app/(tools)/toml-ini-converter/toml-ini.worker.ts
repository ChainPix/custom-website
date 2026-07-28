/// <reference lib="webworker" />

import { parseInput, type ParseRequest } from "./parse";

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const message = event.data;
  if (!message || message.type !== "parse") return;
  self.postMessage(parseInput(message));
};
