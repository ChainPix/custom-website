/// <reference lib="webworker" />

import { formatSql, splitStatements, type FormatOptions } from "./formatter-utils";

type FormatRequest = {
  type: "format";
  requestId: number;
  payload: FormatOptions;
};

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  const message = event.data;
  if (!message || message.type !== "format") return;
  const { requestId, payload } = message;
  const start = performance.now();
  try {
    const output = payload.formatMultiple
      ? splitStatements(payload.input)
          .map((statement) => formatSql({ ...payload, input: statement, formatMultiple: false }))
          .join("\n\n")
      : formatSql(payload);
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    self.postMessage({
      type: "result",
      requestId,
      output,
      durationMs,
      inputChars: payload.input.length,
    });
  } catch (err) {
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    self.postMessage({
      type: "result",
      requestId,
      output: "",
      durationMs,
      inputChars: payload.input.length,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
