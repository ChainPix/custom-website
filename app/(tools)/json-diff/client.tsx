"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, Filter, RefreshCcw, Shuffle } from "lucide-react";

type DiffEntry = {
  path: string;
  type: "added" | "removed" | "changed" | "same" | "moved";
  before?: unknown;
  after?: unknown;
};

type DiffCounts = Record<DiffEntry["type"], number>;

type TreeNode = {
  id: string;
  path: string;
  label: string;
  before?: unknown;
  after?: unknown;
  children: TreeNode[];
  counts: DiffCounts;
  type: DiffEntry["type"];
};

type DiffOptions = {
  ignoreCase: boolean;
  ignoreNullVsMissing: boolean;
  ignoreEmptyStrings: boolean;
  ignoreEmptyContainers: boolean;
  arrayDiffMode: "index" | "set" | "key";
  arrayKey: string;
  ignorePathsRegex: RegExp | null;
  ignoreKeys: Set<string>;
};

const normalizeString = (value: unknown, ignoreCase: boolean) =>
  typeof value === "string" && ignoreCase ? value.toLowerCase() : value;

const isEmptyObject = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value as Record<string, unknown>).length === 0;

const isEmptyArray = (value: unknown) => Array.isArray(value) && value.length === 0;

const normalizeValue = (value: unknown, opts: DiffOptions) => {
  if (opts.ignoreNullVsMissing && value === null) return undefined;
  if (opts.ignoreEmptyStrings && value === "") return undefined;
  if (opts.ignoreEmptyContainers && (isEmptyArray(value) || isEmptyObject(value))) return undefined;
  return value;
};

const sortObjectKeys = (value: Record<string, unknown>) =>
  Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const sorted = sortObjectKeys(value as Record<string, unknown>);
    return `{${Object.entries(sorted)
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const PATH_ID_PREFIX = "json-node-";

const toNodeId = (path: string) => {
  if (!path) return `${PATH_ID_PREFIX}root`;
  return `${PATH_ID_PREFIX}${path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
};

const formatValue = (value: unknown, limit = 120) => {
  if (value === undefined) return "—";
  if (typeof value === "string") {
    const text = JSON.stringify(value);
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  }
  if (value === null) return "null";
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") return `Object(${Object.keys(value as Record<string, unknown>).length})`;
  const text = JSON.stringify(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
};

const getCountTemplate = (): DiffCounts => ({
  added: 0,
  removed: 0,
  changed: 0,
  same: 0,
  moved: 0,
});

const mergeCounts = (target: DiffCounts, source: DiffCounts) => {
  (Object.keys(target) as Array<keyof DiffCounts>).forEach((key) => {
    target[key] += source[key];
  });
};

const shouldIgnorePath = (path: string, key: string, opts: DiffOptions) => {
  if (opts.ignoreKeys.has(key)) return true;
  if (opts.ignorePathsRegex && opts.ignorePathsRegex.test(path)) return true;
  return false;
};

const diffArraysByIndex = (
  arrA: unknown[],
  arrB: unknown[],
  path: string,
  opts: DiffOptions,
): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const maxLen = Math.max(arrA.length, arrB.length);
  for (let i = 0; i < maxLen; i += 1) {
    const entryPath = `${path}[${i}]`;
    let valA = normalizeValue(arrA[i], opts);
    let valB = normalizeValue(arrB[i], opts);

    valA = normalizeString(valA, opts.ignoreCase);
    valB = normalizeString(valB, opts.ignoreCase);

    if (valA === undefined && valB !== undefined) {
      entries.push({ path: entryPath, type: "added", after: valB });
      continue;
    }
    if (valA !== undefined && valB === undefined) {
      entries.push({ path: entryPath, type: "removed", before: valA });
      continue;
    }
    if (Array.isArray(valA) && Array.isArray(valB)) {
      entries.push(...diffArraysByIndex(valA, valB, entryPath, opts));
      continue;
    }
    if (
      typeof valA === "object" &&
      typeof valB === "object" &&
      valA &&
      valB &&
      !Array.isArray(valA) &&
      !Array.isArray(valB)
    ) {
      entries.push(...walkDiff(valA as Record<string, unknown>, valB as Record<string, unknown>, entryPath, opts));
      continue;
    }
    if (valA !== valB) {
      entries.push({ path: entryPath, type: "changed", before: valA, after: valB });
    } else {
      entries.push({ path: entryPath, type: "same", before: valA, after: valB });
    }
  }
  return entries;
};

const diffArraysAsSets = (
  arrA: unknown[],
  arrB: unknown[],
  path: string,
  opts: DiffOptions,
): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const normalizedA = arrA.map((item) => normalizeString(normalizeValue(item, opts), opts.ignoreCase));
  const normalizedB = arrB.map((item) => normalizeString(normalizeValue(item, opts), opts.ignoreCase));
  const idsA = normalizedA.map((item) => stableStringify(item));
  const idsB = normalizedB.map((item) => stableStringify(item));
  const mapA = new Map<string, number[]>();
  const mapB = new Map<string, number[]>();

  idsA.forEach((id, idx) => {
    if (normalizedA[idx] === undefined) return;
    const list = mapA.get(id) || [];
    list.push(idx);
    mapA.set(id, list);
  });
  idsB.forEach((id, idx) => {
    if (normalizedB[idx] === undefined) return;
    const list = mapB.get(id) || [];
    list.push(idx);
    mapB.set(id, list);
  });

  const keys = [...new Set([...mapA.keys(), ...mapB.keys()])].sort();
  keys.forEach((id) => {
    const indicesA = mapA.get(id) || [];
    const indicesB = mapB.get(id) || [];
    const shared = Math.min(indicesA.length, indicesB.length);
    for (let i = 0; i < shared; i += 1) {
      const beforeIndex = indicesA[i];
      const afterIndex = indicesB[i];
      if (beforeIndex !== afterIndex) {
        entries.push({ path: `${path}[${beforeIndex}]`, type: "moved", before: beforeIndex, after: afterIndex });
      } else {
        entries.push({ path: `${path}[${beforeIndex}]`, type: "same", before: normalizedA[beforeIndex] });
      }
    }
    if (indicesA.length > shared) {
      indicesA.slice(shared).forEach((idx) => {
        entries.push({ path: `${path}[${idx}]`, type: "removed", before: normalizedA[idx] });
      });
    }
    if (indicesB.length > shared) {
      indicesB.slice(shared).forEach((idx) => {
        entries.push({ path: `${path}[${idx}]`, type: "added", after: normalizedB[idx] });
      });
    }
  });

  return entries;
};

const diffArraysByKey = (
  arrA: unknown[],
  arrB: unknown[],
  path: string,
  opts: DiffOptions,
): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const keyField = opts.arrayKey.trim();
  if (!keyField) {
    return diffArraysByIndex(arrA, arrB, path, opts);
  }
  const mapA = new Map<string, { item: Record<string, unknown>; index: number }[]>();
  const mapB = new Map<string, { item: Record<string, unknown>; index: number }[]>();
  const extrasA: { item: unknown; index: number }[] = [];
  const extrasB: { item: unknown; index: number }[] = [];

  arrA.forEach((item, index) => {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const keyValue = (item as Record<string, unknown>)[keyField];
      const keyId = keyValue === undefined ? "" : String(keyValue);
      if (!keyId) {
        extrasA.push({ item, index });
        return;
      }
      const list = mapA.get(keyId) || [];
      list.push({ item: item as Record<string, unknown>, index });
      mapA.set(keyId, list);
    } else {
      extrasA.push({ item, index });
    }
  });

  arrB.forEach((item, index) => {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const keyValue = (item as Record<string, unknown>)[keyField];
      const keyId = keyValue === undefined ? "" : String(keyValue);
      if (!keyId) {
        extrasB.push({ item, index });
        return;
      }
      const list = mapB.get(keyId) || [];
      list.push({ item: item as Record<string, unknown>, index });
      mapB.set(keyId, list);
    } else {
      extrasB.push({ item, index });
    }
  });

  const keys = [...new Set([...mapA.keys(), ...mapB.keys()])].sort();
  keys.forEach((keyId) => {
    const listA = mapA.get(keyId) || [];
    const listB = mapB.get(keyId) || [];
    const shared = Math.min(listA.length, listB.length);
    for (let i = 0; i < shared; i += 1) {
      const entryPath = `${path}[${keyField}=${keyId}]`;
      const leftItem = listA[i];
      const rightItem = listB[i];
      if (leftItem.index !== rightItem.index) {
        entries.push({
          path: entryPath,
          type: "moved",
          before: leftItem.index,
          after: rightItem.index,
        });
      }
      entries.push(...walkDiff(leftItem.item, rightItem.item, entryPath, opts));
    }
    if (listA.length > shared) {
      listA.slice(shared).forEach(({ item }) => {
        entries.push({ path: `${path}[${keyField}=${keyId}]`, type: "removed", before: item });
      });
    }
    if (listB.length > shared) {
      listB.slice(shared).forEach(({ item }) => {
        entries.push({ path: `${path}[${keyField}=${keyId}]`, type: "added", after: item });
      });
    }
  });

  extrasA.forEach(({ item, index }) => {
    entries.push({ path: `${path}[${index}]`, type: "removed", before: item });
  });
  extrasB.forEach(({ item, index }) => {
    entries.push({ path: `${path}[${index}]`, type: "added", after: item });
  });

  return entries;
};

const groupArrayByKey = (arr: unknown[], keyField: string) => {
  const map = new Map<string, { item: unknown; index: number }[]>();
  const extras: { item: unknown; index: number }[] = [];
  arr.forEach((item, index) => {
    if (typeof item === "object" && item !== null && !Array.isArray(item)) {
      const keyValue = (item as Record<string, unknown>)[keyField];
      const keyId = keyValue === undefined ? "" : String(keyValue);
      if (!keyId) {
        extras.push({ item, index });
        return;
      }
      const list = map.get(keyId) || [];
      list.push({ item, index });
      map.set(keyId, list);
    } else {
      extras.push({ item, index });
    }
  });
  return { map, extras };
};

const buildTree = (
  leftValue: unknown,
  rightValue: unknown,
  path: string,
  label: string,
  opts: DiffOptions,
  diffEntriesByPath: Map<string, DiffEntry[]>,
  pathToId: Map<string, string>,
  parentMap: Map<string, string>,
): TreeNode => {
  const nodeId = toNodeId(path);
  if (!pathToId.has(path)) {
    pathToId.set(path, nodeId);
  }
  const node: TreeNode = {
    id: nodeId,
    path,
    label,
    before: leftValue,
    after: rightValue,
    children: [],
    counts: getCountTemplate(),
    type: "same",
  };

  const isLeftArray = Array.isArray(leftValue);
  const isRightArray = Array.isArray(rightValue);
  const isLeftObject =
    typeof leftValue === "object" && leftValue !== null && !Array.isArray(leftValue);
  const isRightObject =
    typeof rightValue === "object" && rightValue !== null && !Array.isArray(rightValue);

  if (isLeftArray || isRightArray) {
    const leftArr = (leftValue as unknown[]) || [];
    const rightArr = (rightValue as unknown[]) || [];
    if (opts.arrayDiffMode === "key") {
      const keyField = opts.arrayKey.trim();
      if (keyField) {
        const { map: mapA, extras: extrasA } = groupArrayByKey(leftArr, keyField);
        const { map: mapB, extras: extrasB } = groupArrayByKey(rightArr, keyField);
        const keys = [...new Set([...mapA.keys(), ...mapB.keys()])].sort();
        keys.forEach((keyId) => {
          const listA = mapA.get(keyId) || [];
          const listB = mapB.get(keyId) || [];
          const shared = Math.max(listA.length, listB.length);
          for (let i = 0; i < shared; i += 1) {
            const entryPath = `${path}[${keyField}=${keyId}]`;
            const leftItem = listA[i]?.item;
            const rightItem = listB[i]?.item;
            const child = buildTree(
              leftItem,
              rightItem,
              entryPath,
              `${keyField}=${keyId}`,
              opts,
              diffEntriesByPath,
              pathToId,
              parentMap,
            );
            parentMap.set(child.path, path);
            node.children.push(child);
          }
        });
        extrasA.forEach(({ item, index }) => {
          const entryPath = `${path}[${index}]`;
          const child = buildTree(
            item,
            undefined,
            entryPath,
            `[${index}]`,
            opts,
            diffEntriesByPath,
            pathToId,
            parentMap,
          );
          parentMap.set(child.path, path);
          node.children.push(child);
        });
        extrasB.forEach(({ item, index }) => {
          const entryPath = `${path}[${index}]`;
          const child = buildTree(
            undefined,
            item,
            entryPath,
            `[${index}]`,
            opts,
            diffEntriesByPath,
            pathToId,
            parentMap,
          );
          parentMap.set(child.path, path);
          node.children.push(child);
        });
      } else {
        const maxLen = Math.max(leftArr.length, rightArr.length);
        for (let i = 0; i < maxLen; i += 1) {
          const entryPath = `${path}[${i}]`;
          const child = buildTree(
            leftArr[i],
            rightArr[i],
            entryPath,
            `[${i}]`,
            opts,
            diffEntriesByPath,
            pathToId,
            parentMap,
          );
          parentMap.set(child.path, path);
          node.children.push(child);
        }
      }
    } else {
      const maxLen = Math.max(leftArr.length, rightArr.length);
      for (let i = 0; i < maxLen; i += 1) {
        const entryPath = `${path}[${i}]`;
        const child = buildTree(
          leftArr[i],
          rightArr[i],
          entryPath,
          `[${i}]`,
          opts,
          diffEntriesByPath,
          pathToId,
          parentMap,
        );
        parentMap.set(child.path, path);
        node.children.push(child);
      }
    }
  } else if (isLeftObject || isRightObject) {
    const leftObj = (leftValue as Record<string, unknown>) || {};
    const rightObj = (rightValue as Record<string, unknown>) || {};
    const keys = [...new Set([...Object.keys(leftObj), ...Object.keys(rightObj)])].sort();
    keys.forEach((key) => {
      const childPath = path ? `${path}.${key}` : key;
      if (shouldIgnorePath(childPath, key, opts)) return;
      const child = buildTree(
        leftObj[key],
        rightObj[key],
        childPath,
        key,
        opts,
        diffEntriesByPath,
        pathToId,
        parentMap,
      );
      parentMap.set(child.path, path);
      node.children.push(child);
    });
  }

  const directEntries = diffEntriesByPath.get(path) || [];
  directEntries.forEach((entry) => {
    node.counts[entry.type] += 1;
  });
  node.children.forEach((child) => {
    mergeCounts(node.counts, child.counts);
  });

  if (node.counts.removed > 0) {
    node.type = "removed";
  } else if (node.counts.added > 0) {
    node.type = "added";
  } else if (node.counts.changed > 0) {
    node.type = "changed";
  } else if (node.counts.moved > 0) {
    node.type = "moved";
  } else {
    node.type = "same";
  }

  return node;
};

const walkDiff = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  basePath = "",
  opts: DiffOptions,
): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const keys = [...new Set<string>([...Object.keys(a || {}), ...Object.keys(b || {})])].sort();

  for (const key of keys) {
    const path = basePath ? `${basePath}.${key}` : key;
    if (shouldIgnorePath(path, key, opts)) continue;
    let valA = normalizeValue(a?.[key], opts);
    let valB = normalizeValue(b?.[key], opts);

    valA = normalizeString(valA, opts.ignoreCase);
    valB = normalizeString(valB, opts.ignoreCase);

    if (valA === undefined && valB !== undefined) {
      entries.push({ path, type: "added", after: valB });
      continue;
    }
    if (valA !== undefined && valB === undefined) {
      entries.push({ path, type: "removed", before: valA });
      continue;
    }
    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (opts.arrayDiffMode === "set") {
        entries.push(...diffArraysAsSets(valA, valB, path, opts));
      } else if (opts.arrayDiffMode === "key") {
        entries.push(...diffArraysByKey(valA, valB, path, opts));
      } else {
        entries.push(...diffArraysByIndex(valA, valB, path, opts));
      }
    } else if (
      typeof valA === "object" &&
      typeof valB === "object" &&
      valA &&
      valB &&
      !Array.isArray(valA) &&
      !Array.isArray(valB)
    ) {
      entries.push(...walkDiff(valA as Record<string, unknown>, valB as Record<string, unknown>, path, opts));
    } else if (valA !== valB) {
      entries.push({ path, type: "changed", before: valA, after: valB });
    } else {
      entries.push({ path, type: "same", before: valA, after: valB });
    }
  }

  return entries;
};

export default function JsonDiffClient() {
  const [left, setLeft] = useState('{\n  "name": "Alice",\n  "age": 25\n}');
  const [right, setRight] = useState('{\n  "name": "Alice",\n  "age": 26,\n  "city": "Paris"\n}');
  const [status, setStatus] = useState("Ready");
  const [pretty, setPretty] = useState(true);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreNullVsMissing, setIgnoreNullVsMissing] = useState(false);
  const [ignoreEmptyStrings, setIgnoreEmptyStrings] = useState(false);
  const [ignoreEmptyContainers, setIgnoreEmptyContainers] = useState(false);
  const [arrayDiffMode, setArrayDiffMode] = useState<"index" | "set" | "key">("index");
  const [arrayKey, setArrayKey] = useState("id");
  const [ignorePaths, setIgnorePaths] = useState("");
  const [ignoreKeysInput, setIgnoreKeysInput] = useState("");
  const [filter, setFilter] = useState("");
  const [valueFilter, setValueFilter] = useState("");
  const [typeFilters, setTypeFilters] = useState<Array<DiffEntry["type"]>>([
    "added",
    "removed",
    "changed",
    "moved",
  ]);
  const [showSame, setShowSame] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([toNodeId("")]));

  const MAX_INPUT_CHARS = 20000;
  const MAX_DIFF_ENTRIES = 500;

  const parsed = useMemo(() => {
    try {
      const a = JSON.parse(left) as Record<string, unknown>;
      const b = JSON.parse(right) as Record<string, unknown>;
      if (Array.isArray(a) || Array.isArray(b)) {
        return { a: null, b: null, error: "Please provide JSON objects (not arrays)." };
      }
      return { a, b, error: "" };
    } catch {
      return { a: null, b: null, error: "Invalid JSON in one of the inputs." };
    }
  }, [left, right]);

  const diffOptions = useMemo(() => {
    let ignorePathsRegex: RegExp | null = null;
    const trimmedRegex = ignorePaths.trim();
    if (trimmedRegex) {
      try {
        ignorePathsRegex = new RegExp(trimmedRegex);
      } catch {
        ignorePathsRegex = null;
      }
    }
    const ignoreKeys = new Set(
      ignoreKeysInput
        .split(",")
        .map((key) => key.trim())
        .filter(Boolean),
    );
    return {
      ignoreCase,
      ignoreNullVsMissing,
      ignoreEmptyStrings,
      ignoreEmptyContainers,
      arrayDiffMode,
      arrayKey,
      ignorePathsRegex,
      ignoreKeys,
    };
  }, [
    ignoreCase,
    ignoreNullVsMissing,
    ignoreEmptyStrings,
    ignoreEmptyContainers,
    arrayDiffMode,
    arrayKey,
    ignorePaths,
    ignoreKeysInput,
  ]);

  const fullDiff = useMemo(() => {
    if (!parsed.a || !parsed.b) return [];
    return walkDiff(parsed.a, parsed.b, "", diffOptions);
  }, [
    parsed,
    diffOptions,
  ]);

  const warning = useMemo(() => {
    if (left.length + right.length > MAX_INPUT_CHARS) {
      return "Large input detected; consider reducing size for faster diff.";
    }
    if (fullDiff.length > MAX_DIFF_ENTRIES) {
      return "Diff truncated to 500 entries for readability.";
    }
    return "";
  }, [fullDiff.length, left.length, right.length]);

  const diff = useMemo(() => {
    const trimmedFilter = filter.trim().toLowerCase();
    const trimmedValueFilter = valueFilter.trim().toLowerCase();
    const filtered = fullDiff.filter((d) => {
      if (d.type === "same") {
        if (!showSame) return false;
      } else if (typeFilters.length && !typeFilters.includes(d.type)) {
        return false;
      }
      if (trimmedFilter && !d.path.toLowerCase().includes(trimmedFilter)) return false;
      if (trimmedValueFilter) {
        const value = d.after !== undefined ? d.after : d.before;
        const valueText = JSON.stringify(value ?? "").toLowerCase();
        if (!valueText.includes(trimmedValueFilter)) return false;
      }
      return true;
    });
    const visible = showSame ? filtered : filtered.filter((d) => d.type !== "same");
    return visible.slice(0, MAX_DIFF_ENTRIES);
  }, [fullDiff, filter, showSame, typeFilters, valueFilter]);

  const counts = useMemo(() => {
    const result = { added: 0, removed: 0, changed: 0, same: 0, moved: 0 };
    fullDiff.forEach((d) => {
      result[d.type] += 1;
    });
    return result;
  }, [fullDiff]);

  const diffEntriesByPath = useMemo(() => {
    const map = new Map<string, DiffEntry[]>();
    fullDiff.forEach((entry) => {
      const list = map.get(entry.path) || [];
      list.push(entry);
      map.set(entry.path, list);
    });
    return map;
  }, [fullDiff]);

  const treeData = useMemo(() => {
    if (!parsed.a || !parsed.b) return null;
    const pathToId = new Map<string, string>();
    const parentMap = new Map<string, string>();
    const root = buildTree(parsed.a, parsed.b, "", "root", diffOptions, diffEntriesByPath, pathToId, parentMap);
    return { root, pathToId, parentMap };
  }, [parsed, diffOptions, diffEntriesByPath]);

  const toggleTypeFilter = (type: DiffEntry["type"]) => {
    setTypeFilters((prev) => {
      if (prev.includes(type)) {
        return prev.filter((item) => item !== type);
      }
      return [...prev, type];
    });
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleScrollToPath = (path: string) => {
    if (!treeData) return;
    const nodeId = treeData.pathToId.get(path);
    if (!nodeId) return;
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      let current = path;
      while (current !== undefined) {
        const currentId = treeData.pathToId.get(current);
        if (currentId) {
          next.add(currentId);
        }
        const parent = treeData.parentMap.get(current);
        if (!parent) break;
        current = parent;
      }
      return next;
    });
    requestAnimationFrame(() => {
      const node = document.getElementById(nodeId);
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const renderTreeRows = (node: TreeNode, depth: number): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const movedEntry = diffEntriesByPath.get(node.path)?.find((entry) => entry.type === "moved");
    const leftHighlight =
      node.type === "removed"
        ? "bg-rose-100 text-rose-900"
        : node.type === "changed"
          ? "bg-amber-100 text-amber-900"
          : node.type === "moved"
            ? "bg-sky-100 text-sky-900"
            : "";
    const rightHighlight =
      node.type === "added"
        ? "bg-emerald-100 text-emerald-900"
        : node.type === "changed"
          ? "bg-amber-100 text-amber-900"
          : node.type === "moved"
            ? "bg-sky-100 text-sky-900"
            : "";

    rows.push(
      <div
        key={node.id}
        id={node.id}
        className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] items-start gap-3 px-4 py-2 text-xs text-slate-700"
      >
        <div className="flex items-start gap-2" style={{ paddingLeft: depth * 14 }}>
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="mt-0.5 h-5 w-5 rounded-full border border-slate-200 bg-white text-[10px] font-semibold text-slate-600"
              aria-label={isExpanded ? "Collapse node" : "Expand node"}
            >
              {isExpanded ? "−" : "+"}
            </button>
          ) : (
            <span className="mt-0.5 h-5 w-5 rounded-full border border-transparent" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{node.label || "root"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {node.counts.added > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  +{node.counts.added}
                </span>
              ) : null}
              {node.counts.removed > 0 ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  -{node.counts.removed}
                </span>
              ) : null}
              {node.counts.changed > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  ~{node.counts.changed}
                </span>
              ) : null}
              {node.counts.moved > 0 ? (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  ↔ {node.counts.moved}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="min-h-[20px]">
          {movedEntry ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              index {String(movedEntry.before)} → {String(movedEntry.after)}
            </span>
          ) : (
            <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${leftHighlight}`}>
              {formatValue(node.before)}
            </span>
          )}
        </div>
        <div className="min-h-[20px]">
          {movedEntry ? (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              index {String(movedEntry.after)}
            </span>
          ) : (
            <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${rightHighlight}`}>
              {formatValue(node.after)}
            </span>
          )}
        </div>
      </div>,
    );

    if (hasChildren && isExpanded) {
      node.children.forEach((child) => {
        rows.push(...renderTreeRows(child, depth + 1));
      });
    }

    return rows;
  };

  const applySample = (variant: "small" | "nested") => {
    if (variant === "small") {
      setLeft('{\n  "id": 1,\n  "name": "Widget",\n  "price": 9.99\n}');
      setRight('{\n  "id": 1,\n  "name": "Widget Pro",\n  "price": 12.5,\n  "stock": 5\n}');
    } else {
      setLeft('{\n  "user": {"id": 1, "roles": ["user", "editor"]},\n  "settings": {"theme": "light"}\n}');
      setRight('{\n  "user": {"id": 1, "roles": ["editor", "admin"]},\n  "settings": {"theme": "dark"},\n  "active": true\n}');
    }
    setStatus("Loaded sample");
  };

  const handleSwap = () => {
    setLeft(right);
    setRight(left);
    setStatus("Swapped inputs");
  };

  const formatInputs = () => {
    try {
      setLeft(JSON.stringify(JSON.parse(left), null, pretty ? 2 : 0));
      setRight(JSON.stringify(JSON.parse(right), null, pretty ? 2 : 0));
      setStatus("Formatted inputs");
    } catch {
      setStatus("Unable to format (invalid JSON)");
    }
  };

  const copyText = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      setStatus("Copied");
    } catch (err) {
      console.error("Copy failed", err);
      setStatus("Copy failed");
    }
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
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
              JSON Diff
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">JSON Diff</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Compare two JSON objects and highlight added, removed, and changed values.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/90 p-4 text-xs font-medium text-slate-700 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <span>Samples:</span>
        <button
          onClick={() => applySample("small")}
          className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
        >
          Small
        </button>
        <button
          onClick={() => applySample("nested")}
          className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
        >
          Nested
        </button>
        <span className="mx-2 text-slate-300">|</span>
        <button
          onClick={handleSwap}
          className="flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
          aria-label="Swap left and right"
        >
          <Shuffle className="h-4 w-4" />
          Swap
        </button>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pretty}
            onChange={(e) => setPretty(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
          />
          Pretty print inputs
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ignoreCase}
            onChange={(e) => setIgnoreCase(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
          />
          Ignore case
        </label>
        <label className="flex items-center gap-2">
          <span>Array diff</span>
          <select
            value={arrayDiffMode}
            onChange={(e) => setArrayDiffMode(e.target.value as "index" | "set" | "key")}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="index">By index</option>
            <option value="set">As set (ignore order)</option>
            <option value="key">By key</option>
          </select>
        </label>
        {arrayDiffMode === "key" ? (
          <label className="flex items-center gap-2">
            <span>Key field</span>
            <input
              value={arrayKey}
              onChange={(e) => setArrayKey(e.target.value)}
              className="w-24 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
              placeholder="id"
            />
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ignoreNullVsMissing}
            onChange={(e) => setIgnoreNullVsMissing(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
          />
          Ignore null vs missing
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ignoreEmptyStrings}
            onChange={(e) => setIgnoreEmptyStrings(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
          />
          Ignore empty strings
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ignoreEmptyContainers}
            onChange={(e) => setIgnoreEmptyContainers(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
          />
          Ignore empty arrays/objects
        </label>
        <label className="flex items-center gap-2">
          <span>Ignore paths (regex)</span>
          <input
            value={ignorePaths}
            onChange={(e) => setIgnorePaths(e.target.value)}
            className="w-48 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
            placeholder="^metadata\\.timestamp$"
          />
        </label>
        <label className="flex items-center gap-2">
          <span>Ignore keys</span>
          <input
            value={ignoreKeysInput}
            onChange={(e) => setIgnoreKeysInput(e.target.value)}
            className="w-40 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
            placeholder="updatedAt,lastSeen"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Left (original)</p>
            <button
              onClick={() => setLeft("")}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <button
              onClick={() => {
                try {
                  setLeft(JSON.stringify(JSON.parse(left), null, pretty ? 2 : 0));
                  setStatus("Formatted left");
                } catch {
                  setStatus("Invalid JSON in left");
                }
              }}
              className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              {pretty ? "Format left" : "Minify left"}
            </button>
            <button
              onClick={() => copyText(left)}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Clipboard className="h-4 w-4" /> Copy left
            </button>
            <button
              onClick={() => downloadText(left, "json-diff-left.json")}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4" /> Save left
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-white/90 p-4 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Right (new)</p>
            <button
              onClick={() => setRight("")}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear
            </button>
          </div>
          <textarea
            className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <button
              onClick={() => {
                try {
                  setRight(JSON.stringify(JSON.parse(right), null, pretty ? 2 : 0));
                  setStatus("Formatted right");
                } catch {
                  setStatus("Invalid JSON in right");
                }
              }}
              className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              {pretty ? "Format right" : "Minify right"}
            </button>
            <button
              onClick={() => copyText(right)}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Clipboard className="h-4 w-4" /> Copy right
            </button>
            <button
              onClick={() => downloadText(right, "json-diff-right.json")}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4" /> Save right
            </button>
          </div>
        </div>
      </div>

      {parsed.error ? (
        <p className="text-sm font-medium text-amber-600">{parsed.error}</p>
      ) : (
        <div
          className="space-y-3 rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800"
          role="region"
          aria-labelledby="json-diff-output"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <span id="json-diff-output">Differences</span>
              <span className="text-xs font-medium text-slate-300">
                Added: {counts.added} · Removed: {counts.removed} · Changed: {counts.changed} · Moved:{" "}
                {counts.moved} · Same: {counts.same}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showSame}
                  onChange={(e) => setShowSame(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                />
                Show unchanged
              </label>
              <div className="flex flex-wrap items-center gap-1">
                {(["added", "removed", "changed", "moved"] as DiffEntry["type"][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      typeFilters.includes(type)
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Filter className="h-4 w-4" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter by path"
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div className="flex items-center gap-1">
                <input
                  value={valueFilter}
                  onChange={(e) => setValueFilter(e.target.value)}
                  placeholder="Filter by value"
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs text-white ring-1 ring-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <button
                onClick={() => copyText(diff.map((d) => `${d.type.toUpperCase()}: ${d.path}`).join("\n"))}
                className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
              >
                <Clipboard className="h-4 w-4" /> Copy diff
              </button>
              <button
                onClick={() => downloadText(JSON.stringify(diff, null, 2), "json-diff-results.json")}
                className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
              >
                <Download className="h-4 w-4" /> Save diff
              </button>
            </div>
          </div>
          {warning ? (
            <div className="px-4 text-xs font-medium text-amber-200">
              {warning}
            </div>
          ) : null}
          <div className="max-h-[320px] overflow-auto divide-y divide-slate-800">
            {diff.length ? (
              diff.map((d, idx) => (
                <div
                  key={`${d.path}-${idx}`}
                  className={`px-4 py-3 text-sm leading-relaxed ${
                    d.type === "same"
                      ? "text-slate-200"
                      : d.type === "added"
                        ? "bg-emerald-900/40 text-emerald-100"
                        : d.type === "removed"
                          ? "bg-rose-900/40 text-rose-100"
                          : d.type === "moved"
                            ? "bg-sky-900/40 text-sky-100"
                            : "bg-amber-900/40 text-amber-100"
                  }`}
                >
                  <button
                    onClick={() => handleScrollToPath(d.path)}
                    className="text-left text-sm font-semibold underline underline-offset-4"
                  >
                    {d.path}
                  </button>
                  {d.type === "same" ? null : (
                    <div className="mt-1 grid gap-1 text-xs text-slate-100">
                      {d.before !== undefined ? <p>Before: {JSON.stringify(d.before)}</p> : null}
                      {d.after !== undefined ? <p>After: {JSON.stringify(d.after)}</p> : null}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-slate-300">Diff will appear here.</div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Diff Explorer</h2>
            <p className="text-xs text-slate-600">Tree view with side-by-side values and inline badges.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => {
                if (!treeData) return;
                const next = new Set<string>();
                const expandAll = (node: TreeNode) => {
                  next.add(node.id);
                  node.children.forEach((child) => expandAll(child));
                };
                expandAll(treeData.root);
                setExpandedNodes(next);
              }}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              Expand all
            </button>
            <button
              onClick={() => setExpandedNodes(new Set([toNodeId("")]))}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
            >
              Collapse all
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div>Path</div>
          <div>Left</div>
          <div>Right</div>
        </div>
        <div className="max-h-[420px] overflow-auto divide-y divide-slate-100">
          {treeData ? (
            renderTreeRows(treeData.root, 0)
          ) : (
            <div className="px-4 py-4 text-sm text-slate-500">Tree diff will appear here.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste two JSON objects (or load a sample), then optionally format or swap.</li>
          <li>Pick an array diff mode (index/set/key), then use inline filters (type/value/path).</li>
          <li>Click any diff path to jump into the tree explorer and compare left/right values.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Diffing happens in your browser; nothing is uploaded.</p>
          <p><strong>What’s supported?</strong> JSON objects (non-array) with nested values; arrays diff by index, as sets, or by key field.</p>
          <p><strong>How do I explore changes?</strong> Use the tree diff view to expand nodes and compare left/right values side by side.</p>
          <p><strong>Large inputs?</strong> For very large JSON, a warning appears and diff output may truncate for readability.</p>
        </div>
      </div>
    </main>
  );
}
