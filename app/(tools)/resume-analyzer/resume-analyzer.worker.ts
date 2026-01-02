/// <reference lib="webworker" />

import {
  analyze,
  buildTermData,
  detectAtsIssues,
  redactPrivacyText,
  type AtsIssue,
  type Insights,
  type SectionWeights,
  type TermData,
} from "./analysis";
import { extractPdfText } from "./parsers/pdf";

type ParsePdfMessage = {
  type: "parse-pdf";
  requestId: number;
  buffer: ArrayBuffer;
  weights: SectionWeights;
  privacyMode: boolean;
};

type WorkerMessage =
  | { type: "pdf-progress"; requestId: number; current: number; total: number }
  | {
      type: "pdf-complete";
      requestId: number;
      rawText: string;
      analyzedText: string;
      termData: TermData;
      insights: Insights;
      atsIssues: AtsIssue[];
    }
  | { type: "pdf-empty"; requestId: number }
  | { type: "pdf-error"; requestId: number; message: string };

const MIN_PDF_TEXT_LENGTH = 120;

const ctx = self as DedicatedWorkerGlobalScope;

const postMessage = (message: WorkerMessage) => {
  ctx.postMessage(message);
};

ctx.onmessage = async (event: MessageEvent<ParsePdfMessage>) => {
  const message = event.data;
  if (message.type !== "parse-pdf") return;

  try {
    const { text: rawText, pageTexts } = await extractPdfText(message.buffer, (current, total) => {
      postMessage({ type: "pdf-progress", requestId: message.requestId, current, total });
    });
    const cleanedLength = rawText.replace(/\s+/g, "").length;
    if (!cleanedLength || cleanedLength < MIN_PDF_TEXT_LENGTH) {
      postMessage({ type: "pdf-empty", requestId: message.requestId });
      return;
    }
    const analyzedText = message.privacyMode ? redactPrivacyText(rawText) : rawText;
    const termData = buildTermData(analyzedText, true, message.weights);
    const insights = analyze(analyzedText, termData);
    const atsIssues = detectAtsIssues(analyzedText, pageTexts);
    postMessage({
      type: "pdf-complete",
      requestId: message.requestId,
      rawText,
      analyzedText,
      termData,
      insights,
      atsIssues,
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Failed to parse PDF";
    postMessage({ type: "pdf-error", requestId: message.requestId, message: messageText });
  }
};
