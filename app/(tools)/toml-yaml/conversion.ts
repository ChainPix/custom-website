import yaml from "js-yaml";
import toml from "toml";
import * as iarnaToml from "@iarna/toml";

export type Mode = "toml-to-yaml" | "yaml-to-toml";
export type YamlSchemaMode = "json" | "full";
export type FormatPreset = "default" | "kubernetes" | "github" | "minimal" | "stable";

export type ConvertOptions = {
  yamlIndent: number;
  yamlSchemaMode: YamlSchemaMode;
  sortKeys: boolean;
  lineWidth: number;
  useBasicToml: boolean;
};

export type ConvertMeta = {
  path?: string;
};

export type ConvertResult =
  | { output: string; meta: ConvertMeta }
  | { error: string; meta: ConvertMeta };

type SerializeOptions = {
  sortKeys: boolean;
};

type SerializableRecord = Record<string, unknown>;

const TOML_INT_MIN = BigInt("-9223372036854775808");
const TOML_INT_MAX = BigInt("9223372036854775807");
const TOML_BARE_KEY_RE = /^[A-Za-z0-9_-]+$/;

const isPlainObject = (value: unknown): value is SerializableRecord =>
  Object.prototype.toString.call(value) === "[object Object]";

export const getPresetConfig = (preset: FormatPreset) => {
  switch (preset) {
    case "kubernetes":
      return { yamlIndent: 2, sortKeys: false, lineWidth: 120 };
    case "github":
      return { yamlIndent: 2, sortKeys: false, lineWidth: 120 };
    case "minimal":
      return { yamlIndent: 2, sortKeys: false, lineWidth: -1 };
    case "stable":
      return { yamlIndent: 2, sortKeys: true, lineWidth: -1 };
    default:
      return { yamlIndent: 2, sortKeys: false, lineWidth: -1 };
  }
};

const getYamlSchema = (schemaMode: YamlSchemaMode) =>
  schemaMode === "json" ? yaml.JSON_SCHEMA : yaml.DEFAULT_SCHEMA;

const escapeBasicString = (value: string): string => JSON.stringify(value).slice(1, -1);

const serializeString = (value: string): string => {
  if (value.includes("\n")) {
    const escaped = escapeBasicString(value).replace(/\\n/g, "\n");
    return `"""${escaped}"""`;
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

export const convertToToml = (data: unknown, options: SerializeOptions): string => {
  if (!isPlainObject(data)) {
    throw new Error("TOML output requires an object at the root level.");
  }
  const lines = serializeTable(data, [], options);
  return lines.join("\n").trimEnd();
};

export const convertToTomlStrict = (data: unknown): string => {
  if (!isPlainObject(data)) {
    throw new Error("TOML output requires an object at the root level.");
  }
  return iarnaToml.stringify(data as iarnaToml.JsonMap);
};

export const sortObjectKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectKeys(item));
  }
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce((result: Record<string, unknown>, key) => {
        result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return obj;
};

const extractErrorPath = (message: string): string => {
  const pathMatch = message.match(/at ([^:]+):/i) || message.match(/\(([^)]+)\)/);
  return pathMatch?.[1] ?? "";
};

const formatError = (err: unknown, conversionMode: Mode): { message: string; path: string } => {
  if (err instanceof Error) {
    const { message } = err;
    if (conversionMode === "toml-to-yaml") {
      const tomlErr = err as Error & { line?: number; column?: number };
      if (typeof tomlErr.line === "number") {
        const colText = typeof tomlErr.column === "number" ? `, column ${tomlErr.column}` : "";
        return { message: `Invalid TOML at line ${tomlErr.line}${colText}: ${message}`, path: "" };
      }
      return { message: `Invalid TOML: ${message}`, path: "" };
    }
    const yamlErr = err as yaml.YAMLException & { mark?: { line: number; column: number } };
    if (yamlErr.mark && typeof yamlErr.mark.line === "number" && typeof yamlErr.mark.column === "number") {
      return {
        message: `Invalid YAML at line ${yamlErr.mark.line + 1}, column ${yamlErr.mark.column + 1}: ${message}`,
        path: "",
      };
    }
    return { message: `Invalid YAML: ${message}`, path: extractErrorPath(message) };
  }
  return { message: `Invalid ${conversionMode === "toml-to-yaml" ? "TOML" : "YAML"} input.`, path: "" };
};

export const parseInput = (mode: Mode, input: string, options: ConvertOptions) => {
  try {
    if (mode === "toml-to-yaml") {
      return { ok: true as const, value: toml.parse(input) };
    }
    return { ok: true as const, value: yaml.load(input, { schema: getYamlSchema(options.yamlSchemaMode) }) };
  } catch (err) {
    const formatted = formatError(err, mode);
    return { ok: false as const, error: formatted.message, path: formatted.path };
  }
};

export const serializeOutput = (mode: Mode, value: unknown, options: ConvertOptions) => {
  try {
    if (mode === "toml-to-yaml") {
      const dataToConvert = options.sortKeys ? sortObjectKeys(value) : value;
      const output = yaml.dump(dataToConvert, {
        indent: options.yamlIndent,
        lineWidth: options.lineWidth,
        noRefs: true,
        sortKeys: options.sortKeys,
        schema: getYamlSchema(options.yamlSchemaMode),
      });
      return { ok: true as const, output };
    }
    if (!isPlainObject(value)) {
      return { ok: false as const, error: "TOML output requires an object-like YAML document at the root.", path: "" };
    }
    const dataToConvert = options.sortKeys ? (sortObjectKeys(value) as SerializableRecord) : (value as SerializableRecord);
    const output = options.useBasicToml
      ? convertToToml(dataToConvert, { sortKeys: options.sortKeys })
      : convertToTomlStrict(dataToConvert);
    return { ok: true as const, output };
  } catch (err) {
    const formatted = formatError(err, mode);
    return { ok: false as const, error: formatted.message, path: formatted.path };
  }
};

export const convert = (mode: Mode, input: string, options: ConvertOptions): ConvertResult => {
  const parsed = parseInput(mode, input, options);
  if (!parsed.ok) {
    return { error: parsed.error, meta: { path: parsed.path } };
  }
  const serialized = serializeOutput(mode, parsed.value, options);
  if (!serialized.ok) {
    return { error: serialized.error, meta: { path: serialized.path } };
  }
  return { output: serialized.output, meta: { path: "" } };
};
