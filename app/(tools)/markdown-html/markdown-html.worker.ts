/// <reference lib="webworker" />

import { marked } from "marked";
import TurndownService from "turndown";

type Mode = "md-to-html" | "html-to-md";

type WorkerRequest = {
  id: number;
  input: string;
  mode: Mode;
};

type WorkerResponse = {
  id: number;
  output?: string;
  error?: string;
};

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, input, mode } = event.data;
  try {
    const output = mode === "md-to-html" ? (marked.parse(input) as string) : turndown.turndown(input);
    self.postMessage({ id, output } satisfies WorkerResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    self.postMessage({ id, error: message } satisfies WorkerResponse);
  }
};
