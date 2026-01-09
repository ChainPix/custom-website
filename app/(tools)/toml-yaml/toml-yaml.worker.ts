/// <reference lib="webworker" />

import yaml from "js-yaml";
import toml from "toml";
import * as iarnaToml from "@iarna/toml";

type Mode = "toml-to-yaml" | "yaml-to-toml";
type YamlSchemaMode = "json" | "full";

type ConvertRequest = {
  type: "convert";
  requestId: number;
  input: string;
  mode: Mode;
  yamlIndent: number;
  sortKeys: boolean;
  yamlSchemaMode: YamlSchemaMode;
  useBasicToml: boolean;
};

type CancelRequest = {
  type: "cancel";
  requestId: number;
};

type WorkerMessage = ConvertRequest | CancelRequest;

type SerializeOptions = {
  sortKeys: boolean;
};

type SerializableRecord = Record<string, unknown>;

const TOML_INT_MIN = BigInt("-9223372036854775808");
const TOML_INT_MAX = BigInt("9223372036854775807");
const TOML_BARE_KEY_RE = /^[A-Za-z0-9_-]+$/;
const TOML_LITERAL_STRING_RE = /^[ -~]+$/;

const isPlainObject = (value: unknown): value is SerializableRecord =>
  Object.prototype.toString.call(value) === "[object Object]";

const getYamlSchema = (schemaMode: YamlSchemaMode) =>
  schemaMode === "json" ? yaml.JSON_SCHEMA : yaml.DEFAULT_SCHEMA;

const escapeBasicString = (value: string): string => JSON.stringify(value).slice(1, -1);

const serializeString = (value: string): string => {
  if (value.includes("\n")) {
    const escaped = escapeBasicString(value).replace(/\\n/g, "\n");
    return `"""${escaped}"""`;
  }
  if (!value.includes("'") && TOML_LITERAL_STRING_RE.test(value)) {
    return `'${value}'`;
  }
  return `"${escapeBasicString(value)}"`;
};

const formatKey = (key: string): string => {
  if (TOML_BARE_KEY_RE.test(key)) {
    return key;
  }
  return `"${escapeBasicString(key)}"`;
};

const formatPath = (segments: string[]): string => segments.map((segment) => formatKey(segment)).join(".");

const displayPath = (segments: string[]): string => segments.join(".");

const serializePrimitive = (value: unknown, path: string): string => {
  if (value === null || value === undefined) {
    throw new Error(`Unsupported value at ${path || "root"}: null or undefined cannot be converted to TOML.`);
  }
  if (typeof value === "string") {
    return serializeString(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Unsupported number at ${path || "root"}: must be a finite value.`);
    }
    return String(value);
  }
  if (typeof value === "bigint") {
    if (value < TOML_INT_MIN || value > TOML_INT_MAX) {
      throw new Error(`Unsupported bigint at ${path || "root"}: exceeds TOML 64-bit integer range.`);
    }
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  throw new Error(`Unsupported value at ${path || "root"}: ${typeof value} cannot be converted to TOML.`);
};

const serializeArray = (arr: unknown[], pathSegments: string[], options: SerializeOptions): string[] | string => {
  if (arr.some((item) => item === undefined || item === null)) {
    throw new Error(`Arrays cannot contain null or undefined values (${displayPath(pathSegments) || "root"}).`);
  }

  const hasObject = arr.some((item) => isPlainObject(item));
  const allObject = arr.every((item) => isPlainObject(item));

  if (allObject) {
    const lines: string[] = [];
    arr.forEach((item, index) => {
      const tablePath = formatPath(pathSegments);
      lines.push(`[[${tablePath}]]`);
      lines.push(...serializeTable(item as SerializableRecord, pathSegments, options));
      if (index !== arr.length - 1) {
        lines.push("");
      }
    });
    return lines;
  }

  if (hasObject) {
    const normalized = arr.map((item) => (isPlainObject(item) ? item : { value: item })) as SerializableRecord[];
    const lines: string[] = [];
    normalized.forEach((item, index) => {
      const tablePath = formatPath(pathSegments);
      lines.push(`[[${tablePath}]]`);
      lines.push(...serializeTable(item, pathSegments, options));
      if (index !== normalized.length - 1) {
        lines.push("");
      }
    });
    return lines;
  }

  const serializedItems = arr.map((item) => serializePrimitive(item, displayPath(pathSegments)));
  return `[${serializedItems.join(", ")}]`;
};

const serializeTable = (obj: SerializableRecord, pathSegments: string[], options: SerializeOptions): string[] => {
  const lines: string[] = [];
  const nestedTables: Array<{ key: string; value: SerializableRecord }> = [];
  const tableArrays: Array<{ key: string; value: SerializableRecord[] }> = [];

  const entries = Object.entries(obj);
  const sortedEntries = options.sortKeys ? [...entries].sort(([a], [b]) => a.localeCompare(b)) : entries;

  sortedEntries.forEach(([key, value]) => {
    const fullPathSegments = [...pathSegments, key];
    const fullPath = displayPath(fullPathSegments);
    const formattedKey = formatKey(key);

    if (Array.isArray(value)) {
      if (value.every((item) => isPlainObject(item))) {
        tableArrays.push({ key, value: value as SerializableRecord[] });
        return;
      }
      const serialized = serializeArray(value, fullPathSegments, options);
      if (typeof serialized === "string") {
        lines.push(`${formattedKey} = ${serialized}`);
      } else {
        lines.push(...serialized);
      }
      return;
    }

    if (isPlainObject(value)) {
      nestedTables.push({ key, value });
      return;
    }

    lines.push(`${formattedKey} = ${serializePrimitive(value, fullPath)}`);
  });

  tableArrays.forEach(({ key, value }, index) => {
    value.forEach((item, itemIndex) => {
      const tablePath = formatPath([...pathSegments, key]);
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push(`[[${tablePath}]]`);
      lines.push(...serializeTable(item, [...pathSegments, key], options));
      if (itemIndex !== value.length - 1 || index !== tableArrays.length - 1 || nestedTables.length > 0) {
        lines.push("");
      }
    });
  });

  nestedTables.forEach(({ key, value }, index) => {
    const tablePath = formatPath([...pathSegments, key]);
    lines.push(`[${tablePath}]`);
    lines.push(...serializeTable(value, [...pathSegments, key], options));
    if (index !== nestedTables.length - 1) {
      lines.push("");
    }
  });

  return lines;
};

const convertToToml = (data: unknown, options: SerializeOptions): string => {
  if (!isPlainObject(data)) {
    throw new Error("TOML output requires an object at the root level.");
  }
  const lines = serializeTable(data, [], options);
  return lines.join("\n").trimEnd();
};

const convertToTomlStrict = (data: unknown): string => {
  if (!isPlainObject(data)) {
    throw new Error("TOML output requires an object at the root level.");
  }
  return iarnaToml.stringify(data as iarnaToml.JsonMap);
};

const getErrorMessage = (err: unknown, conversionMode: Mode): string => {
  if (err instanceof Error) {
    const { message } = err;
    if (conversionMode === "toml-to-yaml") {
      const tomlErr = err as Error & { line?: number; column?: number };
      if (typeof tomlErr.line === "number") {
        const colText = typeof tomlErr.column === "number" ? `, column ${tomlErr.column}` : "";
        return `Invalid TOML at line ${tomlErr.line}${colText}: ${message}`;
      }
      return `Invalid TOML: ${message}`;
    }
    const yamlErr = err as yaml.YAMLException & { mark?: { line: number; column: number } };
    if (yamlErr.mark && typeof yamlErr.mark.line === "number" && typeof yamlErr.mark.column === "number") {
      return `Invalid YAML at line ${yamlErr.mark.line + 1}, column ${yamlErr.mark.column + 1}: ${message}`;
    }
    return `Invalid YAML: ${message}`;
  }
  return `Invalid ${conversionMode === "toml-to-yaml" ? "TOML" : "YAML"} input.`;
};

const canceledRequests = new Set<number>();
const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (!message) return;

  if (message.type === "cancel") {
    canceledRequests.add(message.requestId);
    return;
  }

  if (message.type !== "convert") return;

  const { requestId, input, mode, sortKeys, yamlIndent, yamlSchemaMode, useBasicToml } = message;
  canceledRequests.delete(requestId);

  try {
    workerScope.postMessage({ type: "progress", requestId, stage: "Parsing..." });
    const parsed =
      mode === "toml-to-yaml"
        ? toml.parse(input)
        : yaml.load(input, { schema: getYamlSchema(yamlSchemaMode) });

    if (canceledRequests.has(requestId)) return;

    workerScope.postMessage({ type: "progress", requestId, stage: "Serializing..." });
    let output = "";

    if (mode === "toml-to-yaml") {
      output = yaml.dump(parsed, {
        indent: yamlIndent,
        lineWidth: -1,
        noRefs: true,
        sortKeys,
        schema: getYamlSchema(yamlSchemaMode),
      });
    } else {
      if (!isPlainObject(parsed)) {
        throw new Error("TOML output requires an object-like YAML document at the root.");
      }
      output = useBasicToml ? convertToToml(parsed, { sortKeys }) : convertToTomlStrict(parsed);
    }

    if (canceledRequests.has(requestId)) return;

    workerScope.postMessage({ type: "result", requestId, output, error: "" });
  } catch (err) {
    workerScope.postMessage({
      type: "result",
      requestId,
      output: "",
      error: getErrorMessage(err, mode),
    });
  }
};
