"use client";

import Link from "next/link";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import yaml from "js-yaml";
import * as iarnaToml from "@iarna/toml";
import toml from "toml";
import { Check, Clipboard, Download, Loader2, RefreshCcw, Shuffle, Sparkles, Upload } from "lucide-react";

type Mode = "toml-to-yaml" | "yaml-to-toml";
type YamlSchemaMode = "json" | "full";
type FormatPreset = "default" | "kubernetes" | "github" | "minimal" | "stable";

type SerializeOptions = {
  sortKeys: boolean;
};

type SerializableRecord = Record<string, unknown>;

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const WORKER_THRESHOLD_BYTES = 512 * 1024;
const AUTO_CONVERT_DELAY_MS = 250;
const AUTO_CONVERT_IDLE_MS = 600;
const AUTO_CONVERT_MIN_INTERVAL_MS = 800;

const TOML_INT_MIN = BigInt("-9223372036854775808");
const TOML_INT_MAX = BigInt("9223372036854775807");
const TOML_BARE_KEY_RE = /^[A-Za-z0-9_-]+$/;
const TOML_LITERAL_STRING_RE = /^[ -~]+$/;

const isPlainObject = (value: unknown): value is SerializableRecord =>
  Object.prototype.toString.call(value) === "[object Object]";

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

const getYamlSchema = (schemaMode: YamlSchemaMode) =>
  schemaMode === "json" ? yaml.JSON_SCHEMA : yaml.DEFAULT_SCHEMA;

const getPresetConfig = (preset: FormatPreset) => {
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

type ResultState = {
  output: string;
  error: string;
  errorPath: string;
  status: string;
  isProcessing: boolean;
};

type ResultAction =
  | { type: "reset" }
  | { type: "ready" }
  | { type: "start" }
  | { type: "progress"; stage: string }
  | { type: "cancel" }
  | { type: "success"; output: string }
  | { type: "error"; error: string; path?: string };

const resultReducer = (state: ResultState, action: ResultAction): ResultState => {
  switch (action.type) {
    case "reset":
      return { output: "", error: "", errorPath: "", status: "Ready", isProcessing: false };
    case "ready":
      return { ...state, status: "Ready" };
    case "start":
      return { ...state, error: "", errorPath: "", status: "Processing", isProcessing: true };
    case "progress":
      return { ...state, status: action.stage, isProcessing: true };
    case "cancel":
      return { ...state, status: "Canceled", error: "", errorPath: "", isProcessing: false };
    case "success":
      return { output: action.output, error: "", errorPath: "", status: "Completed", isProcessing: false };
    case "error":
      return {
        output: "",
        error: action.error,
        errorPath: action.path || "",
        status: "Error",
        isProcessing: false,
      };
    default:
      return state;
  }
};

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

export default function TomlYamlClient() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("toml-to-yaml");
  const [copied, setCopied] = useState(false);
  const [warning, setWarning] = useState("");
  const [yamlIndent, setYamlIndent] = useState(2);
  const [yamlSchemaMode, setYamlSchemaMode] = useState<YamlSchemaMode>("json");
  const [sortKeys, setSortKeys] = useState(false);
  const [formatPreset, setFormatPreset] = useState<FormatPreset>("default");
  const [autoConvert, setAutoConvert] = useState(false);
  const [useBasicToml, setUseBasicToml] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [formatSuggestion, setFormatSuggestion] = useState<"toml" | "yaml" | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [workerStage, setWorkerStage] = useState("");
  const [isWorkerBusy, setIsWorkerBusy] = useState(false);
  const autoConvertTimer = useRef<NodeJS.Timeout | null>(null);
  const formatDetectTimer = useRef<NodeJS.Timeout | null>(null);
  const lastInputAtRef = useRef(Date.now());
  const lastConvertAtRef = useRef(0);
  const [result, dispatchResult] = useReducer(resultReducer, {
    output: "",
    error: "",
    errorPath: "",
    status: "Ready",
    isProcessing: false,
  });
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerRequestIdRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const stats = useMemo(() => {
    const bytes = new Blob([input]).size;
    const lines = input.split("\n").length;
    const chars = input.length;
    return { bytes, lines, chars };
  }, [input]);

  const shouldUseWorker = stats.bytes >= WORKER_THRESHOLD_BYTES;

  const getErrorMessage = (err: unknown, conversionMode: Mode): { message: string; path: string } => {
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
        return { message: `Invalid YAML at line ${yamlErr.mark.line + 1}, column ${yamlErr.mark.column + 1}: ${message}`, path: "" };
      }
      const pathMatch = message.match(/(?:Unsupported|Arrays cannot contain|Mixed arrays are not supported).*?at (.+?):/i);
      return { message: `Invalid YAML: ${message}`, path: pathMatch?.[1] ?? "" };
    }
    return { message: `Invalid ${conversionMode === "toml-to-yaml" ? "TOML" : "YAML"} input.`, path: "" };
  };

  const tryParseToml = (text: string) => {
    try {
      return { ok: true as const, value: toml.parse(text) };
    } catch (err) {
      return { ok: false as const, error: getErrorMessage(err, "toml-to-yaml").message, path: "" };
    }
  };

  const tryParseYaml = (text: string, schemaMode: YamlSchemaMode) => {
    try {
      return { ok: true as const, value: yaml.load(text, { schema: getYamlSchema(schemaMode) }) };
    } catch (err) {
      const parsedError = getErrorMessage(err, "yaml-to-toml");
      return { ok: false as const, error: parsedError.message, path: parsedError.path };
    }
  };

  const detectInputFormat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      if (tryParseToml(text).ok) return "toml";
      if (tryParseYaml(text, yamlSchemaMode).ok) return "yaml";
      return null;
    },
    [yamlSchemaMode]
  );

  const sortObjectKeys = (obj: unknown): unknown => {
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

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./toml-yaml.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{
      type: "progress" | "result";
      requestId: number;
      stage?: string;
      output?: string;
      error?: string;
      path?: string;
    }>) => {
      const message = event.data;
      if (!message || message.requestId !== workerRequestIdRef.current) return;
      if (message.type === "progress") {
        setWorkerStage(message.stage || "Working...");
        dispatchResult({ type: "progress", stage: message.stage || "Working..." });
        return;
      }
      setIsWorkerBusy(false);
      setWorkerStage("");
      if (message.error) {
        dispatchResult({ type: "error", error: message.error, path: message.path });
        return;
      }
      dispatchResult({ type: "success", output: message.output || "" });
    };
    worker.onerror = () => {
      setIsWorkerBusy(false);
      setWorkerStage("");
      dispatchResult({ type: "error", error: "Worker crashed while converting. Please try again." });
    };
    workerRef.current = worker;
    return worker;
  }, []);

  const handleConvert = useCallback(async () => {
    if (!input.trim()) {
      dispatchResult({ type: "reset" });
      return;
    }

    dispatchResult({ type: "start" });
    setWorkerStage("");

    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      if (shouldUseWorker) {
        const worker = ensureWorker();
        const requestId = (workerRequestIdRef.current += 1);
        const presetConfig = getPresetConfig(formatPreset);
        setIsWorkerBusy(true);
        setWorkerStage("Parsing...");
        dispatchResult({ type: "progress", stage: "Parsing..." });
        worker.postMessage({
          type: "convert",
          requestId,
          input,
          mode,
          sortKeys: presetConfig.sortKeys,
          yamlIndent: presetConfig.yamlIndent,
          yamlSchemaMode,
          useBasicToml,
          lineWidth: presetConfig.lineWidth,
          formatPreset,
        });
        return;
      }
      if (mode === "toml-to-yaml") {
        dispatchResult({ type: "progress", stage: "Parsing..." });
          const parsed = tryParseToml(input);
          if (!parsed.ok) {
            dispatchResult({ type: "error", error: parsed.error, path: parsed.path });
            return;
          }
        const presetConfig = getPresetConfig(formatPreset);
        const dataToConvert = presetConfig.sortKeys ? sortObjectKeys(parsed.value) : parsed.value;
        try {
          dispatchResult({ type: "progress", stage: "Serializing..." });
          const yamlOutput = yaml.dump(dataToConvert, {
            indent: presetConfig.yamlIndent,
            lineWidth: presetConfig.lineWidth,
            noRefs: true,
            sortKeys: presetConfig.sortKeys,
            schema: getYamlSchema(yamlSchemaMode),
          });
          dispatchResult({ type: "success", output: yamlOutput });
        } catch (dumpErr) {
          dispatchResult({
            type: "error",
            error: "Unable to convert to YAML. Ensure TOML does not contain circular references.",
          });
          return;
        }
      } else {
        dispatchResult({ type: "progress", stage: "Parsing..." });
        const parsed = tryParseYaml(input, yamlSchemaMode);
        if (!parsed.ok) {
          dispatchResult({ type: "error", error: parsed.error, path: parsed.path });
          return;
        }
        if (!isPlainObject(parsed.value)) {
          dispatchResult({ type: "error", error: "TOML output requires an object-like YAML document at the root." });
          return;
        }

        const presetConfig = getPresetConfig(formatPreset);
        const dataToConvert = presetConfig.sortKeys
          ? (sortObjectKeys(parsed.value) as SerializableRecord)
          : (parsed.value as SerializableRecord);
        try {
          dispatchResult({ type: "progress", stage: "Serializing..." });
          const tomlOutput = useBasicToml
            ? convertToToml(dataToConvert, { sortKeys: presetConfig.sortKeys })
            : convertToTomlStrict(dataToConvert);
          dispatchResult({ type: "success", output: tomlOutput });
        } catch (serializeErr) {
          const { message, path } = getErrorMessage(serializeErr, "yaml-to-toml");
          dispatchResult({ type: "error", error: message, path });
          return;
        }
      }
    } catch (err) {
      console.error("Conversion error", err);
      const { message, path } = getErrorMessage(err, mode);
      dispatchResult({ type: "error", error: message, path });
    }
  }, [
    ensureWorker,
    input,
    formatPreset,
    mode,
    sortKeys,
    shouldUseWorker,
    useBasicToml,
    yamlIndent,
    yamlSchemaMode,
  ]);

  useEffect(() => {
    if (stats.bytes > MAX_SIZE_BYTES) {
      setWarning(`Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit of 10MB.`);
    } else if (stats.bytes > 1024 * 1024) {
      setWarning(`Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB).`);
    } else {
      setWarning("");
    }
    dispatchResult({ type: "ready" });
  }, [stats.bytes]);

  useEffect(() => {
    if (!autoConvert) {
      return;
    }

    const schedule = (delay: number) => {
      if (autoConvertTimer.current) {
        clearTimeout(autoConvertTimer.current);
      }
      autoConvertTimer.current = setTimeout(() => {
        if (!input.trim()) {
          dispatchResult({ type: "reset" });
          return;
        }
        const now = Date.now();
        const idleFor = now - lastInputAtRef.current;
        const sinceLastConvert = now - lastConvertAtRef.current;
        if (idleFor < AUTO_CONVERT_IDLE_MS || sinceLastConvert < AUTO_CONVERT_MIN_INTERVAL_MS) {
          const nextDelay = Math.max(
            AUTO_CONVERT_IDLE_MS - idleFor,
            AUTO_CONVERT_MIN_INTERVAL_MS - sinceLastConvert,
            AUTO_CONVERT_DELAY_MS
          );
          schedule(nextDelay);
          return;
        }
        if (result.isProcessing || isWorkerBusy) {
          schedule(AUTO_CONVERT_IDLE_MS);
          return;
        }
        lastConvertAtRef.current = now;
        handleConvert();
      }, delay);
    };

    schedule(AUTO_CONVERT_DELAY_MS);
    return () => {
      if (autoConvertTimer.current) {
        clearTimeout(autoConvertTimer.current);
      }
    };
  }, [autoConvert, handleConvert, input, isWorkerBusy, result.isProcessing]);

  useEffect(() => {
    if (formatDetectTimer.current) {
      clearTimeout(formatDetectTimer.current);
    }
    if (!input.trim()) {
      setFormatSuggestion(null);
      return;
    }
    formatDetectTimer.current = setTimeout(() => {
      const detected = detectInputFormat(input);
      const expected = mode === "toml-to-yaml" ? "toml" : "yaml";
      setFormatSuggestion(detected && detected !== expected ? detected : null);
    }, 250);
    return () => {
      if (formatDetectTimer.current) {
        clearTimeout(formatDetectTimer.current);
      }
    };
  }, [detectInputFormat, input, mode]);

  useEffect(() => {
    if (!result.output && showDiff) {
      setShowDiff(false);
    }
  }, [result.output, showDiff]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const editorOptions = useMemo(
    () => ({
      fontSize: 13,
      minimap: { enabled: false },
      wordWrap: "on" as const,
      scrollBeyondLastLine: false,
      renderLineHighlight: "none" as const,
      overviewRulerBorder: false,
    }),
    []
  );

  const diffOptions = useMemo(
    () => ({
      readOnly: true,
      renderSideBySide: true,
      minimap: { enabled: false },
      wordWrap: "on" as const,
      scrollBeyondLastLine: false,
    }),
    []
  );

  const handleEditorWillMount = useCallback((monaco: typeof import("monaco-editor")) => {
    monacoRef.current = monaco;
    if (!monaco.languages.getLanguages().some((lang) => lang.id === "toml")) {
      monaco.languages.register({ id: "toml" });
      monaco.languages.setMonarchTokensProvider("toml", {
        tokenizer: {
          root: [
            [/#.*$/, "comment"],
            [/^\s*\[[^\]]+\]/, "type.identifier"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, "string", "@string"],
            [/'[^']*'/, "string"],
            [/\b(true|false)\b/, "keyword"],
            [/-?\d+(\.\d+)?/, "number"],
            [/[\w\-]+\s*(?==)/, "identifier"],
            [/[\[\]=.,]/, "delimiter"],
          ],
          string: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, "string", "@pop"],
          ],
        },
      });
      monaco.languages.setLanguageConfiguration("toml", {
        comments: { lineComment: "#" },
        brackets: [
          ["[", "]"],
          ["{", "}"],
          ["(", ")"],
        ],
      });
    }
  }, []);

  const handleInputChange = useCallback((value: string) => {
    lastInputAtRef.current = Date.now();
    setInput(value);
  }, []);

  const loadFile = async (file: File) => {
    const validExtensions = [".toml", ".yaml", ".yml"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const validTypes = ["application/toml", "text/yaml", "application/x-yaml", "text/plain", "application/yaml"];

    if (!hasValidExt && !validTypes.includes(file.type)) {
      dispatchResult({ type: "error", error: "Unsupported file type. Upload TOML, YAML, or YML files only." });
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      dispatchResult({
        type: "error",
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB.`,
      });
      return;
    }

    setIsUploading(true);
    dispatchResult({ type: "reset" });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      await new Promise((resolve) => setTimeout(resolve, 0));
      handleInputChange(content);
      setIsUploading(false);
    };
    reader.onerror = () => {
      dispatchResult({ type: "error", error: "Failed to read file. Please try again." });
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  const handleSwap = () => {
    if (!result.output) return;
    const nextMode = mode === "toml-to-yaml" ? "yaml-to-toml" : "toml-to-yaml";
    setMode(nextMode);
    handleInputChange(result.output);
    dispatchResult({ type: "reset" });
    setCopied(false);
    setShowDiff(false);
    setFormatSuggestion(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await loadFile(file);

    event.target.value = '';
  };

  const handleDownload = () => {
    if (!result.output) return;

    try {
      const extension = mode === "toml-to-yaml" ? "yml" : "toml";
      const mimeType = mode === "toml-to-yaml" ? "text/yaml" : "text/plain";
      const blob = new Blob([result.output], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download", err);
      dispatchResult({ type: "error", error: "Unable to download file. Please try copying the output instead." });
    }
  };

  const handleCopyVariant = async (variant: "output" | "minified" | "escaped") => {
    if (!result.output) return;
    let payload = result.output;
    if (variant === "minified") {
      payload = result.output.replace(/\s+/g, " ").trim();
    }
    if (variant === "escaped") {
      payload = JSON.stringify(result.output);
    }
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      dispatchResult({ type: "error", error: "Unable to copy. Please select and copy manually." });
    }
  };

  const handleCancel = useCallback(() => {
    if (!isWorkerBusy) return;
    const cancelId = workerRequestIdRef.current;
    workerRequestIdRef.current += 1;
    workerRef.current?.postMessage({ type: "cancel", requestId: cancelId });
    setIsWorkerBusy(false);
    setWorkerStage("");
    dispatchResult({ type: "cancel" });
  }, [isWorkerBusy]);

  const handlePresetChange = (preset: FormatPreset) => {
    setFormatPreset(preset);
    const presetConfig = getPresetConfig(preset);
    setYamlIndent(presetConfig.yamlIndent);
    setSortKeys(presetConfig.sortKeys);
  };

  const handleSampleLoad = (nextInput: string, nextMode?: Mode) => {
    if (nextMode) {
      setMode(nextMode);
    }
    handleInputChange(nextInput);
    dispatchResult({ type: "reset" });
    setShowDiff(false);
    setFormatSuggestion(null);
  };

  const inputLanguage = mode === "toml-to-yaml" ? "toml" : "yaml";
  const outputLanguage = mode === "toml-to-yaml" ? "yaml" : "toml";
  const outputValue = result.isProcessing ? (workerStage || result.status) : result.output || "Converted output will appear here.";
  const samples = {
    tomlBasic: 'title = "Example"\n\n[owner]\nname = "Alex"\ndob = 1979-05-27T07:32:00Z\n\n[database]\nports = [8000, 8001, 8002]\nenabled = true\n',
    tomlArrayTables: '[[products]]\nname = "Hammer"\nsku = 738594937\n\n[[products]]\nname = "Nail"\nsku = 284758393\ncolor = "gray"\n',
    tomlNestedKeys: '[server."api.v1"]\nendpoint = "https://example.com"\n\n[server.features]\nflags = ["alpha", "beta"]\n',
    yamlBasic: "name: build\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test\n",
    yamlKube: "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: example\n  labels:\n    app: demo\ndata:\n  config.json: |\n    {\"enabled\": true, \"level\": \"info\"}\n",
    yamlEdge: "created_at: 2024-02-18T12:30:00Z\nitems:\n  - name: alpha\n    values: [1, 2, 3]\n  - name: beta\n    values: [true, false]\n",
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {result.status} {result.error || warning}
      </div>
            {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-slate-600" itemScope itemType="https://schema.org/BreadcrumbList">
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/" itemProp="item" className="underline underline-offset-4 transition hover:text-slate-900">
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li aria-hidden="true">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name" className="font-medium text-slate-900">
              TOML to YAML
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">TOML ⇄ YAML Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert TOML to YAML or YAML to TOML with validation, sorting, and quick copy/download for config files.
        </p>
        <div className="text-xs text-slate-500" aria-live="polite">
          {autoConvert ? "Auto-convert enabled" : "Auto-convert disabled"}
        </div>
        <p className="text-xs text-slate-500">Runs entirely in your browser; files are not uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Direction</span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Conversion direction"
            >
              <option value="toml-to-yaml">TOML → YAML</option>
              <option value="yaml-to-toml">YAML → TOML</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            disabled={result.isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Convert between TOML and YAML"
          >
            {result.isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Convert
              </>
            )}
          </button>
          <button
            onClick={handleSwap}
            disabled={!result.output || result.isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Swap input and output"
          >
            <Shuffle className="h-4 w-4" />
            Swap
          </button>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void loadFile(file);
            }}
            className={`flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${isUploading || result.isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isDragging ? 'ring-2 ring-slate-400 bg-slate-50' : ''}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Load or drop file
              </>
            )}
            <input
              type="file"
              accept=".toml,.yaml,.yml,text/yaml,text/plain"
              onChange={handleFileUpload}
              disabled={isUploading || result.isProcessing}
              className="hidden"
              aria-label="Upload file"
            />
          </label>
          <button
            onClick={() => {
              handleInputChange("");
              dispatchResult({ type: "reset" });
              setShowDiff(false);
              setFormatSuggestion(null);
            }}
            disabled={result.isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Clear all fields"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="format-preset" className="text-xs font-medium text-slate-600">
              Preset:
            </label>
            <select
              id="format-preset"
              value={formatPreset}
              onChange={(e) => handlePresetChange(e.target.value as FormatPreset)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="default">Default</option>
              <option value="kubernetes">Kubernetes YAML</option>
              <option value="github">GitHub Actions</option>
              <option value="minimal">Minimal</option>
              <option value="stable">Stable sorted</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="indent-size" className="text-xs font-medium text-slate-600">
              YAML Indent:
            </label>
            <select
              id="indent-size"
              value={yamlIndent}
              onChange={(e) => setYamlIndent(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="yaml-schema" className="text-xs font-medium text-slate-600">
              YAML Schema:
            </label>
            <select
              id="yaml-schema"
              value={yamlSchemaMode}
              onChange={(e) => setYamlSchemaMode(e.target.value as YamlSchemaMode)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="json">JSON-safe</option>
              <option value="full">Full YAML</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(e) => setSortKeys(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Sort keys
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={autoConvert}
              onChange={(e) => setAutoConvert(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Auto-convert
          </label>
          {mode === "yaml-to-toml" && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={useBasicToml}
                onChange={(e) => setUseBasicToml(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Basic TOML mode
            </label>
          )}
        </div>

        {formatSuggestion && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>
              Detected {formatSuggestion.toUpperCase()} input. Want to switch to{" "}
              {formatSuggestion === "toml" ? "TOML → YAML" : "YAML → TOML"}?
            </span>
            <button
              type="button"
              onClick={() => {
                setMode(formatSuggestion === "toml" ? "toml-to-yaml" : "yaml-to-toml");
                setFormatSuggestion(null);
              }}
              className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition hover:-translate-y-0.5"
            >
              Switch
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Samples</span>
          <button
            type="button"
            onClick={() => handleSampleLoad(samples.tomlBasic, "toml-to-yaml")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5"
          >
            Load sample TOML
          </button>
          <button
            type="button"
            onClick={() => handleSampleLoad(samples.yamlBasic, "yaml-to-toml")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5"
          >
            Load sample YAML
          </button>
          <button
            type="button"
            onClick={() => handleSampleLoad(samples.tomlArrayTables, "toml-to-yaml")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5"
          >
            Arrays of tables
          </button>
          <button
            type="button"
            onClick={() => handleSampleLoad(samples.tomlNestedKeys, "toml-to-yaml")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5"
          >
            Nested keys
          </button>
          <button
            type="button"
            onClick={() => handleSampleLoad(samples.yamlKube, "toml-to-yaml")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5"
          >
            Kubernetes YAML
          </button>
          <button
            type="button"
            onClick={() => handleSampleLoad(samples.yamlEdge, "yaml-to-toml")}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:-translate-y-0.5"
          >
            Datetimes + nested
          </button>
        </div>

        {mode === "yaml-to-toml" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
            YAML → TOML may lose features (comments, anchors, mixed arrays).
          </div>
        )}

        {(isWorkerBusy || result.isProcessing) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span>{workerStage || result.status}</span>
            {isWorkerBusy && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
              <span className="text-sm font-semibold text-slate-900">Input</span>
              <span>{stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines · {(stats.bytes / 1024).toFixed(2)}KB</span>
            </div>
            <div className="h-[260px]">
              <Editor
                value={input}
                language={inputLanguage}
                theme="vs-light"
                options={{ ...editorOptions, ariaLabel: `Input ${inputLanguage.toUpperCase()}` }}
                onChange={(value) => handleInputChange(value ?? "")}
                beforeMount={handleEditorWillMount}
                height="100%"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
              <p className="text-sm font-semibold" id="output-label">Output</p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={showDiff}
                    onChange={(e) => setShowDiff(e.target.checked)}
                    disabled={!result.output}
                    className="h-3.5 w-3.5 rounded border-slate-500 bg-slate-800 text-white focus:ring-2 focus:ring-slate-500"
                  />
                  Show diff
                </label>
                <button
                  onClick={handleDownload}
                  disabled={!result.output}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Download converted file"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <button
                  onClick={() => handleCopyVariant("output")}
                  disabled={!result.output}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy output to clipboard"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => handleCopyVariant("minified")}
                  disabled={!result.output}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy minified output"
                >
                  Copy min
                </button>
                <button
                  onClick={() => handleCopyVariant("escaped")}
                  disabled={!result.output}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy escaped output"
                >
                  Copy escaped
                </button>
              </div>
            </div>
            <div
              className="h-[260px]"
              aria-live="polite"
              aria-busy={result.isProcessing}
              role="region"
              aria-labelledby="output-label"
            >
              {showDiff && result.output ? (
                <DiffEditor
                  original={input}
                  modified={result.output}
                  originalLanguage={inputLanguage}
                  modifiedLanguage={outputLanguage}
                  theme="vs-dark"
                  options={diffOptions}
                  height="100%"
                  beforeMount={handleEditorWillMount}
                />
              ) : (
                <Editor
                  value={outputValue}
                  language={outputLanguage}
                  theme="vs-dark"
                  options={{ ...editorOptions, readOnly: true, ariaLabel: "Output" }}
                  beforeMount={handleEditorWillMount}
                  height="100%"
                />
              )}
            </div>
          </div>
        </div>

        {warning && (
          <p className="text-sm font-medium text-blue-600">{warning}</p>
        )}
        {result.error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700" role="alert">
            <span className="font-semibold">Conversion error:</span> {result.error}
            {result.errorPath && (
              <span className="block text-xs text-amber-700">Path: {result.errorPath}</span>
            )}
          </div>
        ) : !warning && (
          <p className="text-sm text-slate-600">
            Tip: Runs entirely in your browser—perfect for quick config tweaks.
          </p>
        )}
      </div>

      <section className="space-y-2 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            <strong>When to use TOML vs YAML?</strong> TOML suits tooling configs; YAML is common for CI/CD and infra. Convert based on the target system.
          </li>
          <li>
            <strong>Why did my array fail?</strong> Strict TOML disallows mixed arrays and null/undefined entries. Use uniform arrays or enable Basic TOML mode.
          </li>
          <li>
            <strong>Privacy?</strong> Everything runs locally in your browser; no uploads.
          </li>
        </ul>
      </section>
    </main>
  );
}
