"use client";

import Link from "next/link";
import Editor, { DiffEditor } from "@monaco-editor/react";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { Check, Clipboard, Download, Loader2, RefreshCcw, Shuffle, Sparkles, Upload } from "lucide-react";
import {
  convert,
  getPresetConfig,
  parseInput,
  serializeOutput,
  type ConvertOptions,
  type FormatPreset,
  type Mode,
  type YamlSchemaMode,
} from "./conversion";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit
const WORKER_THRESHOLD_BYTES = 512 * 1024;
const AUTO_CONVERT_DELAY_MS = 250;
const AUTO_CONVERT_IDLE_MS = 600;
const AUTO_CONVERT_MIN_INTERVAL_MS = 800;
type AppStatus = "idle" | "uploading" | "converting" | "success" | "error" | "canceled";

type AppState = {
  input: string;
  output: string;
  error: string;
  errorPath: string;
  status: AppStatus;
  warning: string;
  mode: Mode;
  yamlIndent: number;
  yamlSchemaMode: YamlSchemaMode;
  sortKeys: boolean;
  formatPreset: FormatPreset;
  autoConvert: boolean;
  useBasicToml: boolean;
  showDiff: boolean;
  formatSuggestion: "toml" | "yaml" | null;
  copied: boolean;
  isDragging: boolean;
  workerStage: string;
  isWorkerBusy: boolean;
};

type AppAction =
  | { type: "set_input"; value: string }
  | { type: "set_mode"; value: Mode }
  | { type: "set_warning"; value: string }
  | { type: "set_dragging"; value: boolean }
  | { type: "set_copied"; value: boolean }
  | { type: "set_show_diff"; value: boolean }
  | { type: "set_format_suggestion"; value: "toml" | "yaml" | null }
  | { type: "set_yaml_indent"; value: number }
  | { type: "set_yaml_schema"; value: YamlSchemaMode }
  | { type: "set_sort_keys"; value: boolean }
  | { type: "set_format_preset"; value: FormatPreset }
  | { type: "set_auto_convert"; value: boolean }
  | { type: "set_basic_toml"; value: boolean }
  | { type: "set_worker_busy"; value: boolean }
  | { type: "upload_start" }
  | { type: "upload_end" }
  | { type: "convert_start" }
  | { type: "convert_progress"; stage: string }
  | { type: "convert_success"; output: string }
  | { type: "convert_error"; error: string; path?: string }
  | { type: "convert_cancel" }
  | { type: "clear_output" }
  | { type: "reset" };

const initialState: AppState = {
  input: "",
  output: "",
  error: "",
  errorPath: "",
  status: "idle",
  warning: "",
  mode: "toml-to-yaml",
  yamlIndent: 2,
  yamlSchemaMode: "json",
  sortKeys: false,
  formatPreset: "default",
  autoConvert: false,
  useBasicToml: false,
  showDiff: false,
  formatSuggestion: null,
  copied: false,
  isDragging: false,
  workerStage: "",
  isWorkerBusy: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "set_input":
      return { ...state, input: action.value };
    case "set_mode":
      return { ...state, mode: action.value };
    case "set_warning":
      return { ...state, warning: action.value };
    case "set_dragging":
      return { ...state, isDragging: action.value };
    case "set_copied":
      return { ...state, copied: action.value };
    case "set_show_diff":
      return { ...state, showDiff: action.value };
    case "set_format_suggestion":
      return { ...state, formatSuggestion: action.value };
    case "set_yaml_indent":
      return { ...state, yamlIndent: action.value };
    case "set_yaml_schema":
      return { ...state, yamlSchemaMode: action.value };
    case "set_sort_keys":
      return { ...state, sortKeys: action.value };
    case "set_format_preset":
      return { ...state, formatPreset: action.value };
    case "set_auto_convert":
      return { ...state, autoConvert: action.value };
    case "set_basic_toml":
      return { ...state, useBasicToml: action.value };
    case "set_worker_busy":
      return { ...state, isWorkerBusy: action.value };
    case "upload_start":
      return { ...state, status: "uploading", error: "", errorPath: "" };
    case "upload_end":
      return { ...state, status: "idle" };
    case "convert_start":
      return { ...state, status: "converting", error: "", errorPath: "", workerStage: "" };
    case "convert_progress":
      return { ...state, status: "converting", workerStage: action.stage };
    case "convert_success":
      return { ...state, status: "success", output: action.output, error: "", errorPath: "", workerStage: "" };
    case "convert_error":
      return {
        ...state,
        status: "error",
        output: "",
        error: action.error,
        errorPath: action.path || "",
        workerStage: "",
      };
    case "convert_cancel":
      return { ...state, status: "canceled", error: "", errorPath: "", workerStage: "" };
    case "clear_output":
      return {
        ...state,
        output: "",
        error: "",
        errorPath: "",
        status: "idle",
        showDiff: false,
        formatSuggestion: null,
        workerStage: "",
      };
    case "reset":
      return {
        ...state,
        input: "",
        output: "",
        error: "",
        errorPath: "",
        status: "idle",
        showDiff: false,
        formatSuggestion: null,
        copied: false,
        workerStage: "",
      };
    default:
      return state;
  }
};

export default function TomlYamlClient() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const autoConvertTimer = useRef<NodeJS.Timeout | null>(null);
  const formatDetectTimer = useRef<NodeJS.Timeout | null>(null);
  const lastInputAtRef = useRef(0);
  const lastConvertAtRef = useRef(0);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerRequestIdRef = useRef(0);

  // Seed the last-input timestamp at mount (kept out of render so it stays
  // pure); this preserves the initial idle grace period before auto-convert.
  useEffect(() => {
    lastInputAtRef.current = Date.now();
  }, []);

  const stats = useMemo(() => {
    const bytes = new Blob([state.input]).size;
    const lines = state.input.split("\n").length;
    const chars = state.input.length;
    return { bytes, lines, chars };
  }, [state.input]);

  const shouldUseWorker = stats.bytes >= WORKER_THRESHOLD_BYTES;

  const detectInputFormat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return null;
      const options: ConvertOptions = {
        yamlIndent: state.yamlIndent,
        yamlSchemaMode: state.yamlSchemaMode,
        sortKeys: state.sortKeys,
        lineWidth: getPresetConfig(state.formatPreset).lineWidth,
        useBasicToml: state.useBasicToml,
      };
      if (parseInput("toml-to-yaml", text, options).ok) return "toml";
      if (parseInput("yaml-to-toml", text, options).ok) return "yaml";
      return null;
    },
    [state.formatPreset, state.sortKeys, state.useBasicToml, state.yamlIndent, state.yamlSchemaMode]
  );

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
        dispatch({ type: "convert_progress", stage: message.stage || "Working..." });
        return;
      }
      dispatch({ type: "set_worker_busy", value: false });
      if (message.error) {
        dispatch({ type: "convert_error", error: message.error, path: message.path });
        return;
      }
      dispatch({ type: "convert_success", output: message.output || "" });
    };
    worker.onerror = () => {
      dispatch({ type: "set_worker_busy", value: false });
      dispatch({ type: "convert_error", error: "Worker crashed while converting. Please try again." });
    };
    workerRef.current = worker;
    return worker;
  }, []);

  const handleConvert = useCallback(async () => {
    if (!state.input.trim()) {
      dispatch({ type: "clear_output" });
      return;
    }

    dispatch({ type: "convert_start" });

    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const presetConfig = getPresetConfig(state.formatPreset);
      const options: ConvertOptions = {
        yamlIndent: presetConfig.yamlIndent,
        yamlSchemaMode: state.yamlSchemaMode,
        sortKeys: presetConfig.sortKeys,
        lineWidth: presetConfig.lineWidth,
        useBasicToml: state.useBasicToml,
      };

      if (shouldUseWorker) {
        const worker = ensureWorker();
        const requestId = (workerRequestIdRef.current += 1);
        dispatch({ type: "set_worker_busy", value: true });
        dispatch({ type: "convert_progress", stage: "Parsing..." });
        worker.postMessage({
          type: "convert",
          requestId,
          input: state.input,
          mode: state.mode,
          options,
        });
        return;
      }
      dispatch({ type: "convert_progress", stage: "Parsing..." });
      const parsed = parseInput(state.mode, state.input, options);
      if (!parsed.ok) {
        dispatch({ type: "convert_error", error: parsed.error, path: parsed.path });
        return;
      }
      dispatch({ type: "convert_progress", stage: "Serializing..." });
      const serialized = serializeOutput(state.mode, parsed.value, options);
      if (!serialized.ok) {
        dispatch({ type: "convert_error", error: serialized.error, path: serialized.path });
        return;
      }
      dispatch({ type: "convert_success", output: serialized.output });
    } catch (err) {
      console.error("Conversion error", err);
      const fallback = convert(state.mode, state.input, {
        yamlIndent: state.yamlIndent,
        yamlSchemaMode: state.yamlSchemaMode,
        sortKeys: state.sortKeys,
        lineWidth: getPresetConfig(state.formatPreset).lineWidth,
        useBasicToml: state.useBasicToml,
      });
      if ("error" in fallback) {
        dispatch({ type: "convert_error", error: fallback.error, path: fallback.meta.path });
      } else {
        dispatch({ type: "convert_success", output: fallback.output });
      }
    }
  }, [
    ensureWorker,
    state.formatPreset,
    state.input,
    state.mode,
    state.sortKeys,
    shouldUseWorker,
    state.useBasicToml,
    state.yamlIndent,
    state.yamlSchemaMode,
  ]);

  useEffect(() => {
    if (stats.bytes > MAX_SIZE_BYTES) {
      dispatch({ type: "set_warning", value: `Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit of 10MB.` });
    } else if (stats.bytes > 1024 * 1024) {
      dispatch({ type: "set_warning", value: `Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB).` });
    } else {
      dispatch({ type: "set_warning", value: "" });
    }
  }, [stats.bytes]);

  useEffect(() => {
    if (!state.autoConvert) {
      return;
    }

    const schedule = (delay: number) => {
      if (autoConvertTimer.current) {
        clearTimeout(autoConvertTimer.current);
      }
      autoConvertTimer.current = setTimeout(() => {
        if (!state.input.trim()) {
          dispatch({ type: "reset" });
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
        if (state.status === "converting" || state.isWorkerBusy) {
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
  }, [handleConvert, state.autoConvert, state.input, state.isWorkerBusy, state.status]);

  useEffect(() => {
    if (formatDetectTimer.current) {
      clearTimeout(formatDetectTimer.current);
    }
    if (!state.input.trim()) {
      dispatch({ type: "set_format_suggestion", value: null });
      return;
    }
    formatDetectTimer.current = setTimeout(() => {
      const detected = detectInputFormat(state.input);
      const expected = state.mode === "toml-to-yaml" ? "toml" : "yaml";
      dispatch({ type: "set_format_suggestion", value: detected && detected !== expected ? detected : null });
    }, 250);
    return () => {
      if (formatDetectTimer.current) {
        clearTimeout(formatDetectTimer.current);
      }
    };
  }, [detectInputFormat, state.input, state.mode]);

  useEffect(() => {
    if (!state.output && state.showDiff) {
      dispatch({ type: "set_show_diff", value: false });
    }
  }, [state.output, state.showDiff]);

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
    dispatch({ type: "set_input", value });
  }, []);

  const loadFile = async (file: File) => {
    const validExtensions = [".toml", ".yaml", ".yml"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    const validTypes = ["application/toml", "text/yaml", "application/x-yaml", "text/plain", "application/yaml"];

    if (!hasValidExt && !validTypes.includes(file.type)) {
      dispatch({ type: "convert_error", error: "Unsupported file type. Upload TOML, YAML, or YML files only." });
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      dispatch({
        type: "convert_error",
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB.`,
      });
      return;
    }

    dispatch({ type: "upload_start" });
    dispatch({ type: "clear_output" });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      await new Promise((resolve) => setTimeout(resolve, 0));
      handleInputChange(content);
      dispatch({ type: "upload_end" });
    };
    reader.onerror = () => {
      dispatch({ type: "convert_error", error: "Failed to read file. Please try again." });
      dispatch({ type: "upload_end" });
    };
    reader.readAsText(file);
  };

  const handleSwap = () => {
    if (!state.output) return;
    const nextMode = state.mode === "toml-to-yaml" ? "yaml-to-toml" : "toml-to-yaml";
    dispatch({ type: "set_mode", value: nextMode });
    handleInputChange(state.output);
    dispatch({ type: "clear_output" });
    dispatch({ type: "set_copied", value: false });
    dispatch({ type: "set_show_diff", value: false });
    dispatch({ type: "set_format_suggestion", value: null });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await loadFile(file);

    event.target.value = '';
  };

  const handleDownload = () => {
    if (!state.output) return;

    try {
      const extension = state.mode === "toml-to-yaml" ? "yml" : "toml";
      const mimeType = state.mode === "toml-to-yaml" ? "text/yaml" : "text/plain";
      const blob = new Blob([state.output], { type: mimeType });
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
      dispatch({ type: "convert_error", error: "Unable to download file. Please try copying the output instead." });
    }
  };

  const handleCopyVariant = async (variant: "output" | "minified" | "escaped") => {
    if (!state.output) return;
    let payload = state.output;
    if (variant === "minified") {
      payload = state.output.replace(/\s+/g, " ").trim();
    }
    if (variant === "escaped") {
      payload = JSON.stringify(state.output);
    }
    try {
      await navigator.clipboard.writeText(payload);
      dispatch({ type: "set_copied", value: true });
      setTimeout(() => dispatch({ type: "set_copied", value: false }), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      dispatch({ type: "convert_error", error: "Unable to copy. Please select and copy manually." });
    }
  };

  const handleCancel = useCallback(() => {
    if (!state.isWorkerBusy) return;
    const cancelId = workerRequestIdRef.current;
    workerRequestIdRef.current += 1;
    workerRef.current?.postMessage({ type: "cancel", requestId: cancelId });
    dispatch({ type: "set_worker_busy", value: false });
    dispatch({ type: "convert_cancel" });
  }, [state.isWorkerBusy]);

  const handlePresetChange = (preset: FormatPreset) => {
    dispatch({ type: "set_format_preset", value: preset });
    const presetConfig = getPresetConfig(preset);
    dispatch({ type: "set_yaml_indent", value: presetConfig.yamlIndent });
    dispatch({ type: "set_sort_keys", value: presetConfig.sortKeys });
  };

  const handleSampleLoad = (nextInput: string, nextMode?: Mode) => {
    if (nextMode) {
      dispatch({ type: "set_mode", value: nextMode });
    }
    handleInputChange(nextInput);
    dispatch({ type: "clear_output" });
    dispatch({ type: "set_show_diff", value: false });
    dispatch({ type: "set_format_suggestion", value: null });
  };

  const inputLanguage = state.mode === "toml-to-yaml" ? "toml" : "yaml";
  const outputLanguage = state.mode === "toml-to-yaml" ? "yaml" : "toml";
  const isProcessing = state.status === "converting";
  const isUploading = state.status === "uploading";
  const statusLabel = useMemo(() => {
    switch (state.status) {
      case "uploading":
        return "Uploading";
      case "converting":
        return "Converting";
      case "success":
        return "Completed";
      case "error":
        return "Error";
      case "canceled":
        return "Canceled";
      default:
        return "Ready";
    }
  }, [state.status]);
  const outputValue = isProcessing ? (state.workerStage || statusLabel) : state.output || "Converted output will appear here.";
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
        {statusLabel} {state.error || state.warning}
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
          {state.autoConvert ? "Auto-convert enabled" : "Auto-convert disabled"}
        </div>
        <p className="text-xs text-slate-500">Runs entirely in your browser; files are not uploaded.</p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Direction</span>
            <select
              value={state.mode}
              onChange={(event) => dispatch({ type: "set_mode", value: event.target.value as Mode })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Conversion direction"
            >
              <option value="toml-to-yaml">TOML → YAML</option>
              <option value="yaml-to-toml">YAML → TOML</option>
            </select>
          </label>
          <button
            onClick={handleConvert}
            disabled={isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Convert between TOML and YAML"
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
            onClick={handleSwap}
            disabled={!state.output || isProcessing || isUploading}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Swap input and output"
          >
            <Shuffle className="h-4 w-4" />
            Swap
          </button>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              dispatch({ type: "set_dragging", value: true });
            }}
            onDragLeave={() => dispatch({ type: "set_dragging", value: false })}
            onDrop={(e) => {
              e.preventDefault();
              dispatch({ type: "set_dragging", value: false });
              const file = e.dataTransfer.files?.[0];
              if (file) void loadFile(file);
            }}
            className={`flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${isUploading || isProcessing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${state.isDragging ? 'ring-2 ring-slate-400 bg-slate-50' : ''}`}
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
              disabled={isUploading || isProcessing}
              className="hidden"
              aria-label="Upload file"
            />
          </label>
          <button
            onClick={() => {
              handleInputChange("");
              dispatch({ type: "reset" });
              dispatch({ type: "set_show_diff", value: false });
              dispatch({ type: "set_format_suggestion", value: null });
            }}
            disabled={isProcessing || isUploading}
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
              value={state.formatPreset}
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
              value={state.yamlIndent}
              onChange={(e) => dispatch({ type: "set_yaml_indent", value: Number(e.target.value) })}
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
              value={state.yamlSchemaMode}
              onChange={(e) => dispatch({ type: "set_yaml_schema", value: e.target.value as YamlSchemaMode })}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="json">JSON-safe</option>
              <option value="full">Full YAML</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={state.sortKeys}
              onChange={(e) => dispatch({ type: "set_sort_keys", value: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Sort keys
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={state.autoConvert}
              onChange={(e) => dispatch({ type: "set_auto_convert", value: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
            />
            Auto-convert
          </label>
          {state.mode === "yaml-to-toml" && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={state.useBasicToml}
                onChange={(e) => dispatch({ type: "set_basic_toml", value: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200"
              />
              Basic TOML mode
            </label>
          )}
        </div>

        {state.formatSuggestion && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <span>
              Detected {state.formatSuggestion.toUpperCase()} input. Want to switch to{" "}
              {state.formatSuggestion === "toml" ? "TOML → YAML" : "YAML → TOML"}?
            </span>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "set_mode", value: state.formatSuggestion === "toml" ? "toml-to-yaml" : "yaml-to-toml" });
                dispatch({ type: "set_format_suggestion", value: null });
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

        {state.mode === "yaml-to-toml" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
            YAML → TOML may lose features (comments, anchors, mixed arrays).
          </div>
        )}

        {(state.isWorkerBusy || isProcessing) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span>{state.workerStage || statusLabel}</span>
            {state.isWorkerBusy && (
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
                value={state.input}
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
                    checked={state.showDiff}
                    onChange={(e) => dispatch({ type: "set_show_diff", value: e.target.checked })}
                    disabled={!state.output}
                    className="h-3.5 w-3.5 rounded border-slate-500 bg-slate-800 text-white focus:ring-2 focus:ring-slate-500"
                  />
                  Show diff
                </label>
                <button
                  onClick={handleDownload}
                  disabled={!state.output}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Download converted file"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <button
                  onClick={() => handleCopyVariant("output")}
                  disabled={!state.output}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy output to clipboard"
                >
                  {state.copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />} {state.copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => handleCopyVariant("minified")}
                  disabled={!state.output}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy minified output"
                >
                  Copy min
                </button>
                <button
                  onClick={() => handleCopyVariant("escaped")}
                  disabled={!state.output}
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
              aria-busy={isProcessing}
              role="region"
              aria-labelledby="output-label"
            >
              {state.showDiff && state.output ? (
                <DiffEditor
                  original={state.input}
                  modified={state.output}
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

        {state.warning && (
          <p className="text-sm font-medium text-blue-600">{state.warning}</p>
        )}
        {state.error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700" role="alert">
            <span className="font-semibold">Conversion error:</span> {state.error}
            {state.errorPath && (
              <span className="block text-xs text-amber-700">Path: {state.errorPath}</span>
            )}
          </div>
        ) : !state.warning && (
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
