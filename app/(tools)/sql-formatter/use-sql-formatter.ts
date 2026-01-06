"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { type KeywordCase } from "sql-formatter";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import {
  detectDialectSuggestion,
  lintSql,
  splitStatements,
  type CommaStyle,
  type Dialect,
  type FormatOptions,
  type IndentMode,
} from "./formatter-utils";

export type OutputPreset = "readable" | "compact" | "team" | "custom";
export type OutputView = "formatted" | "diff";
export type FormatMode = "prettify" | "minify";

type PersistedState = {
  input: string;
  dialect: Dialect;
  indent: number;
  indentMode: IndentMode;
  keywordCase: KeywordCase;
  linesBetweenStatements: number;
  commaStyle: CommaStyle;
  minify: boolean;
  wrap: boolean;
  outputPreset: OutputPreset;
  autoFormat: boolean;
  formatOnPaste: boolean;
  output: string;
  checkSemicolon: boolean;
  explainMode: boolean;
  outputView: OutputView;
  shareCompression: boolean;
  formatMultiple: boolean;
  formatMode: FormatMode;
};

type FormatResult = {
  durationMs: number;
  inputChars: number;
};

export const presetOptions: Record<
  Exclude<OutputPreset, "custom">,
  {
    label: string;
    keywordCase: KeywordCase;
    indentSize: number;
    indentMode: IndentMode;
    linesBetweenStatements: number;
    commaStyle: CommaStyle;
    minify: boolean;
    softWrap: boolean;
  }
> = {
  readable: {
    label: "Readable",
    keywordCase: "preserve",
    indentSize: 2,
    indentMode: "spaces",
    linesBetweenStatements: 1,
    commaStyle: "trailing",
    minify: false,
    softWrap: false,
  },
  compact: {
    label: "Compact",
    keywordCase: "upper",
    indentSize: 2,
    indentMode: "spaces",
    linesBetweenStatements: 0,
    commaStyle: "trailing",
    minify: false,
    softWrap: false,
  },
  team: {
    label: "Team Style",
    keywordCase: "lower",
    indentSize: 4,
    indentMode: "spaces",
    linesBetweenStatements: 1,
    commaStyle: "leading",
    minify: false,
    softWrap: false,
  },
};

const STORAGE_KEY = "sql-formatter-state-v1";
const AUTO_FORMAT_DELAY = 400;
const FORMAT_STATUS_DELAY = 150;
const MAX_SHARE_LENGTH = 6000;
const MAX_LEN = 50000;

const encodeSharePayload = (payload: object, compress: boolean) => {
  const json = JSON.stringify(payload);
  if (compress) {
    return `c:${compressToEncodedURIComponent(json)}`;
  }
  return `p:${btoa(unescape(encodeURIComponent(json)))}`;
};

const decodeSharePayload = (payload: string) => {
  if (payload.startsWith("c:")) {
    const decoded = decompressFromEncodedURIComponent(payload.slice(2));
    if (!decoded) throw new Error("Invalid compressed payload");
    return JSON.parse(decoded);
  }
  if (payload.startsWith("p:")) {
    const json = decodeURIComponent(escape(atob(payload.slice(2))));
    return JSON.parse(json);
  }
  const fallback = decompressFromEncodedURIComponent(payload);
  if (fallback) return JSON.parse(fallback);
  const json = decodeURIComponent(escape(atob(payload)));
  return JSON.parse(json);
};

type DiffLine = {
  type: "same" | "add" | "remove";
  leftText: string;
  rightText: string;
  leftLine?: number;
  rightLine?: number;
};

const buildLineDiff = (leftText: string, rightText: string): DiffLine[] => {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const table = Array.from({ length: leftLines.length + 1 }, () => new Array(rightLines.length + 1).fill(0));

  for (let i = 1; i <= leftLines.length; i += 1) {
    for (let j = 1; j <= rightLines.length; j += 1) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = leftLines.length;
  let j = rightLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      diff.push({ type: "same", leftText: leftLines[i - 1], rightText: rightLines[j - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      diff.push({ type: "add", leftText: "", rightText: rightLines[j - 1] });
      j -= 1;
    } else {
      diff.push({ type: "remove", leftText: leftLines[i - 1], rightText: "" });
      i -= 1;
    }
  }

  diff.reverse();
  let leftLine = 1;
  let rightLine = 1;
  return diff.map((line) => {
    const next = { ...line };
    if (line.type === "same" || line.type === "remove") {
      next.leftLine = leftLine;
      leftLine += 1;
    }
    if (line.type === "same" || line.type === "add") {
      next.rightLine = rightLine;
      rightLine += 1;
    }
    return next;
  });
};

export function useSqlFormatter() {
  const [input, setInput] = useState("select * from users where id = 42 and status = 'active';");
  const [dialect, setDialect] = useState<Dialect>("sql");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatStatus, setFormatStatus] = useState("");
  const [formatStats, setFormatStats] = useState<FormatResult | null>(null);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [indent, setIndent] = useState(presetOptions.readable.indentSize);
  const [indentMode, setIndentMode] = useState<IndentMode>(presetOptions.readable.indentMode);
  const [keywordCase, setKeywordCase] = useState<KeywordCase>(presetOptions.readable.keywordCase);
  const [linesBetweenStatements, setLinesBetweenStatements] = useState(presetOptions.readable.linesBetweenStatements);
  const [commaStyle, setCommaStyle] = useState<CommaStyle>(presetOptions.readable.commaStyle);
  const [minify, setMinifyState] = useState(presetOptions.readable.minify);
  const [wrap, setWrap] = useState(presetOptions.readable.softWrap);
  const [outputPreset, setOutputPreset] = useState<OutputPreset>("readable");
  const [autoFormat, setAutoFormat] = useState(false);
  const [formatOnPaste, setFormatOnPaste] = useState(false);
  const [checkSemicolon, setCheckSemicolon] = useState(false);
  const [explainMode, setExplainMode] = useState(false);
  const [outputView, setOutputView] = useState<OutputView>("formatted");
  const [shareCompression, setShareCompression] = useState(true);
  const [formatMultiple, setFormatMultiple] = useState(false);
  const [formatMode, setFormatModeState] = useState<FormatMode>("prettify");
  const [dropActive, setDropActive] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const statusTimerRef = useRef<number | null>(null);
  const shareAppliedRef = useRef(false);

  const setMinify = (value: boolean) => {
    setMinifyState(value);
    setFormatModeState(value ? "minify" : "prettify");
  };

  const setFormatMode = (value: FormatMode) => {
    setFormatModeState(value);
    setMinifyState(value === "minify");
  };

  const suggestedDialect = useMemo(() => detectDialectSuggestion(input), [input]);
  const lintHints = useMemo(() => lintSql(input, checkSemicolon), [input, checkSemicolon]);
  const statements = useMemo(() => splitStatements(input), [input]);
  const diffLines = useMemo(() => (output ? buildLineDiff(input, output) : []), [input, output]);
  const errorSuggestion =
    error && suggestedDialect && suggestedDialect.dialect !== dialect
      ? `Try dialect ${suggestedDialect.dialect}.`
      : "";

  const ensureWorker = () => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./sql-formatter.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type !== "result") return;
      if (message.requestId !== requestIdRef.current) return;
      setIsFormatting(false);
      setFormatStatus("");
      stopStatusTimer();
      if (message.error) {
        setOutput("");
        setFormatStats(null);
        setError("Unable to format this SQL. Check syntax or choose a different dialect.");
        setErrorDetails(message.error);
        return;
      }
      setOutput(message.output);
      setFormatStats({ durationMs: message.durationMs, inputChars: message.inputChars });
      setError("");
      setErrorDetails("");
    };
    worker.onerror = (event) => {
      console.error("SQL worker error", event);
      setIsFormatting(false);
      setFormatStatus("");
      stopStatusTimer();
      setError("Unable to format this SQL. Check syntax or choose a different dialect.");
      setErrorDetails("Worker error. Check console for details.");
    };
    workerRef.current = worker;
    return worker;
  };

  const stopStatusTimer = () => {
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  };

  const resetFormattingState = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    stopStatusTimer();
    setIsFormatting(false);
    setFormatStatus("");
    requestIdRef.current += 1;
  };

  const requestFormat = (rawInput: string, override?: Partial<FormatOptions>) => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setError("");
      setErrorDetails("");
      setOutput("");
      setFormatStats(null);
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setError("SQL is too large to format. Please shorten or split the query.");
      setErrorDetails("");
      setOutput("");
      setFormatStats(null);
      setIsFormatting(false);
      return;
    }
    const payload: FormatOptions = {
      input: rawInput,
      dialect: override?.dialect ?? dialect,
      indent: override?.indent ?? indent,
      indentMode: override?.indentMode ?? indentMode,
      keywordCase: override?.keywordCase ?? keywordCase,
      linesBetweenStatements: override?.linesBetweenStatements ?? linesBetweenStatements,
      commaStyle: override?.commaStyle ?? commaStyle,
      minify: override?.minify ?? minify,
      formatMultiple: override?.formatMultiple ?? formatMultiple,
    };
    if (isFormatting) {
      workerRef.current?.terminate();
      workerRef.current = null;
    }
    const worker = ensureWorker();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsFormatting(true);
    setFormatStatus("");
    setFormatStats(null);
    stopStatusTimer();
    statusTimerRef.current = window.setTimeout(() => {
      setFormatStatus("Formatting...");
      statusTimerRef.current = null;
    }, FORMAT_STATUS_DELAY);
    setError("");
    setErrorDetails("");
    worker.postMessage({
      type: "format",
      requestId,
      payload,
    });
  };

  const handleFormat = () => requestFormat(input);

  const handleCopy = async (value: string, setCopiedState: (next: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyInput = () => handleCopy(input, setCopiedInput);
  const handleCopyOutput = () => handleCopy(output, setCopiedOutput);

  const handleDownload = (format: "sql" | "txt" = "sql") => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `formatted.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    if (!output) return;
    const fenced = ["```sql", output, "```"].join("\n");
    try {
      await navigator.clipboard.writeText(fenced);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const cancelFormat = () => {
    if (!isFormatting) return;
    resetFormattingState();
    setFormatStatus("Canceled");
    setFormatStats(null);
  };

  const clearState = () => {
    localStorage.removeItem(STORAGE_KEY);
    resetFormattingState();
    setInput("select * from users where id = 42 and status = 'active';");
    setOutput("");
    setError("");
    setErrorDetails("");
    setCopiedInput(false);
    setCopiedOutput(false);
    setShareStatus("");
    setOutputPreset("readable");
    setKeywordCase(presetOptions.readable.keywordCase);
    setIndent(presetOptions.readable.indentSize);
    setIndentMode(presetOptions.readable.indentMode);
    setLinesBetweenStatements(presetOptions.readable.linesBetweenStatements);
    setCommaStyle(presetOptions.readable.commaStyle);
    setMinify(presetOptions.readable.minify);
    setWrap(presetOptions.readable.softWrap);
    setAutoFormat(false);
    setFormatOnPaste(false);
    setCheckSemicolon(false);
    setExplainMode(false);
    setOutputView("formatted");
    setShareCompression(true);
    setFormatMultiple(false);
    setFormatMode("prettify");
    setFormatStats(null);
  };

  const resetDefaults = () => {
    resetFormattingState();
    setInput("select * from users where id = 42 and status = 'active';");
    setOutput("");
    setError("");
    setErrorDetails("");
    setCopiedInput(false);
    setCopiedOutput(false);
    setShareStatus("");
    setOutputPreset("readable");
    setKeywordCase(presetOptions.readable.keywordCase);
    setIndent(presetOptions.readable.indentSize);
    setIndentMode(presetOptions.readable.indentMode);
    setLinesBetweenStatements(presetOptions.readable.linesBetweenStatements);
    setCommaStyle(presetOptions.readable.commaStyle);
    setMinify(presetOptions.readable.minify);
    setWrap(presetOptions.readable.softWrap);
    setAutoFormat(false);
    setFormatOnPaste(false);
    setCheckSemicolon(false);
    setExplainMode(false);
    setOutputView("formatted");
    setShareCompression(true);
    setFormatMultiple(false);
    setFormatMode("prettify");
    setFormatStats(null);
  };

  const handleShareLink = async () => {
    if (!input.trim()) {
      setShareStatus("Add SQL before sharing.");
      return;
    }
    const payload: Omit<PersistedState, "output"> & FormatOptions = {
      input,
      dialect,
      indent,
      indentMode,
      keywordCase,
      linesBetweenStatements,
      commaStyle,
      minify,
      formatMultiple,
      wrap,
      outputPreset,
      autoFormat,
      formatOnPaste,
      checkSemicolon,
      explainMode,
      outputView,
      shareCompression,
      formatMode,
    };
    const encoded = encodeSharePayload(payload, shareCompression);
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    if (url.length > MAX_SHARE_LENGTH) {
      setShareStatus("Share link too long. Try compression or shorten SQL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Share link copied.");
    } catch (err) {
      console.error("Share link failed", err);
      setShareStatus("Share link failed.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("share");
    if (!shared) return;
    try {
      const decoded = decodeSharePayload(shared) as Partial<PersistedState & FormatOptions>;
      shareAppliedRef.current = true;
      resetFormattingState();
      if (decoded.input !== undefined) setInput(decoded.input);
      if (decoded.dialect) setDialect(decoded.dialect);
      if (typeof decoded.indent === "number") setIndent(decoded.indent);
      if (decoded.indentMode) setIndentMode(decoded.indentMode);
      if (decoded.keywordCase) setKeywordCase(decoded.keywordCase);
      if (typeof decoded.linesBetweenStatements === "number") setLinesBetweenStatements(decoded.linesBetweenStatements);
      if (decoded.commaStyle) setCommaStyle(decoded.commaStyle);
      if (typeof decoded.minify === "boolean") setMinify(decoded.minify);
      if (typeof decoded.wrap === "boolean") setWrap(decoded.wrap);
      if (decoded.outputPreset) setOutputPreset(decoded.outputPreset);
      if (typeof decoded.autoFormat === "boolean") setAutoFormat(decoded.autoFormat);
      if (typeof decoded.formatOnPaste === "boolean") setFormatOnPaste(decoded.formatOnPaste);
      if (typeof decoded.checkSemicolon === "boolean") setCheckSemicolon(decoded.checkSemicolon);
      if (typeof decoded.explainMode === "boolean") setExplainMode(decoded.explainMode);
      if (decoded.outputView) setOutputView(decoded.outputView);
      if (typeof decoded.shareCompression === "boolean") setShareCompression(decoded.shareCompression);
      if (typeof decoded.formatMultiple === "boolean") setFormatMultiple(decoded.formatMultiple);
      if (decoded.formatMode) setFormatMode(decoded.formatMode);
      if (typeof decoded.input === "string" && decoded.input.trim()) {
        const sharedInput = decoded.input;
        window.setTimeout(() => {
          requestFormat(sharedInput, decoded);
        }, 0);
      }
    } catch (err) {
      console.error("Share decode failed", err);
      setShareStatus("Share link invalid.");
    }
  }, []);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      stopStatusTimer();
    },
    []
  );

  useEffect(() => {
    if (shareAppliedRef.current) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Partial<PersistedState>;
      if (parsed.input !== undefined) setInput(parsed.input);
      if (parsed.dialect) setDialect(parsed.dialect);
      if (typeof parsed.indent === "number") setIndent(parsed.indent);
      if (parsed.indentMode) setIndentMode(parsed.indentMode);
      if (parsed.keywordCase) setKeywordCase(parsed.keywordCase);
      if (typeof parsed.linesBetweenStatements === "number") setLinesBetweenStatements(parsed.linesBetweenStatements);
      if (parsed.commaStyle) setCommaStyle(parsed.commaStyle);
      if (typeof parsed.minify === "boolean") setMinify(parsed.minify);
      if (typeof parsed.wrap === "boolean") setWrap(parsed.wrap);
      if (parsed.outputPreset) setOutputPreset(parsed.outputPreset);
      if (typeof parsed.autoFormat === "boolean") setAutoFormat(parsed.autoFormat);
      if (typeof parsed.formatOnPaste === "boolean") setFormatOnPaste(parsed.formatOnPaste);
      if (typeof parsed.output === "string") setOutput(parsed.output);
      if (typeof parsed.checkSemicolon === "boolean") setCheckSemicolon(parsed.checkSemicolon);
      if (typeof parsed.explainMode === "boolean") setExplainMode(parsed.explainMode);
      if (parsed.outputView) setOutputView(parsed.outputView);
      if (typeof parsed.shareCompression === "boolean") setShareCompression(parsed.shareCompression);
      if (typeof parsed.formatMultiple === "boolean") setFormatMultiple(parsed.formatMultiple);
      if (parsed.formatMode) setFormatMode(parsed.formatMode);
    } catch (err) {
      console.error("Failed to restore formatter state", err);
    }
  }, []);

  useEffect(() => {
    const payload: PersistedState = {
      input,
      dialect,
      indent,
      indentMode,
      keywordCase,
      linesBetweenStatements,
      commaStyle,
      minify,
      wrap,
      outputPreset,
      autoFormat,
      formatOnPaste,
      output,
      checkSemicolon,
      explainMode,
      outputView,
      shareCompression,
      formatMultiple,
      formatMode,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    input,
    dialect,
    indent,
    indentMode,
    keywordCase,
    linesBetweenStatements,
    commaStyle,
    minify,
    wrap,
    outputPreset,
    autoFormat,
    formatOnPaste,
    output,
    checkSemicolon,
    explainMode,
    outputView,
    shareCompression,
    formatMultiple,
    formatMode,
  ]);

  // formatMode and minify stay in sync via setters.

  useEffect(() => {
    if (!autoFormat) return;
    if (!input.trim()) {
      setOutput("");
      setError("");
      setErrorDetails("");
      setFormatStats(null);
      return;
    }
    const timer = window.setTimeout(() => {
      requestFormat(input);
    }, AUTO_FORMAT_DELAY);
    return () => window.clearTimeout(timer);
  }, [
    autoFormat,
    input,
    dialect,
    indent,
    indentMode,
    keywordCase,
    linesBetweenStatements,
    commaStyle,
    minify,
    formatMultiple,
  ]);

  const handleImportFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setInput(content);
      setError("");
      setErrorDetails("");
      setOutput("");
      setFormatStats(null);
      setDropActive(false);
    };
    reader.onerror = () => {
      setError("Unable to read file.");
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setDropActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleImportFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setDropActive(true);
  };

  const handleDragLeave = () => {
    setDropActive(false);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        // Allow shortcuts even when focused in inputs.
      }
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleFormat();
        return;
      }
      if ((event.key === "C" || event.key === "c") && event.shiftKey) {
        if (!output) return;
        event.preventDefault();
        handleCopyOutput();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFormat, handleCopyOutput, output]);

  return {
    input,
    setInput,
    dialect,
    setDialect,
    output,
    setOutput,
    error,
    errorDetails,
    setError,
    isFormatting,
    formatStatus,
    formatStats,
    copiedInput,
    copiedOutput,
    shareStatus,
    indent,
    setIndent,
    indentMode,
    setIndentMode,
    keywordCase,
    setKeywordCase,
    linesBetweenStatements,
    setLinesBetweenStatements,
    commaStyle,
    setCommaStyle,
    minify,
    setMinify,
    wrap,
    setWrap,
    outputPreset,
    setOutputPreset,
    autoFormat,
    setAutoFormat,
    formatOnPaste,
    setFormatOnPaste,
    checkSemicolon,
    setCheckSemicolon,
    explainMode,
    setExplainMode,
    outputView,
    setOutputView,
    shareCompression,
    setShareCompression,
    formatMultiple,
    setFormatMultiple,
    formatMode,
    setFormatMode,
    dropActive,
    suggestedDialect,
    lintHints,
    statements,
    diffLines,
    errorSuggestion,
    requestFormat,
    handleFormat,
    handleCopyInput,
    handleCopyOutput,
    handleCopyMarkdown,
    handleDownload,
    handleShareLink,
    cancelFormat,
    clearState,
    resetDefaults,
    resetFormattingState,
    handleImportFile,
    handleDrop,
    handleDragOver,
    handleDragLeave,
  };
}
