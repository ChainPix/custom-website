import { buildDiffOptions, diffJson, type JsonContainer, type WorkerDiffOptions } from "../../../lib/diff";

type WorkerMessage = {
  id: number;
  left: string;
  right: string;
  options: WorkerDiffOptions;
};

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, left, right, options } = event.data;
  try {
    const a = JSON.parse(left) as JsonContainer;
    const b = JSON.parse(right) as JsonContainer;
    const isValidContainer =
      (typeof a === "object" && a !== null) && (typeof b === "object" && b !== null);
    if (!isValidContainer) {
      self.postMessage({ id, diff: [], error: "Please provide JSON objects or arrays." });
      return;
    }
    if (!options.allowTopLevelArrays && (Array.isArray(a) || Array.isArray(b))) {
      self.postMessage({ id, diff: [], error: "Top-level arrays are disabled in settings." });
      return;
    }

    const opts = buildDiffOptions(options);
    const diff = diffJson(a, b, opts);
    self.postMessage({ id, diff, error: "" });
  } catch {
    self.postMessage({ id, diff: [], error: "Invalid JSON in one of the inputs." });
  }
};
