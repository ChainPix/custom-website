import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildTreeStructure,
  getJSONPath,
  parseWithBetterError,
  sortObjectKeys,
  type TreeNode,
} from "@/lib/json-utils";

const DEFAULT_INDENT = 2;

type JsonProcessorOptions = {
  defaultInput: string;
  defaultOutput: string;
  maxSizeBytes: number;
};

type PasteEvent = React.ClipboardEvent<HTMLTextAreaElement>;

type ProcessorStats = {
  bytes: number;
  lines: number;
  chars: number;
};

export function useJsonProcessor({
  defaultInput,
  defaultOutput,
  maxSizeBytes,
}: JsonProcessorOptions) {
  const [input, setInput] = useState(defaultInput);
  const [output, setOutput] = useState(defaultOutput);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [indentSize, setIndentSize] = useState(DEFAULT_INDENT);
  const [sortKeys, setSortKeys] = useState(false);
  const [useJSON5, setUseJSON5] = useState(false);
  const [formatOnPaste, setFormatOnPaste] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const pasteRun = useRef(0);

  const stats: ProcessorStats = useMemo(() => {
    const bytes = new Blob([input]).size;
    const lines = input.split("\n").length;
    const chars = input.length;
    return { bytes, lines, chars };
  }, [input]);

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

  const processJson = useCallback(
    async ({ mode }: { mode: "format" | "minify" }) => {
      setError("");
      setIsProcessing(true);

      await new Promise((resolve) => setTimeout(resolve, 0));

      try {
        const result = parseWithBetterError(input, useJSON5);

        if (result.error) {
          console.error(`Failed to ${mode} JSON`, result.error);
          setOutput("");
          setError(result.error);
          setTreeNodes([]);
          return;
        }

        const processedData = sortKeys ? sortObjectKeys(result.parsed) : result.parsed;
        const formattedOutput =
          mode === "minify"
            ? JSON.stringify(processedData)
            : JSON.stringify(processedData, null, indentSize);

        setOutput(formattedOutput);
        setTreeNodes(buildTreeStructure(processedData));
      } catch (err) {
        console.error(`Failed to ${mode} JSON`, err);
        setOutput("");
        setError(`Unable to ${mode} JSON. The structure may be too complex.`);
        setTreeNodes([]);
      } finally {
        setIsProcessing(false);
      }
    },
    [indentSize, input, sortKeys, useJSON5],
  );

  const handleFormat = useCallback(async () => {
    await processJson({ mode: "format" });
  }, [processJson]);

  const handleMinify = useCallback(async () => {
    await processJson({ mode: "minify" });
  }, [processJson]);

  const handlePaste = useCallback(
    async (event: PasteEvent) => {
      if (!formatOnPaste) return;

      const text = event.clipboardData.getData("text");
      if (!text) return;

      event.preventDefault();
      setError("");
      setInput(text);

      const runId = Date.now();
      pasteRun.current = runId;

      setTimeout(() => {
        if (pasteRun.current !== runId) return;

        const result = parseWithBetterError(text, useJSON5);
        if (result.error) {
          setError(result.error);
          setOutput("");
          setTreeNodes([]);
          return;
        }

        const processedData = sortKeys ? sortObjectKeys(result.parsed) : result.parsed;
        setOutput(JSON.stringify(processedData, null, indentSize));
        setTreeNodes(buildTreeStructure(processedData));
      }, 120);
    },
    [formatOnPaste, indentSize, sortKeys, useJSON5],
  );

  const handleNodeClick = useCallback((path: string[], value: unknown) => {
    const pathString = getJSONPath(value, path);
    setSelectedPath(pathString);
  }, []);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setTreeNodes([]);
    setError("");
  }, []);

  return {
    input,
    setInput,
    output,
    error,
    setError,
    warning,
    stats,
    indentSize,
    setIndentSize,
    sortKeys,
    setSortKeys,
    useJSON5,
    setUseJSON5,
    formatOnPaste,
    setFormatOnPaste,
    isProcessing,
    treeNodes,
    selectedPath,
    handleNodeClick,
    handleFormat,
    handleMinify,
    handlePaste,
    clearAll,
  };
}
