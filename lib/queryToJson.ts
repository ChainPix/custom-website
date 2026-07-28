export type Options = {
  decode: boolean;
  mode: "arrays" | "first" | "last";
  sort: boolean;
  pretty: boolean;
  keyMode: "flat" | "nested";
  inferTypes: boolean;
  plusAsSpace: boolean;
};

export type ParsedValue =
  | string
  | number
  | boolean
  | null
  | ParsedValue[]
  | { [key: string]: ParsedValue };

export type DiffResult = {
  added: Record<string, string>;
  removed: Record<string, string>;
  changed: Record<string, { from: string; to: string }>;
};

export type NormalizeActions = {
  removeTracking?: boolean;
  sortKeys?: boolean;
  removeEmpty?: boolean;
  dedupeValues?: boolean;
};

const encodeForDisplay = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");

const toFormEncoded = (value: string, plusAsSpace: boolean) => {
  const encoded = encodeURIComponent(value);
  return plusAsSpace ? encoded.replace(/%20/g, "+") : encoded;
};

const parseKeyParts = (key: string) => {
  const parts: string[] = [];
  const pattern = /([^\[\]]+)|\[(.*?)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(key))) {
    if (match[1]) {
      parts.push(match[1]);
    } else {
      parts.push(match[2] ?? "");
    }
  }
  return parts.length ? parts : [key];
};

const isArrayToken = (part: string) => part === "" || /^\d+$/.test(part);

const applyDuplicateMode = (existing: ParsedValue | undefined, next: ParsedValue, mode: Options["mode"]) => {
  if (existing === undefined) return next;
  if (mode === "first") return existing;
  if (mode === "last") return next;
  if (Array.isArray(existing)) return [...existing, next];
  return [existing, next];
};

const setNestedValue = (
  root: Record<string, ParsedValue>,
  parts: string[],
  value: ParsedValue,
  mode: Options["mode"],
) => {
  let current: ParsedValue = root;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    const nextPart = parts[i + 1];

    if (Array.isArray(current)) {
      if (isLast) {
        if (part === "") {
          if (mode === "first" && current.length) return;
          if (mode === "last" && current.length) {
            current[current.length - 1] = value;
          } else {
            current.push(value);
          }
        } else {
          const index = Number(part);
          current[index] = applyDuplicateMode(current[index] as ParsedValue | undefined, value, mode);
        }
        return;
      }

      const index = part === "" ? current.length : Number(part);
      const existing = current[index];
      if (!existing || typeof existing === "string" || typeof existing === "number" || typeof existing === "boolean") {
        current[index] = isArrayToken(nextPart) ? [] : {};
      }
      current = current[index] as ParsedValue;
      continue;
    }

    const container = current as Record<string, ParsedValue>;
    if (isLast) {
      container[part] = applyDuplicateMode(container[part], value, mode);
      return;
    }

    const existing = container[part];
    if (!existing || typeof existing === "string" || typeof existing === "number" || typeof existing === "boolean") {
      container[part] = isArrayToken(nextPart) ? [] : {};
    }
    current = container[part] as ParsedValue;
  }
};

const inferType = (value: string): ParsedValue => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^[+-]?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return value;
};

const stableStringify = (value: ParsedValue): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, ParsedValue>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
};

const extractQueryString = (input: string) => {
  const trimmed = input.trim();
  const idx = trimmed.indexOf("?");
  if (idx === -1) return { base: "", query: trimmed, offset: 0 };
  return { base: trimmed.slice(0, idx), query: trimmed.slice(idx + 1), offset: idx + 1 };
};

export const findBadPercentIndex = (query: string) => {
  for (let i = 0; i < query.length; i += 1) {
    if (query[i] !== "%") continue;
    const hex = query.slice(i + 1, i + 3);
    if (!/^[\da-fA-F]{2}$/.test(hex)) return i;
    i += 2;
  }
  return -1;
};

export const normalizeQueryString = (input: string, opts: Pick<Options, "plusAsSpace">, actions: NormalizeActions) => {
  const { base, query } = extractQueryString(input);
  if (!query) return input;
  const qs = opts.plusAsSpace ? query : query.replace(/\+/g, "%2B");
  const params = new URLSearchParams(qs);
  const entries = Array.from(params.entries()).filter(([key, value]) => {
    if (actions.removeTracking) {
      if (key.startsWith("utm_")) return false;
      if (["gclid", "fbclid", "igshid", "mc_cid", "mc_eid", "msclkid"].includes(key)) return false;
    }
    if (actions.removeEmpty && value === "") return false;
    return true;
  });

  let normalized = entries;
  if (actions.dedupeValues) {
    const seen = new Map<string, Set<string>>();
    normalized = normalized.filter(([key, value]) => {
      const existing = seen.get(key) ?? new Set<string>();
      if (existing.has(value)) return false;
      existing.add(value);
      seen.set(key, existing);
      return true;
    });
  }

  if (actions.sortKeys) {
    normalized = [...normalized].sort(([aKey, aValue], [bKey, bValue]) => {
      const keyCompare = aKey.localeCompare(bKey);
      return keyCompare === 0 ? aValue.localeCompare(bValue) : keyCompare;
    });
  }

  const nextParams = new URLSearchParams();
  normalized.forEach(([key, value]) => nextParams.append(key, value));
  const nextQuery = opts.plusAsSpace ? nextParams.toString() : nextParams.toString().replace(/\+/g, "%2B");
  if (!nextQuery) return base || "";
  return base ? `${base}?${nextQuery}` : nextQuery;
};

export const parseQuery = (input: string, opts: Options) => {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a URL or query string.");
  const { query, offset } = extractQueryString(trimmed);
  const badPercentIndex = findBadPercentIndex(query);
  if (badPercentIndex !== -1) {
    const token = query.slice(badPercentIndex, badPercentIndex + 3);
    const absoluteIndex = offset + badPercentIndex;
    const message = `Bad percent encoding near: \`${token}\` (pos ${absoluteIndex + 1})`;
    const error = new Error(message) as Error & { meta?: { index: number; token: string } };
    error.meta = { index: absoluteIndex, token };
    throw error;
  }
  const qs = opts.plusAsSpace ? query : query.replace(/\+/g, "%2B");
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(qs);
  } catch {
    throw new Error("Invalid percent-encoding or malformed query string.");
  }
  const result: Record<string, ParsedValue> = {};
  params.forEach((value, key) => {
    const rawParts = parseKeyParts(key);
    const parts = opts.decode ? rawParts : rawParts.map((part) => (part === "" ? "" : encodeForDisplay(part)));
    const displayKey = opts.decode ? key : encodeForDisplay(key);
    const displayValue = opts.decode ? value : encodeForDisplay(value);
    const finalValue = opts.inferTypes && opts.decode ? inferType(value) : displayValue;
    if (opts.keyMode === "nested" && parts.length > 1) {
      setNestedValue(result, parts, finalValue, opts.mode);
      return;
    }
    result[displayKey] = applyDuplicateMode(result[displayKey], finalValue, opts.mode);
  });
  const sorted = opts.sort
    ? Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)))
    : result;
  return sorted;
};

export const flattenParsed = (value: ParsedValue, prefix = ""): Record<string, string> => {
  if (value === null || typeof value !== "object") {
    return { [prefix]: stableStringify(value) };
  }
  if (Array.isArray(value)) {
    return value.reduce<Record<string, string>>((acc, item, index) => {
      const nextPrefix = `${prefix}[${index}]`;
      return { ...acc, ...flattenParsed(item, nextPrefix) };
    }, {});
  }
  const record = value as Record<string, ParsedValue>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return { ...acc, ...flattenParsed(record[key], nextPrefix) };
    }, {});
};

export const diffParsed = (left: ParsedValue, right: ParsedValue): DiffResult => {
  const flatLeft = flattenParsed(left);
  const flatRight = flattenParsed(right);
  const added: Record<string, string> = {};
  const removed: Record<string, string> = {};
  const changed: Record<string, { from: string; to: string }> = {};

  Object.keys(flatRight).forEach((key) => {
    if (!(key in flatLeft)) {
      added[key] = flatRight[key];
    } else if (flatLeft[key] !== flatRight[key]) {
      changed[key] = { from: flatLeft[key], to: flatRight[key] };
    }
  });

  Object.keys(flatLeft).forEach((key) => {
    if (!(key in flatRight)) {
      removed[key] = flatLeft[key];
    }
  });

  return { added, removed, changed };
};

const buildQueryEntries = (value: ParsedValue, keyPath: string = ""): Array<[string, string]> => {
  if (value === null) {
    return [[keyPath, "null"]];
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [[keyPath, String(value)]];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => buildQueryEntries(item, `${keyPath}[]`));
  }
  const record = value as Record<string, ParsedValue>;
  return Object.keys(record).flatMap((key) => {
    const nextKey = keyPath ? `${keyPath}[${key}]` : key;
    return buildQueryEntries(record[key], nextKey);
  });
};

export const buildQueryString = (value: ParsedValue, plusAsSpace: boolean) => {
  if (value === null || typeof value !== "object") return "";
  const entries = buildQueryEntries(value);
  return entries
    .map(([key, val]) => `${toFormEncoded(key, plusAsSpace)}=${toFormEncoded(val, plusAsSpace)}`)
    .join("&");
};

export const toPathRows = (value: ParsedValue) => {
  const flat = flattenParsed(value);
  return Object.entries(flat).map(([path, val]) => ({
    path,
    value: val,
  }));
};
