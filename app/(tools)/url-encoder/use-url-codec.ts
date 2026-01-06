"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  detectAction,
  encodeValue,
  safeDecodeValue,
  type DecodeResult,
  type EncodeMode,
} from "../../../lib/url-codec";

type CoreState = {
  input: string;
  encoded: string;
  decoded: string;
  status: string;
  error: string;
  copied: "enc" | "dec" | null;
  mode: "encode" | "decode";
};

type Action =
  | { type: "patch"; patch: Partial<CoreState> }
  | { type: "reset" };

type HistoryItem = {
  id: string;
  action: string;
  input: string;
  output: string;
  createdAt: string;
};

const initialState: CoreState = {
  input: "",
  encoded: "",
  decoded: "",
  status: "Ready",
  error: "",
  copied: null,
  mode: "encode",
};

const reducer = (state: CoreState, action: Action): CoreState => {
  if (action.type === "reset") return initialState;
  return { ...state, ...action.patch };
};

const HISTORY_KEY = "url-encoder-history";

export function useUrlCodec() {
  const [core, dispatch] = useReducer(reducer, initialState);
  const [autoMode, setAutoMode] = useState<"none" | "encode" | "decode">("none");
  const [encodeMode, setEncodeMode] = useState<EncodeMode>("component");
  const [querystringMode, setQuerystringMode] = useState(false);
  const [lenientDecode, setLenientDecode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [highlightMode, setHighlightMode] = useState(true);
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [autoDetectNote, setAutoDetectNote] = useState("");
  const [activeOutput, setActiveOutput] = useState<"enc" | "dec" | null>(null);
  const [exportFormat, setExportFormat] = useState<"txt" | "json" | "csv">("txt");
  const [parseError, setParseError] = useState("");
  const [parsedBase, setParsedBase] = useState("");
  const [parsedHash, setParsedHash] = useState("");
  const [parsedParams, setParsedParams] = useState<Array<{ key: string; value: string }>>([]);
  const [inputBytes, setInputBytes] = useState(0);
  const MAX_SIZE_BYTES = 512 * 1024; // 512KB guard
  const textEncoder = useMemo(() => new TextEncoder(), []);
  const inputBytesRef = useRef(0);
  const copyTimeoutRef = useRef<number | null>(null);

  const options = useMemo(
    () => ({ encodeMode, querystringMode, lenientDecode }),
    [encodeMode, querystringMode, lenientDecode],
  );

  const clearCopyTimeout = () => {
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  };

  const pushHistory = (action: string, inputValue: string, outputValue: string) => {
    if (!historyEnabled) return;
    const nextItem: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      input: inputValue,
      output: outputValue,
      createdAt: new Date().toLocaleString(),
    };
    setHistoryItems((current) => {
      const nextItems = [nextItem, ...current].slice(0, 10);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(nextItems));
      } catch (err) {
        console.error("History save failed", err);
      }
      return nextItems;
    });
  };

  const updateInput = (value: string) => {
    const bytes = textEncoder.encode(value).length;
    dispatch({ type: "patch", patch: { input: value } });
    setInputBytes(bytes);
    inputBytesRef.current = bytes;
  };

  const handleEncode = (value: string) => {
    dispatch({ type: "patch", patch: { error: "", status: "Encoding..." } });
    if (inputBytesRef.current > MAX_SIZE_BYTES) {
      dispatch({
        type: "patch",
        patch: { error: "Input too large. Please keep under 512KB.", status: "Error" },
      });
      return;
    }
    try {
      const normalized = batchMode
        ? value
            .split(/\r?\n/)
            .map((line) => encodeValue(line, options))
            .join("\n")
        : encodeValue(value, options);
      dispatch({
        type: "patch",
        patch: {
          encoded: normalized,
          status: "Updated",
          error: "",
          mode: "encode",
        },
      });
      setActiveOutput("enc");
      pushHistory("encode", value, normalized);
    } catch (err) {
      console.error("Encode error", err);
      dispatch({
        type: "patch",
        patch: { error: "Unable to encode this input.", status: "Error" },
      });
    }
  };

  const formatBatchDecodeError = (result: DecodeResult, index: number) =>
    `Line ${index + 1}: ${result.ok ? "" : result.error}`.trim();

  const handleDecode = (value: string) => {
    dispatch({ type: "patch", patch: { error: "", status: "Decoding..." } });
    if (inputBytesRef.current > MAX_SIZE_BYTES) {
      dispatch({
        type: "patch",
        patch: { error: "Input too large. Please keep under 512KB.", status: "Error" },
      });
      return;
    }
    if (batchMode) {
      const lines = value.split(/\r?\n/);
      const outputs: string[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        const result = safeDecodeValue(lines[i], options);
        if (!result.ok) {
          dispatch({
            type: "patch",
            patch: { error: formatBatchDecodeError(result, i), status: "Error" },
          });
          return;
        }
        outputs.push(result.value);
      }
      const output = outputs.join("\n");
      dispatch({
        type: "patch",
        patch: { decoded: output, status: "Updated", error: "", mode: "decode" },
      });
      setActiveOutput("dec");
      pushHistory("decode", value, output);
      return;
    }
    const decodedResult = safeDecodeValue(value, options);
    if (!decodedResult.ok) {
      dispatch({ type: "patch", patch: { error: decodedResult.error, status: "Error" } });
      return;
    }
    dispatch({
      type: "patch",
      patch: { decoded: decodedResult.value, status: "Updated", error: "", mode: "decode" },
    });
    setActiveOutput("dec");
    pushHistory("decode", value, decodedResult.value);
  };

  const handleAutoDetect = (value: string) => {
    const result = detectAction(value, options);
    setAutoDetectNote(`Auto-detect: ${result.action} (${result.confidence})`);
    if (result.action === "decode") {
      handleDecode(value);
    } else {
      handleEncode(value);
    }
  };

  const handleSwap = () => {
    if (core.encoded && core.decoded) {
      dispatch({
        type: "patch",
        patch: { encoded: core.decoded, decoded: core.encoded, status: "Swapped" },
      });
      setActiveOutput(activeOutput === "enc" ? "dec" : "enc");
      return;
    }
    if (core.encoded) {
      updateInput(core.encoded);
      dispatch({
        type: "patch",
        patch: { encoded: "", decoded: "", status: "Moved encoded to input" },
      });
      return;
    }
    if (core.decoded) {
      updateInput(core.decoded);
      dispatch({
        type: "patch",
        patch: { encoded: "", decoded: "", status: "Moved decoded to input" },
      });
    }
  };

  const handleCopy = async (text: string, key: "enc" | "dec") => {
    try {
      await navigator.clipboard.writeText(text);
      clearCopyTimeout();
      dispatch({ type: "patch", patch: { copied: key } });
      copyTimeoutRef.current = window.setTimeout(() => {
        dispatch({ type: "patch", patch: { copied: null } });
      }, 1200);
      setActiveOutput(key);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const buildTimestamp = () =>
    new Date().toISOString().replace(/[:.]/g, "-");

  const csvEscape = (value: string) => {
    const escaped = value.replace(/"/g, "\"\"");
    return `"${escaped}"`;
  };

  const buildBatchExport = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (exportFormat === "json") {
      return JSON.stringify(lines, null, 2);
    }
    if (exportFormat === "csv") {
      const header = "index,value";
      const rows = lines.map((line, index) => `${index + 1},${csvEscape(line)}`);
      return [header, ...rows].join("\n");
    }
    return text;
  };

  const handleDownload = (text: string, prefix: string) => {
    if (!text) return;
    const timestamp = buildTimestamp();
    const format = batchMode ? exportFormat : "txt";
    const content = batchMode ? buildBatchExport(text) : text;
    const mime =
      format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/plain";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prefix}-${timestamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateParsedParam = (index: number, key: string, value: string) => {
    setParsedParams((current) =>
      current.map((param, idx) => (idx === index ? { key, value } : param)),
    );
  };

  const handleAddParam = () => {
    setParsedParams((current) => [...current, { key: "", value: "" }]);
  };

  const handleParseUrl = () => {
    setParseError("");
    try {
      const trimmed = core.input.trim();
      if (!trimmed) {
        setParseError("Paste a URL to parse.");
        return;
      }
      const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      const url = new URL(withProtocol);
      setParsedBase(`${url.origin}${url.pathname}`);
      setParsedHash(url.hash);
      const entries = Array.from(url.searchParams.entries()).map(([key, value]) => ({
        key,
        value,
      }));
      setParsedParams(entries);
    } catch (err) {
      console.error("Parse error", err);
      setParseError("Unable to parse this URL.");
    }
  };

  const handleRebuildUrl = () => {
    if (!parsedBase) return;
    try {
      const url = new URL(parsedBase);
      const params = new URLSearchParams();
      parsedParams.forEach(({ key, value }) => {
        if (!key) return;
        params.append(key, value);
      });
      url.search = params.toString();
      url.hash = parsedHash || "";
      updateInput(url.toString());
      dispatch({ type: "patch", patch: { status: "Rebuilt URL" } });
    } catch (err) {
      console.error("Rebuild error", err);
      setParseError("Unable to rebuild URL.");
    }
  };

  const applyEncodeToParam = (index: number) => {
    setParsedParams((current) =>
      current.map((param, idx) =>
        idx === index ? { ...param, value: encodeValue(param.value, options) } : param,
      ),
    );
  };

  const applyDecodeToParam = (index: number) => {
    setParsedParams((current) =>
      current.map((param, idx) => {
        if (idx !== index) return param;
        const decoded = safeDecodeValue(param.value, options);
        if (!decoded.ok) return param;
        return { ...param, value: decoded.value };
      }),
    );
  };

  const clearAll = () => {
    updateInput("");
    dispatch({
      type: "patch",
      patch: { encoded: "", decoded: "", error: "", status: "Ready", copied: null },
    });
    setAutoMode("none");
    setAutoDetectNote("");
    setParseError("");
    setParsedParams([]);
    setParsedBase("");
    setParsedHash("");
  };

  const clearHistory = () => {
    setHistoryItems([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (err) {
      console.error("History clear failed", err);
    }
  };

  useEffect(() => {
    if (!historyEnabled) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryItem[];
      setHistoryItems(parsed.slice(0, 10));
    } catch (err) {
      console.error("History load failed", err);
    }
  }, [historyEnabled]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isEnter = event.key === "Enter";
      const isCopy = event.key.toLowerCase() === "c";
      const hasModifier = event.metaKey || event.ctrlKey;
      if (hasModifier && isEnter) {
        event.preventDefault();
        const action = autoMode !== "none" ? autoMode : core.mode;
        if (action === "encode") handleEncode(core.input);
        if (action === "decode") handleDecode(core.input);
      }
      if (hasModifier && event.shiftKey && isCopy) {
        event.preventDefault();
        const text = activeOutput === "dec" ? core.decoded : core.encoded;
        if (text) handleCopy(text, activeOutput === "dec" ? "dec" : "enc");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeOutput,
    autoMode,
    batchMode,
    core.decoded,
    core.encoded,
    core.input,
    core.mode,
    encodeMode,
    historyEnabled,
    lenientDecode,
    querystringMode,
  ]);

  useEffect(() => () => clearCopyTimeout(), []);

  const formattedInputKb = Math.round(inputBytes / 1024);

  return {
    core,
    autoMode,
    encodeMode,
    querystringMode,
    lenientDecode,
    batchMode,
    highlightMode,
    historyEnabled,
    historyItems,
    autoDetectNote,
    activeOutput,
    exportFormat,
    parseError,
    parsedBase,
    parsedHash,
    parsedParams,
    inputBytes,
    formattedInputKb,
    MAX_SIZE_BYTES,
    setAutoMode,
    setEncodeMode,
    setQuerystringMode,
    setLenientDecode,
    setBatchMode,
    setHighlightMode,
    setHistoryEnabled,
    setAutoDetectNote,
    setActiveOutput,
    setExportFormat,
    setParseError,
    updateInput,
    handleEncode,
    handleDecode,
    handleAutoDetect,
    handleSwap,
    handleCopy,
    handleDownload,
    handleParseUrl,
    handleRebuildUrl,
    updateParsedParam,
    handleAddParam,
    applyEncodeToParam,
    applyDecodeToParam,
    clearAll,
    clearHistory,
  };
}
