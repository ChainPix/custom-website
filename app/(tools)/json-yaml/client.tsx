"use client";

import Editor, { DiffEditor } from "@monaco-editor/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import yaml from "js-yaml";
import { Check, Clipboard, Download, Loader2, RefreshCcw, Sparkles, Upload } from "lucide-react";

type Mode = "json-to-yaml" | "yaml-to-json" | "auto";

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit
const MAX_OUTPUT_BYTES = 25 * 1024 * 1024; // 25MB output cap
const WORKER_THRESHOLD_BYTES = 0;

type WorkerResponse = {
  type: "progress" | "result";
  requestId: number;
  stage?: string;
  output?: string;
  roundTripOutput?: string;
  error?: string;
  errorLine?: number;
  errorColumn?: number;
  detectedMode?: Exclude<Mode, "auto">;
};

export default function JsonYamlClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("json-to-yaml");
  const [copied, setCopied] = useState(false);
  const [errorCopied, setErrorCopied] = useState(false);
  const [error, setError] = useState("");
  const [errorLocation, setErrorLocation] = useState<{ line: number; column: number } | null>(null);
  const [warning, setWarning] = useState("");
  const [yamlIndent, setYamlIndent] = useState(2);
  const [jsonIndent, setJsonIndent] = useState(2);
  const [preserveKeyOrder, setPreserveKeyOrder] = useState(true);
  const [autoConvert, setAutoConvert] = useState(false);
  const [yamlQuoteStyle, setYamlQuoteStyle] = useState<"double" | "single">("double");
  const [yamlFlowLevel, setYamlFlowLevel] = useState(-1);
  const [yamlWrap, setYamlWrap] = useState(true);
  const [yamlLineWidth, setYamlLineWidth] = useState(100);
  const [jsonTrailingNewline, setJsonTrailingNewline] = useState(false);
  const [jsonEscapeUnicode, setJsonEscapeUnicode] = useState(false);
  const [jsonCompact, setJsonCompact] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [roundTripOutput, setRoundTripOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [workerStage, setWorkerStage] = useState("");
  const [detectedMode, setDetectedMode] = useState<Exclude<Mode, "auto"> | null>(null);
  const autoConvertTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingAutoConvertRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);
  const workerRequestIdRef = useRef(0);
  const workerJobRef = useRef<"convert" | "roundtrip" | null>(null);
  const modeRef = useRef(mode);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const inputEditorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const errorDecorationRef = useRef<string[]>([]);

  // Stats calculation
  const stats = useMemo(() => {
    const bytes = new Blob([input]).size;
    const lines = input.split('\n').length;
    const chars = input.length;
    return { bytes, lines, chars };
  }, [input]);

  const shouldUseWorker = stats.bytes >= WORKER_THRESHOLD_BYTES;
  const sizeLimitMessage = `Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 50MB.`;
  const resolvedMode = mode === "auto" ? detectedMode : mode;
  const inputLanguage = resolvedMode === "json-to-yaml" ? "json" : resolvedMode === "yaml-to-json" ? "yaml" : "plaintext";
  const outputLanguage = resolvedMode === "json-to-yaml" ? "yaml" : resolvedMode === "yaml-to-json" ? "json" : "plaintext";
  const outputValue = isProcessing ? (workerStage || "Converting...") : output || "Converted output will appear here.";

  const editorOptions = useMemo(
    () => ({
      fontSize: 13,
      minimap: { enabled: false },
      wordWrap: "on" as const,
      lineNumbers: "on" as const,
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
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

  const setErrorState = useCallback((message: string, location?: { line: number; column: number } | null) => {
    setError(message);
    setErrorCopied(false);
    if (!message) {
      setErrorLocation(null);
      return;
    }
    setErrorLocation(location ?? null);
  }, []);

  // Check input size and warn if too large
  useEffect(() => {
    if (stats.bytes > MAX_SIZE_BYTES) {
      setWarning(`Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds the 50MB limit.`);
    } else if (stats.bytes > 10 * 1024 * 1024) {
      setWarning(`Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB).`);
    } else {
      setWarning("");
    }
  }, [stats.bytes]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    if (typeof Worker === "undefined") return null;

    const worker = new Worker(new URL("./json-yaml.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (!message || message.requestId !== workerRequestIdRef.current) return;
      if (message.type === "progress") {
        setWorkerStage(message.stage || "Working...");
        return;
      }
      setIsProcessing(false);
      setWorkerStage("");
      const activeMode = modeRef.current;
      setDetectedMode(message.detectedMode ?? (activeMode === "auto" ? null : activeMode));
      if (message.error) {
        setErrorState(message.error, message.errorLine && message.errorColumn
          ? { line: message.errorLine, column: message.errorColumn }
          : null);
        setOutput("");
        return;
      }
      setErrorState("");
      setOutput(message.output ?? "");
      if (workerJobRef.current === "roundtrip") {
        setRoundTripOutput(message.roundTripOutput ?? "");
        setShowDiff(Boolean(message.roundTripOutput));
      } else {
        setRoundTripOutput("");
        setShowDiff(false);
      }
    };
    worker.onerror = () => {
      setIsProcessing(false);
      setWorkerStage("");
      setErrorState("Worker crashed while converting. Please try again.");
      setOutput("");
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    if (mode !== "auto") {
      setDetectedMode(null);
    }
  }, [mode]);

  useEffect(() => {
    setRoundTripOutput("");
    setShowDiff(false);
  }, [
    input,
    mode,
    yamlIndent,
    jsonIndent,
    preserveKeyOrder,
    yamlQuoteStyle,
    yamlFlowLevel,
    yamlWrap,
    yamlLineWidth,
    jsonTrailingNewline,
    jsonEscapeUnicode,
    jsonCompact
  ]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isProcessing && pendingAutoConvertRef.current) {
      pendingAutoConvertRef.current = false;
      handleConvert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing]);

  // Auto-convert when input changes
  useEffect(() => {
    if (!autoConvert) {
      return;
    }
    if (autoConvertTimer.current) {
      clearTimeout(autoConvertTimer.current);
    }
    if (stats.bytes > MAX_SIZE_BYTES) {
      setErrorState(sizeLimitMessage);
      setOutput("");
      return;
    }
    autoConvertTimer.current = setTimeout(() => {
      if (!input.trim()) {
        setOutput("");
        setErrorState("");
        return;
      }
      if (isProcessing) {
        pendingAutoConvertRef.current = true;
        return;
      }
      handleConvert();
    }, 250);
    return () => {
      if (autoConvertTimer.current) {
        clearTimeout(autoConvertTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input,
    mode,
    yamlIndent,
    jsonIndent,
    preserveKeyOrder,
    autoConvert,
    isProcessing,
    stats.bytes,
    sizeLimitMessage,
    yamlQuoteStyle,
    yamlFlowLevel,
    yamlWrap,
    yamlLineWidth,
    jsonTrailingNewline,
    jsonEscapeUnicode,
    jsonCompact
  ]);

  const getJsonErrorLocation = (err: Error) => {
    const match = err.message.match(/position (\d+)/);
    if (!match) return null;
    const position = parseInt(match[1], 10);
    const lines = input.substring(0, position).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    return { line, column };
  };

  const getYamlErrorLocation = (err: Error) => {
    const mark = (err as yaml.YAMLException & { mark?: { line: number; column: number } }).mark;
    if (mark && typeof mark.line === "number" && typeof mark.column === "number") {
      return { line: mark.line + 1, column: mark.column + 1 };
    }
    return null;
  };

  const getBetterErrorMessage = (err: unknown, conversionMode: Mode): string => {
    if (err instanceof Error) {
      if (conversionMode === "json-to-yaml") {
        const location = getJsonErrorLocation(err);
        if (location) {
          return `Invalid JSON at line ${location.line}, column ${location.column}: ${err.message}`;
        }
        return `Invalid JSON: ${err.message}`;
      }
      const location = getYamlErrorLocation(err);
      if (location) {
        return `Invalid YAML at line ${location.line}, column ${location.column}: ${err.message}`;
      }
      return `Invalid YAML: ${err.message}`;
    }
    return `Invalid ${conversionMode === "json-to-yaml" ? "JSON" : "YAML"} input.`;
  };

  const tryParseJson = (text: string) => {
    try {
      return { ok: true as const, value: JSON.parse(text) };
    } catch (err) {
      if (err instanceof Error) {
        const location = getJsonErrorLocation(err);
        const message = location
          ? `Invalid JSON at line ${location.line}, column ${location.column}: ${err.message}`
          : `Invalid JSON: ${err.message}`;
        return { ok: false as const, error: message, line: location?.line, column: location?.column };
      }
      return { ok: false as const, error: "Invalid JSON input." };
    }
  };

  const tryParseYaml = (text: string) => {
    try {
      return { ok: true as const, value: yaml.load(text, { schema: yaml.JSON_SCHEMA }) };
    } catch (err) {
      if (err instanceof Error) {
        const location = getYamlErrorLocation(err);
        const message = location
          ? `Invalid YAML at line ${location.line}, column ${location.column}: ${err.message}`
          : `Invalid YAML: ${err.message}`;
        return { ok: false as const, error: message, line: location?.line, column: location?.column };
      }
      return { ok: false as const, error: "Invalid YAML input." };
    }
  };

  const sortObjectKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(item => sortObjectKeys(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((result: Record<string, unknown>, key) => {
          result[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
          return result;
        }, {});
    }
    return obj;
  };

  const isPlainObject = (value: object) => {
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  };

  const findJsonUnsafeValue = (value: unknown, path = "$"): { path: string; reason: string } | null => {
    if (value === undefined) {
      return { path, reason: "value is undefined" };
    }
    if (value === null) return null;
    if (typeof value === "string" || typeof value === "boolean") return null;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return { path, reason: "number is not finite" };
      }
      return null;
    }
    if (typeof value === "bigint") {
      return { path, reason: "value is a BigInt" };
    }
    if (typeof value === "function" || typeof value === "symbol") {
      return { path, reason: `value is a ${typeof value}` };
    }
    if (value instanceof Date) {
      return { path, reason: "value is a Date" };
    }
    if (value instanceof Map) {
      return { path, reason: "value is a Map" };
    }
    if (value instanceof Set) {
      return { path, reason: "value is a Set" };
    }
    if (value instanceof RegExp) {
      return { path, reason: "value is a RegExp" };
    }
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const found = findJsonUnsafeValue(value[index], `${path}[${index}]`);
        if (found) return found;
      }
      return null;
    }
    if (typeof value === "object") {
      if (!isPlainObject(value)) {
        return { path, reason: "value is a non-plain object" };
      }
      for (const [key, child] of Object.entries(value)) {
        const found = findJsonUnsafeValue(child, `${path}.${key}`);
        if (found) return found;
      }
      return null;
    }
    return { path, reason: "value is not JSON-compatible" };
  };

  const getByteSize = (value: string) => new TextEncoder().encode(value).length;

  const escapeUnicodeString = (value: string) =>
    value.replace(/[^\u0000-\u007f]/g, (char) => {
      const code = char.codePointAt(0);
      if (code === undefined) return char;
      if (code <= 0xffff) {
        return `\\u${code.toString(16).padStart(4, "0")}`;
      }
      const high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
      const low = ((code - 0x10000) % 0x400) + 0xdc00;
      return `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
    });

  const applyJsonFormatting = (value: string) => {
    const escaped = jsonEscapeUnicode ? escapeUnicodeString(value) : value;
    return jsonTrailingNewline ? `${escaped}\n` : escaped;
  };

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleInputEditorMount = useCallback(
    (editor: import("monaco-editor").editor.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => {
      inputEditorRef.current = editor;
      monacoRef.current = monaco;
      if (errorLocation) {
        errorDecorationRef.current = editor.deltaDecorations(errorDecorationRef.current, [
          {
            range: new monaco.Range(errorLocation.line, 1, errorLocation.line, 1),
            options: { isWholeLine: true, className: "json-yaml-error-line" }
          }
        ]);
      }
    },
    [errorLocation]
  );

  const detectAutoMode = (text: string) => {
    const trimmed = text.trim();
    const preferJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    const jsonResult = tryParseJson(text);
    const yamlResult = tryParseYaml(text);

    if (jsonResult.ok && yamlResult.ok) {
      return { ok: false as const, error: "Ambiguous input: valid JSON and YAML. Please choose a direction." };
    }
    if (jsonResult.ok) {
      return { ok: true as const, mode: "json-to-yaml" as const, parsedValue: jsonResult.value };
    }
    if (yamlResult.ok) {
      return { ok: true as const, mode: "yaml-to-json" as const, parsedValue: yamlResult.value };
    }

    if (preferJson && !jsonResult.ok) {
      return { ok: false as const, error: jsonResult.error, line: jsonResult.line, column: jsonResult.column };
    }
    if (!yamlResult.ok) {
      return { ok: false as const, error: yamlResult.error, line: yamlResult.line, column: yamlResult.column };
    }
    return { ok: false as const, error: "Invalid input." };
  };

  const handleConvert = async () => {
    if (!input.trim()) {
      setErrorState("");
      setOutput("");
      return;
    }
    if (stats.bytes > MAX_SIZE_BYTES) {
      setErrorState(sizeLimitMessage);
      setOutput("");
      return;
    }

    setIsProcessing(true);
    setErrorState("");
    setWorkerStage("Starting...");
    setDetectedMode(null);
    setRoundTripOutput("");
    setShowDiff(false);
    workerJobRef.current = null;

    const worker = ensureWorker();
    if (worker && shouldUseWorker) {
      workerJobRef.current = "convert";
      const requestId = workerRequestIdRef.current + 1;
      workerRequestIdRef.current = requestId;
      const trimmed = input.trim();
      const preferMode = trimmed.startsWith("{") || trimmed.startsWith("[") ? "json" : "yaml";
      worker.postMessage({
        type: "convert",
        requestId,
        input,
        mode,
        yamlIndent,
        jsonIndent,
        preserveKeyOrder,
        preferMode,
        yamlQuoteStyle,
        yamlFlowLevel,
        yamlWrap,
        yamlLineWidth,
        jsonTrailingNewline,
        jsonEscapeUnicode,
        jsonCompact
      });
      return;
    }

    try {
      let conversionMode: Exclude<Mode, "auto">;
      let parsedValue: unknown;

      if (mode === "auto") {
        const detection = detectAutoMode(input);
        if (!detection.ok) {
          setErrorState(detection.error, detection.line && detection.column ? { line: detection.line, column: detection.column } : null);
          setOutput("");
          return;
        }
        conversionMode = detection.mode;
        parsedValue = detection.parsedValue;
      } else if (mode === "json-to-yaml") {
        const parsed = tryParseJson(input);
        if (!parsed.ok) {
          setErrorState(parsed.error, parsed.line && parsed.column ? { line: parsed.line, column: parsed.column } : null);
          setOutput("");
          return;
        }
        conversionMode = mode;
        parsedValue = parsed.value;
      } else {
        const parsed = tryParseYaml(input);
        if (!parsed.ok) {
          setErrorState(parsed.error, parsed.line && parsed.column ? { line: parsed.line, column: parsed.column } : null);
          setOutput("");
          return;
        }
        conversionMode = mode;
        parsedValue = parsed.value;
      }

      if (conversionMode === "json-to-yaml") {
        const dataToConvert = preserveKeyOrder ? parsedValue : sortObjectKeys(parsedValue);
        try {
          const converted = yaml.dump(dataToConvert, {
            indent: yamlIndent,
            lineWidth: yamlWrap ? yamlLineWidth : -1,
            noRefs: true,
            quotingType: yamlQuoteStyle === "single" ? "'" : "\"",
            flowLevel: yamlFlowLevel
          });
          if (getByteSize(converted) > MAX_OUTPUT_BYTES) {
            setErrorState("Converted output exceeds the 25MB limit. Please reduce the input size.");
            setOutput("");
            return;
          }
          setOutput(converted);
        } catch (dumpErr) {
          setErrorState("Unable to convert to YAML (possible circular references).");
          setOutput("");
          return;
        }
      } else {
        if (parsedValue === undefined || parsedValue === null || parsedValue === "") {
          setErrorState("Parsed YAML is empty; please provide valid content.");
          setOutput("");
          return;
        }
        const unsafeValue = findJsonUnsafeValue(parsedValue);
        if (unsafeValue) {
          setErrorState(`YAML contains a value that cannot be converted to JSON at ${unsafeValue.path} (${unsafeValue.reason}).`);
          setOutput("");
          return;
        }
        const dataToConvert = preserveKeyOrder ? parsedValue : sortObjectKeys(parsedValue);
        try {
          const indent = jsonCompact ? 0 : jsonIndent;
          const rawOutput = JSON.stringify(dataToConvert, null, indent);
          const converted = applyJsonFormatting(rawOutput);
          if (getByteSize(converted) > MAX_OUTPUT_BYTES) {
            setErrorState("Converted output exceeds the 25MB limit. Please reduce the input size.");
            setOutput("");
            return;
          }
          setOutput(converted);
        } catch (stringifyErr) {
          setErrorState("Unable to convert to JSON. Ensure YAML has no anchors or circular structures.");
          setOutput("");
          return;
        }
      }
      setDetectedMode(conversionMode);
    } catch (err) {
      console.error("Conversion error", err);
      setErrorState(getBetterErrorMessage(err, mode));
      setOutput("");
    } finally {
      setIsProcessing(false);
      setWorkerStage("");
    }
  };

  const handleRoundTrip = async () => {
    if (!input.trim()) {
      setErrorState("");
      setOutput("");
      return;
    }
    if (stats.bytes > MAX_SIZE_BYTES) {
      setErrorState(sizeLimitMessage);
      setOutput("");
      return;
    }

    setIsProcessing(true);
    setErrorState("");
    setWorkerStage("Starting round-trip...");
    setDetectedMode(null);
    setRoundTripOutput("");
    setShowDiff(false);
    workerJobRef.current = null;

    const worker = ensureWorker();
    if (worker && shouldUseWorker) {
      workerJobRef.current = "roundtrip";
      const requestId = workerRequestIdRef.current + 1;
      workerRequestIdRef.current = requestId;
      const trimmed = input.trim();
      const preferMode = trimmed.startsWith("{") || trimmed.startsWith("[") ? "json" : "yaml";
      worker.postMessage({
        type: "roundtrip",
        requestId,
        input,
        mode,
        yamlIndent,
        jsonIndent,
        preserveKeyOrder,
        preferMode,
        yamlQuoteStyle,
        yamlFlowLevel,
        yamlWrap,
        yamlLineWidth,
        jsonTrailingNewline,
        jsonEscapeUnicode,
        jsonCompact
      });
      return;
    }

    try {
      let conversionMode: Exclude<Mode, "auto">;
      let parsedValue: unknown;

      if (mode === "auto") {
        const detection = detectAutoMode(input);
        if (!detection.ok) {
          setErrorState(detection.error, detection.line && detection.column ? { line: detection.line, column: detection.column } : null);
          setOutput("");
          return;
        }
        conversionMode = detection.mode;
        parsedValue = detection.parsedValue;
      } else if (mode === "json-to-yaml") {
        const parsed = tryParseJson(input);
        if (!parsed.ok) {
          setErrorState(parsed.error, parsed.line && parsed.column ? { line: parsed.line, column: parsed.column } : null);
          setOutput("");
          return;
        }
        conversionMode = mode;
        parsedValue = parsed.value;
      } else {
        const parsed = tryParseYaml(input);
        if (!parsed.ok) {
          setErrorState(parsed.error, parsed.line && parsed.column ? { line: parsed.line, column: parsed.column } : null);
          setOutput("");
          return;
        }
        conversionMode = mode;
        parsedValue = parsed.value;
      }

      if (conversionMode === "json-to-yaml") {
        const dataToConvert = preserveKeyOrder ? parsedValue : sortObjectKeys(parsedValue);
        const forward = yaml.dump(dataToConvert, {
          indent: yamlIndent,
          lineWidth: yamlWrap ? yamlLineWidth : -1,
          noRefs: true,
          quotingType: yamlQuoteStyle === "single" ? "'" : "\"",
          flowLevel: yamlFlowLevel
        });
        if (getByteSize(forward) > MAX_OUTPUT_BYTES) {
          setErrorState("Converted output exceeds the 25MB limit. Please reduce the input size.");
          setOutput("");
          return;
        }
        let parsedBack: unknown;
        try {
          parsedBack = yaml.load(forward, { schema: yaml.JSON_SCHEMA });
        } catch (err) {
          setErrorState("Round-trip failed while parsing converted YAML.");
          setOutput("");
          return;
        }
        if (parsedBack === undefined || parsedBack === null || parsedBack === "") {
          setErrorState("Parsed YAML is empty; please provide valid content.");
          setOutput("");
          return;
        }
        const unsafeValue = findJsonUnsafeValue(parsedBack);
        if (unsafeValue) {
          setErrorState(`YAML contains a value that cannot be converted to JSON at ${unsafeValue.path} (${unsafeValue.reason}).`);
          setOutput("");
          return;
        }
        const roundTripValue = preserveKeyOrder ? parsedBack : sortObjectKeys(parsedBack);
        const indent = jsonCompact ? 0 : jsonIndent;
        const rawOutput = JSON.stringify(roundTripValue, null, indent);
        const back = applyJsonFormatting(rawOutput);
        if (getByteSize(back) > MAX_OUTPUT_BYTES) {
          setErrorState("Round-trip output exceeds the 25MB limit. Please reduce the input size.");
          setOutput("");
          return;
        }
        setOutput(forward);
        setRoundTripOutput(back);
        setShowDiff(true);
      } else {
        if (parsedValue === undefined || parsedValue === null || parsedValue === "") {
          setErrorState("Parsed YAML is empty; please provide valid content.");
          setOutput("");
          return;
        }
        const unsafeValue = findJsonUnsafeValue(parsedValue);
        if (unsafeValue) {
          setErrorState(`YAML contains a value that cannot be converted to JSON at ${unsafeValue.path} (${unsafeValue.reason}).`);
          setOutput("");
          return;
        }
        const dataToConvert = preserveKeyOrder ? parsedValue : sortObjectKeys(parsedValue);
        const indent = jsonCompact ? 0 : jsonIndent;
        const rawOutput = JSON.stringify(dataToConvert, null, indent);
        const forward = applyJsonFormatting(rawOutput);
        if (getByteSize(forward) > MAX_OUTPUT_BYTES) {
          setErrorState("Converted output exceeds the 25MB limit. Please reduce the input size.");
          setOutput("");
          return;
        }
        let parsedBack: unknown;
        try {
          parsedBack = JSON.parse(forward);
        } catch (err) {
          setErrorState("Round-trip failed while parsing converted JSON.");
          setOutput("");
          return;
        }
        const backValue = preserveKeyOrder ? parsedBack : sortObjectKeys(parsedBack);
        const back = yaml.dump(backValue, {
          indent: yamlIndent,
          lineWidth: yamlWrap ? yamlLineWidth : -1,
          noRefs: true,
          quotingType: yamlQuoteStyle === "single" ? "'" : "\"",
          flowLevel: yamlFlowLevel
        });
        if (getByteSize(back) > MAX_OUTPUT_BYTES) {
          setErrorState("Round-trip output exceeds the 25MB limit. Please reduce the input size.");
          setOutput("");
          return;
        }
        setOutput(forward);
        setRoundTripOutput(back);
        setShowDiff(true);
      }
      setDetectedMode(conversionMode);
    } catch (err) {
      console.error("Round-trip error", err);
      setErrorState("Round-trip failed. Please try again.");
      setOutput("");
    } finally {
      setIsProcessing(false);
      setWorkerStage("");
    }
  };

  const handleCancel = () => {
    if (!isProcessing) return;
    pendingAutoConvertRef.current = false;
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    workerRequestIdRef.current += 1;
    workerJobRef.current = null;
    setIsProcessing(false);
    setWorkerStage("");
    setErrorState("Conversion canceled.");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = [".json", ".yaml", ".yml"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const validTypes = ["application/json", "text/yaml", "application/x-yaml", "text/plain", "application/yaml"];

    if (!hasValidExt && !validTypes.includes(file.type)) {
      setErrorState("Unsupported file type. Upload JSON, YAML, or YML files.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setErrorState(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 50MB.`);
      return;
    }

    setIsUploading(true);
    setErrorState("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;

      setInput(content);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setErrorState("Failed to read file. Please try again.");
      setIsUploading(false);
    };
    reader.readAsText(file);

    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  const handleDownload = () => {
    if (!output) return;

    try {
      const extension = mode === "json-to-yaml" ? "yml" : "json";
      const mimeType = mode === "json-to-yaml" ? "text/yaml" : "application/json";
      const blob = new Blob([output], { type: mimeType });
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
      setErrorState("Unable to download file. Please try copying the output instead.");
    }
  };

  const handleCopy = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setErrorState("Unable to copy. Please select and copy manually.");
    }
  };

  const handleCopyError = async () => {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(error);
      setErrorCopied(true);
      setTimeout(() => setErrorCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      setErrorState("Unable to copy error text. Please select and copy manually.");
    }
  };

  const handleJumpToError = () => {
    if (!errorLocation || !inputEditorRef.current) return;
    inputEditorRef.current.revealPositionInCenter({ lineNumber: errorLocation.line, column: errorLocation.column });
    inputEditorRef.current.setPosition({ lineNumber: errorLocation.line, column: errorLocation.column });
    inputEditorRef.current.focus();
  };

  useEffect(() => {
    const editor = inputEditorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    if (!errorLocation) {
      errorDecorationRef.current = editor.deltaDecorations(errorDecorationRef.current, []);
      return;
    }
    errorDecorationRef.current = editor.deltaDecorations(errorDecorationRef.current, [
      {
        range: new monaco.Range(errorLocation.line, 1, errorLocation.line, 1),
        options: { isWholeLine: true, className: "json-yaml-error-line" }
      }
    ]);
  }, [errorLocation]);

  return (
    <main className="space-y-8">
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
              {mode === "auto" ? "Detect input type" : mode === "json-to-yaml" ? "JSON to YAML" : "YAML to JSON"}
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JSON ⇄ YAML Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert JSON to YAML or YAML to JSON with validation. Perfect for configs, APIs, and infra
          files.
        </p>
        <div className="text-xs text-slate-500" aria-live="polite">
          {autoConvert ? "Auto-convert enabled" : "Auto-convert disabled"}
        </div>
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
              <option value="auto">Detect input type</option>
              <option value="json-to-yaml">JSON → YAML</option>
              <option value="yaml-to-json">YAML → JSON</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Convert between JSON and YAML"
          >
            {isProcessing ? (
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
            onClick={handleCancel}
            disabled={!isProcessing}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel conversion"
          >
            Cancel
          </button>
          <button
            onClick={handleRoundTrip}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Run round-trip check"
          >
            Round-trip check
          </button>
          <label className={`flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${isUploading || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Load File
              </>
            )}
            <input
              type="file"
              accept=".json,.yaml,.yml,application/json,text/yaml,text/plain"
              onChange={handleFileUpload}
              disabled={isUploading || isProcessing}
              className="hidden"
              aria-label="Upload file"
            />
          </label>
          <button
            onClick={() => {
              setInput("");
              setOutput("");
              setErrorState("");
            }}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear all fields"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </button>
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2">
            <label htmlFor="indent-size" className="text-xs font-medium text-slate-600">
              {resolvedMode === "json-to-yaml" ? "YAML" : resolvedMode === "yaml-to-json" ? "JSON" : "YAML/JSON"} Indent:
            </label>
            <select
              id="indent-size"
              value={mode === "json-to-yaml" ? yamlIndent : jsonIndent}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (mode === "json-to-yaml") {
                  setYamlIndent(value);
                } else {
                  setJsonIndent(value);
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={preserveKeyOrder}
              onChange={(e) => setPreserveKeyOrder(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Preserve key order
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
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">YAML Quote</label>
            <select
              value={yamlQuoteStyle}
              onChange={(e) => setYamlQuoteStyle(e.target.value as "double" | "single")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="double">Double</option>
              <option value="single">Single</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Flow level</label>
            <select
              value={yamlFlowLevel}
              onChange={(e) => setYamlFlowLevel(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={-1}>Block only</option>
              <option value={0}>Flow 0+</option>
              <option value={1}>Flow 1+</option>
              <option value={2}>Flow 2+</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={yamlWrap}
              onChange={(e) => setYamlWrap(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Wrap lines
          </label>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Line width</label>
            <select
              value={yamlLineWidth}
              onChange={(e) => setYamlLineWidth(Number(e.target.value))}
              disabled={!yamlWrap}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
            >
              <option value={80}>80</option>
              <option value={100}>100</option>
              <option value={120}>120</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={jsonCompact}
              onChange={(e) => setJsonCompact(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Compact JSON
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={jsonTrailingNewline}
              onChange={(e) => setJsonTrailingNewline(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Trailing newline
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={jsonEscapeUnicode}
              onChange={(e) => setJsonEscapeUnicode(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Escape unicode
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 text-xs text-slate-600">
            <span className="text-sm font-semibold text-slate-900">Input</span>
            <span>{stats.chars.toLocaleString()} chars · {stats.lines.toLocaleString()} lines · {(stats.bytes / 1024).toFixed(2)} KB</span>
          </div>
          <div className="h-[240px]">
            <Editor
              value={input}
              language={inputLanguage}
              theme="vs-light"
              options={{ ...editorOptions, ariaLabel: `Input ${inputLanguage.toUpperCase()}` }}
              onChange={(value) => handleInputChange(value ?? "")}
              onMount={handleInputEditorMount}
              height="100%"
            />
          </div>
        </div>

        {/* Stats */}
        {warning && (
          <p className="text-sm font-medium text-blue-600">{warning}</p>
        )}
        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700" role="alert">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">Conversion error</span>
              <div className="flex flex-wrap items-center gap-2">
                {errorLocation && (
                  <button
                    type="button"
                    onClick={handleJumpToError}
                    className="rounded-full border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    Line {errorLocation.line}, Col {errorLocation.column}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyError}
                  className="rounded-full border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                >
                  {errorCopied ? "Copied" : "Copy error"}
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : !warning && (
          <p className="text-sm text-slate-600">
            Tip: Validate configs before deploying. This runs entirely in your browser.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold">Output</p>
          <div className="flex items-center gap-2">
            {roundTripOutput && (
              <label className="flex items-center gap-2 text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={showDiff}
                  onChange={(e) => setShowDiff(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-500 bg-slate-800 text-white focus:ring-2 focus:ring-slate-500"
                />
                Show diff
              </label>
            )}
            <button
              onClick={handleDownload}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Download converted file"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="h-[240px]">
          {showDiff && roundTripOutput ? (
            <DiffEditor
              original={input}
              modified={roundTripOutput}
              originalLanguage={inputLanguage}
              modifiedLanguage={inputLanguage}
              theme="vs-dark"
              options={diffOptions}
              height="100%"
            />
          ) : (
            <Editor
              value={outputValue}
              language={outputLanguage}
              theme="vs-dark"
              options={{ ...editorOptions, readOnly: true, ariaLabel: "Output" }}
              height="100%"
            />
          )}
        </div>
      </div>
    </main>
  );
}
