/// <reference lib="webworker" />

import {
  formatXml,
  type FormatPayload,
  type ValidationSummary,
  type XmlParseLocation,
} from "./formatter-utils";

type FormatRequest = {
  type: "format";
  requestId: number;
  payload: FormatPayload;
};

type FormatResult = {
  type: "result";
  requestId: number;
  output: string;
  error?: string;
  location?: XmlParseLocation | null;
  durationMs?: number;
  summary?: ValidationSummary;
};

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  const message = event.data;
  if (!message || message.type !== "format") return;
  const { requestId, payload } = message;
  const start = performance.now();
  try {
    const { output, summary } = formatXml(payload);
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    const response: FormatResult = {
      type: "result",
      requestId,
      output,
      durationMs,
      summary,
    };
    self.postMessage(response);
  } catch (err) {
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    const response: FormatResult = {
      type: "result",
      requestId,
      output: "",
      durationMs,
      error: err instanceof Error ? err.message : "Unable to format XML.",
      location: (err as { location?: XmlParseLocation | null }).location ?? null,
    };
    self.postMessage(response);
  }
};
