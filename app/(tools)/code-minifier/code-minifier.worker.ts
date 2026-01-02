import { formatCode, type FormatRequest } from "../../../lib/formatters/code-minifier";

type WorkerRequest = FormatRequest & { id: number };

type WorkerResponse = {
  id: number;
  output?: string;
  duration?: number;
  error?: string;
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, code, lang, mode, options, safeMode } = event.data;
  const startedAt = performance.now();
  try {
    const { output } = await formatCode({ code, lang, mode, options, safeMode });
    const duration = Math.round(performance.now() - startedAt);
    self.postMessage({ id, output, duration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    self.postMessage({ id, error: message });
  }
};
