"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw, Sliders, Share2, Upload } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

type Row = Record<string, unknown>;
type ColumnFilter = { op: "contains" | "equals" | ">" | "<"; value: string };

export default function JsonTableClient() {
  const [input, setInput] = useState('[{"name":"Alice","age":25},{"name":"Bob","age":28}]');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [filter, setFilter] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rowLimit, setRowLimit] = useState(200);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnSearch, setColumnSearch] = useState("");
  const [pinnedCol, setPinnedCol] = useState<string | null>(null);
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
  const [columnFilterSearch, setColumnFilterSearch] = useState("");
  const [groupByKey, setGroupByKey] = useState("");
  const MAX_CHARS = 40000;
  const WORKER_THRESHOLD = 200000;
  const CELL_TRUNCATE = 140;
  const [pretty, setPretty] = useState(true);
  const [flattenExport, setFlattenExport] = useState(false);
  const [jsonPath, setJsonPath] = useState("$");
  const [flattenTable, setFlattenTable] = useState(false);
  const [arrayMode, setArrayMode] = useState<"join" | "index" | "stringify">("join");
  const [exportFilteredOnly, setExportFilteredOnly] = useState(false);
  const [lenientMode, setLenientMode] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [parsed, setParsed] = useState<{
    rows: Row[];
    headers: string[];
    error: string;
    errorLine: number | null;
    errorColumn: number | null;
    errorPos: number | null;
    errorSnippet: string;
  }>({
    rows: [],
    headers: [],
    error: "",
    errorLine: null,
    errorColumn: null,
    errorPos: null,
    errorSnippet: "",
  });
  const [isParsing, setIsParsing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const workerRequestId = useRef(0);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const SHARE_LIMIT = 6000;

  const typeRank = (value: unknown) => {
    if (value === undefined) return 0;
    if (value === null) return 1;
    if (typeof value === "boolean") return 2;
    if (typeof value === "number") return 3;
    if (value instanceof Date) return 4;
    if (typeof value === "string") return 5;
    if (Array.isArray(value)) return 6;
    if (typeof value === "object") return 7;
    return 8;
  };

  const parseDate = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value !== "string") return null;
    const isoLike = /^\d{4}-\d{2}-\d{2}(?:[tT ][\d:.+-]+)?$/.test(value);
    if (!isoLike) return null;
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return null;
    return new Date(timestamp);
  };

  const getErrorDetails = (raw: string, err: unknown) => {
    const message = err instanceof Error ? err.message : "Invalid JSON input.";
    const match = /position\s+(\d+)/i.exec(message);
    if (!match) {
      return { errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
    }
    const pos = Number(match[1]);
    if (!Number.isFinite(pos)) {
      return { errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
    }
    const slice = raw.slice(0, pos);
    const lines = slice.split("\n");
    const errorLine = lines.length;
    const errorColumn = lines[lines.length - 1]?.length + 1;
    const lineText = raw.split("\n")[errorLine - 1] || "";
    const caret = " ".repeat(Math.max(errorColumn - 1, 0)) + "^";
    return { errorLine, errorColumn, errorPos: pos, errorSnippet: `${lineText}\n${caret}` };
  };

  const fixCommonJsonIssues = (raw: string) => {
    let next = raw;
    next = next.replace(/,\s*([}\]])/g, "$1");
    next = next.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, inner) => {
      const escaped = String(inner).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    return next;
  };

  const compareValues = (a: unknown, b: unknown): number => {
    if (a === b) return 0;
    const rankA = typeRank(a);
    const rankB = typeRank(b);
    if (rankA !== rankB) return rankA - rankB;

    switch (rankA) {
      case 2: {
        const boolA = a as boolean;
        const boolB = b as boolean;
        return boolA === boolB ? 0 : boolA ? 1 : -1;
      }
      case 3: {
        const numA = a as number;
        const numB = b as number;
        const nanA = Number.isNaN(numA);
        const nanB = Number.isNaN(numB);
        if (nanA && nanB) return 0;
        if (nanA) return 1;
        if (nanB) return -1;
        return numA - numB;
      }
      case 4: {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        return String(a).localeCompare(String(b));
      }
      case 5: {
        const dateA = parseDate(a);
        const dateB = parseDate(b);
        if (dateA && dateB) return dateA.getTime() - dateB.getTime();
        return (a as string).localeCompare(b as string);
      }
      case 6: {
        const arrA = a as unknown[];
        const arrB = b as unknown[];
        const len = Math.min(arrA.length, arrB.length);
        for (let i = 0; i < len; i += 1) {
          const itemCompare = compareValues(arrA[i], arrB[i]);
          if (itemCompare !== 0) return itemCompare;
        }
        return arrA.length - arrB.length;
      }
      case 7: {
        const objA = a as Record<string, unknown>;
        const objB = b as Record<string, unknown>;
        const keysA = Object.keys(objA).sort();
        const keysB = Object.keys(objB).sort();
        const len = Math.min(keysA.length, keysB.length);
        for (let i = 0; i < len; i += 1) {
          const keyCompare = keysA[i].localeCompare(keysB[i]);
          if (keyCompare !== 0) return keyCompare;
        }
        if (keysA.length !== keysB.length) return keysA.length - keysB.length;
        for (const key of keysA) {
          const valueCompare = compareValues(objA[key], objB[key]);
          if (valueCompare !== 0) return valueCompare;
        }
        return 0;
      }
      default:
        return 0;
    }
  };

  const normalizeRows = (value: unknown) => {
    if (Array.isArray(value)) {
      const isObjectArray = value.every(
        (item) => item !== null && typeof item === "object" && !Array.isArray(item),
      );
      if (isObjectArray) {
        return { rows: value as Row[], error: "" };
      }
      const rows = value.map((item) => ({ value: item })) as Row[];
      return { rows, error: "" };
    }
    if (value !== null && typeof value === "object") {
      return { rows: [value as Row], error: "" };
    }
    return { rows: [{ value }] as Row[], error: "" };
  };

  const formatCellValue = (value: unknown) => {
    if (value === null) return { text: "null", badge: true };
    if (value === undefined) return { text: "undefined", badge: true };
    if (typeof value === "string") return { text: value, badge: false };
    if (typeof value === "number" || typeof value === "boolean") return { text: String(value), badge: false };
    if (value instanceof Date) return { text: value.toISOString(), badge: false };
    try {
      return { text: JSON.stringify(value), badge: false };
    } catch {
      return { text: Array.isArray(value) ? "[Array]" : "[Object]", badge: false };
    }
  };

  const normalizeKey = (value: unknown) => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  };

  const matchesColumnFilter = (value: unknown, filterDef: ColumnFilter) => {
    const raw = filterDef.value.trim();
    if (!raw) return true;
    const lower = raw.toLowerCase();
    if (filterDef.op === "contains") {
      return normalizeKey(value).toLowerCase().includes(lower);
    }
    if (filterDef.op === "equals") {
      if (typeof value === "boolean") {
        return String(value).toLowerCase() === lower;
      }
      if (typeof value === "number") {
        const num = Number(raw);
        return Number.isFinite(num) ? value === num : false;
      }
      return normalizeKey(value).toLowerCase() === lower;
    }
    const num = Number(raw);
    const valNum = typeof value === "number" ? value : Number(normalizeKey(value));
    if (!Number.isFinite(num) || !Number.isFinite(valNum)) return false;
    return filterDef.op === ">" ? valNum > num : valNum < num;
  };

  const buildHeaders = (rows: Row[]) =>
    Array.from(
      rows.reduce((set: Set<string>, item: Row) => {
        Object.keys(item || {}).forEach((k) => set.add(k));
        return set;
      }, new Set<string>()),
    ).sort((a, b) => a.localeCompare(b));

  const flattenRow = (row: Row) => {
    const out: Record<string, unknown> = {};
    const visit = (value: unknown, prefix: string) => {
      if (value === null || value === undefined) {
        out[prefix] = value;
        return;
      }
      if (Array.isArray(value)) {
        if (!value.length) {
          out[prefix] = arrayMode === "stringify" ? "[]" : "";
          return;
        }
        if (arrayMode === "join") {
          out[prefix] = value
            .map((item) =>
              item === null || item === undefined
                ? ""
                : typeof item === "string" || typeof item === "number" || typeof item === "boolean"
                ? String(item)
                : JSON.stringify(item),
            )
            .join("; ");
          return;
        }
        if (arrayMode === "stringify") {
          out[prefix] = JSON.stringify(value);
          return;
        }
        value.forEach((item, index) => {
          const nextPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
          visit(item, nextPrefix);
        });
        return;
      }
      if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);
        if (!entries.length) {
          out[prefix] = {};
          return;
        }
        entries
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([key, val]) => {
            const nextPrefix = prefix ? `${prefix}.${key}` : key;
            visit(val, nextPrefix);
          });
        return;
      }
      out[prefix] = value;
    };

    Object.entries(row).forEach(([key, value]) => {
      visit(value, key);
    });
    return out as Row;
  };

  const resolveJsonPath = (value: unknown, path: string) => {
    const trimmed = path.trim();
    if (!trimmed || trimmed === "$") return { value, error: "" };
    if (!trimmed.startsWith("$")) {
      return { value: null, error: "JSONPath must start with $." };
    }
    const raw = trimmed.slice(1);
    const segments = raw.split(".").filter(Boolean);
    let nodes: unknown[] = [value];
    for (const segment of segments) {
      const next: unknown[] = [];
      const match = /^([^\[\]]+)?(\[(\*|\d+)\])?$/.exec(segment);
      if (!match) {
        return { value: null, error: "Unsupported JSONPath segment." };
      }
      const [, prop, , bracket] = match;
      for (const node of nodes) {
        const base = prop ? (node as Record<string, unknown>)?.[prop] : node;
        if (bracket === "*") {
          if (Array.isArray(base)) next.push(...base);
        } else if (bracket) {
          const index = Number(bracket);
          if (Array.isArray(base) && Number.isFinite(index)) next.push(base[index]);
        } else if (base !== undefined) {
          next.push(base);
        }
      }
      nodes = next;
      if (!nodes.length) break;
    }
    if (!nodes.length) {
      return { value: null, error: "JSONPath did not resolve to any data." };
    }
    return { value: nodes.length === 1 ? nodes[0] : nodes, error: "" };
  };

  const parseInput = (raw: string) => {
    if (raw.length > MAX_CHARS) {
      return {
        rows: [],
        headers: [],
        error: `Input exceeds ${MAX_CHARS.toLocaleString()} characters. Trim the JSON to parse it.`,
        errorLine: null,
        errorColumn: null,
        errorPos: null,
        errorSnippet: "",
      };
    }
    try {
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        if (!lenientMode) throw err;
        const fixed = fixCommonJsonIssues(raw);
        data = JSON.parse(fixed);
      }
      const resolved = resolveJsonPath(data, jsonPath);
      if (resolved.error) {
        return {
          rows: [],
          headers: [],
          error: resolved.error,
          errorLine: null,
          errorColumn: null,
          errorPos: null,
          errorSnippet: "",
        };
      }
      const normalized = normalizeRows(resolved.value);
      if (normalized.error) {
        return {
          rows: [],
          headers: [],
          error: normalized.error,
          errorLine: null,
          errorColumn: null,
          errorPos: null,
          errorSnippet: "",
        };
      }
      const rows = flattenTable ? normalized.rows.map((row) => flattenRow(row)) : normalized.rows;
      return { rows, headers: buildHeaders(rows), error: "", errorLine: null, errorColumn: null, errorPos: null, errorSnippet: "" };
    } catch (err) {
      const details = getErrorDetails(raw, err);
      return { rows: [], headers: [], error: "Invalid JSON input.", ...details };
    }
  };

  useEffect(() => {
    workerRef.current = new Worker(new URL("./json-table.worker.ts", import.meta.url));
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const handleMessage = (
      event: MessageEvent<{
        id: number;
        payload: {
          rows: Row[];
          headers: string[];
          error: string;
          errorLine: number | null;
          errorColumn: number | null;
          errorPos: number | null;
          errorSnippet: string;
        };
      }>,
    ) => {
      if (event.data.id !== workerRequestId.current) return;
      setParsed(event.data.payload);
      setIsParsing(false);
    };
    worker.addEventListener("message", handleMessage);
    return () => worker.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setFilter(filterInput), 200);
    return () => window.clearTimeout(timer);
  }, [filterInput]);

  useEffect(() => {
    const id = (workerRequestId.current += 1);
    if (input.length > MAX_CHARS) {
      setIsParsing(false);
      setParsed(parseInput(input));
      return;
    }
    if (input.length >= WORKER_THRESHOLD && workerRef.current) {
      setIsParsing(true);
      workerRef.current.postMessage({
        id,
        input,
        jsonPath,
        flattenTable,
        arrayMode,
        maxChars: MAX_CHARS,
        lenientMode,
      });
      return;
    }
    setIsParsing(false);
    setParsed(parseInput(input));
  }, [input, jsonPath, flattenTable, arrayMode, lenientMode]);

  useEffect(() => {
    if (!parsed.error || parsed.errorPos === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(parsed.errorPos, parsed.errorPos + 1);
  }, [parsed.error, parsed.errorPos]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.startsWith("#json=")) {
      try {
        const encoded = hash.replace(/^#json=/, "");
        const decoded = decodeURIComponent(encoded);
        setInput(decoded);
        setStatus("Loaded from share link");
      } catch {
        setStatus("Share link failed to load");
      }
      return;
    }
    if (hash.startsWith("#session=")) {
      const key = hash.replace(/^#session=/, "");
      try {
        const cached = sessionStorage.getItem(key);
        if (cached) {
          setInput(cached);
          setStatus("Loaded from session share");
        } else {
          setStatus("Session share expired");
        }
      } catch {
        setStatus("Session share failed to load");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("json-table-preferences");
    if (!saved) return;
    try {
      const parsedSaved = JSON.parse(saved) as {
        input?: string;
        rowLimit?: number;
        hiddenCols?: string[];
        sortKey?: string | null;
        sortDir?: "asc" | "desc";
      };
      if (typeof parsedSaved.input === "string") setInput(parsedSaved.input);
      if (typeof parsedSaved.rowLimit === "number") setRowLimit(parsedSaved.rowLimit);
      if (Array.isArray(parsedSaved.hiddenCols)) setHiddenCols(new Set(parsedSaved.hiddenCols));
      if (typeof parsedSaved.sortKey === "string" || parsedSaved.sortKey === null) setSortKey(parsedSaved.sortKey ?? null);
      if (parsedSaved.sortDir === "asc" || parsedSaved.sortDir === "desc") setSortDir(parsedSaved.sortDir);
    } catch {
      // Ignore malformed localStorage entries.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      input,
      rowLimit,
      hiddenCols: Array.from(hiddenCols),
      sortKey,
      sortDir,
    };
    window.localStorage.setItem("json-table-preferences", JSON.stringify(payload));
  }, [input, rowLimit, hiddenCols, sortKey, sortDir]);

  useEffect(() => {
    if (!parsed.headers.length) return;
    setColumnOrder((prev) => {
      const existing = prev.filter((col) => parsed.headers.includes(col));
      parsed.headers.forEach((col) => {
        if (!existing.includes(col)) existing.push(col);
      });
      return existing;
    });
    setHiddenCols((prev) => new Set([...prev].filter((col) => parsed.headers.includes(col))));
    setColumnFilters((prev) => {
      const next: Record<string, ColumnFilter> = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (parsed.headers.includes(key)) next[key] = value;
      });
      return next;
    });
    if (groupByKey && !parsed.headers.includes(groupByKey)) setGroupByKey("");
    if (pinnedCol && !parsed.headers.includes(pinnedCol)) setPinnedCol(null);
  }, [parsed.headers, pinnedCol, groupByKey]);

  const orderedHeaders = useMemo(() => {
    const base = columnOrder.length ? columnOrder : parsed.headers;
    if (!pinnedCol) return base;
    return [pinnedCol, ...base.filter((col) => col !== pinnedCol)];
  }, [columnOrder, parsed.headers, pinnedCol]);

  const indexedRows = useMemo(() => {
    if (parsed.error) return [];
    const rows = parsed.rows.slice(0, rowLimit);
    return rows.map((row) => ({ row, search: JSON.stringify(row).toLowerCase() }));
  }, [parsed, rowLimit]);

  const filteredRows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const activeFilters = Object.entries(columnFilters).filter(([, value]) => value.value.trim() !== "");
    let result = indexedRows
      .filter((entry) => {
        if (term && !entry.search.includes(term)) return false;
        if (!activeFilters.length) return true;
        return activeFilters.every(([key, def]) => matchesColumnFilter(entry.row[key], def));
      })
      .map((entry) => entry.row);
    if (sortKey) {
      const direction = sortDir === "asc" ? 1 : -1;
      result = result
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
          const va = a.row[sortKey];
          const vb = b.row[sortKey];
          const valueCompare = compareValues(va, vb);
          if (valueCompare !== 0) return valueCompare * direction;
          return a.index - b.index;
        })
        .map((entry) => entry.row);
    }
    return result;
  }, [indexedRows, filter, sortKey, sortDir, columnFilters]);

  const truncated = useMemo(() => {
    const total = parsed.rows.length;
    return total > filteredRows.length;
  }, [parsed.rows.length, filteredRows.length]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  const columnStats = useMemo(() => {
    const stats = parsed.headers.reduce<Record<string, { nulls: number; unique: Set<string>; min: number | null; max: number | null; numericCount: number }>>(
      (acc, header) => {
        acc[header] = { nulls: 0, unique: new Set<string>(), min: null, max: null, numericCount: 0 };
        return acc;
      },
      {},
    );
    filteredRows.forEach((row) => {
      parsed.headers.forEach((header) => {
        const value = row[header];
        const entry = stats[header];
        if (!entry) return;
        if (value === null || value === undefined) entry.nulls += 1;
        entry.unique.add(normalizeKey(value));
        if (typeof value === "number" && Number.isFinite(value)) {
          entry.numericCount += 1;
          entry.min = entry.min === null ? value : Math.min(entry.min, value);
          entry.max = entry.max === null ? value : Math.max(entry.max, value);
        }
      });
    });
    return parsed.headers.map((header) => ({
      header,
      nulls: stats[header]?.nulls ?? 0,
      unique: stats[header]?.unique.size ?? 0,
      min: stats[header]?.min ?? null,
      max: stats[header]?.max ?? null,
      numericCount: stats[header]?.numericCount ?? 0,
    }));
  }, [parsed.headers, filteredRows]);

  const groupCounts = useMemo(() => {
    if (!groupByKey) return [];
    const counts = new Map<string, number>();
    filteredRows.forEach((row) => {
      const key = normalizeKey(row[groupByKey]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [filteredRows, groupByKey]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.error ? "" : JSON.stringify(parsed.rows, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied JSON");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const flattenValue = (value: unknown, prefix: string, out: Record<string, unknown>) => {
    if (value === null || value === undefined) {
      out[prefix] = value;
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        out[prefix] = [];
        return;
      }
      value.forEach((item, index) => {
        const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
        flattenValue(item, nextPrefix, out);
      });
      return;
    }
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (!entries.length) {
        out[prefix] = {};
        return;
      }
      entries
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, val]) => {
          const nextPrefix = prefix ? `${prefix}.${key}` : key;
          flattenValue(val, nextPrefix, out);
        });
      return;
    }
    out[prefix] = value;
  };

  const getExportRows = () => {
    const baseRows = exportFilteredOnly ? filteredRows : parsed.rows;
    if (!flattenExport) return baseRows;
    return baseRows.map((row) => {
      const flattened: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        flattenValue(value, key, flattened);
      });
      return flattened as Row;
    });
  };

  const getExportHeaders = (rows: Row[]) => buildHeaders(rows);

  const escapeCell = (value: unknown, delimiter: string) => {
    if (value === null || value === undefined) return "";
    const text =
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
    const needsQuotes = text.includes(delimiter) || text.includes("\n") || text.includes("\r") || text.includes('"');
    const escaped = text.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const buildDelimited = (rows: Row[], delimiter: string, visibleOnly: boolean) => {
    const cols = getExportHeaders(rows).filter((h) => (visibleOnly ? !hiddenCols.has(String(h)) : true));
    const lines = rows.map((row) => cols.map((c) => escapeCell((row as Row)[String(c)], delimiter)).join(delimiter));
    return [cols.join(delimiter), ...lines].join("\n");
  };

  const copyDelimited = async (delimiter: string, label: string, visibleOnly: boolean) => {
    if (parsed.error || !parsed.rows.length) return;
    const rows = getExportRows();
    const content = buildDelimited(rows, delimiter, visibleOnly);
    try {
      await navigator.clipboard.writeText(content);
      setStatus(`Copied ${label}`);
    } catch {
      setStatus("Copy failed");
    }
  };

  const handleShare = async () => {
    const encoded = encodeURIComponent(input);
    if (encoded.length <= SHARE_LIMIT) {
      const url = `${window.location.origin}${window.location.pathname}#json=${encoded}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setStatus("Share link copied");
      } catch {
        setStatus("Share link ready");
      }
      return;
    }
    try {
      sessionStorage.setItem("json-table-share", input);
      const url = `${window.location.origin}${window.location.pathname}#session=json-table-share`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setStatus("Share link copied (session)");
      } catch {
        setStatus("Share link ready (session)");
      }
    } catch {
      setStatus("Share failed");
    }
  };

  const handleLoadFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      setInput(text);
      setStatus(`Loaded ${file.name}`);
    } catch {
      setStatus("File read failed");
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await handleLoadFile(file);
  };

  const buildNdjson = (rows: Row[]) => rows.map((row) => JSON.stringify(row)).join("\n");

  const download = (content: string, filename: string, contentType = "text/plain") => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const sampleFlat = '[{"name":"Alice","age":25},{"name":"Bob","age":28,"city":"Paris"}]';
  const sampleNested =
    '[{"user":{"id":1,"name":"Alice"},"tags":["admin","editor"]},{"user":{"id":2,"name":"Bob"},"tags":["viewer"]}]';

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleColumnDrop = (from: string, to: string) => {
    if (from === to) return;
    setColumnOrder((prev) => {
      const order = prev.length ? [...prev] : [...parsed.headers];
      const fromIndex = order.indexOf(from);
      const toIndex = order.indexOf(to);
      if (fromIndex < 0 || toIndex < 0) return order;
      order.splice(fromIndex, 1);
      order.splice(toIndex, 0, from);
      return order;
    });
  };

  const toggleCol = (col: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {parsed.error}
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
              JSON to Table
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JSON Table Viewer</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Paste a JSON array to see it as a table. Validate input and copy clean JSON.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setInput('[{"name":"Alice","age":25},{"name":"Bob","age":28}]');
              setCopied(false);
              setStatus("Reset");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            <Upload className="h-4 w-4" />
            Load JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(event) => handleLoadFile(event.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => {
              setInput(sampleFlat);
              setStatus("Loaded flat sample");
            }}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Flat sample
          </button>
          <button
            onClick={() => {
              setInput(sampleNested);
              setStatus("Loaded nested sample");
            }}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Nested sample
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!input.trim().length}
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={() => copyDelimited(",", "CSV (visible columns)", true)}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
          >
            Copy CSV
          </button>
          <button
            onClick={() => copyDelimited("\t", "TSV (visible columns)", true)}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
          >
            Copy TSV
          </button>
          <button
            onClick={() => download(JSON.stringify(parsed.rows, null, 2), "json-table.json", "application/json")}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
            aria-label="Download JSON"
          >
            <Download className="h-4 w-4" />
            Save JSON
          </button>
          <button
            onClick={() => {
              const rows = getExportRows();
              const ndjson = buildNdjson(rows);
              download(ndjson, "json-table.ndjson", "application/x-ndjson");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
            aria-label="Download NDJSON"
          >
            <Download className="h-4 w-4" />
            Save NDJSON
          </button>
          <button
            onClick={() => {
              const rows = getExportRows();
              const csv = buildDelimited(rows, ",", false);
              download(csv, "json-table.csv", "text/csv");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
            aria-label="Download CSV"
          >
            <Download className="h-4 w-4" />
            Save CSV
          </button>
          <button
            onClick={() => {
              const rows = getExportRows();
              const tsv = buildDelimited(rows, "\t", false);
              download(tsv, "json-table.tsv", "text/tab-separated-values");
            }}
            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:opacity-60"
            disabled={!!parsed.error || !parsed.rows.length}
            aria-label="Download TSV"
          >
            <Download className="h-4 w-4" />
            Save TSV
          </button>
        </div>
        <textarea
          ref={inputRef}
          className={`h-[220px] w-full rounded-xl border px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:outline-none focus:ring-2 ${
            isDragging ? "border-slate-600 bg-slate-50 ring-slate-300" : "border-slate-200 bg-white focus:border-slate-400 focus:ring-slate-200"
          }`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        />
        {shareUrl ? (
          <p className="text-xs text-slate-500">
            Share link ready: <span className="font-medium text-slate-700">{shareUrl}</span>
          </p>
        ) : null}
        {parsed.error ? (
          <div className="space-y-2 text-sm text-amber-600">
            <p className="font-medium">
              {parsed.error}
              {parsed.errorLine && parsed.errorColumn ? ` (line ${parsed.errorLine}, col ${parsed.errorColumn})` : ""}
            </p>
            {parsed.errorSnippet ? (
              <pre className="rounded-lg bg-amber-50/60 px-3 py-2 text-xs text-amber-700">{parsed.errorSnippet}</pre>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Rows detected: {parsed.rows.length} {truncated ? " · View limited by row cap" : ""}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <button
            onClick={() => {
              try {
                const indent = pretty ? 0 : 2;
                setInput(JSON.stringify(JSON.parse(input), null, indent));
                setStatus(pretty ? "Minified input" : "Pretty-printed input");
              } catch {
                setStatus("Invalid JSON; cannot format");
              }
            }}
            className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            {pretty ? "Minify" : "Pretty print"}
          </button>
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={pretty}
              onChange={(e) => setPretty(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Pretty mode
          </label>
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={flattenTable}
              onChange={(e) => setFlattenTable(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Flatten table
          </label>
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={lenientMode}
              onChange={(e) => setLenientMode(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Lenient JSON
          </label>
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={exportFilteredOnly}
              onChange={(e) => setExportFilteredOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Export filtered only
          </label>
          {flattenTable ? (
            <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
              Arrays
              <select
                value={arrayMode}
                onChange={(e) => setArrayMode(e.target.value as "join" | "index" | "stringify")}
                className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
              >
                <option value="join">Join with ;</option>
                <option value="index">Index keys</option>
                <option value="stringify">Stringify</option>
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={flattenExport}
              onChange={(e) => setFlattenExport(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            Flatten export
          </label>
          {input.length > MAX_CHARS ? (
            <span className="text-amber-600 font-medium">
              Input too large to parse ({MAX_CHARS.toLocaleString()} char limit).
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            <Sliders className="h-4 w-4" />
            <input
              type="text"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              placeholder="Filter rows (text search)"
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              aria-label="Filter rows"
            />
          </div>
          <label className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            Row limit
            <input
              type="number"
              value={rowLimit}
              onChange={(e) => setRowLimit(Math.max(10, Number(e.target.value) || 10))}
              className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
              aria-label="Row limit"
            />
          </label>
          <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
            JSONPath
            <input
              type="text"
              value={jsonPath}
              onChange={(e) => setJsonPath(e.target.value)}
              placeholder="$.items[*]"
              className="w-40 bg-transparent text-xs text-slate-700 focus:outline-none"
              aria-label="JSONPath"
            />
          </label>
          {truncated ? <span className="text-amber-600 font-medium">Showing first {filteredRows.length} rows.</span> : null}
          {isParsing ? <span className="text-slate-500 font-medium">Parsing large JSON in background…</span> : null}
        </div>
      </div>

      <div
        className="rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
        role="region"
        aria-labelledby="json-table-preview"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-sm font-semibold">
          <span id="json-table-preview">Table preview</span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <span>
              Rows: {filteredRows.length} / {parsed.rows.length} · Columns: {parsed.headers.length}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">Columns:</span>
              <input
                type="text"
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                placeholder="Search columns"
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none"
                aria-label="Search columns"
              />
              <button
                type="button"
                onClick={() => setHiddenCols(new Set(parsed.headers.map(String)))}
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-100 transition hover:bg-white/20"
              >
                Hide all
              </button>
              <button
                type="button"
                onClick={() => setHiddenCols(new Set())}
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-100 transition hover:bg-white/20"
              >
                Show all
              </button>
            </div>
            <span className="text-slate-400">Toggle columns:</span>
            {orderedHeaders
              .filter((h) => h.toLowerCase().includes(columnSearch.trim().toLowerCase()))
              .map((h) => (
                <div
                  key={String(h)}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", String(h));
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleColumnDrop(event.dataTransfer.getData("text/plain"), String(h));
                  }}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5"
                  title="Drag to reorder"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenCols.has(String(h))}
                    onChange={() => toggleCol(String(h))}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                    aria-label={`Toggle column ${String(h)}`}
                  />
                  <span>{String(h)}</span>
                  <button
                    type="button"
                    onClick={() => setPinnedCol((prev) => (prev === String(h) ? null : String(h)))}
                    className="rounded-full bg-white/10 px-1 text-[10px] uppercase tracking-[0.08em] text-slate-200 transition hover:bg-white/20"
                    aria-label={`Pin column ${String(h)} left`}
                  >
                    {pinnedCol === String(h) ? "Pinned" : "Pin"}
                  </button>
                </div>
              ))}
          </div>
        </div>
        <div ref={tableScrollRef} className="max-h-[360px] overflow-auto">
          {!filteredRows.length || parsed.error ? (
            <div className="px-4 py-3 text-sm text-slate-300">Valid table preview will appear here.</div>
          ) : (
            <table className="min-w-full table-fixed text-left text-sm text-slate-100">
              <thead className="sticky top-0 z-10 block bg-slate-800">
                <tr className="table w-full table-fixed">
                  {orderedHeaders
                    .filter((h) => !hiddenCols.has(String(h)))
                    .map((h) => (
                      <th
                        key={String(h)}
                        className="cursor-pointer px-4 py-2 font-semibold uppercase tracking-[0.1em] text-xs"
                        onClick={() => handleSort(String(h))}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", String(h));
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleColumnDrop(event.dataTransfer.getData("text/plain"), String(h));
                        }}
                      >
                        {String(h)} {sortKey === String(h) ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="relative block" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = filteredRows[virtualRow.index];
                  const idx = virtualRow.index;
                  return (
                    <tr
                      key={virtualRow.key}
                      className="absolute left-0 right-0 border-t border-slate-800/60"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                        display: "table",
                        tableLayout: "fixed",
                        width: "100%",
                      }}
                    >
                    {orderedHeaders
                      .filter((h) => !hiddenCols.has(String(h)))
                      .map((h) => {
                        const key = String(h);
                        const value = (row as Record<string, unknown>)[key];
                        const { text, badge } = formatCellValue(value);
                        const cellKey = `${idx}:${key}`;
                        const isExpanded = expandedCells.has(cellKey);
                        const shouldTruncate = !badge && text.length > CELL_TRUNCATE;
                        const display = shouldTruncate && !isExpanded ? `${text.slice(0, CELL_TRUNCATE)}...` : text;
                        return (
                          <td key={key} className="px-4 py-2 align-top text-slate-200">
                            {badge ? (
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                                {text}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!shouldTruncate) return;
                                  setExpandedCells((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(cellKey)) next.delete(cellKey);
                                    else next.add(cellKey);
                                    return next;
                                  });
                                }}
                                className={`text-left ${shouldTruncate ? "cursor-pointer" : "cursor-default"}`}
                                aria-expanded={isExpanded}
                              >
                                {display}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Data exploration</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span className="font-medium text-slate-800">Column filters</span>
          <input
            type="text"
            value={columnFilterSearch}
            onChange={(e) => setColumnFilterSearch(e.target.value)}
            placeholder="Search columns"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 focus:outline-none"
            aria-label="Search column filters"
          />
          <button
            type="button"
            onClick={() => setColumnFilters({})}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          >
            Clear filters
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {orderedHeaders
            .filter((h) => h.toLowerCase().includes(columnFilterSearch.trim().toLowerCase()))
            .map((header) => {
              const current = columnFilters[header] ?? { op: "contains", value: "" };
              return (
                <div key={header} className="flex items-center gap-2 text-xs text-slate-700">
                  <span className="w-32 truncate font-medium text-slate-800">{header}</span>
                  <select
                    value={current.op}
                    onChange={(e) =>
                      setColumnFilters((prev) => ({
                        ...prev,
                        [header]: { op: e.target.value as ColumnFilter["op"], value: current.value },
                      }))
                    }
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                    aria-label={`Filter operator for ${header}`}
                  >
                    <option value="contains">contains</option>
                    <option value="equals">equals</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                  <input
                    type="text"
                    value={current.value}
                    onChange={(e) =>
                      setColumnFilters((prev) => ({
                        ...prev,
                        [header]: { op: current.op, value: e.target.value },
                      }))
                    }
                    placeholder="Value"
                    className="flex-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                    aria-label={`Filter value for ${header}`}
                  />
                </div>
              );
            })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <span className="font-medium text-slate-800">Group by</span>
          <select
            value={groupByKey}
            onChange={(e) => setGroupByKey(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
            aria-label="Group by column"
          >
            <option value="">Select column</option>
            {orderedHeaders.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
          {groupByKey ? (
            <span className="text-slate-500">Top 20 by count</span>
          ) : (
            <span className="text-slate-500">Choose a column to see counts.</span>
          )}
        </div>
        {groupByKey ? (
          <div className="grid gap-2 md:grid-cols-2">
            {groupCounts.length ? (
              groupCounts.map(([label, count]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  <span className="truncate text-slate-700">{label}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No rows to group.</p>
            )}
          </div>
        ) : null}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-900">Column stats</p>
          <div className="grid gap-2 md:grid-cols-2">
            {columnStats.map((stat) => (
              <div key={stat.header} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{stat.header}</span>
                  <span className="text-slate-500">Unique: {stat.unique}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  <span>Nulls: {stat.nulls}</span>
                  {stat.numericCount ? (
                    <>
                      <span>Min: {stat.min}</span>
                      <span>Max: {stat.max}</span>
                    </>
                  ) : (
                    <span>Min/Max: n/a</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste a JSON array or load a sample; optional pretty/minify and filters.</li>
          <li>Toggle columns, sort headers, and adjust row limit; warnings show on large inputs.</li>
          <li>Copy/download JSON or CSV; table respects visible columns.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Parsing/rendering happen in your browser.</p>
          <p><strong>Large inputs?</strong> Inputs over ~40k chars show a warning; row limit/truncation keep UI responsive.</p>
          <p><strong>Exports?</strong> Copy or download JSON/CSV; you can also copy CSV to clipboard.</p>
        </div>
      </div>
    </main>
  );
}
