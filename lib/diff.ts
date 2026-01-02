export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };
export type JsonContainer = JsonObject | JsonValue[];

export type DiffEntry = {
  path: string;
  type: "added" | "removed" | "changed" | "same" | "moved";
  before?: unknown;
  after?: unknown;
};

export type DiffOptions = {
  ignoreCase: boolean;
  ignoreNullVsMissing: boolean;
  ignoreEmptyStrings: boolean;
  ignoreEmptyContainers: boolean;
  arrayDiffMode: "index" | "set" | "key";
  arrayKey: string;
  ignorePathsRegex: RegExp | null;
  ignoreKeys: Set<string>;
};

export type WorkerDiffOptions = {
  ignoreCase: boolean;
  ignoreNullVsMissing: boolean;
  ignoreEmptyStrings: boolean;
  ignoreEmptyContainers: boolean;
  arrayDiffMode: "index" | "set" | "key";
  arrayKey: string;
  ignorePathsPattern: string;
  ignoreKeys: string[];
  allowTopLevelArrays: boolean;
};

export const buildDiffOptions = (options: WorkerDiffOptions): DiffOptions => {
  let ignorePathsRegex: RegExp | null = null;
  if (options.ignorePathsPattern) {
    try {
      ignorePathsRegex = new RegExp(options.ignorePathsPattern);
    } catch {
      ignorePathsRegex = null;
    }
  }
  return {
    ignoreCase: options.ignoreCase,
    ignoreNullVsMissing: options.ignoreNullVsMissing,
    ignoreEmptyStrings: options.ignoreEmptyStrings,
    ignoreEmptyContainers: options.ignoreEmptyContainers,
    arrayDiffMode: options.arrayDiffMode,
    arrayKey: options.arrayKey,
    ignorePathsRegex,
    ignoreKeys: new Set(options.ignoreKeys),
  };
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

const hashString = (input: string) => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const hashJson = (value: unknown): string => {
  if (value === undefined) return "u";
  if (value === null) return "n";
  if (typeof value === "string") return `s:${hashString(value)}`;
  if (typeof value === "number") return `num:${String(value)}`;
  if (typeof value === "boolean") return `b:${value ? "1" : "0"}`;
  if (Array.isArray(value)) {
    return `a:[${value.map((item) => hashJson(item)).join("|")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `o:{${entries.map(([key, val]) => `${key}:${hashJson(val)}`).join("|")}}`;
  }
  return `other:${hashString(String(value))}`;
};

export const shouldIgnorePath = (path: string, key: string, opts: DiffOptions) => {
  if (opts.ignoreKeys.has(key)) return true;
  if (opts.ignorePathsRegex && opts.ignorePathsRegex.test(path)) return true;
  return false;
};

const formatPath = (basePath: string) => (basePath ? basePath : "(root)");

const isSimplePathKey = (key: string) => /^[A-Za-z0-9_-]+$/.test(key);

export const joinPath = (basePath: string, key: string) => {
  const segment = isSimplePathKey(key) ? key : `[${JSON.stringify(key)}]`;
  if (!basePath) return segment;
  if (segment.startsWith("[")) return `${basePath}${segment}`;
  return `${basePath}.${segment}`;
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
  const idsA = normalizedA.map((item) => hashJson(item));
  const idsB = normalizedB.map((item) => hashJson(item));
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

const walkDiff = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  basePath = "",
  opts: DiffOptions,
): DiffEntry[] => {
  const entries: DiffEntry[] = [];
  const keys = [...new Set<string>([...Object.keys(a || {}), ...Object.keys(b || {})])].sort();

  for (const key of keys) {
    const path = joinPath(basePath, key);
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

export const diffJson = (
  left: JsonContainer,
  right: JsonContainer,
  opts: DiffOptions,
  basePath = "",
): DiffEntry[] => {
  if (Array.isArray(left) && Array.isArray(right)) {
    const arrayPath = basePath;
    if (opts.arrayDiffMode === "set") {
      return diffArraysAsSets(left, right, arrayPath, opts);
    }
    if (opts.arrayDiffMode === "key") {
      return diffArraysByKey(left, right, arrayPath, opts);
    }
    return diffArraysByIndex(left, right, arrayPath, opts);
  }

  if (!Array.isArray(left) && !Array.isArray(right)) {
    return walkDiff(left as Record<string, unknown>, right as Record<string, unknown>, basePath, opts);
  }

  return [
    {
      path: formatPath(basePath),
      type: "changed",
      before: left,
      after: right,
    },
  ];
};
