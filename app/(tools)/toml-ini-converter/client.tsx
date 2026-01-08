"use client";

import Link from "next/link";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import ini from "ini";
import toml from "toml";
import { stringify as stringifyToml } from "@iarna/toml";
import Ajv, { type ErrorObject } from "ajv";
import { Check, Clipboard, Download, RefreshCcw, Shuffle, Upload } from "lucide-react";

type Mode = "toml" | "ini" | "json";
type IniArrayDelimiter = "comma" | "newline";
type IniDuplicateKeys = "last" | "array";
type ParseResult = {
  output: string;
  error: string;
  errorLocation: ErrorLocation | null;
  warning: string;
  status: string;
  schemaValidation: SchemaValidation | null;
};

type ErrorLocation = {
  line: number;
  column: number;
};

type SchemaIssue = {
  path: string;
  message: string;
};

type SchemaValidation = {
  valid: boolean;
  errors: SchemaIssue[];
  schemaError: string;
};

export default function TomlIniClient() {
  const [input, setInput] = useState('[db]\nhost="localhost"\nport=5432');
  const [mode, setMode] = useState<Mode>("toml");
  const [outputFormat, setOutputFormat] = useState<Mode>("json");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [pretty, setPretty] = useState(true);
  const [warning, setWarning] = useState("");
  const [nestIniDots, setNestIniDots] = useState(true);
  const [iniArrayDelimiter, setIniArrayDelimiter] = useState<IniArrayDelimiter>("comma");
  const [iniDuplicateKeys, setIniDuplicateKeys] = useState<IniDuplicateKeys>("last");
  const [iniCoerceTypes, setIniCoerceTypes] = useState(true);
  const [schemaEnabled, setSchemaEnabled] = useState(false);
  const [schemaInput, setSchemaInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [diffMode, setDiffMode] = useState(false);
  const [compareSource, setCompareSource] = useState<"converted" | "custom">("converted");
  const [compareInput, setCompareInput] = useState("");
  const MAX_CHARS = 40000;
  const DEBOUNCE_DELAY_MS = 300;
  const DEBOUNCE_THRESHOLD = 2000;
  const WORKER_THRESHOLD = 20000;
  const [debouncedInput, setDebouncedInput] = useState(input);
  const [workerResult, setWorkerResult] = useState<ParseResult | null>(null);
  const [isWorkerParsing, setIsWorkerParsing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const ajvRef = useRef<Ajv | null>(null);
  const inputEditorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const outputEditorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<ParseResult | null>(null);
  const modeRef = useRef(mode);
  const outputFormatRef = useRef(outputFormat);

  const findIniLineError = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const trimmed = lines[index].trim();
      if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#")) {
        continue;
      }
      if (trimmed.startsWith("[") && !/^\[[^\]]+\]\s*$/.test(trimmed)) {
        return { line: index + 1, message: `Invalid INI section header at line ${index + 1}.` };
      }
    }
    return null;
  };

  const samples = {
    tomlSimple: '[db]\nhost="localhost"\nport=5432\n',
    tomlNested: '[server]\nports = [8000, 8001]\n[client]\nname = "app"\n[client.auth]\nuser="alice"\n',
    iniSimple: "[db]\nhost=localhost\nport=5432\n",
    iniDotted: "[server]\nports=8000,8001\n[client]\nname=app\n[client.auth]\nuser=alice\n",
    jsonSimple: '{\n  "db": {\n    "host": "localhost",\n    "port": 5432\n  }\n}\n',
    jsonNested: '{\n  "server": {\n    "ports": [8000, 8001]\n  },\n  "client": {\n    "name": "app",\n    "auth": {\n      "user": "alice"\n    }\n  }\n}\n',
  };

  const preservesInput = outputFormat === mode && !pretty;
  const lossyWarnings = useMemo(() => {
    const warnings: string[] = [];
    const hasTomlComments = /(^|\n)\s*#/.test(input);
    const hasIniComments = /(^|\n)\s*[;#]/.test(input);

    if (!preservesInput) {
      if (mode === "toml" && hasTomlComments) {
        warnings.push("TOML comments are not preserved in output.");
      }
      if (mode === "ini" && hasIniComments) {
        warnings.push("INI comments are not preserved in output.");
      }
      warnings.push("Key ordering may change during conversion.");
      warnings.push("Duplicate keys may be overwritten by the last value.");
    }

    if (outputFormat === "ini") {
      warnings.push("INI output cannot represent all nested structures; arrays become repeated keys.");
    }
    if (mode === "ini" && outputFormat !== "ini") {
      warnings.push("INI has no explicit types; numbers/booleans are inferred.");
    }
    if (
      (mode === "toml" && outputFormat === "ini") ||
      (mode === "ini" && outputFormat === "toml")
    ) {
      warnings.push("TOML ↔ INI conversions can be lossy; nested structures may flatten.");
    }

    return warnings;
  }, [input, mode, outputFormat, preservesInput]);

  const warningMessage = useMemo(() => {
    const warnings: string[] = [];
    if (input.length > MAX_CHARS) {
      warnings.push("Large input; parsing may be slow. Consider trimming.");
    }
    if (lossyWarnings.length > 0) {
      warnings.push("Lossy conversion warnings available.");
    }
    return warnings.join(" ");
  }, [input.length, lossyWarnings.length]);
  const shouldUseWorker = debouncedInput.length >= WORKER_THRESHOLD;

  const getAjv = () => {
    if (!ajvRef.current) {
      ajvRef.current = new Ajv({ allErrors: true, strict: false });
    }
    return ajvRef.current;
  };

  const toSchemaIssues = (errors: ErrorObject[] | null | undefined): SchemaIssue[] =>
    (errors || []).map((err) => ({
      path: err.instancePath || "(root)",
      message: err.message || "Schema validation error.",
    }));

  const validateSchema = (value: unknown): SchemaValidation | null => {
    if (!schemaEnabled) return null;
    const trimmed = schemaInput.trim();
    if (!trimmed) {
      return { valid: false, errors: [], schemaError: "Schema is empty." };
    }
    try {
      const schema = JSON.parse(trimmed);
      const ajv = getAjv();
      const validate = ajv.compile(schema);
      const valid = Boolean(validate(value));
      return {
        valid,
        errors: valid ? [] : toSchemaIssues(validate.errors),
        schemaError: "",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid schema JSON.";
      return { valid: false, errors: [], schemaError: `Invalid schema: ${message}` };
    }
  };

  const coerceIniPrimitive = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    if (trimmed === "null") return null;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return value;
  };

  const transformIniValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map((entry) => transformIniValue(entry));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, transformIniValue(val)])
      );
    }
    if (typeof value === "boolean") {
      return iniCoerceTypes ? value : value ? "true" : "false";
    }
    if (value === null) {
      return iniCoerceTypes ? null : "null";
    }
    if (typeof value !== "string") return value;

    const segments =
      iniArrayDelimiter === "comma" && value.includes(",")
        ? value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0)
        : [value];
    if (segments.length > 1) {
      return iniCoerceTypes ? segments.map((entry) => coerceIniPrimitive(entry)) : segments;
    }
    return iniCoerceTypes ? coerceIniPrimitive(value) : value;
  };

  const detectModeFromName = (name: string): Mode | null => {
    const ext = name.toLowerCase().split(".").pop();
    if (ext === "toml") return "toml";
    if (ext === "ini") return "ini";
    if (ext === "json") return "json";
    return null;
  };

  const loadFile = async (file: File) => {
    const content = await file.text();
    const detected = detectModeFromName(file.name);
    if (detected) {
      setMode(detected);
      setOutputFormat("json");
    }
    setInput(content);
    setStatus(`Loaded ${file.name}`);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void loadFile(files[0]);
  };

  const getLineColumn = (text: string, offset: number): ErrorLocation => {
    const safeOffset = Math.max(0, Math.min(offset, text.length));
    const upto = text.slice(0, safeOffset);
    const lines = upto.split("\n");
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
  };

  const extractJsonErrorLocation = (message: string, raw: string): ErrorLocation | null => {
    const match = message.match(/position\s+(\d+)/i);
    if (!match) return null;
    const offset = Number(match[1]);
    if (Number.isNaN(offset)) return null;
    return getLineColumn(raw, offset);
  };

  const findJsonPointerLocation = (text: string, pointer: string): ErrorLocation | null => {
    const segments = pointer.split("/").slice(1).map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
    const last = segments[segments.length - 1];
    if (!last) return null;
    const needle = `"${last}"`;
    const index = text.indexOf(needle);
    if (index === -1) return null;
    return getLineColumn(text, index);
  };

  const clearMarkers = (editor: import("monaco-editor").editor.IStandaloneCodeEditor | null) => {
    const model = editor?.getModel();
    const monaco = monacoRef.current;
    if (!model || !monaco) return;
    monaco.editor.setModelMarkers(model, "toml-ini", []);
  };

  const setMarkers = (
    editor: import("monaco-editor").editor.IStandaloneCodeEditor | null,
    markers: import("monaco-editor").editor.IMarkerData[]
  ) => {
    const model = editor?.getModel();
    const monaco = monacoRef.current;
    if (!model || !monaco) return;
    monaco.editor.setModelMarkers(model, "toml-ini", markers);
  };

  useEffect(() => {
    if (input.length < DEBOUNCE_THRESHOLD) {
      setDebouncedInput(input);
      return;
    }
    const handle = window.setTimeout(() => setDebouncedInput(input), DEBOUNCE_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [input, DEBOUNCE_DELAY_MS, DEBOUNCE_THRESHOLD]);

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./toml-ini.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ParseResult & { requestId: number; type?: string }>) => {
      const message = event.data;
      if (!message || message.type !== "result" || typeof message.requestId !== "number") return;
      if (message.requestId !== requestIdRef.current) return;
      setIsWorkerParsing(false);
      setWorkerResult({
        output: message.output,
        error: message.error,
        errorLocation: message.errorLocation || null,
        warning: "",
        status: message.status,
        schemaValidation: message.schemaValidation,
      });
    };
    workerRef.current = worker;
    return worker;
  };

  useEffect(() => {
    if (!shouldUseWorker) {
      setIsWorkerParsing(false);
      setWorkerResult(null);
      return;
    }
    const worker = ensureWorker();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsWorkerParsing(true);
    setWorkerResult(null);
    worker.postMessage({
      type: "parse",
      requestId,
      input: debouncedInput,
      mode,
      outputFormat,
      pretty,
      nestIniDots,
      iniArrayDelimiter,
      iniDuplicateKeys,
      iniCoerceTypes,
      schemaEnabled,
      schemaInput,
    });
  }, [
    debouncedInput,
    mode,
    nestIniDots,
    outputFormat,
    pretty,
    iniArrayDelimiter,
    iniDuplicateKeys,
    iniCoerceTypes,
    schemaEnabled,
    schemaInput,
    shouldUseWorker,
  ]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const localResult = useMemo<ParseResult>(() => {
    if (shouldUseWorker) {
      return {
        output: "",
        error: "",
        errorLocation: null,
        warning: warningMessage,
        status: isWorkerParsing ? "Converting in worker..." : "Waiting for input",
        schemaValidation: schemaEnabled
          ? {
              valid: false,
              errors: [],
              schemaError: isWorkerParsing ? "Schema validation pending..." : "",
            }
          : null,
      };
    }
    try {
      if (mode === "ini") {
        const iniLineError = findIniLineError(debouncedInput);
        if (iniLineError) {
          return {
            output: "",
            error: iniLineError.message,
            errorLocation: { line: iniLineError.line, column: 1 },
            warning: warningMessage,
            status: iniLineError.message,
            schemaValidation: null,
          };
        }
      }
      const escapedIniInput = debouncedInput.replace(
        /^(\s*)\[([^\]]+)\](\s*)$/gm,
        (_match, lead, name, tail) => {
          let backslashes = 0;
          let escaped = "";
          for (const char of name) {
            if (char === "\\") {
              backslashes += 1;
              escaped += char;
              continue;
            }
            if (char === ".") {
              escaped += backslashes % 2 === 1 ? "." : "\\.";
              backslashes = 0;
              continue;
            }
            backslashes = 0;
            escaped += char;
          }
          return `${lead}[${escaped}]${tail}`;
        }
      );
      const parsed =
        mode === "toml"
          ? toml.parse(debouncedInput)
          : mode === "ini"
            ? ini.parse(nestIniDots ? debouncedInput : escapedIniInput, {
                bracketedArray: iniDuplicateKeys !== "array",
              })
            : JSON.parse(debouncedInput);
      const normalizedParsed = mode === "ini" ? transformIniValue(parsed) : parsed;
      const output = preservesInput
        ? debouncedInput
        : outputFormat === "json"
          ? pretty
            ? JSON.stringify(normalizedParsed, null, 2)
            : JSON.stringify(normalizedParsed)
          : outputFormat === "ini"
            ? ini.stringify(normalizedParsed as Record<string, unknown>, {
                whitespace: pretty,
                align: pretty,
                newline: true,
              })
            : stringifyToml(normalizedParsed as Record<string, unknown>);
      const status = preservesInput
        ? `Validated ${mode.toUpperCase()} input`
        : mode === outputFormat
          ? `Formatted ${mode.toUpperCase()} input`
          : `Converted ${mode.toUpperCase()} to ${outputFormat.toUpperCase()}`;
      const schemaValidation = validateSchema(normalizedParsed);
      return { output, error: "", errorLocation: null, warning: warningMessage, status, schemaValidation };
    } catch (err) {
      console.error("Parse error", err);
      if (mode === "toml") {
        const line = typeof (err as { line?: unknown }).line === "number" ? (err as { line: number }).line : null;
        const column =
          typeof (err as { column?: unknown }).column === "number" ? (err as { column: number }).column : null;
        if (line !== null && column !== null) {
          const error = `Invalid TOML at line ${line}, column ${column}.`;
          return {
            output: "",
            error,
            errorLocation: { line, column },
            warning: warningMessage,
            status: error,
            schemaValidation: null,
          };
        }
        if (err instanceof Error && err.message) {
          const error = `Invalid TOML: ${err.message}`;
          return { output: "", error, errorLocation: null, warning: warningMessage, status: error, schemaValidation: null };
        }
      } else if (mode === "json") {
        if (err instanceof Error && err.message) {
          const error = `Invalid JSON: ${err.message}`;
          const location = extractJsonErrorLocation(err.message, debouncedInput);
          return {
            output: "",
            error,
            errorLocation: location,
            warning: warningMessage,
            status: error,
            schemaValidation: null,
          };
        }
      }
      const error = `Invalid ${mode.toUpperCase()} input.`;
      return { output: "", error, errorLocation: null, warning: warningMessage, status: error, schemaValidation: null };
    }
  }, [
    debouncedInput,
    isWorkerParsing,
    mode,
    nestIniDots,
    outputFormat,
    pretty,
    preservesInput,
    iniArrayDelimiter,
    iniDuplicateKeys,
    iniCoerceTypes,
    schemaEnabled,
    schemaInput,
    shouldUseWorker,
    warningMessage,
  ]);

  const result = useMemo<ParseResult>(() => {
    const base = shouldUseWorker && workerResult ? workerResult : localResult;
    return {
      ...base,
      warning: warningMessage,
      schemaValidation: base.schemaValidation,
    };
  }, [localResult, shouldUseWorker, warningMessage, workerResult]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    modeRef.current = mode;
    outputFormatRef.current = outputFormat;
  }, [mode, outputFormat]);

  useEffect(() => {
    setStatus(result.status);
    setWarning(result.warning);
  }, [result.status, result.warning]);

  useEffect(() => {
    if (!diffMode || compareSource !== "converted") return;
    setCompareInput(result.output);
  }, [compareSource, diffMode, result.output]);

  const handleEditorWillMount = (monaco: typeof import("monaco-editor")) => {
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

    if (!monaco.languages.getLanguages().some((lang) => lang.id === "ini")) {
      monaco.languages.register({ id: "ini" });
      monaco.languages.setMonarchTokensProvider("ini", {
        tokenizer: {
          root: [
            [/^\s*[;#].*$/, "comment"],
            [/^\s*\[[^\]]+\]/, "type.identifier"],
            [/".*?"/, "string"],
            [/'[^']*'/, "string"],
            [/\b(true|false)\b/, "keyword"],
            [/-?\d+(\.\d+)?/, "number"],
            [/[\w\-.]+\s*(?==)/, "identifier"],
            [/=/, "delimiter"],
          ],
        },
      });
      monaco.languages.setLanguageConfiguration("ini", {
        comments: { lineComment: ";" },
        brackets: [["[", "]"]],
      });
    }
  };

  const handleInputMount = (editor: import("monaco-editor").editor.IStandaloneCodeEditor) => {
    inputEditorRef.current = editor;
    const monaco = monacoRef.current;
    if (!monaco) return;
    editor.addAction({
      id: "format-input",
      label: "Format input",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => {
        if (outputFormatRef.current !== modeRef.current) {
          setOutputFormat(modeRef.current);
          setStatus("Output format set to match input for formatting");
          return;
        }
        const next = resultRef.current?.output;
        if (next) {
          setInput(next);
          setStatus("Formatted input");
        }
      },
    });
  };

  const handleOutputMount = (editor: import("monaco-editor").editor.IStandaloneCodeEditor) => {
    outputEditorRef.current = editor;
  };

  const handleDiffMount = (
    editor: import("monaco-editor").editor.IStandaloneDiffEditor,
    monaco: typeof import("monaco-editor")
  ) => {
    monacoRef.current = monaco;
    outputEditorRef.current = editor.getModifiedEditor();
  };

  useEffect(() => {
    if (!monacoRef.current) return;
    if (result.error && result.errorLocation) {
      setMarkers(inputEditorRef.current, [
        {
          severity: monacoRef.current.MarkerSeverity.Error,
          message: result.error,
          startLineNumber: result.errorLocation.line,
          startColumn: result.errorLocation.column,
          endLineNumber: result.errorLocation.line,
          endColumn: result.errorLocation.column + 1,
        },
      ]);
    } else {
      clearMarkers(inputEditorRef.current);
    }

    if (!schemaEnabled) {
      clearMarkers(outputEditorRef.current);
      return;
    }
    if (!result.schemaValidation || !result.schemaValidation.errors.length || !result.output) {
      clearMarkers(outputEditorRef.current);
      return;
    }
    if (outputFormat !== "json") {
      setMarkers(outputEditorRef.current, [
        {
          severity: monacoRef.current.MarkerSeverity.Warning,
          message: "Schema errors exist; switch output to JSON to see locations.",
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        },
      ]);
      return;
    }
    const markers = result.schemaValidation.errors.map((entry) => {
      const location = findJsonPointerLocation(result.output, entry.path);
      return {
        severity: monacoRef.current.MarkerSeverity.Warning,
        message: `${entry.path}: ${entry.message}`,
        startLineNumber: location?.line ?? 1,
        startColumn: location?.column ?? 1,
        endLineNumber: location?.line ?? 1,
        endColumn: (location?.column ?? 1) + 1,
      };
    });
    setMarkers(outputEditorRef.current, markers);
  }, [
    outputFormat,
    result.error,
    result.errorLocation,
    result.output,
    result.schemaValidation,
    schemaEnabled,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const handleDownload = () => {
    if (!result.output) return;
    const type =
      outputFormat === "json" ? "application/json" : outputFormat === "toml" ? "application/toml" : "text/plain";
    const blob = new Blob([result.output], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted.${outputFormat}`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const copyInput = async () => {
    try {
      await navigator.clipboard.writeText(input);
      setStatus("Copied original");
    } catch {
      setStatus("Copy failed");
    }
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {warning}
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
              TOML/INI/JSON Converter
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">TOML/INI/JSON Converter</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Convert TOML, INI, and JSON configuration text between formats. Validate and copy formatted output.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as Mode)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Select input format"
            >
              <option value="toml">TOML</option>
              <option value="ini">INI</option>
              <option value="json">JSON</option>
            </select>
            <button
              onClick={() => {
                setMode("toml");
                setOutputFormat("json");
                setInput('[db]\nhost="localhost"\nport=5432');
                setCopied(false);
                setStatus("Reset");
                setWarning("");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Reset to default sample"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={() => {
                setMode("toml");
                setOutputFormat("json");
                setInput(samples.tomlSimple);
                setStatus("Loaded TOML sample");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              TOML sample
            </button>
            <button
              onClick={() => {
                setMode("ini");
                setOutputFormat("json");
                setInput(samples.iniSimple);
                setStatus("Loaded INI sample");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              INI sample
            </button>
            <button
              onClick={() => {
                setMode("toml");
                setOutputFormat("json");
                setInput(samples.tomlNested);
                setStatus("Loaded nested TOML sample");
              }}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Nested TOML
            </button>
            <button
              onClick={() => {
                setMode("ini");
                setOutputFormat("json");
                setInput(samples.iniDotted);
                setStatus("Loaded dotted INI sample");
              }}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              Dotted INI
            </button>
            <button
              onClick={() => {
                if (result.output) {
                  setInput(result.output);
                }
                setMode(outputFormat);
                setOutputFormat(mode);
                setStatus(result.output ? "Swapped formats" : "Swapped formats (no output to carry)");
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Swap input/output formats"
            >
              <Shuffle className="h-4 w-4" />
              Swap formats
            </button>
            <button
              onClick={() => {
                setMode("json");
                setOutputFormat("toml");
                setInput(samples.jsonSimple);
                setStatus("Loaded JSON sample");
              }}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              JSON sample
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Upload TOML, INI, or JSON file"
            >
              <Upload className="h-4 w-4" />
              Upload file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".toml,.ini,.json"
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <button
              onClick={copyInput}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Copy original input"
            >
              <Clipboard className="h-4 w-4" />
              Copy original
            </button>
          </div>
          <div
            className={`relative overflow-hidden rounded-xl border bg-white shadow-inner shadow-slate-200 ${
              isDragging ? "border-emerald-300 ring-2 ring-emerald-200" : "border-slate-200"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
          >
            <Editor
              height="220px"
              value={input}
              language={mode === "ini" ? "ini" : mode === "toml" ? "toml" : "json"}
              theme="vs"
              beforeMount={handleEditorWillMount}
              onMount={handleInputMount}
              onChange={(value) => setInput(value ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                renderLineHighlight: "line",
              }}
            />
            {isDragging && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-50/80 text-sm font-semibold text-emerald-700">
                Drop .toml, .ini, or .json to load
              </div>
            )}
          </div>
          {result.error ? (
            <p className="text-sm font-medium text-amber-600">{result.error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: Runs locally—great for quick config conversions. {input.length > MAX_CHARS ? "Large input detected." : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pretty}
                onChange={(e) => setPretty(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              Pretty output
            </label>
            <span className="text-slate-500">Lines: {input.split("\n").length}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">Parser options</p>
              <span className="text-[11px] text-slate-500">INI-focused</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Array delimiter</span>
                <select
                  value={iniArrayDelimiter}
                  onChange={(event) => setIniArrayDelimiter(event.target.value as IniArrayDelimiter)}
                  disabled={mode !== "ini"}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="comma">Comma (a,b,c)</option>
                  <option value="newline">Newline (repeat keys)</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-slate-600">
                <span className="font-medium text-slate-700">Duplicate keys</span>
                <select
                  value={iniDuplicateKeys}
                  onChange={(event) => setIniDuplicateKeys(event.target.value as IniDuplicateKeys)}
                  disabled={mode !== "ini"}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="last">Last wins</option>
                  <option value="array">Collect array</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={nestIniDots}
                  onChange={(e) => setNestIniDots(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                  disabled={mode !== "ini"}
                />
                Dot notation nesting
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={iniCoerceTypes}
                  onChange={(e) => setIniCoerceTypes(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                  disabled={mode !== "ini"}
                />
                Type coercion (numbers/booleans)
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">Schema validation</p>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={schemaEnabled}
                  onChange={(e) => setSchemaEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Enable
              </label>
            </div>
            <textarea
              className="mt-2 h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              value={schemaInput}
              onChange={(event) => setSchemaInput(event.target.value)}
              disabled={!schemaEnabled}
              spellCheck={false}
              placeholder="Paste JSON Schema (draft-07+)"
              aria-label="JSON Schema"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div
            className="flex flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
            role="region"
            aria-labelledby="toml-ini-output"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <p id="toml-ini-output" className="text-sm font-semibold">
                  Output
                </p>
                <select
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value as Mode)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-inner focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  aria-label="Select output format"
                >
                  <option value="json">JSON</option>
                  <option value="toml">TOML</option>
                  <option value="ini">INI</option>
                </select>
                <label className="ml-2 flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={diffMode}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      setDiffMode(enabled);
                      if (enabled && compareSource === "converted") {
                        setCompareInput(result.output);
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-600 text-slate-100 focus:ring-slate-500"
                  />
                  Diff mode
                </label>
              </div>
              {diffMode && (
                <div className="flex items-center gap-2">
                  <select
                    value={compareSource}
                    onChange={(event) => setCompareSource(event.target.value as "converted" | "custom")}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-inner focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    aria-label="Select compare source"
                  >
                    <option value="converted">Compare to converted</option>
                    <option value="custom">Compare to custom</option>
                  </select>
                  {compareSource === "custom" && (
                    <button
                      onClick={() => setCompareInput(result.output)}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
                    >
                      Use converted
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!result.output}
                aria-label="Copy output"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!result.output}
                aria-label="Download output"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
            {diffMode ? (
              <div className="flex-1">
                <DiffEditor
                  height="260px"
                  original={input}
                  modified={compareSource === "converted" ? result.output : compareInput}
                  language={outputFormat === "ini" ? "ini" : outputFormat === "toml" ? "toml" : "json"}
                  theme="vs-dark"
                  beforeMount={handleEditorWillMount}
                  onMount={handleDiffMount}
                  onChange={(value) => {
                    if (compareSource === "custom") {
                      setCompareInput(value ?? "");
                    }
                  }}
                  options={{
                    readOnly: compareSource === "converted",
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    renderSideBySide: true,
                    automaticLayout: true,
                  }}
                />
              </div>
            ) : (
              <div className="flex-1">
                <Editor
                  height="260px"
                  value={result.output}
                  language={outputFormat === "ini" ? "ini" : outputFormat === "toml" ? "toml" : "json"}
                  theme="vs-dark"
                  beforeMount={handleEditorWillMount}
                  onMount={handleOutputMount}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    renderLineHighlight: "line",
                  }}
                />
              </div>
            )}
            {!result.output && !diffMode && (
              <p className="px-4 pb-3 text-xs text-slate-300">Converted output will appear here.</p>
            )}
          </div>
          {schemaEnabled && (
            <div
              className={`rounded-2xl border p-4 text-sm shadow-[var(--shadow-soft)] ${
                !result.schemaValidation
                  ? "border-slate-200/80 bg-slate-50/80 text-slate-700"
                  : result.schemaValidation.schemaError || result.schemaValidation.errors.length
                    ? "border-amber-200/80 bg-amber-50/80 text-amber-900"
                    : "border-emerald-200/80 bg-emerald-50/80 text-emerald-900"
              }`}
            >
              <h3 className="text-sm font-semibold">Schema validation</h3>
              {!result.schemaValidation ? (
                <p className="mt-2 text-sm">Schema validation pending (fix input errors).</p>
              ) : result.schemaValidation.schemaError ? (
                <p className="mt-2 text-sm">{result.schemaValidation.schemaError}</p>
              ) : result.schemaValidation.errors.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {result.schemaValidation.errors.map((entry) => (
                    <li key={`${entry.path}-${entry.message}`}>
                      {entry.path}: {entry.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm">Schema validation passed.</p>
              )}
            </div>
          )}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 text-amber-900 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Lossy conversion warnings</h3>
            </div>
            {lossyWarnings.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {lossyWarnings.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-amber-800">No lossy warnings detected for this conversion.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Select TOML, INI, or JSON, paste your config, upload a file, or drop it onto the editor.</li>
          <li>Pick the output format (JSON/TOML/INI), then optionally pretty the output.</li>
          <li>Large inputs show a warning; errors indicate invalid format (line/column for TOML when available).</li>
          <li>Use parser options to control INI arrays, duplicates, dot nesting, and type coercion.</li>
          <li>TOML ↔ INI conversions can be lossy due to differing data models.</li>
          <li>Optionally enable JSON Schema validation to check keys and types.</li>
          <li>Use Ctrl/Cmd+Shift+F in the input editor to format the current input.</li>
          <li>Enable diff mode to compare input against the converted output or a custom version.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Conversion happens in your browser; config text is not uploaded.</p>
          <p><strong>What formats?</strong> TOML, INI, and JSON. Output can be JSON, TOML, or INI.</p>
          <p><strong>Can I export?</strong> Yes. Copy or download the converted output directly.</p>
        </div>
      </div>
    </main>
  );
}
