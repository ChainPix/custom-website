import { v1 as uuidv1, v5 as uuidv5, v7 as uuidv7 } from "uuid";

export type UuidVersion = "v1" | "v4" | "v5" | "v7";
export type FormatOption = "lower-dash" | "upper-dash" | "lower-nodash" | "upper-nodash";

type GenerateOptions = {
  version: UuidVersion;
  namespace?: string;
  name?: string;
  names?: string[];
};

export const normalizeCount = (input: number, fallback = 5, min = 1, max = 50) => {
  const safe = Number.isFinite(input) ? input : fallback;
  return Math.min(Math.max(Math.floor(safe), min), max);
};

export const formatUuid = (uuid: string, opts: { format: FormatOption }) => {
  const dashed = opts.format === "lower-dash" || opts.format === "upper-dash";
  const upper = opts.format === "upper-dash" || opts.format === "upper-nodash";
  let next = dashed ? uuid : uuid.replace(/-/g, "");
  next = upper ? next.toUpperCase() : next.toLowerCase();
  return next;
};

const generateV4 = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    throw new Error("Secure random generator unavailable.");
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
    .slice(8, 10)
    .join("")}-${hex.slice(10, 16).join("")}`;
};

export const generateUuids = (count: number, options: GenerateOptions) => {
  if (options.version === "v5") {
    if (!options.namespace) {
      throw new Error("Namespace UUID is required for v5.");
    }
    if (options.names?.length) {
      return options.names.slice(0, 50).map((entry) => uuidv5(entry, options.namespace as string));
    }
    return [uuidv5(options.name || "example", options.namespace as string)];
  }
  const total = normalizeCount(count);
  if (options.version === "v1") {
    return Array.from({ length: total }, () => uuidv1());
  }
  if (options.version === "v7") {
    return Array.from({ length: total }, () => uuidv7());
  }
  return Array.from({ length: total }, () => generateV4());
};
