/// <reference lib="webworker" />

import yaml from "js-yaml";

type Mode = "json-to-yaml" | "yaml-to-json";

type ConvertRequest = {
  type: "convert";
  requestId: number;
  input: string;
  mode: Mode;
  yamlIndent: number;
  jsonIndent: number;
  sortKeys: boolean;
};

type WorkerResponse = {
  requestId: number;
  output?: string;
  error?: string;
};

const getBetterErrorMessage = (err: unknown, conversionMode: Mode, input: string): string => {
  if (err instanceof Error) {
    if (conversionMode === "json-to-yaml") {
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1], 10);
        const lines = input.substring(0, position).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        return `Invalid JSON at line ${line}, column ${column}: ${err.message}`;
      }
      return `Invalid JSON: ${err.message}`;
    }
    const mark = (err as yaml.YAMLException & { mark?: { line: number; column: number } }).mark;
    if (mark && typeof mark.line === "number" && typeof mark.column === "number") {
      return `Invalid YAML at line ${mark.line + 1}, column ${mark.column + 1}: ${err.message}`;
    }
    return `Invalid YAML: ${err.message}`;
  }
  return `Invalid ${conversionMode === "json-to-yaml" ? "JSON" : "YAML"} input.`;
};

const sortObjectKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item));
  }
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((result: Record<string, unknown>, key) => {
        result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return obj;
};

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<ConvertRequest>) => {
  const message = event.data;
  if (!message || message.type !== "convert") return;

  const { requestId, input, mode, yamlIndent, jsonIndent, sortKeys } = message;

  if (mode === "json-to-yaml") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      workerScope.postMessage({ requestId, error: getBetterErrorMessage(err, mode, input) } satisfies WorkerResponse);
      return;
    }
    const dataToConvert = sortKeys ? sortObjectKeys(parsed) : parsed;
    try {
      const output = yaml.dump(dataToConvert, {
        indent: yamlIndent,
        lineWidth: -1,
        noRefs: true,
        sortKeys
      });
      workerScope.postMessage({ requestId, output } satisfies WorkerResponse);
    } catch {
      workerScope.postMessage({ requestId, error: "Unable to convert to YAML (possible circular references)." } satisfies WorkerResponse);
    }
    return;
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(input);
  } catch (err) {
    workerScope.postMessage({ requestId, error: getBetterErrorMessage(err, mode, input) } satisfies WorkerResponse);
    return;
  }
  if (parsed === undefined || parsed === null || parsed === "") {
    workerScope.postMessage({ requestId, error: "Parsed YAML is empty; please provide valid content." } satisfies WorkerResponse);
    return;
  }
  const dataToConvert = sortKeys ? sortObjectKeys(parsed) : parsed;
  try {
    const output = JSON.stringify(dataToConvert, null, jsonIndent);
    workerScope.postMessage({ requestId, output } satisfies WorkerResponse);
  } catch {
    workerScope.postMessage({ requestId, error: "Unable to convert to JSON. Ensure YAML has no anchors or circular structures." } satisfies WorkerResponse);
  }
};
