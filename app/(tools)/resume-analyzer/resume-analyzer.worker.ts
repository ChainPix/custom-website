/// <reference lib="webworker" />

import { analyze, buildTermData, type Insights, type TermData } from "./analysis";

type ParsePdfMessage = {
  type: "parse-pdf";
  requestId: number;
  buffer: ArrayBuffer;
};

type WorkerMessage =
  | { type: "pdf-progress"; requestId: number; current: number; total: number }
  | { type: "pdf-complete"; requestId: number; text: string; termData: TermData; insights: Insights }
  | { type: "pdf-empty"; requestId: number }
  | { type: "pdf-error"; requestId: number; message: string };

const ctx = self as DedicatedWorkerGlobalScope;

const postMessage = (message: WorkerMessage) => {
  ctx.postMessage(message);
};

async function extractPdfText(buffer: ArrayBuffer, requestId: number) {
  const pdfjsLib = await import("pdfjs-dist");
  const pdf = await pdfjsLib.getDocument({ data: buffer, disableWorker: true }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
    pages.push(strings);
    postMessage({ type: "pdf-progress", requestId, current: i, total: pdf.numPages });
  }

  return pages.join("\n\n");
}

ctx.onmessage = async (event: MessageEvent<ParsePdfMessage>) => {
  const message = event.data;
  if (message.type !== "parse-pdf") return;

  try {
    const text = await extractPdfText(message.buffer, message.requestId);
    if (!text.replace(/\s+/g, "").length) {
      postMessage({ type: "pdf-empty", requestId: message.requestId });
      return;
    }
    const termData = buildTermData(text, true);
    const insights = analyze(text, termData);
    postMessage({ type: "pdf-complete", requestId: message.requestId, text, termData, insights });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Failed to parse PDF";
    postMessage({ type: "pdf-error", requestId: message.requestId, message: messageText });
  }
};
