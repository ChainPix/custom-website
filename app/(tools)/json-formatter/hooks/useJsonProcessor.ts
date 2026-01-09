import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildTreeStructure,
  analyzeJsonText,
  getJSONPath,
  parseWithBetterError,
  sortObjectKeys,
  stringifyWithNumberLiterals,
  type TreeNode,
} from "@/lib/json-utils";

const DEFAULT_INDENT = 2;

type JsonProcessorOptions = {
  defaultInput: string;
  defaultOutput: string;
  maxSizeBytes: number;
  shouldBuildTree: boolean;
};

type ProcessorStats = {
  bytes: number;
  lines: number;
  chars: number;
};

export function useJsonProcessor({
  defaultInput,
  defaultOutput,
  maxSizeBytes,
  shouldBuildTree,
}: JsonProcessorOptions) {
  const [input, setInput] = useState(defaultInput);
  const [output, setOutput] = useState(defaultOutput);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [errorLocation, setErrorLocation] = useState<{ line: number; column: number } | null>(null);
  const [indentSize, setIndentSize] = useState(DEFAULT_INDENT);
  const [sortKeys, setSortKeys] = useState(false);
  const [sortScope, setSortScope] = useState<"recursive" | "top">("recursive");
  const [useJSON5, setUseJSON5] = useState(false);
  const [formatOnPaste, setFormatOnPaste] = useState(false);
  const [formatOnType, setFormatOnType] = useState(false);
  const [preserveNumberFormat, setPreserveNumberFormat] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedPointer, setSelectedPointer] = useState("");
  const [selectedValue, setSelectedValue] = useState<unknown>(null);
  const [debouncedInput, setDebouncedInput] = useState(input);
  const [parsedData, setParsedData] = useState<unknown | null>(null);
  const [lastChangeSource, setLastChangeSource] = useState<"type" | "paste" | "program" | null>(null);
  const [analysis, setAnalysis] = useState(() => analyzeJsonText(input, useJSON5));
  const workerRef = useRef<Worker | null>(null);
  const workerRequestIdRef = useRef(0);

  const WORKER_THRESHOLD_BYTES = 1024 * 1024;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedInput(input), 200);
    return () => clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    setAnalysis(analyzeJsonText(debouncedInput, useJSON5));
  }, [debouncedInput, useJSON5]);

  const stats: ProcessorStats = useMemo(() => {
    const bytes = new TextEncoder().encode(debouncedInput).length;
    const lines = debouncedInput.split("\n").length;
    const chars = debouncedInput.length;
    return { bytes, lines, chars };
  }, [debouncedInput]);

  useEffect(() => {
    if (stats.bytes > maxSizeBytes) {
      setWarning(
        `Input size (${(stats.bytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit of 10MB. Performance may be affected.`,
      );
    } else if (stats.bytes > 1024 * 1024) {
      setWarning(
        `Large input detected (${(stats.bytes / 1024 / 1024).toFixed(2)}MB). Processing may take a moment.`,
      );
    } else {
      setWarning("");
    }
  }, [maxSizeBytes, stats.bytes]);

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("../json-formatter.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (
      event: MessageEvent<{
        type: "result";
        requestId: number;
        output: string;
        parsed?: unknown;
        error?: string;
        errorLocation?: { line: number; column: number } | null;
      }>,
    ) => {
      const message = event.data;
      if (!message || message.requestId !== workerRequestIdRef.current) return;
      if (message.error) {
        setOutput("");
        setError(message.error);
        setErrorLocation(message.errorLocation ?? null);
        setTreeNodes([]);
        setParsedData(null);
      } else {
        setOutput(message.output);
        setError("");
        setErrorLocation(null);
        setParsedData(message.parsed ?? null);
      }
      setIsProcessing(false);
    };
    worker.onerror = () => {
      setOutput("");
      setError("Worker failed to process JSON.");
      setErrorLocation(null);
      setTreeNodes([]);
      setParsedData(null);
      setIsProcessing(false);
    };
    workerRef.current = worker;
    return worker;
  }, []);

  const processJson = useCallback(
    async ({ mode }: { mode: "format" | "minify" }) => {
      setError("");
      setErrorLocation(null);
      setIsProcessing(true);

      await new Promise((resolve) => setTimeout(resolve, 0));

      const analysisSnapshot = preserveNumberFormat ? analyzeJsonText(input, useJSON5) : analysis;
      const inputBytes = new TextEncoder().encode(input).length;
      const shouldUseWorker = inputBytes >= WORKER_THRESHOLD_BYTES;

      if (shouldUseWorker) {
        const worker = ensureWorker();
        workerRequestIdRef.current += 1;
        const requestId = workerRequestIdRef.current;
        worker.postMessage({
          type: "process",
          requestId,
          payload: {
            input,
            mode,
            indentSize,
            sortKeys,
            sortScope,
            useJSON5,
            preserveNumberFormat,
            numberLiterals: analysisSnapshot.numberLiterals,
          },
        });
        return;
      }

      try {
        const result = parseWithBetterError(input, useJSON5);

        if (result.error) {
          console.error(`Failed to ${mode} JSON`, result.error);
          setOutput("");
          setError(result.error);
          setErrorLocation(result.errorLocation ?? null);
          setTreeNodes([]);
          setParsedData(null);
          return;
        }

        const recursiveSort = sortScope === "recursive";
        const processedData = sortKeys ? sortObjectKeys(result.parsed, recursiveSort) : result.parsed;
        const formattedOutput = preserveNumberFormat
          ? stringifyWithNumberLiterals(processedData, {
              indent: mode === "minify" ? 0 : indentSize,
            }, analysisSnapshot.numberLiterals)
          : mode === "minify"
            ? JSON.stringify(processedData)
            : JSON.stringify(processedData, null, indentSize);

        setOutput(formattedOutput);
        setParsedData(processedData);
      } catch (err) {
        console.error(`Failed to ${mode} JSON`, err);
        setOutput("");
        setError(`Unable to ${mode} JSON. The structure may be too complex.`);
        setErrorLocation(null);
        setTreeNodes([]);
        setParsedData(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [analysis, ensureWorker, indentSize, input, preserveNumberFormat, sortKeys, sortScope, useJSON5],
  );

  const handleFormat = useCallback(async () => {
    await processJson({ mode: "format" });
  }, [processJson]);

  const handleMinify = useCallback(async () => {
    await processJson({ mode: "minify" });
  }, [processJson]);

  const updateInput = useCallback((value: string, source: "type" | "paste" | "program" = "program") => {
    setInput(value);
    setLastChangeSource(source);
  }, []);

  const handleNodeClick = useCallback((node: TreeNode) => {
    const pathString = getJSONPath(node.value, node.path);
    setSelectedPath(pathString);
    setSelectedPointer(node.id || "/");
    setSelectedValue(node.value);
  }, []);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setTreeNodes([]);
    setError("");
    setErrorLocation(null);
    setParsedData(null);
    setLastChangeSource(null);
    setSelectedPath("");
    setSelectedPointer("");
    setSelectedValue(null);
  }, []);

  useEffect(() => {
    if (!shouldBuildTree) {
      setTreeNodes([]);
      return;
    }
    if (!parsedData) {
      setTreeNodes([]);
      return;
    }
    setTreeNodes(buildTreeStructure(parsedData));
  }, [parsedData, shouldBuildTree]);

  useEffect(() => {
    if (!formatOnPaste && !formatOnType) return;
    if (!lastChangeSource) return;
    if (isProcessing) return;
    const shouldAutoFormat =
      (lastChangeSource === "paste" && formatOnPaste) ||
      (lastChangeSource === "type" && formatOnType);
    if (!shouldAutoFormat) return;
    const timeout = setTimeout(() => {
      processJson({ mode: "format" });
      setLastChangeSource(null);
    }, 200);
    return () => clearTimeout(timeout);
  }, [formatOnPaste, formatOnType, isProcessing, lastChangeSource, processJson]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return {
    input,
    updateInput,
    output,
    error,
    setError,
    errorLocation,
    setErrorLocation,
    warning,
    stats,
    indentSize,
    setIndentSize,
    sortKeys,
    setSortKeys,
    sortScope,
    setSortScope,
    useJSON5,
    setUseJSON5,
    formatOnPaste,
    setFormatOnPaste,
    formatOnType,
    setFormatOnType,
    preserveNumberFormat,
    setPreserveNumberFormat,
    isProcessing,
    treeNodes,
    selectedPath,
    selectedPointer,
    selectedValue,
    handleNodeClick,
    handleFormat,
    handleMinify,
    clearAll,
    parsedData,
    analysis,
  };
}
