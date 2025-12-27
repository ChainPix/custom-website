"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, Plus, RefreshCcw, X } from "lucide-react";

type SchemaKey = "user" | "transaction" | "custom" | "relational";
type Format = "json" | "csv" | "sql" | "sql-postgres" | "sql-mysql" | "ts" | "jsonschema" | "openapi" | "prisma" | "mongo";
type FieldType = "string" | "number" | "boolean" | "date" | "enum" | "email" | "uuid";

type Options = {
  count: number;
  format: Format;
  pretty: boolean;
  schema: SchemaKey;
  seed: string;
};

type RecordMap = Record<string, string | number | boolean | null>;
type RelationalCounts = {
  users: number;
  transactions: number;
  orders: number;
};
type RelationalCollectionKey = keyof RelationalCounts;
type RelationalLink = {
  id: string;
  label: string;
  childCollection: RelationalCollectionKey;
  childField: string;
  parentCollection: RelationalCollectionKey;
  parentField: string;
};
type SchemaField = {
  name: string;
  type: FieldType;
  optional: boolean;
  nullable: boolean;
  enumValues?: string[];
  min?: number;
  max?: number;
  regex?: string;
};

const MAX_STANDARD_COUNT = 500;
const MAX_PERF_COUNT = 10000;

type EnumOption = {
  id: string;
  value: string;
  weight: number;
};

type FieldDef = {
  id: string;
  name: string;
  type: FieldType;
  optional: boolean;
  nullable: boolean;
  min?: number;
  max?: number;
  regex?: string;
  enumOptions?: EnumOption[];
  minDate?: string;
  maxDate?: string;
};

const builtInSchemas: Record<
  "user" | "transaction",
  { label: string; fields: (rng: () => number) => RecordMap }
> = {
  user: {
    label: "User profile",
    fields: (rng) => ({
      id: randomId(rng),
      name: randomName(rng),
      email: randomEmail(rng),
      city: randomCity(rng),
      jobTitle: randomJob(rng),
      createdAt: randomDateIso(rng),
    }),
  },
  transaction: {
    label: "Transaction",
    fields: (rng) => ({
      id: randomId(rng),
      userId: randomId(rng),
      amount: randomAmount(rng),
      currency: "USD",
      status: randomStatus(rng),
      createdAt: randomDateIso(rng),
    }),
  },
};

const schemaOptions: Array<{ key: SchemaKey; label: string }> = [
  { key: "user", label: "User profile" },
  { key: "transaction", label: "Transaction" },
  { key: "custom", label: "Custom schema" },
  { key: "relational", label: "Relational preset" },
];
const relationalCollections: Record<RelationalCollectionKey, { label: string; fields: string[] }> = {
  users: {
    label: "Users",
    fields: ["id", "name", "email", "city", "jobTitle", "createdAt"],
  },
  transactions: {
    label: "Transactions",
    fields: ["id", "userId", "amount", "currency", "status", "createdAt"],
  },
  orders: {
    label: "Orders",
    fields: ["id", "userId", "transactionId", "amount", "status", "createdAt"],
  },
};
const MAPPING_STORAGE_KEY = "mock-data-relational-mappings-v1";
const MAPPING_TEMPLATES: Array<{ id: string; label: string; links: RelationalLink[] }> = [
  {
    id: "default",
    label: "Users + Transactions + Orders",
    links: [
      {
        id: "transaction.userId",
        label: "transaction.userId",
        childCollection: "transactions",
        childField: "userId",
        parentCollection: "users",
        parentField: "id",
      },
      {
        id: "order.userId",
        label: "order.userId",
        childCollection: "orders",
        childField: "userId",
        parentCollection: "users",
        parentField: "id",
      },
      {
        id: "order.transactionId",
        label: "order.transactionId",
        childCollection: "orders",
        childField: "transactionId",
        parentCollection: "transactions",
        parentField: "id",
      },
    ],
  },
  {
    id: "orders-only",
    label: "Users + Orders",
    links: [
      {
        id: "order.userId",
        label: "order.userId",
        childCollection: "orders",
        childField: "userId",
        parentCollection: "users",
        parentField: "id",
      },
    ],
  },
];

function hashSeed(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function createRng(seedText: string) {
  if (!seedText.trim()) return Math.random;
  const seed = hashSeed(seedText)();
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomId(rng: () => number) {
  return rng().toString(36).slice(2, 10);
}

function randomUuid(rng: () => number) {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const rand = Math.floor(rng() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function randomString(length: number, rng: () => number) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(rng() * chars.length)];
  }
  return out;
}

const names = ["Alex", "Taylor", "Sam", "Jordan", "Casey", "Morgan", "Riley", "Jamie"];
function randomName(rng: () => number) {
  const first = names[Math.floor(rng() * names.length)];
  const last = names[Math.floor(rng() * names.length)];
  return `${first} ${last}`;
}

const jobs = ["Engineer", "Designer", "Product Manager", "Analyst", "Support", "QA", "DevOps", "Marketing"];
function randomJob(rng: () => number) {
  return jobs[Math.floor(rng() * jobs.length)];
}

const cities = ["New York", "San Francisco", "Austin", "London", "Berlin", "Toronto", "Sydney", "Singapore"];
function randomCity(rng: () => number) {
  return cities[Math.floor(rng() * cities.length)];
}

function randomEmail(rng: () => number) {
  const handle = rng().toString(36).slice(2, 8);
  return `${handle}@example.com`;
}

function randomDateIso(rng: () => number) {
  const now = Date.now();
  const past = now - 1000 * 60 * 60 * 24 * 365;
  const ts = Math.floor(rng() * (now - past) + past);
  return new Date(ts).toISOString();
}

function randomDateBetween(rng: () => number, minDate?: string, maxDate?: string) {
  const now = Date.now();
  const min = minDate ? new Date(minDate).getTime() : now - 1000 * 60 * 60 * 24 * 365;
  const max = maxDate ? new Date(maxDate).getTime() : now;
  const safeMin = Number.isFinite(min) ? min : now - 1000 * 60 * 60 * 24 * 365;
  const safeMax = Number.isFinite(max) ? max : now;
  const low = Math.min(safeMin, safeMax);
  const high = Math.max(safeMin, safeMax);
  const ts = Math.floor(rng() * (high - low) + low);
  return new Date(ts).toISOString();
}

function randomAmount(rng: () => number) {
  return parseFloat((rng() * 500).toFixed(2));
}

const statuses = ["pending", "paid", "failed", "refunded"];
function randomStatus(rng: () => number) {
  return statuses[Math.floor(rng() * statuses.length)];
}

const builtInFieldDefs: Record<"user" | "transaction", SchemaField[]> = {
  user: [
    { name: "id", type: "string", optional: false, nullable: false },
    { name: "name", type: "string", optional: false, nullable: false },
    { name: "email", type: "email", optional: false, nullable: false },
    { name: "city", type: "string", optional: false, nullable: false },
    { name: "jobTitle", type: "string", optional: false, nullable: false },
    { name: "createdAt", type: "date", optional: false, nullable: false },
  ],
  transaction: [
    { name: "id", type: "string", optional: false, nullable: false },
    { name: "userId", type: "string", optional: false, nullable: false },
    { name: "amount", type: "number", optional: false, nullable: false },
    { name: "currency", type: "string", optional: false, nullable: false },
    { name: "status", type: "enum", optional: false, nullable: false, enumValues: statuses },
    { name: "createdAt", type: "date", optional: false, nullable: false },
  ],
};
const relationalFieldDefs: Record<RelationalCollectionKey, SchemaField[]> = {
  users: builtInFieldDefs.user,
  transactions: builtInFieldDefs.transaction,
  orders: [
    { name: "id", type: "string", optional: false, nullable: false },
    { name: "userId", type: "string", optional: false, nullable: false },
    { name: "transactionId", type: "string", optional: false, nullable: false },
    { name: "amount", type: "number", optional: false, nullable: false },
    { name: "status", type: "enum", optional: false, nullable: false, enumValues: statuses },
    { name: "createdAt", type: "date", optional: false, nullable: false },
  ],
};

function validateRelationalCounts(counts: RelationalCounts, maxCount: number) {
  const entries: Array<[keyof RelationalCounts, number]> = [
    ["users", counts.users],
    ["transactions", counts.transactions],
    ["orders", counts.orders],
  ];
  entries.forEach(([key, value]) => {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${key} count must be greater than 0.`);
    }
    if (value > maxCount) {
      throw new Error(`${key} count capped at ${maxCount} for performance.`);
    }
  });
}

function formatCsvRow(row: RecordMap, headers: string[]) {
  return headers
    .map((h) => {
      const val = row[h];
      return `"${String(val ?? "").replace(/"/g, '""')}"`;
    })
    .join(",");
}

function formatSqlRow(row: RecordMap, headers: string[], dialect: "generic" | "postgres" | "mysql") {
  return headers
    .map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "NULL";
      if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
      if (typeof val === "number") return val.toString();
      return `'${String(val).replace(/'/g, "''")}'`;
    })
    .join(", ");
}

async function generateLargeOutput(
  opts: Options,
  customFields: FieldDef[],
  maxCount: number,
  onProgress: (value: number) => void
) {
  if (!Number.isFinite(opts.count) || opts.count <= 0) throw new Error("Count must be greater than 0.");
  if (opts.count > maxCount) throw new Error(`Count capped at ${maxCount} for performance.`);
  const rng = createRng(opts.seed);
  const batchSize = 500;
  let schemaFields: SchemaField[] = [];
  const makeRow = (() => {
    if (opts.schema === "custom") {
      validateCustomFields(customFields);
      schemaFields = customFields.map((field) => ({
        name: field.name,
        type: field.type,
        optional: field.optional,
        nullable: field.nullable,
        enumValues: field.enumOptions?.map((opt) => opt.value),
        min: field.min,
        max: field.max,
        regex: field.regex,
      }));
      return () => {
        const record: RecordMap = {};
        customFields.forEach((field) => {
          record[field.name] = generateFieldValue(field, rng);
        });
        return record;
      };
    }
    const schemaKey = opts.schema as "user" | "transaction";
    const maker = builtInSchemas[schemaKey]?.fields;
    if (!maker) throw new Error("Unknown schema.");
    schemaFields = builtInFieldDefs[schemaKey];
    return () => maker(rng);
  })();

  const chunks: string[] = [];
  if (opts.format === "json") {
    chunks.push("[");
    let first = true;
    for (let i = 0; i < opts.count; i += 1) {
      const row = makeRow();
      const json = JSON.stringify(row);
      chunks.push(first ? json : `,${json}`);
      first = false;
      if (i % batchSize === 0) {
        onProgress(Math.round(((i + 1) / opts.count) * 100));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    chunks.push("]");
    return { chunks, schemaFields };
  }

  if (opts.format === "csv") {
    const firstRow = makeRow();
    const headers = Object.keys(firstRow);
    chunks.push(headers.join(","));
    chunks.push("\n");
    chunks.push(formatCsvRow(firstRow, headers));
    for (let i = 1; i < opts.count; i += 1) {
      const row = makeRow();
      chunks.push("\n");
      chunks.push(formatCsvRow(row, headers));
      if (i % batchSize === 0) {
        onProgress(Math.round(((i + 1) / opts.count) * 100));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    return { chunks, schemaFields };
  }

  if (opts.format === "sql" || opts.format === "sql-postgres" || opts.format === "sql-mysql") {
    const firstRow = makeRow();
    const headers = Object.keys(firstRow);
    const dialect =
      opts.format === "sql-postgres" ? "postgres" : opts.format === "sql-mysql" ? "mysql" : "generic";
    const quote = (value: string) => {
      if (dialect === "mysql") return `\`${value.replace(/`/g, "``")}\``;
      if (dialect === "postgres") return `"${value.replace(/"/g, '""')}"`;
      return value;
    };
    const table = opts.schema === "custom" ? "custom" : opts.schema;
    chunks.push(`INSERT INTO ${quote(table)} (${headers.map(quote).join(", ")}) VALUES\n`);
    chunks.push(`(${formatSqlRow(firstRow, headers, dialect)})`);
    for (let i = 1; i < opts.count; i += 1) {
      const row = makeRow();
      chunks.push(",\n");
      chunks.push(`(${formatSqlRow(row, headers, dialect)})`);
      if (i % batchSize === 0) {
        onProgress(Math.round(((i + 1) / opts.count) * 100));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    chunks.push(";");
    return { chunks, schemaFields };
  }

  const result = generateData(opts, customFields, maxCount);
  return { chunks: [result], schemaFields };
}

function createJsonWorker() {
  const workerCode = `
    const names = ["Alex", "Taylor", "Sam", "Jordan", "Casey", "Morgan", "Riley", "Jamie"];
    const jobs = ["Engineer", "Designer", "Product Manager", "Analyst", "Support", "QA", "DevOps", "Marketing"];
    const cities = ["New York", "San Francisco", "Austin", "London", "Berlin", "Toronto", "Sydney", "Singapore"];
    const statuses = ["pending", "paid", "failed", "refunded"];

    function hashSeed(seedText) {
      let h = 1779033703 ^ seedText.length;
      for (let i = 0; i < seedText.length; i += 1) {
        h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
      }
      return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return h >>> 0;
      };
    }

    function createRng(seedText) {
      if (!seedText.trim()) return Math.random;
      const seed = hashSeed(seedText)();
      let t = seed + 0x6d2b79f5;
      return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
    }

    function randomString(length, rng) {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let out = "";
      for (let i = 0; i < length; i += 1) {
        out += chars[Math.floor(rng() * chars.length)];
      }
      return out;
    }

    function randomDateIso(rng) {
      const now = Date.now();
      const past = now - 1000 * 60 * 60 * 24 * 365;
      const ts = Math.floor(rng() * (now - past) + past);
      return new Date(ts).toISOString();
    }

    function randomDateBetween(rng, minDate, maxDate) {
      const now = Date.now();
      const min = minDate ? new Date(minDate).getTime() : now - 1000 * 60 * 60 * 24 * 365;
      const max = maxDate ? new Date(maxDate).getTime() : now;
      const safeMin = Number.isFinite(min) ? min : now - 1000 * 60 * 60 * 24 * 365;
      const safeMax = Number.isFinite(max) ? max : now;
      const low = Math.min(safeMin, safeMax);
      const high = Math.max(safeMin, safeMax);
      const ts = Math.floor(rng() * (high - low) + low);
      return new Date(ts).toISOString();
    }

    function generateFromRegex(pattern, minLength, maxLength, rng) {
      try {
        const regex = new RegExp(pattern);
        for (let i = 0; i < 12; i += 1) {
          const length = Math.floor(rng() * (maxLength - minLength + 1)) + minLength;
          const candidate = randomString(length, rng);
          if (regex.test(candidate)) return candidate;
        }
      } catch {
        return null;
      }
      return null;
    }

    function weightedEnumPick(options, rng) {
      if (!options.length) return "";
      const normalized = options.map((opt) => ({
        value: opt.value,
        weight: Number.isFinite(opt.weight) && opt.weight > 0 ? opt.weight : 1,
      }));
      const total = normalized.reduce((sum, opt) => sum + opt.weight, 0);
      let roll = rng() * total;
      for (const opt of normalized) {
        roll -= opt.weight;
        if (roll <= 0) return opt.value;
      }
      return normalized[normalized.length - 1].value;
    }

    function shouldNull(optional, nullable, rng) {
      const chance = optional && nullable ? 0.35 : optional || nullable ? 0.2 : 0;
      return rng() < chance;
    }

    function generateFieldValue(field, rng) {
      if (shouldNull(field.optional, field.nullable, rng)) return null;
      const name = field.name.toLowerCase();
      if (field.type === "number") {
        const min = typeof field.min === "number" ? field.min : 0;
        const max = typeof field.max === "number" ? field.max : 100;
        const low = Math.min(min, max);
        const high = Math.max(min, max);
        return parseFloat((rng() * (high - low) + low).toFixed(2));
      }
      if (field.type === "boolean") return rng() > 0.5;
      if (field.type === "date") return randomDateBetween(rng, field.minDate, field.maxDate);
      if (field.type === "email") {
        const handle = randomString(6, rng).toLowerCase();
        return \`\${handle}@example.com\`;
      }
      if (field.type === "uuid") {
        const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
        return template.replace(/[xy]/g, (char) => {
          const rand = Math.floor(rng() * 16);
          const value = char === "x" ? rand : (rand & 0x3) | 0x8;
          return value.toString(16);
        });
      }
      if (field.type === "enum") return weightedEnumPick(field.enumOptions || [], rng);
      if (name.includes("name")) {
        const first = names[Math.floor(rng() * names.length)];
        const last = names[Math.floor(rng() * names.length)];
        return \`\${first} \${last}\`;
      }
      if (name.includes("city")) return cities[Math.floor(rng() * cities.length)];
      if (name.includes("job")) return jobs[Math.floor(rng() * jobs.length)];
      if (name.includes("status")) return statuses[Math.floor(rng() * statuses.length)];
      const minLen = typeof field.min === "number" ? field.min : 6;
      const maxLen = typeof field.max === "number" ? field.max : 12;
      const low = Math.max(1, Math.min(minLen, maxLen));
      const high = Math.max(low, Math.max(minLen, maxLen));
      if (field.regex) {
        const result = generateFromRegex(field.regex, low, high, rng);
        if (result) return result;
      }
      const length = Math.floor(rng() * (high - low + 1)) + low;
      return randomString(length, rng);
    }

    self.onmessage = (event) => {
      const { count, seed, fields } = event.data;
      const rng = createRng(seed || "");
      const chunks = ["["];
      let first = true;
      for (let i = 0; i < count; i += 1) {
        const record = {};
        fields.forEach((field) => {
          record[field.name] = generateFieldValue(field, rng);
        });
        const json = JSON.stringify(record);
        chunks.push(first ? json : \`,\${json}\`);
        first = false;
        if (i % 500 === 0) {
          const progress = Math.round(((i + 1) / count) * 100);
          self.postMessage({ type: "progress", value: progress });
        }
      }
      chunks.push("]");
      self.postMessage({ type: "done", chunks });
    };
  `;
  const blob = new Blob([workerCode], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob));
}

function pickLinkedValue(
  rng: () => number,
  data: Record<RelationalCollectionKey, RecordMap[]>,
  parentCollection: RelationalCollectionKey,
  parentField: string
) {
  const parentRows = data[parentCollection];
  if (!parentRows.length) return null;
  const row = parentRows[Math.floor(rng() * parentRows.length)];
  return row[parentField] ?? null;
}

function generateFromRegex(pattern: string, minLength: number, maxLength: number, rng: () => number) {
  try {
    const regex = new RegExp(pattern);
    for (let i = 0; i < 12; i += 1) {
      const length = Math.floor(rng() * (maxLength - minLength + 1)) + minLength;
      const candidate = randomString(length, rng);
      if (regex.test(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}

function weightedEnumPick(options: EnumOption[], rng: () => number) {
  if (!options.length) return "";
  const normalized = options.map((opt) => ({
    value: opt.value,
    weight: Number.isFinite(opt.weight) && opt.weight > 0 ? opt.weight : 1,
  }));
  const total = normalized.reduce((sum, opt) => sum + opt.weight, 0);
  let roll = rng() * total;
  for (const opt of normalized) {
    roll -= opt.weight;
    if (roll <= 0) return opt.value;
  }
  return normalized[normalized.length - 1].value;
}

function shouldNull(optional: boolean, nullable: boolean, rng: () => number) {
  const chance = optional && nullable ? 0.35 : optional || nullable ? 0.2 : 0;
  return rng() < chance;
}

function generateFieldValue(field: FieldDef, rng: () => number): string | number | boolean | null {
  if (shouldNull(field.optional, field.nullable, rng)) return null;

  switch (field.type) {
    case "number": {
      const min = typeof field.min === "number" ? field.min : 0;
      const max = typeof field.max === "number" ? field.max : 100;
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      return parseFloat((rng() * (high - low) + low).toFixed(2));
    }
    case "boolean":
      return rng() > 0.5;
    case "date":
      return randomDateBetween(rng, field.minDate, field.maxDate);
    case "email": {
      const handle = randomString(6, rng).toLowerCase();
      return `${handle}@example.com`;
    }
    case "uuid":
      return randomUuid(rng);
    case "enum":
      return weightedEnumPick(field.enumOptions ?? [], rng);
    case "string":
    default: {
      const minLen = typeof field.min === "number" ? field.min : 6;
      const maxLen = typeof field.max === "number" ? field.max : 12;
      const low = Math.max(1, Math.min(minLen, maxLen));
      const high = Math.max(low, Math.max(minLen, maxLen));
      if (field.regex) {
        const result = generateFromRegex(field.regex, low, high, rng);
        if (result) return result;
      }
      const length = Math.floor(rng() * (high - low + 1)) + low;
      return randomString(length, rng);
    }
  }
}

function toCsv(rows: RecordMap[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

function toMultiCsv(data: Record<RelationalCollectionKey, RecordMap[]>) {
  const sections: string[] = [];
  (Object.keys(data) as RelationalCollectionKey[]).forEach((key) => {
    sections.push(`# ${key}`);
    sections.push(toCsv(data[key]));
    sections.push("");
  });
  return sections.join("\n").trim();
}

async function buildZip(entries: { name: string; blob: Blob }[]) {
  const encoder = new TextEncoder();
  const fileParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  const writeHeader = (view: DataView, offset: number, value: number, bytes: number) => {
    if (bytes === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
  };

  const crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  const crc32 = (data: Uint8Array) => {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const crc = crc32(data);
    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const localView = new DataView(localHeader);
    writeHeader(localView, 0, 0x04034b50, 4);
    writeHeader(localView, 4, 20, 2);
    writeHeader(localView, 6, 0, 2);
    writeHeader(localView, 8, 0, 2);
    writeHeader(localView, 10, 0, 2);
    writeHeader(localView, 12, 0, 2);
    writeHeader(localView, 14, crc, 4);
    writeHeader(localView, 18, data.length, 4);
    writeHeader(localView, 22, data.length, 4);
    writeHeader(localView, 26, nameBytes.length, 2);
    writeHeader(localView, 28, 0, 2);
    new Uint8Array(localHeader, 30, nameBytes.length).set(nameBytes);

    fileParts.push(new Uint8Array(localHeader), data);

    const centralHeader = new ArrayBuffer(46 + nameBytes.length);
    const centralView = new DataView(centralHeader);
    writeHeader(centralView, 0, 0x02014b50, 4);
    writeHeader(centralView, 4, 20, 2);
    writeHeader(centralView, 6, 20, 2);
    writeHeader(centralView, 8, 0, 2);
    writeHeader(centralView, 10, 0, 2);
    writeHeader(centralView, 12, 0, 2);
    writeHeader(centralView, 14, 0, 2);
    writeHeader(centralView, 16, crc, 4);
    writeHeader(centralView, 20, data.length, 4);
    writeHeader(centralView, 24, data.length, 4);
    writeHeader(centralView, 28, nameBytes.length, 2);
    writeHeader(centralView, 30, 0, 2);
    writeHeader(centralView, 32, 0, 2);
    writeHeader(centralView, 34, 0, 2);
    writeHeader(centralView, 36, 0, 2);
    writeHeader(centralView, 38, 0, 4);
    writeHeader(centralView, 42, offset, 4);
    new Uint8Array(centralHeader, 46, nameBytes.length).set(nameBytes);

    centralParts.push(new Uint8Array(centralHeader));

    offset += localHeader.byteLength + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = new ArrayBuffer(22);
  const endView = new DataView(endHeader);
  writeHeader(endView, 0, 0x06054b50, 4);
  writeHeader(endView, 4, 0, 2);
  writeHeader(endView, 6, 0, 2);
  writeHeader(endView, 8, entries.length, 2);
  writeHeader(endView, 10, entries.length, 2);
  writeHeader(endView, 12, centralSize, 4);
  writeHeader(endView, 16, offset, 4);
  writeHeader(endView, 20, 0, 2);

  return new Blob([...fileParts, ...centralParts, endHeader], {
    type: "application/zip",
  });
}

function toSql(rows: RecordMap[], table = "sample") {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const values = rows
    .map((row) => {
      const vals = headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          if (typeof val === "number") return val.toString();
          return `'${String(val).replace(/'/g, "''")}'`;
        })
        .join(", ");
      return `(${vals})`;
    })
    .join(",\n");
  return `INSERT INTO ${table} (${headers.join(", ")}) VALUES\n${values};`;
}

function toSqlDialect(rows: RecordMap[], table: string, dialect: "generic" | "postgres" | "mysql") {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const quote = (value: string) => {
    if (dialect === "mysql") return `\`${value.replace(/`/g, "``")}\``;
    if (dialect === "postgres") return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const values = rows
    .map((row) => {
      const vals = headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          if (typeof val === "number") return val.toString();
          return `'${String(val).replace(/'/g, "''")}'`;
        })
        .join(", ");
      return `(${vals})`;
    })
    .join(",\n");
  return `INSERT INTO ${quote(table)} (${headers.map(quote).join(", ")}) VALUES\n${values};`;
}

function toTypeScriptInterface(name: string, fields: SchemaField[]) {
  const lines = fields.map((field) => {
    const baseType = (() => {
      if (field.type === "number") return "number";
      if (field.type === "boolean") return "boolean";
      if (field.type === "enum" && field.enumValues?.length) {
        return field.enumValues.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(" | ");
      }
      return "string";
    })();
    const nullable = field.nullable ? ` | null` : "";
    const optional = field.optional ? "?" : "";
    return `  ${field.name}${optional}: ${baseType}${nullable};`;
  });
  return `export interface ${name} {\n${lines.join("\n")}\n}`;
}

function toJsonSchema(name: string, fields: SchemaField[], asArray: boolean) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  fields.forEach((field) => {
    const baseType = (() => {
      if (field.type === "number") return "number";
      if (field.type === "boolean") return "boolean";
      return "string";
    })();
    const schema: Record<string, unknown> = {};
    const typeValue = field.nullable ? [baseType, "null"] : baseType;
    schema.type = typeValue;
    if (field.type === "email") schema.format = "email";
    if (field.type === "uuid") schema.format = "uuid";
    if (field.type === "date") schema.format = "date-time";
    if (field.type === "string" && typeof field.min === "number") schema.minLength = field.min;
    if (field.type === "string" && typeof field.max === "number") schema.maxLength = field.max;
    if (field.type === "string" && field.regex) schema.pattern = field.regex;
    if (field.type === "number" && typeof field.min === "number") schema.minimum = field.min;
    if (field.type === "number" && typeof field.max === "number") schema.maximum = field.max;
    if (field.type === "enum" && field.enumValues?.length) schema.enum = field.enumValues;
    properties[field.name] = schema;
    if (!field.optional) required.push(field.name);
  });
  const objectSchema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: name,
    type: "object",
    properties,
    required: required.length ? required : undefined,
  };
  if (asArray) {
    return {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: `${name}List`,
      type: "array",
      items: objectSchema,
    };
  }
  return objectSchema;
}

function toOpenApiExample(title: string, example: unknown) {
  return {
    openapi: "3.0.0",
    info: {
      title: `${title} Example`,
      version: "1.0.0",
    },
    paths: {
      "/example": {
        get: {
          summary: "Example response",
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  example,
                },
              },
            },
          },
        },
      },
    },
  };
}

function toPrismaSeedScript(data: Record<string, RecordMap[]>) {
  const blocks = Object.entries(data).map(([collection, rows]) => {
    return `  await prisma.${collection}.createMany({ data: ${JSON.stringify(rows, null, 2)} });`;
  });
  return `import { PrismaClient } from "@prisma/client";\n\nconst prisma = new PrismaClient();\n\nasync function main() {\n${blocks.join(
    "\n"
  )}\n}\n\nmain()\n  .catch((err) => {\n    console.error(err);\n    process.exit(1);\n  })\n  .finally(async () => {\n    await prisma.$disconnect();\n  });\n`;
}

function toMongoInsertMany(data: Record<string, RecordMap[]>) {
  const blocks = Object.entries(data).map(([collection, rows]) => {
    return `db.${collection}.insertMany(${JSON.stringify(rows, null, 2)});`;
  });
  return blocks.join("\n\n");
}

function validateCustomFields(fields: FieldDef[]) {
  if (!fields.length) throw new Error("Add at least one field to the custom schema.");
  const names = fields.map((field) => field.name.trim()).filter(Boolean);
  if (names.length !== fields.length) throw new Error("All custom fields must have a name.");
  const unique = new Set(names.map((name) => name.toLowerCase()));
  if (unique.size !== names.length) throw new Error("Custom field names must be unique.");
}

function generateData(opts: Options, customFields: FieldDef[], maxCount: number) {
  if (!Number.isFinite(opts.count) || opts.count <= 0) throw new Error("Count must be greater than 0.");
  if (opts.count > maxCount) throw new Error(`Count capped at ${maxCount} for performance.`);
  const rng = createRng(opts.seed);
  let rows: RecordMap[] = [];
  let schemaFields: SchemaField[] = [];
  if (opts.schema === "custom") {
    validateCustomFields(customFields);
    schemaFields = customFields.map((field) => ({
      name: field.name,
      type: field.type,
      optional: field.optional,
      nullable: field.nullable,
      enumValues: field.enumOptions?.map((opt) => opt.value),
      min: field.min,
      max: field.max,
      regex: field.regex,
    }));
    rows = Array.from({ length: opts.count }, () => {
      const record: RecordMap = {};
      customFields.forEach((field) => {
        record[field.name] = generateFieldValue(field, rng);
      });
      return record;
    });
  } else {
    const schemaKey = opts.schema as "user" | "transaction";
    const maker = builtInSchemas[schemaKey]?.fields;
    if (!maker) throw new Error("Unknown schema.");
    schemaFields = builtInFieldDefs[schemaKey];
    rows = Array.from({ length: opts.count }, () => maker(rng));
  }
  const schemaName = opts.schema === "custom" ? "CustomRecord" : opts.schema === "user" ? "User" : "Transaction";
  if (opts.format === "csv") return toCsv(rows);
  if (opts.format === "sql") return toSqlDialect(rows, opts.schema === "custom" ? "custom" : opts.schema, "generic");
  if (opts.format === "sql-postgres") {
    return toSqlDialect(rows, opts.schema === "custom" ? "custom" : opts.schema, "postgres");
  }
  if (opts.format === "sql-mysql") {
    return toSqlDialect(rows, opts.schema === "custom" ? "custom" : opts.schema, "mysql");
  }
  if (opts.format === "ts") {
    return toTypeScriptInterface(schemaName, schemaFields);
  }
  if (opts.format === "jsonschema") {
    return JSON.stringify(toJsonSchema(schemaName, schemaFields, true), null, 2);
  }
  if (opts.format === "openapi") {
    return JSON.stringify(toOpenApiExample(`${schemaName} List`, rows.slice(0, Math.min(5, rows.length))), null, 2);
  }
  if (opts.format === "prisma") {
    const data = { [opts.schema === "custom" ? "custom" : opts.schema]: rows };
    return toPrismaSeedScript(data);
  }
  if (opts.format === "mongo") {
    const data = { [opts.schema === "custom" ? "custom" : opts.schema]: rows };
    return toMongoInsertMany(data);
  }
  return opts.pretty ? JSON.stringify(rows, null, 2) : JSON.stringify(rows);
}

export default function MockDataClient() {
  const [options, setOptions] = useState<Options>({
    count: 10,
    format: "json",
    pretty: true,
    schema: "user",
    seed: "",
  });
  const [relationalCounts, setRelationalCounts] = useState<RelationalCounts>({
    users: 100,
    transactions: 500,
    orders: 250,
  });
  const [relationalLinks, setRelationalLinks] = useState<RelationalLink[]>([
    {
      id: randomId(Math.random),
      label: "transaction.userId",
      childCollection: "transactions",
      childField: "userId",
      parentCollection: "users",
      parentField: "id",
    },
    {
      id: randomId(Math.random),
      label: "order.userId",
      childCollection: "orders",
      childField: "userId",
      parentCollection: "users",
      parentField: "id",
    },
    {
      id: randomId(Math.random),
      label: "order.transactionId",
      childCollection: "orders",
      childField: "transactionId",
      parentCollection: "transactions",
      parentField: "id",
    },
  ]);
  const [selectedMappingTemplate, setSelectedMappingTemplate] = useState("custom");
  const [performanceMode, setPerformanceMode] = useState(false);
  const [zipOutput, setZipOutput] = useState(false);
  const [useWorker, setUseWorker] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputChunks, setOutputChunks] = useState<string[] | null>(null);
  const [customFields, setCustomFields] = useState<FieldDef[]>([
    {
      id: randomId(Math.random),
      name: "id",
      type: "uuid",
      optional: false,
      nullable: false,
    },
    {
      id: randomId(Math.random),
      name: "email",
      type: "email",
      optional: false,
      nullable: false,
    },
    {
      id: randomId(Math.random),
      name: "createdAt",
      type: "date",
      optional: false,
      nullable: false,
    },
  ]);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const schemaPreview = useMemo(() => {
    const preview = {
      type: "object",
      fields: customFields.map((field) => ({
        name: field.name,
        type: field.type,
        optional: field.optional,
        nullable: field.nullable,
        min: field.type === "number" || field.type === "string" ? field.min ?? null : null,
        max: field.type === "number" || field.type === "string" ? field.max ?? null : null,
        regex: field.type === "string" ? field.regex ?? null : null,
        enum: field.type === "enum" ? field.enumOptions?.map((opt) => ({ value: opt.value, weight: opt.weight })) ?? [] : [],
        minDate: field.type === "date" ? field.minDate ?? null : null,
        maxDate: field.type === "date" ? field.maxDate ?? null : null,
      })),
    };
    return JSON.stringify(preview, null, 2);
  }, [customFields]);

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Generated successfully";
    return "Awaiting generation";
  }, [error, output]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MAPPING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RelationalLink[];
        if (Array.isArray(parsed) && parsed.length) {
          setRelationalLinks(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(relationalLinks));
    } catch {
      // ignore storage errors
    }
  }, [relationalLinks]);

  const handleGenerate = async () => {
    setError("");
    setCopied(false);
    setProgress(0);
    setIsGenerating(true);
    try {
      const maxCount = performanceMode ? MAX_PERF_COUNT : MAX_STANDARD_COUNT;
      if (options.schema === "relational") {
        validateRelationalCounts(relationalCounts, maxCount);
        const normalizedLinks = relationalLinks.map((link) => ({
          ...link,
          childField: link.childField.trim(),
          parentField: link.parentField.trim(),
        }));
        const linkKeys = normalizedLinks.map((link) => `${link.childCollection}:${link.childField.toLowerCase()}`);
        const uniqueLinkKeys = new Set(linkKeys);
        if (normalizedLinks.some((link) => !link.childField || !link.parentField)) {
          throw new Error("All mappings must have a child field and parent field.");
        }
        if (uniqueLinkKeys.size !== linkKeys.length) {
          throw new Error("Each child field can only map to one parent field.");
        }
        normalizedLinks.forEach((link) => {
          const childFields = relationalCollections[link.childCollection].fields;
          const parentFields = relationalCollections[link.parentCollection].fields;
          if (!childFields.includes(link.childField)) {
            throw new Error(`Child field "${link.childField}" is not in ${link.childCollection} schema.`);
          }
          if (!parentFields.includes(link.parentField)) {
            throw new Error(`Parent field "${link.parentField}" is not in ${link.parentCollection} schema.`);
          }
        });
        const rng = createRng(options.seed);
        const data: Record<RelationalCollectionKey, RecordMap[]> = {
          users: [],
          transactions: [],
          orders: [],
        };
        data.users = Array.from({ length: relationalCounts.users }, () => ({
          id: randomId(rng),
          name: randomName(rng),
          email: randomEmail(rng),
          city: randomCity(rng),
          jobTitle: randomJob(rng),
          createdAt: randomDateIso(rng),
        }));
        data.transactions = Array.from({ length: relationalCounts.transactions }, () => {
          const record: RecordMap = {
            id: randomId(rng),
            userId: null,
            amount: randomAmount(rng),
            currency: "USD",
            status: randomStatus(rng),
            createdAt: randomDateIso(rng),
          };
          const links = normalizedLinks.filter((item) => item.childCollection === "transactions");
          links.forEach((link) => {
            record[link.childField] =
              pickLinkedValue(rng, data, link.parentCollection, link.parentField) ?? randomId(rng);
          });
          if (!record.userId) {
            record.userId = randomId(rng);
          }
          return record;
        });
        data.orders = Array.from({ length: relationalCounts.orders }, () => {
          const record: RecordMap = {
            id: randomId(rng),
            userId: null,
            transactionId: null,
            amount: randomAmount(rng),
            status: randomStatus(rng),
            createdAt: randomDateIso(rng),
          };
          const links = normalizedLinks.filter((item) => item.childCollection === "orders");
          links.forEach((link) => {
            const linkedValue = pickLinkedValue(rng, data, link.parentCollection, link.parentField);
            record[link.childField] = linkedValue ?? randomId(rng);
            if (link.parentCollection === "transactions" && link.childField === "transactionId" && linkedValue) {
              const transaction = data.transactions.find((item) => item[link.parentField] === linkedValue);
              if (transaction) {
                record.amount = transaction.amount ?? record.amount;
                record.status = transaction.status ?? record.status;
                record.createdAt = transaction.createdAt ?? record.createdAt;
              }
            }
          });
          if (!record.userId) record.userId = randomId(rng);
          if (!record.transactionId) record.transactionId = randomId(rng);
          return record;
        });
        const payload = {
          users: data.users,
          transactions: data.transactions,
          orders: data.orders,
        };
        const result = (() => {
          if (options.format === "csv") return toMultiCsv(data);
          if (options.format === "sql") {
            return [
              toSqlDialect(data.users, "users", "generic"),
              toSqlDialect(data.transactions, "transactions", "generic"),
              toSqlDialect(data.orders, "orders", "generic"),
            ]
              .filter(Boolean)
              .join("\n\n");
          }
          if (options.format === "sql-postgres") {
            return [
              toSqlDialect(data.users, "users", "postgres"),
              toSqlDialect(data.transactions, "transactions", "postgres"),
              toSqlDialect(data.orders, "orders", "postgres"),
            ]
              .filter(Boolean)
              .join("\n\n");
          }
          if (options.format === "sql-mysql") {
            return [
              toSqlDialect(data.users, "users", "mysql"),
              toSqlDialect(data.transactions, "transactions", "mysql"),
              toSqlDialect(data.orders, "orders", "mysql"),
            ]
              .filter(Boolean)
              .join("\n\n");
          }
          if (options.format === "ts") {
            const interfaces = [
              toTypeScriptInterface("User", relationalFieldDefs.users),
              toTypeScriptInterface("Transaction", relationalFieldDefs.transactions),
              toTypeScriptInterface("Order", relationalFieldDefs.orders),
              "export interface RelationalResponse {",
              "  users: User[];",
              "  transactions: Transaction[];",
              "  orders: Order[];",
              "}",
            ];
            return interfaces.join("\n\n");
          }
          if (options.format === "jsonschema") {
            const schema = {
              $schema: "https://json-schema.org/draft/2020-12/schema",
              title: "RelationalResponse",
              type: "object",
              properties: {
                users: toJsonSchema("User", relationalFieldDefs.users, true),
                transactions: toJsonSchema("Transaction", relationalFieldDefs.transactions, true),
                orders: toJsonSchema("Order", relationalFieldDefs.orders, true),
              },
            };
            return JSON.stringify(schema, null, 2);
          }
          if (options.format === "openapi") {
            return JSON.stringify(toOpenApiExample("Relational Response", payload), null, 2);
          }
          if (options.format === "prisma") {
            return toPrismaSeedScript({
              users: data.users,
              transactions: data.transactions,
              orders: data.orders,
            });
          }
          if (options.format === "mongo") {
            return toMongoInsertMany({
              users: data.users,
              transactions: data.transactions,
              orders: data.orders,
            });
          }
          return options.pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
        })();
        setOutput(result);
        setOutputChunks(null);
        return;
      }
      if (performanceMode && options.count > MAX_STANDARD_COUNT) {
        if (useWorker && options.format === "json" && options.schema !== "relational") {
          const schemaFields =
            options.schema === "custom"
              ? customFields.map((field) => ({
                  name: field.name,
                  type: field.type,
                  optional: field.optional,
                  nullable: field.nullable,
                  enumOptions: field.enumOptions?.map((opt) => ({ value: opt.value, weight: opt.weight })) ?? [],
                  min: field.min,
                  max: field.max,
                  regex: field.regex,
                  minDate: field.minDate,
                  maxDate: field.maxDate,
                }))
              : builtInFieldDefs[options.schema as "user" | "transaction"].map((field) => ({
                  ...field,
                  enumOptions: field.enumValues?.map((value) => ({ value, weight: 1 })) ?? [],
                }));
          const worker = createJsonWorker();
          const chunks = await new Promise<string[]>((resolve, reject) => {
            worker.onmessage = (event) => {
              if (event.data?.type === "progress") {
                setProgress(event.data.value);
              }
              if (event.data?.type === "done") {
                resolve(event.data.chunks as string[]);
                worker.terminate();
              }
            };
            worker.onerror = (err) => {
              worker.terminate();
              reject(err);
            };
            worker.postMessage({
              count: options.count,
              seed: options.seed,
              fields: schemaFields,
            });
          });
          const preview = chunks.join("").slice(0, 4000);
          setOutput(preview);
          setOutputChunks(chunks);
        } else {
          const { chunks } = await generateLargeOutput(options, customFields, maxCount, setProgress);
          const preview = chunks.join("").slice(0, 4000);
          setOutput(preview);
          setOutputChunks(chunks);
        }
      } else {
        const result = generateData(options, customFields, maxCount);
        setOutput(result);
        setOutputChunks(null);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to generate data.");
      setOutput("");
      setOutputChunks(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!output && !outputChunks?.length) return;
    try {
      const text = outputChunks?.length ? outputChunks.join("") : output;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = async () => {
    if (!output && !outputChunks?.length) return;
    const extMap: Record<Format, string> = {
      json: "json",
      csv: "csv",
      sql: "sql",
      "sql-postgres": "sql",
      "sql-mysql": "sql",
      ts: "ts",
      jsonschema: "json",
      openapi: "json",
      prisma: "ts",
      mongo: "js",
    };
    const ext = extMap[options.format] ?? "txt";
    const chunks = outputChunks?.length ? outputChunks : [output];
    const blob = new Blob(chunks, { type: "text/plain" });
    const fileName = `mock-data.${ext}`;
    const downloadBlob = zipOutput ? await buildZip([{ name: fileName, blob }]) : blob;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipOutput ? "mock-data.zip" : fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
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
              Mock Data
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Mock Data Generator</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Generate realistic sample data in JSON, CSV, or SQL for testing and prototyping. Runs locally in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Schema
              <select
                value={options.schema}
                onChange={(e) => {
                  const nextSchema = e.target.value as SchemaKey;
                  setOptions((prev) => ({
                    ...prev,
                    schema: nextSchema,
                    pretty: nextSchema === "relational" ? true : prev.pretty,
                  }));
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                {schemaOptions.map((schema) => (
                  <option key={schema.key} value={schema.key}>
                    {schema.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Format
              <select
                value={options.format}
                onChange={(e) => setOptions((prev) => ({ ...prev, format: e.target.value as Format }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <optgroup label="Core">
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="sql">SQL (Generic)</option>
                  <option value="sql-postgres">SQL (PostgreSQL)</option>
                  <option value="sql-mysql">SQL (MySQL)</option>
                </optgroup>
                <optgroup label="Schemas">
                  <option value="ts">TypeScript Interfaces</option>
                  <option value="jsonschema">JSON Schema</option>
                  <option value="openapi">OpenAPI Example</option>
                </optgroup>
                <optgroup label="Pipelines">
                  <option value="prisma">Prisma Seed Script</option>
                  <option value="mongo">MongoDB insertMany()</option>
                </optgroup>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Count (max {performanceMode ? MAX_PERF_COUNT : MAX_STANDARD_COUNT})
              <input
                type="number"
                min={1}
                max={performanceMode ? MAX_PERF_COUNT : MAX_STANDARD_COUNT}
                value={options.count}
                onChange={(e) => setOptions((prev) => ({ ...prev, count: Number(e.target.value) }))}
                disabled={options.schema === "relational"}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-2 lg:col-span-1">
              Seed (optional)
              <input
                type="text"
                value={options.seed}
                onChange={(e) => setOptions((prev) => ({ ...prev, seed: e.target.value }))}
                placeholder="e.g. qa-snapshot-01"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-inner focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              />
            </label>
          </div>

          {options.format === "json" ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={options.pretty}
                onChange={() => setOptions((prev) => ({ ...prev, pretty: !prev.pretty }))}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Pretty-print JSON"
              />
              Pretty-print JSON
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50/70 px-3 py-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Performance mode (10k+ rows)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={zipOutput}
                onChange={(e) => setZipOutput(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Zip output
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useWorker}
                onChange={(e) => setUseWorker(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              Use Web Worker
            </label>
            {performanceMode && (
              <span className="text-xs text-slate-500">Chunked generation for large datasets.</span>
            )}
          </div>

          {options.schema === "relational" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Relational counts</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Users
                  <input
                    type="number"
                    min={1}
                    max={performanceMode ? MAX_PERF_COUNT : MAX_STANDARD_COUNT}
                    value={relationalCounts.users}
                    onChange={(e) =>
                      setRelationalCounts((prev) => ({ ...prev, users: Number(e.target.value) }))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Transactions
                  <input
                    type="number"
                    min={1}
                    max={performanceMode ? MAX_PERF_COUNT : MAX_STANDARD_COUNT}
                    value={relationalCounts.transactions}
                    onChange={(e) =>
                      setRelationalCounts((prev) => ({ ...prev, transactions: Number(e.target.value) }))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Orders
                  <input
                    type="number"
                    min={1}
                    max={performanceMode ? MAX_PERF_COUNT : MAX_STANDARD_COUNT}
                    value={relationalCounts.orders}
                    onChange={(e) =>
                      setRelationalCounts((prev) => ({ ...prev, orders: Number(e.target.value) }))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Links are generated from your mapping choices below.
              </p>
            </div>
          )}

          {options.schema === "relational" && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Foreign key mappings</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-2 font-medium text-slate-600">
                  Mapping template
                  <select
                    value={selectedMappingTemplate}
                    onChange={(e) => {
                      const nextTemplate = e.target.value;
                      setSelectedMappingTemplate(nextTemplate);
                      const template = MAPPING_TEMPLATES.find((item) => item.id === nextTemplate);
                      if (template) {
                        setRelationalLinks(
                          template.links.map((link) => ({
                            ...link,
                            id: randomId(Math.random),
                          }))
                        );
                      }
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                  >
                    <option value="custom">Custom</option>
                    {MAPPING_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => {
                    const template = MAPPING_TEMPLATES[0];
                    setSelectedMappingTemplate(template.id);
                    setRelationalLinks(
                      template.links.map((link) => ({
                        ...link,
                        id: randomId(Math.random),
                      }))
                    );
                  }}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                >
                  Reset to default
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {relationalLinks.map((link) => (
                  <div key={link.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Child
                      <select
                        value={link.childCollection}
                        onChange={(e) => {
                          const nextChild = e.target.value as RelationalCollectionKey;
                          setRelationalLinks((prev) =>
                            prev.map((item) => {
                              if (item.id !== link.id) return item;
                              const fields = relationalCollections[nextChild].fields;
                              return {
                                ...item,
                                childCollection: nextChild,
                                childField: fields.includes(item.childField) ? item.childField : fields[0],
                              };
                            })
                          );
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        {Object.entries(relationalCollections).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Field
                      <select
                        value={link.childField}
                        onChange={(e) =>
                          setRelationalLinks((prev) =>
                            prev.map((item) =>
                              item.id === link.id ? { ...item, childField: e.target.value } : item
                            )
                          )
                        }
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        {relationalCollections[link.childCollection].fields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="text-xs text-slate-400">-&gt;</span>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Parent
                      <select
                        value={link.parentCollection}
                        onChange={(e) => {
                          const nextParent = e.target.value as RelationalCollectionKey;
                          setRelationalLinks((prev) =>
                            prev.map((item) => {
                              if (item.id !== link.id) return item;
                              const fields = relationalCollections[nextParent].fields;
                              return {
                                ...item,
                                parentCollection: nextParent,
                                parentField: fields.includes(item.parentField) ? item.parentField : fields[0],
                              };
                            })
                          );
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        {Object.entries(relationalCollections).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      Field
                      <select
                        value={link.parentField}
                        onChange={(e) =>
                          setRelationalLinks((prev) =>
                            prev.map((item) =>
                              item.id === link.id ? { ...item, parentField: e.target.value } : item
                            )
                          )
                        }
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        {relationalCollections[link.parentCollection].fields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      onClick={() =>
                        setRelationalLinks((prev) => prev.filter((item) => item.id !== link.id))
                      }
                      className="ml-auto flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
                      aria-label="Remove mapping"
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  setRelationalLinks((prev) => [
                    ...prev,
                    {
                      id: randomId(Math.random),
                      label: "custom",
                      childCollection: "transactions",
                      childField: "userId",
                      parentCollection: "users",
                      parentField: "id",
                    },
                  ])
                }
                className="mt-4 flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                aria-label="Add mapping"
              >
                <Plus className="h-4 w-4" />
                Add mapping
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              aria-label="Generate mock data"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
            <button
              onClick={() => {
                setOptions({ count: 10, format: "json", pretty: true, schema: "user", seed: "" });
                setOutput("");
                setError("");
                setCopied(false);
              }}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset options"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <p className="text-sm text-slate-600">
              {status}
              {isGenerating && performanceMode ? ` - ${progress}%` : ""}
              {outputChunks?.length ? " (preview shown)" : ""}
            </p>
          )}
        </div>

        {options.schema === "custom" && (
          <div className="space-y-4 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Custom schema builder</h2>
                <p className="text-sm text-slate-600">Define fields, types, and constraints. Preview updates live.</p>
              </div>
              <button
                onClick={() =>
                  setCustomFields((prev) => [
                    ...prev,
                    {
                      id: randomId(Math.random),
                      name: `field_${prev.length + 1}`,
                      type: "string",
                      optional: false,
                      nullable: false,
                    },
                  ])
                }
                className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5"
                aria-label="Add field"
              >
                <Plus className="h-4 w-4" />
                Add field
              </button>
            </div>

            <div className="space-y-3">
              {customFields.map((field, index) => (
                <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Field name
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          setCustomFields((prev) =>
                            prev.map((item) => (item.id === field.id ? { ...item, name: e.target.value } : item))
                          )
                        }
                        className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                      Type
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const nextType = e.target.value as FieldType;
                          setCustomFields((prev) =>
                            prev.map((item) => {
                              if (item.id !== field.id) return item;
                              return {
                                ...item,
                                type: nextType,
                                enumOptions:
                                  nextType === "enum"
                                    ? item.enumOptions ?? [
                                        { id: randomId(), value: "option_1", weight: 1 },
                                        { id: randomId(), value: "option_2", weight: 1 },
                                      ]
                                    : undefined,
                              };
                            })
                          );
                        }}
                        className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                        <option value="enum">Enum</option>
                        <option value="email">Email</option>
                        <option value="uuid">UUID</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={field.optional}
                        onChange={(e) =>
                          setCustomFields((prev) =>
                            prev.map((item) => (item.id === field.id ? { ...item, optional: e.target.checked } : item))
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Optional
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={field.nullable}
                        onChange={(e) =>
                          setCustomFields((prev) =>
                            prev.map((item) => (item.id === field.id ? { ...item, nullable: e.target.checked } : item))
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Nullable
                    </label>
                    <button
                      onClick={() => setCustomFields((prev) => prev.filter((item) => item.id !== field.id))}
                      className="ml-auto flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700"
                      aria-label={`Remove ${field.name || `field ${index + 1}`}`}
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </button>
                  </div>

                  {(field.type === "number" || field.type === "string") && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                        {field.type === "string" ? "Min length" : "Min"}
                        <input
                          type="number"
                          value={field.min ?? ""}
                          onChange={(e) =>
                            setCustomFields((prev) =>
                              prev.map((item) =>
                                item.id === field.id ? { ...item, min: Number(e.target.value) } : item
                              )
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                        {field.type === "string" ? "Max length" : "Max"}
                        <input
                          type="number"
                          value={field.max ?? ""}
                          onChange={(e) =>
                            setCustomFields((prev) =>
                              prev.map((item) =>
                                item.id === field.id ? { ...item, max: Number(e.target.value) } : item
                              )
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                        />
                      </label>
                      {field.type === "string" && (
                        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
                          Regex (optional)
                          <input
                            type="text"
                            value={field.regex ?? ""}
                            onChange={(e) =>
                              setCustomFields((prev) =>
                                prev.map((item) =>
                                  item.id === field.id ? { ...item, regex: e.target.value } : item
                                )
                              )
                            }
                            placeholder="e.g. ^[A-Z]{3}-\\d{4}$"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {field.type === "date" && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                        Min date
                        <input
                          type="date"
                          value={field.minDate ?? ""}
                          onChange={(e) =>
                            setCustomFields((prev) =>
                              prev.map((item) =>
                                item.id === field.id ? { ...item, minDate: e.target.value } : item
                              )
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                        Max date
                        <input
                          type="date"
                          value={field.maxDate ?? ""}
                          onChange={(e) =>
                            setCustomFields((prev) =>
                              prev.map((item) =>
                                item.id === field.id ? { ...item, maxDate: e.target.value } : item
                              )
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                        />
                      </label>
                    </div>
                  )}

                  {field.type === "enum" && (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-600">Enum options (value + weight)</p>
                        <button
                          onClick={() =>
                            setCustomFields((prev) =>
                              prev.map((item) =>
                                item.id === field.id
                                  ? {
                                      ...item,
                                      enumOptions: [
                                        ...(item.enumOptions ?? []),
                                        { id: randomId(Math.random), value: `option_${(item.enumOptions?.length ?? 0) + 1}`, weight: 1 },
                                      ],
                                    }
                                  : item
                              )
                            )
                          }
                          className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                          aria-label="Add enum option"
                        >
                          <Plus className="h-3 w-3" />
                          Add option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(field.enumOptions ?? []).map((opt) => (
                          <div key={opt.id} className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={opt.value}
                              onChange={(e) =>
                                setCustomFields((prev) =>
                                  prev.map((item) =>
                                    item.id === field.id
                                      ? {
                                          ...item,
                                          enumOptions: (item.enumOptions ?? []).map((choice) =>
                                            choice.id === opt.id ? { ...choice, value: e.target.value } : choice
                                          ),
                                        }
                                      : item
                                  )
                                )
                              }
                              className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                              placeholder="Value"
                            />
                            <input
                              type="number"
                              min={1}
                              value={opt.weight}
                              onChange={(e) =>
                                setCustomFields((prev) =>
                                  prev.map((item) =>
                                    item.id === field.id
                                      ? {
                                          ...item,
                                          enumOptions: (item.enumOptions ?? []).map((choice) =>
                                            choice.id === opt.id
                                              ? { ...choice, weight: Number(e.target.value) }
                                              : choice
                                          ),
                                        }
                                      : item
                                  )
                                )
                              }
                              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800"
                            />
                            <button
                              onClick={() =>
                                setCustomFields((prev) =>
                                  prev.map((item) =>
                                    item.id === field.id
                                      ? {
                                          ...item,
                                          enumOptions: (item.enumOptions ?? []).filter((choice) => choice.id !== opt.id),
                                        }
                                      : item
                                  )
                                )
                              }
                              className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200"
                              aria-label="Remove enum option"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-sm text-slate-100">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Schema preview</div>
              <pre className="mt-3 whitespace-pre-wrap leading-relaxed">{schemaPreview}</pre>
            </div>
          </div>
        )}

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="output-heading">
              Output
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy output"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download output"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <pre
            className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-slate-100"
            role="region"
            aria-labelledby="output-heading"
          >
            {output || "Your generated data will appear here."}
          </pre>
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Pick a schema (user or transaction) and format (JSON, CSV, or SQL).</li>
          <li>Set a record count (capped at 500) and click Generate.</li>
          <li>Copy or download the output for your tests or prototypes.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Notes & privacy</p>
          <p>All data is generated locally in your browser; nothing is uploaded.</p>
          <p>For larger datasets or custom schemas, generate in smaller batches or adjust the code client-side.</p>
        </div>
      </div>
    </main>
  );
}

