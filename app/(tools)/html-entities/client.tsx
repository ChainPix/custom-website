"use client";

import JSZip from "jszip";
import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { Check, Clipboard, RefreshCcw } from "lucide-react";

const NAMED_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
  "\u00A0": "&nbsp;",
};

const UNSAFE_CHARS = new Set(["&", "<", ">", '"', "'"]);
const ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos|nbsp);/g;

type EncodeMode = "named" | "numeric" | "hex";

type DiffLine = {
  type: "same" | "add" | "remove";
  leftText: string;
  rightText: string;
  leftLine?: number;
  rightLine?: number;
};

type TransformStats = {
  inputLength: number;
  outputLength: number;
  entityCount: number;
  durationMs: number;
  deltaChars: number;
  deltaPercent: number;
  mode: "encode" | "decode";
};

type BatchEntry = {
  id: string;
  filename: string;
  mode: "encode" | "decode";
  input: string;
  output: string;
  stats: TransformStats;
};

type HistoryEntry = {
  id: string;
  mode: "encode" | "decode";
  input: string;
  output: string;
  stats: TransformStats;
  encodeMode: EncodeMode;
  encodeUnsafeOnly: boolean;
  encodeIncludeSlash: boolean;
  createdAt: number;
};

type State = {
  input: string;
  output: string;
  copiedInput: boolean;
  copiedOutput: boolean;
  copiedSnippet: boolean;
  error: string;
  status: string;
  mode: "encode" | "decode";
  autoRun: boolean;
  trimInput: boolean;
  encodeMode: EncodeMode;
  encodeUnsafeOnly: boolean;
  encodeIncludeSlash: boolean;
  warning: string;
  processing: boolean;
  decodeProgress: number;
  outputView: "output" | "diff";
  lastStats: TransformStats | null;
  history: HistoryEntry[];
  historyIndex: number;
  compareEntry: HistoryEntry | null;
  batchEntries: BatchEntry[];
  batchStatus: string;
  batchBusy: boolean;
  snippetLang: "ts" | "js" | "python" | "java";
};

type Action =
  | { type: "patch"; patch: Partial<State> }
  | { type: "update"; updater: (state: State) => State };

const initialState: State = {
  input: "<p>Hello & welcome!</p>",
  output: "",
  copiedInput: false,
  copiedOutput: false,
  copiedSnippet: false,
  error: "",
  status: "Ready",
  mode: "encode",
  autoRun: true,
  trimInput: true,
  encodeMode: "named",
  encodeUnsafeOnly: true,
  encodeIncludeSlash: false,
  warning: "",
  processing: false,
  decodeProgress: 0,
  outputView: "output",
  lastStats: null,
  history: [],
  historyIndex: -1,
  compareEntry: null,
  batchEntries: [],
  batchStatus: "",
  batchBusy: false,
  snippetLang: "ts",
};

const reducer = (state: State, action: Action): State => {
  if (action.type === "update") {
    return action.updater(state);
  }
  return { ...state, ...action.patch };
};

type WorkerResponse = {
  id: number;
  type: "progress" | "done" | "error";
  output?: string;
  progress?: number;
  entityCount?: number;
  error?: string;
};

type WorkerRequest = {
  id: number;
  text: string;
};

const DECODE_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00A0",
};

const encodeEntities = (
  text: string,
  options: { mode: EncodeMode; unsafeOnly: boolean; includeSlash: boolean }
) => {
  let count = 0;
  let result = "";
  for (const char of text) {
    const isUnsafe = UNSAFE_CHARS.has(char) || (options.includeSlash && char === "/");
    if (options.unsafeOnly && !isUnsafe) {
      result += char;
      continue;
    }
    if (options.mode === "named") {
      const named = NAMED_ENTITIES[char];
      if (named) {
        result += named;
        count += 1;
        continue;
      }
    }
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) {
      result += char;
      continue;
    }
    if (options.mode === "hex") {
      result += `&#x${codePoint.toString(16)};`;
    } else {
      result += `&#${codePoint};`;
    }
    count += 1;
  }
  return { output: result, count };
};

const decodeEntities = (text: string) => {
  let count = 0;
  const output = text.replace(ENTITY_PATTERN, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1]?.toLowerCase() === "x";
      const numberText = isHex ? body.slice(2) : body.slice(1);
      const codePoint = isHex ? parseInt(numberText, 16) : parseInt(numberText, 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        count += 1;
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    if (DECODE_ENTITIES[body]) {
      count += 1;
    }
    return DECODE_ENTITIES[body] ?? match;
  });
  return { output, count };
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

export default function HtmlEntitiesClient() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const patchState = (patch: Partial<State>) => dispatch({ type: "patch", patch });
  const workerRef = useRef<Worker | null>(null);
  const workerRequestId = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const lastRunSourceRef = useRef<"manual" | "auto">("manual");
  const pendingInputRef = useRef("");
  const suppressAutoRunRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const encodeOptionsRef = useRef({
    encodeMode: state.encodeMode,
    encodeUnsafeOnly: state.encodeUnsafeOnly,
    encodeIncludeSlash: state.encodeIncludeSlash,
  });

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./html-entities.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, type, output: nextOutput, progress, error: workerError, entityCount } = event.data;
      if (id !== workerRequestId.current) return;
      if (type === "progress") {
        if (typeof progress === "number") {
          patchState({
            decodeProgress: progress,
            status: `Decoding... ${Math.round(progress * 100)}%`,
          });
        }
        return;
      }
      patchState({ processing: false, decodeProgress: 0 });
      if (type === "done") {
        const finalOutput = nextOutput ?? "";
        patchState({
          output: finalOutput,
          error: "",
          status: "Decoded",
          compareEntry: null,
        });
        const durationMs = Math.max(0, Math.round((startTimeRef.current ?? 0) ? nowMs() - (startTimeRef.current ?? 0) : 0));
        const stats = recordStats(
          pendingInputRef.current,
          finalOutput,
          typeof entityCount === "number" ? entityCount : 0,
          durationMs,
          "decode"
        );
        if (lastRunSourceRef.current === "manual") {
          const encodeOptions = encodeOptionsRef.current;
          pushHistory({
            id: buildHistoryId(),
            mode: "decode",
            input: pendingInputRef.current,
            output: finalOutput,
            stats,
            encodeMode: encodeOptions.encodeMode,
            encodeUnsafeOnly: encodeOptions.encodeUnsafeOnly,
            encodeIncludeSlash: encodeOptions.encodeIncludeSlash,
            createdAt: Date.now(),
          });
        }
      } else {
        patchState({
          error: workerError || "Unable to decode entities in this input. Check for malformed entity strings.",
          output: "",
          status: "Decode failed",
        });
      }
    };
    worker.onerror = () => {
      patchState({
        processing: false,
        decodeProgress: 0,
        error: "Worker error while decoding. Try smaller input.",
        output: "",
        status: "Decode failed",
      });
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    encodeOptionsRef.current = {
      encodeMode: state.encodeMode,
      encodeUnsafeOnly: state.encodeUnsafeOnly,
      encodeIncludeSlash: state.encodeIncludeSlash,
    };
  }, [state.encodeMode, state.encodeUnsafeOnly, state.encodeIncludeSlash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("html-entities-history");
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryEntry[];
        if (Array.isArray(parsed)) {
          patchState({ history: parsed, historyIndex: parsed.length - 1 });
        }
      }
    } catch (err) {
      console.error("Failed to load html entities history", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("html-entities-history", JSON.stringify(state.history));
    } catch (err) {
      console.error("Failed to save html entities history", err);
    }
  }, [state.history]);

  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  const buildHistoryId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const buildStats = (
    inputText: string,
    outputText: string,
    entityCount: number,
    durationMs: number,
    actionMode: "encode" | "decode"
  ) => {
    const inputLength = inputText.length;
    const outputLength = outputText.length;
    const deltaChars = outputLength - inputLength;
    const deltaPercent = inputLength ? Math.round((deltaChars / inputLength) * 100) : 0;
    return { inputLength, outputLength, entityCount, durationMs, deltaChars, deltaPercent, mode: actionMode };
  };

  const recordStats = (
    inputText: string,
    outputText: string,
    entityCount: number,
    durationMs: number,
    actionMode: "encode" | "decode"
  ) => {
    const stats = buildStats(inputText, outputText, entityCount, durationMs, actionMode);
    patchState({ lastStats: stats });
    return stats;
  };

  const pushHistory = (entry: HistoryEntry) => {
    dispatch({
      type: "update",
      updater: (prev) => {
        const next = [...prev.history, entry].slice(-10);
        return { ...prev, history: next, historyIndex: next.length - 1 };
      },
    });
  };

  const loadHistoryEntry = (entry: HistoryEntry) => {
    suppressAutoRunRef.current = true;
    patchState({
      input: entry.input,
      output: entry.output,
      mode: entry.mode,
      encodeMode: entry.encodeMode,
      encodeUnsafeOnly: entry.encodeUnsafeOnly,
      encodeIncludeSlash: entry.encodeIncludeSlash,
      error: "",
      warning: "",
      processing: false,
      decodeProgress: 0,
      outputView: "output",
      compareEntry: null,
      status: "History loaded",
      lastStats: entry.stats,
    });
  };

  const suggestion = useMemo(() => {
    if (!state.input) return null;
    const entityMatches = state.input.match(ENTITY_PATTERN) ?? [];
    const entityCount = entityMatches.length;
    const hasMarkup = /<[^>]+>/.test(state.input);
    const hasRawAmpersand = /&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;|nbsp;)/.test(state.input);
    if (entityCount >= 3 || entityCount >= Math.max(2, Math.round(state.input.length / 15))) {
      return { mode: "decode" as const, reason: `${entityCount} entity patterns detected` };
    }
    if (hasMarkup && hasRawAmpersand) {
      return { mode: "encode" as const, reason: "Raw HTML with unescaped & detected" };
    }
    return null;
  }, [state.input]);

  const diffSource = useMemo(() => {
    if (state.compareEntry) {
      return {
        left: state.compareEntry.output,
        right: state.output,
        leftLabel: "History output",
        rightLabel: "Current output",
      };
    }
    return { left: state.input, right: state.output, leftLabel: "Input", rightLabel: "Output" };
  }, [state.compareEntry, state.input, state.output]);

  const diffLines = useMemo(() => {
    if (!diffSource.left && !diffSource.right) return [];
    return buildLineDiff(diffSource.left, diffSource.right);
  }, [diffSource]);

  const statsSummary = useMemo(() => {
    if (!state.lastStats) return null;
    const deltaSign = state.lastStats.deltaChars > 0 ? "+" : "";
    const percentSign = state.lastStats.deltaPercent > 0 ? "+" : "";
    return {
      deltaText: `${deltaSign}${state.lastStats.deltaChars.toLocaleString()} chars`,
      percentText: `${percentSign}${state.lastStats.deltaPercent}%`,
    };
  }, [state.lastStats]);

  const snippetText = useMemo(() => {
    if (state.snippetLang === "python") {
      return `import re

NAMED = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
    "\\u00A0": "&nbsp;",
}

UNSAFE = {"&", "<", ">", '"', "'"}
ENTITY_RE = re.compile(r"&(#x[0-9a-fA-F]+|#\\d+|amp|lt|gt|quot|apos|nbsp);")

def encode_html(text, mode="named", unsafe_only=True, include_slash=False):
    out = []
    for ch in text:
        is_unsafe = ch in UNSAFE or (include_slash and ch == "/")
        if unsafe_only and not is_unsafe:
            out.append(ch)
            continue
        if mode == "named" and ch in NAMED:
            out.append(NAMED[ch])
            continue
        code = ord(ch)
        out.append(f"&#x{code:x};" if mode == "hex" else f"&#{code};")
    return "".join(out)

def decode_html(text):
    def repl(match):
        body = match.group(1)
        if body.startswith("#"):
            is_hex = len(body) > 1 and body[1].lower() == "x"
            number = body[2:] if is_hex else body[1:]
            try:
                return chr(int(number, 16 if is_hex else 10))
            except ValueError:
                return match.group(0)
        reverse = {"amp": "&", "lt": "<", "gt": ">", "quot": '"', "apos": "'", "nbsp": "\\u00A0"}
        return reverse.get(body, match.group(0))
    return ENTITY_RE.sub(repl, text)`;
    }
    if (state.snippetLang === "java") {
      return `import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class HtmlEntities {
  private static final Map<Character, String> NAMED = new HashMap<>();
  private static final Pattern ENTITY_RE = Pattern.compile("&(#x[0-9a-fA-F]+|#\\\\d+|amp|lt|gt|quot|apos|nbsp);");

  static {
    NAMED.put('&', "&amp;");
    NAMED.put('<', "&lt;");
    NAMED.put('>', "&gt;");
    NAMED.put('\"', "&quot;");
    NAMED.put('\\'', "&apos;");
    NAMED.put('\\u00A0', "&nbsp;");
  }

  public static String encodeHtml(String text, String mode, boolean unsafeOnly, boolean includeSlash) {
    StringBuilder out = new StringBuilder();
    for (int i = 0; i < text.length(); ) {
      int cp = text.codePointAt(i);
      char[] chars = Character.toChars(cp);
      String ch = new String(chars);
      boolean isUnsafe = ch.equals("&") || ch.equals("<") || ch.equals(">") || ch.equals("\"") || ch.equals("'")
        || (includeSlash && ch.equals("/"));
      if (unsafeOnly && !isUnsafe) {
        out.append(ch);
      } else if ("named".equals(mode) && chars.length == 1 && NAMED.containsKey(chars[0])) {
        out.append(NAMED.get(chars[0]));
      } else if ("hex".equals(mode)) {
        out.append("&#x").append(Integer.toHexString(cp)).append(";");
      } else {
        out.append("&#").append(cp).append(";");
      }
      i += Character.charCount(cp);
    }
    return out.toString();
  }

  public static String decodeHtml(String text) {
    Matcher matcher = ENTITY_RE.matcher(text);
    StringBuffer out = new StringBuffer();
    while (matcher.find()) {
      String body = matcher.group(1);
      String replacement = matcher.group(0);
      if (body.startsWith("#")) {
        boolean isHex = body.length() > 1 && (body.charAt(1) == 'x' || body.charAt(1) == 'X');
        String number = isHex ? body.substring(2) : body.substring(1);
        try {
          int cp = Integer.parseInt(number, isHex ? 16 : 10);
          replacement = new String(Character.toChars(cp));
        } catch (Exception ignored) {
          replacement = matcher.group(0);
        }
      } else {
        replacement = switch (body) {
          case "amp" -> "&";
          case "lt" -> "<";
          case "gt" -> ">";
          case "quot" -> "\"";
          case "apos" -> "'";
          case "nbsp" -> "\\u00A0";
          default -> matcher.group(0);
        };
      }
      matcher.appendReplacement(out, Matcher.quoteReplacement(replacement));
    }
    matcher.appendTail(out);
    return out.toString();
  }
}`;
    }
    const isTs = state.snippetLang === "ts";
    return `${isTs ? "type EncodeMode = \"named\" | \"numeric\" | \"hex\";\n" : ""}const NAMED = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
  "\\u00A0": "&nbsp;",
};
const UNSAFE = new Set(["&", "<", ">", '"', "'"]);
const ENTITY_RE = /&(#x[0-9a-fA-F]+|#\\d+|amp|lt|gt|quot|apos|nbsp);/g;

${isTs ? "export function encodeHtml(text: string, options: { mode?: EncodeMode; unsafeOnly?: boolean; includeSlash?: boolean } = {}): string {" : "export function encodeHtml(text, options = {}) {"}
  const { mode = "named", unsafeOnly = true, includeSlash = false } = options;
  let out = "";
  for (const ch of text) {
    const isUnsafe = UNSAFE.has(ch) || (includeSlash && ch === "/");
    if (unsafeOnly && !isUnsafe) {
      out += ch;
      continue;
    }
    if (mode === "named" && NAMED[ch]) {
      out += NAMED[ch];
      continue;
    }
    const cp = ch.codePointAt(0);
    if (cp === undefined) {
      out += ch;
      continue;
    }
    out += mode === "hex" ? \`&#x\${cp.toString(16)};\` : \`&#\${cp};\`;
  }
  return out;
}

${isTs ? "export function decodeHtml(text: string): string {" : "export function decodeHtml(text) {"}
  return text.replace(ENTITY_RE, (match, body) => {
    if (body.startsWith("#")) {
      const isHex = body[1]?.toLowerCase() === "x";
      const numberText = isHex ? body.slice(2) : body.slice(1);
      const cp = parseInt(numberText, isHex ? 16 : 10);
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return match;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return match;
      }
    }
    const decode = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\\u00A0" };
    return decode[body] ?? match;
  });
}`;
  }, [state.snippetLang]);

  const normalizeInput = (value: string) => (state.trimInput ? value.trim() : value);

  const encodeValue = (text: string) => {
    workerRequestId.current += 1;
    patchState({ processing: false, decodeProgress: 0 });
    const { output: encoded, count } = encodeEntities(text, {
      mode: state.encodeMode,
      unsafeOnly: state.encodeUnsafeOnly,
      includeSlash: state.encodeIncludeSlash,
    });
    patchState({
      output: encoded,
      error: "",
      status: "Encoded",
      compareEntry: null,
    });
    const durationMs = Math.max(0, Math.round((startTimeRef.current ?? 0) ? nowMs() - (startTimeRef.current ?? 0) : 0));
    const stats = recordStats(text, encoded, count, durationMs, "encode");
    if (lastRunSourceRef.current === "manual") {
      pushHistory({
        id: buildHistoryId(),
        mode: "encode",
        input: text,
        output: encoded,
        stats,
        encodeMode: state.encodeMode,
        encodeUnsafeOnly: state.encodeUnsafeOnly,
        encodeIncludeSlash: state.encodeIncludeSlash,
        createdAt: Date.now(),
      });
    }
  };

  const decodeValue = (text: string) => {
    const { output: decoded, count } = decodeEntities(text);
    patchState({
      output: decoded,
      error: "",
      status: "Decoded",
      compareEntry: null,
    });
    const durationMs = Math.max(0, Math.round((startTimeRef.current ?? 0) ? nowMs() - (startTimeRef.current ?? 0) : 0));
    const stats = recordStats(text, decoded, count, durationMs, "decode");
    if (lastRunSourceRef.current === "manual") {
      pushHistory({
        id: buildHistoryId(),
        mode: "decode",
        input: text,
        output: decoded,
        stats,
        encodeMode: state.encodeMode,
        encodeUnsafeOnly: state.encodeUnsafeOnly,
        encodeIncludeSlash: state.encodeIncludeSlash,
        createdAt: Date.now(),
      });
    }
  };

  const runTransform = (direction: "encode" | "decode", source: "manual" | "auto" = "manual") => {
    if (state.processing && direction === "decode") return;
    lastRunSourceRef.current = source;
    const text = normalizeInput(state.input);
    if (!text) {
      workerRequestId.current += 1;
      patchState({
        processing: false,
        decodeProgress: 0,
        error: "Enter text to process.",
        output: "",
        status: "No input",
      });
      return;
    }
    startTimeRef.current = nowMs();
    pendingInputRef.current = text;
    if (text.length > 50_000) {
      patchState({ warning: `Large input detected (${text.length.toLocaleString()} chars). Processing may be slow.` });
    } else {
      patchState({ warning: "" });
    }

    if (direction === "encode") encodeValue(text);
    else handleDecode(text);
  };

  const handleDecode = (value?: string) => {
    try {
      const normalized = value ?? normalizeInput(state.input);
      if (workerRef.current && normalized.length > 50_000) {
        const id = (workerRequestId.current += 1);
        patchState({
          processing: true,
          decodeProgress: 0,
          error: "",
          status: "Decoding large input...",
        });
        startTimeRef.current = nowMs();
        pendingInputRef.current = normalized;
        workerRef.current.postMessage({ id, text: normalized } satisfies WorkerRequest);
        return;
      }
      workerRequestId.current += 1;
      patchState({ processing: false, decodeProgress: 0 });
      decodeValue(normalized);
    } catch (err) {
      console.error("Decode error", err);
      patchState({
        error: "Unable to decode entities in this input. Check for malformed entity strings.",
        output: "",
        status: "Decode failed",
      });
    }
  };

  const handleCopyInput = async () => {
    try {
      await navigator.clipboard.writeText(state.input);
      patchState({ copiedInput: true, status: "Copied input" });
      setTimeout(() => patchState({ copiedInput: false }), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      patchState({ status: "Copy failed" });
    }
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(state.output);
      patchState({ copiedOutput: true, status: "Copied output" });
      setTimeout(() => patchState({ copiedOutput: false }), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      patchState({ status: "Copy failed" });
    }
  };

  const handleDownload = () => {
    const content = state.output || state.input;
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `html-entities-${state.mode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    patchState({ status: "Downloaded" });
  };

  const handleSwap = () => {
    if (!state.input && !state.output) return;
    const nextInput = state.output;
    const nextOutput = state.input;
    suppressAutoRunRef.current = true;
    patchState({
      input: nextInput,
      output: nextOutput,
      compareEntry: null,
      error: "",
      status: "Swapped",
    });
    if (state.autoRun && nextInput) {
      lastRunSourceRef.current = "manual";
      startTimeRef.current = nowMs();
      pendingInputRef.current = nextInput;
      if (nextInput.length > 50_000) {
        patchState({ warning: `Large input detected (${nextInput.length.toLocaleString()} chars). Processing may be slow.` });
      } else {
        patchState({ warning: "" });
      }
      if (state.mode === "encode") encodeValue(nextInput);
      else handleDecode(nextInput);
    }
  };

  const handleHistoryBack = () => {
    if (state.historyIndex <= 0) return;
    const nextIndex = state.historyIndex - 1;
    dispatch({
      type: "update",
      updater: (prev) => ({ ...prev, historyIndex: nextIndex }),
    });
    const entry = state.history[nextIndex];
    if (entry) loadHistoryEntry(entry);
  };

  const handleHistoryForward = () => {
    if (state.historyIndex < 0 || state.historyIndex >= state.history.length - 1) return;
    const nextIndex = state.historyIndex + 1;
    dispatch({
      type: "update",
      updater: (prev) => ({ ...prev, historyIndex: nextIndex }),
    });
    const entry = state.history[nextIndex];
    if (entry) loadHistoryEntry(entry);
  };

  const stripExtension = (filename: string) => filename.replace(/\.[^/.]+$/, "");

  const buildOutputFilename = (filename: string, actionMode: "encode" | "decode") => {
    const lower = filename.toLowerCase();
    const ext = lower.endsWith(".html") ? ".html" : ".txt";
    return `${stripExtension(filename)}.${actionMode}${ext}`;
  };

  const handleBatchFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((file) => {
      const lower = file.name.toLowerCase();
      return lower.endsWith(".txt") || lower.endsWith(".html");
    });
    if (!files.length) {
      patchState({ batchStatus: "Only .txt and .html files are supported." });
      return;
    }
    patchState({ batchBusy: true });
    try {
      patchState({ batchStatus: `Processing ${files.length} file${files.length === 1 ? "" : "s"}...` });
      const entries: BatchEntry[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        patchState({ batchStatus: `Processing ${file.name} (${index + 1}/${files.length})...` });
        const text = await file.text();
        const start = nowMs();
        if (state.mode === "encode") {
          const { output: encoded, count } = encodeEntities(text, {
            mode: state.encodeMode,
            unsafeOnly: state.encodeUnsafeOnly,
            includeSlash: state.encodeIncludeSlash,
          });
          const stats = buildStats(text, encoded, count, Math.round(nowMs() - start), "encode");
          entries.push({ id: buildHistoryId(), filename: file.name, mode: "encode", input: text, output: encoded, stats });
        } else {
          const { output: decoded, count } = decodeEntities(text);
          const stats = buildStats(text, decoded, count, Math.round(nowMs() - start), "decode");
          entries.push({ id: buildHistoryId(), filename: file.name, mode: "decode", input: text, output: decoded, stats });
        }
      }
      patchState({
        batchEntries: entries,
        batchStatus: `Processed ${entries.length} file${entries.length === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      console.error("Batch processing failed", err);
      patchState({ batchStatus: "Batch processing failed. Try smaller files." });
    } finally {
      patchState({ batchBusy: false });
    }
  };

  const handleBatchDownload = (entry: BatchEntry) => {
    const blob = new Blob([entry.output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildOutputFilename(entry.filename, entry.mode);
    link.click();
    URL.revokeObjectURL(url);
    patchState({ status: "Downloaded batch output" });
  };

  const handleBatchDownloadAll = async () => {
    if (!state.batchEntries.length) return;
    if (state.batchEntries.length === 1) {
      handleBatchDownload(state.batchEntries[0]);
      return;
    }
    try {
      patchState({ batchBusy: true, batchStatus: "Building zip..." });
      const zip = new JSZip();
      state.batchEntries.forEach((entry) => {
        zip.file(buildOutputFilename(entry.filename, entry.mode), entry.output);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "html-entities-batch.zip";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      patchState({ batchStatus: "Downloaded zip" });
    } catch (err) {
      console.error("Zip download failed", err);
      patchState({ batchStatus: "Unable to build zip download." });
    } finally {
      patchState({ batchBusy: false });
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippetText);
      patchState({ copiedSnippet: true, status: "Copied snippet" });
      setTimeout(() => patchState({ copiedSnippet: false }), 1200);
    } catch (err) {
      console.error("Copy failed", err);
      patchState({ status: "Copy failed" });
    }
  };

  const applyAuto = (next: string) => {
    patchState({ input: next });
  };

  useEffect(() => {
    if (!state.autoRun) {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }
    if (suppressAutoRunRef.current) {
      suppressAutoRunRef.current = false;
      return;
    }
    if (!state.input) return;
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      runTransform(state.mode, "auto");
    }, 200);
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    state.input,
    state.mode,
    state.autoRun,
    state.trimInput,
    state.encodeMode,
    state.encodeUnsafeOnly,
    state.encodeIncludeSlash,
  ]);

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {state.status} {state.error} {state.warning}
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
              HTML Entities
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">HTML Entity Encoder/Decoder</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Escape or unescape HTML entities to keep content safe or readable. Runs entirely in your browser.
        </p>
        <p className="text-sm font-medium text-emerald-700">All processing runs locally in your browser.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="mode-select">
              Mode
            </label>
            <select
              id="mode-select"
              value={state.mode}
              onChange={(event) => {
                const nextMode = event.target.value === "decode" ? "decode" : "encode";
                patchState({ mode: nextMode });
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Select encode or decode mode"
            >
              <option value="encode">Encode</option>
              <option value="decode">Decode</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={state.autoRun}
                onChange={(event) => patchState({ autoRun: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Toggle auto run on change"
              />
              Auto-run
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={state.trimInput}
                onChange={(event) => patchState({ trimInput: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Toggle trim whitespace before processing"
              />
              Trim input
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700" htmlFor="encoding-select">
              Encoding
            </label>
            <select
              id="encoding-select"
              value={state.encodeMode}
              onChange={(event) => {
                const nextMode = event.target.value as EncodeMode;
                patchState({ encodeMode: nextMode });
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-70"
              aria-label="Select encoding output style"
              disabled={state.mode === "decode"}
            >
              <option value="named">Named + numeric fallback</option>
              <option value="numeric">Numeric (decimal)</option>
              <option value="hex">Numeric (hex)</option>
            </select>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={state.encodeUnsafeOnly}
                onChange={(event) => {
                  patchState({ encodeUnsafeOnly: event.target.checked });
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Encode only unsafe HTML characters"
                disabled={state.mode === "decode"}
              />
              Unsafe-only
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={state.encodeIncludeSlash}
                onChange={(event) => {
                  patchState({ encodeIncludeSlash: event.target.checked });
                }}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                aria-label="Include forward slash when encoding unsafe characters"
                disabled={state.mode === "decode"}
              />
              Include slash
            </label>
          </div>
          {suggestion && suggestion.mode !== state.mode ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Suggestion: switch to <strong className="font-semibold">{suggestion.mode}</strong> ({suggestion.reason}).
                </span>
                <button
                  onClick={() => {
                    patchState({ mode: suggestion.mode });
                  }}
                  className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-950 transition hover:bg-amber-300"
                  aria-label={`Switch to ${suggestion.mode} mode`}
                >
                  Switch to {suggestion.mode}
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => runTransform(state.mode, "manual")}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label={`Run ${state.mode} mode`}
              disabled={state.processing}
            >
              {state.mode === "encode" ? "Run Encode" : "Run Decode"}
            </button>
            <button
              onClick={() => {
                const nextMode = state.mode === "encode" ? "decode" : "encode";
                patchState({ mode: nextMode });
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Toggle encode/decode mode"
            >
              Switch to {state.mode === "encode" ? "Decode" : "Encode"}
            </button>
            <button
              onClick={() => {
                workerRequestId.current += 1;
                patchState({
                  input: "",
                  output: "",
                  error: "",
                  status: "Cleared",
                  warning: "",
                  processing: false,
                  decodeProgress: 0,
                  lastStats: null,
                  compareEntry: null,
                  copiedInput: false,
                  copiedOutput: false,
                });
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Clear input and output"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={handleSwap}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Swap input and output"
              disabled={!state.input && !state.output}
            >
              Swap
            </button>
            <button
              onClick={handleCopyInput}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Copy input"
              disabled={!state.input}
            >
              {state.copiedInput ? "Copied input" : "Copy input"}
            </button>
            <button
              onClick={handleDownload}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-50"
              aria-label="Download output"
              disabled={!state.output && !state.input}
            >
              Download
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                applyAuto('<div class="card">Tom &amp; Jerry\'s "best" episode</div>')
              }
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load sample HTML snippet"
            >
              Sample HTML
            </button>
            <button
              onClick={() => applyAuto('Quotes: "double" & \'single\' & ampersand &')}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
              aria-label="Load sample text"
            >
              Sample text
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={state.input}
            onChange={(event) => applyAuto(event.target.value)}
            placeholder="Paste text or HTML to encode/decode"
            aria-label="Input text to encode or decode"
          />
          {state.error ? (
            <p className="text-sm font-medium text-amber-600">{state.error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Tip: encode before embedding user input; decode to review stored entities.
            </p>
          )}
          {state.warning ? <p className="text-sm font-medium text-amber-600">{state.warning}</p> : null}
          {state.processing && state.mode === "decode" ? (
            <p className="text-sm text-slate-600">
              Decoding{state.decodeProgress ? `... ${Math.round(state.decodeProgress * 100)}%` : "..."}
            </p>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stats</p>
            <div className="mt-2 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">Input length</p>
                <p className="font-semibold text-slate-900">
                  {state.lastStats ? state.lastStats.inputLength.toLocaleString() : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Output length</p>
                <p className="font-semibold text-slate-900">
                  {state.lastStats ? state.lastStats.outputLength.toLocaleString() : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Entities</p>
                <p className="font-semibold text-slate-900">
                  {state.lastStats
                    ? `${state.lastStats.entityCount.toLocaleString()} ${state.lastStats.mode === "decode" ? "decoded" : "encoded"}`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Time</p>
                <p className="font-semibold text-slate-900">
                  {state.lastStats ? `${state.lastStats.durationMs.toLocaleString()} ms` : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Change</p>
                <p className="font-semibold text-slate-900">
                  {statsSummary ? `${statsSummary.deltaText} (${statsSummary.percentText})` : "--"}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">History</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHistoryBack}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={state.historyIndex <= 0}
                  aria-label="Previous history item"
                >
                  Back
                </button>
                <button
                  onClick={handleHistoryForward}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={state.historyIndex < 0 || state.historyIndex >= state.history.length - 1}
                  aria-label="Next history item"
                >
                  Forward
                </button>
              </div>
            </div>
            {state.history.length ? (
              <div className="mt-3 space-y-2">
                {state.history
                  .slice()
                  .reverse()
                  .map((entry, idx) => {
                    const actualIndex = state.history.length - 1 - idx;
                    return (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {entry.mode.toUpperCase()} · {new Date(entry.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-slate-600">
                          {entry.input.slice(0, 48) || "Empty input"}
                          {entry.input.length > 48 ? "..." : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            dispatch({
                              type: "update",
                              updater: (prev) => ({ ...prev, historyIndex: actualIndex }),
                            });
                            loadHistoryEntry(entry);
                          }}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                          aria-label="Load history entry"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            patchState({
                              compareEntry: entry,
                              outputView: "diff",
                              status: "Comparing output with history",
                            });
                          }}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                          aria-label="Compare output with history"
                          disabled={!state.output}
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  );
                  })}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Run a transform to build history.</p>
            )}
          </div>
        </div>

        <div
          className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-labelledby="html-entities-output"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <p id="html-entities-output" className="text-sm font-semibold">
                Output
              </p>
              {state.compareEntry ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
                  Comparing history
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => patchState({ outputView: "output" })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  state.outputView === "output" ? "bg-white text-slate-900" : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                aria-label="View output"
              >
                Output
              </button>
              <button
                onClick={() => patchState({ outputView: "diff" })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  state.outputView === "diff" ? "bg-white text-slate-900" : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
                aria-label="View diff"
              >
                Diff
              </button>
              {state.compareEntry ? (
                <button
                  onClick={() => patchState({ compareEntry: null })}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/20"
                  aria-label="Clear history comparison"
                >
                  Clear compare
                </button>
              ) : null}
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50"
                disabled={!state.output}
                aria-label="Copy output"
              >
                {state.copiedOutput ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {state.copiedOutput ? "Copied output" : "Copy output"}
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100">
            {state.outputView === "output" ? (
              <pre className="text-sm leading-relaxed text-slate-100">
                {state.output || "Result will appear here."}
              </pre>
            ) : null}
            {state.outputView === "diff" ? (
              state.output || diffSource.left ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{diffSource.leftLabel}</p>
                      <div className="mt-2 grid min-w-0 grid-cols-[auto_1fr] gap-x-3 overflow-x-auto font-mono text-xs leading-5">
                        {diffLines.map((line, idx) => (
                          <div key={`left-${idx}`} className="contents">
                            <div
                              className={`text-right text-slate-500 ${line.type === "remove" ? "text-rose-300" : ""}`}
                            >
                              {line.leftLine ?? ""}
                            </div>
                            <div
                              className={`${
                                line.type === "remove" ? "bg-rose-500/15 text-rose-100" : "text-slate-100"
                              } whitespace-pre-wrap break-words`}
                            >
                              {line.leftText || " "}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{diffSource.rightLabel}</p>
                      <div className="mt-2 grid min-w-0 grid-cols-[auto_1fr] gap-x-3 overflow-x-auto font-mono text-xs leading-5">
                        {diffLines.map((line, idx) => (
                          <div key={`right-${idx}`} className="contents">
                            <div
                              className={`text-right text-slate-500 ${line.type === "add" ? "text-emerald-300" : ""}`}
                            >
                              {line.rightLine ?? ""}
                            </div>
                            <div
                              className={`${
                                line.type === "add" ? "bg-emerald-500/15 text-emerald-100" : "text-slate-100"
                              } whitespace-pre-wrap break-words`}
                            >
                              {line.rightText || " "}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Diff will appear here.</p>
              )
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Batch mode</h2>
              <p className="text-sm text-slate-600">
                Upload .txt or .html files, process with current settings, and download results.
              </p>
            </div>
            <button
              onClick={() => {
                patchState({ batchEntries: [], batchStatus: "" });
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              aria-label="Clear batch results"
              disabled={!state.batchEntries.length}
            >
              Clear
            </button>
          </div>
          <input
            type="file"
            accept=".txt,.html,text/plain,text/html"
            multiple
            onChange={(event) => handleBatchFiles(event.target.files)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
            aria-label="Upload text or HTML files for batch processing"
            disabled={state.batchBusy}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleBatchDownloadAll}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-50"
              disabled={!state.batchEntries.length || state.batchBusy}
              aria-label="Download batch outputs"
            >
              {state.batchEntries.length > 1 ? "Download zip" : "Download output"}
            </button>
            {state.batchStatus ? <span className="text-xs text-slate-600">{state.batchStatus}</span> : null}
          </div>
          {state.batchEntries.length ? (
            <div className="space-y-2">
              {state.batchEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.filename} · {entry.mode.toUpperCase()}
                    </p>
                    <p className="text-slate-600">
                      {entry.stats.inputLength.toLocaleString()} → {entry.stats.outputLength.toLocaleString()} chars,{" "}
                      {entry.stats.entityCount.toLocaleString()} entities, {entry.stats.durationMs} ms
                    </p>
                  </div>
                  <button
                    onClick={() => handleBatchDownload(entry)}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
                    aria-label={`Download output for ${entry.filename}`}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No batch results yet.</p>
          )}
        </div>

        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">API snippets</h2>
              <p className="text-sm text-slate-600">
                Copy ready-to-use encode/decode helpers for your app.
              </p>
            </div>
            <button
              onClick={handleCopySnippet}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
              aria-label="Copy API snippet"
            >
              {state.copiedSnippet ? "Copied snippet" : "Copy snippet"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="snippet-lang">
              Language
            </label>
            <select
              id="snippet-lang"
              value={state.snippetLang}
              onChange={(event) => patchState({ snippetLang: event.target.value as State["snippetLang"] })}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Select snippet language"
            >
              <option value="ts">TypeScript</option>
              <option value="js">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>
          <pre className="max-h-[320px] overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
            {snippetText}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Choose encode or decode, paste your text, and run (auto-run is on by default).</li>
          <li>Use Trim input to remove leading/trailing whitespace before processing.</li>
          <li>Copy or download the result; large inputs show a warning.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes, all processing happens in your browser.</p>
          <p><strong>Why encode?</strong> Encoding prevents browsers from treating user input as markup (avoids XSS/layout issues).</p>
          <p><strong>Is this a sanitizer?</strong> No. Encoding is for safely displaying text in HTML, not sanitizing unsafe HTML.</p>
          <p><strong>Big inputs?</strong> Very large inputs may be slower; you’ll see a warning so you can decide.</p>
        </div>
      </div>
    </main>
  );
}
