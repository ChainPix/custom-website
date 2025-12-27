"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, Plus, RefreshCcw, X } from "lucide-react";

type SchemaKey = "user" | "transaction" | "custom";
type Format = "json" | "csv" | "sql";
type FieldType = "string" | "number" | "boolean" | "date" | "enum" | "email" | "uuid";

type Options = {
  count: number;
  format: Format;
  pretty: boolean;
  schema: SchemaKey;
};

type RecordMap = Record<string, string | number | boolean | null>;

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
  Exclude<SchemaKey, "custom">,
  { label: string; fields: () => RecordMap }
> = {
  user: {
    label: "User profile",
    fields: () => ({
      id: randomId(),
      name: randomName(),
      email: randomEmail(),
      city: randomCity(),
      jobTitle: randomJob(),
      createdAt: randomDateIso(),
    }),
  },
  transaction: {
    label: "Transaction",
    fields: () => ({
      id: randomId(),
      userId: randomId(),
      amount: randomAmount(),
      currency: "USD",
      status: randomStatus(),
      createdAt: randomDateIso(),
    }),
  },
};

const schemaOptions: Array<{ key: SchemaKey; label: string }> = [
  { key: "user", label: "User profile" },
  { key: "transaction", label: "Transaction" },
  { key: "custom", label: "Custom schema" },
];

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function randomUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function randomString(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const names = ["Alex", "Taylor", "Sam", "Jordan", "Casey", "Morgan", "Riley", "Jamie"];
function randomName() {
  const first = names[Math.floor(Math.random() * names.length)];
  const last = names[Math.floor(Math.random() * names.length)];
  return `${first} ${last}`;
}

const jobs = ["Engineer", "Designer", "Product Manager", "Analyst", "Support", "QA", "DevOps", "Marketing"];
function randomJob() {
  return jobs[Math.floor(Math.random() * jobs.length)];
}

const cities = ["New York", "San Francisco", "Austin", "London", "Berlin", "Toronto", "Sydney", "Singapore"];
function randomCity() {
  return cities[Math.floor(Math.random() * cities.length)];
}

function randomEmail() {
  const handle = Math.random().toString(36).slice(2, 8);
  return `${handle}@example.com`;
}

function randomDateIso() {
  const now = Date.now();
  const past = now - 1000 * 60 * 60 * 24 * 365;
  const ts = Math.floor(Math.random() * (now - past) + past);
  return new Date(ts).toISOString();
}

function randomDateBetween(minDate?: string, maxDate?: string) {
  const now = Date.now();
  const min = minDate ? new Date(minDate).getTime() : now - 1000 * 60 * 60 * 24 * 365;
  const max = maxDate ? new Date(maxDate).getTime() : now;
  const safeMin = Number.isFinite(min) ? min : now - 1000 * 60 * 60 * 24 * 365;
  const safeMax = Number.isFinite(max) ? max : now;
  const low = Math.min(safeMin, safeMax);
  const high = Math.max(safeMin, safeMax);
  const ts = Math.floor(Math.random() * (high - low) + low);
  return new Date(ts).toISOString();
}

function randomAmount() {
  return parseFloat((Math.random() * 500).toFixed(2));
}

const statuses = ["pending", "paid", "failed", "refunded"];
function randomStatus() {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateFromRegex(pattern: string, minLength: number, maxLength: number) {
  try {
    const regex = new RegExp(pattern);
    for (let i = 0; i < 12; i += 1) {
      const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
      const candidate = randomString(length);
      if (regex.test(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}

function weightedEnumPick(options: EnumOption[]) {
  if (!options.length) return "";
  const normalized = options.map((opt) => ({
    value: opt.value,
    weight: Number.isFinite(opt.weight) && opt.weight > 0 ? opt.weight : 1,
  }));
  const total = normalized.reduce((sum, opt) => sum + opt.weight, 0);
  let roll = Math.random() * total;
  for (const opt of normalized) {
    roll -= opt.weight;
    if (roll <= 0) return opt.value;
  }
  return normalized[normalized.length - 1].value;
}

function shouldNull(optional: boolean, nullable: boolean) {
  const chance = optional && nullable ? 0.35 : optional || nullable ? 0.2 : 0;
  return Math.random() < chance;
}

function generateFieldValue(field: FieldDef): string | number | boolean | null {
  if (shouldNull(field.optional, field.nullable)) return null;

  switch (field.type) {
    case "number": {
      const min = typeof field.min === "number" ? field.min : 0;
      const max = typeof field.max === "number" ? field.max : 100;
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      return parseFloat((Math.random() * (high - low) + low).toFixed(2));
    }
    case "boolean":
      return Math.random() > 0.5;
    case "date":
      return randomDateBetween(field.minDate, field.maxDate);
    case "email": {
      const handle = randomString(6).toLowerCase();
      return `${handle}@example.com`;
    }
    case "uuid":
      return randomUuid();
    case "enum":
      return weightedEnumPick(field.enumOptions ?? []);
    case "string":
    default: {
      const minLen = typeof field.min === "number" ? field.min : 6;
      const maxLen = typeof field.max === "number" ? field.max : 12;
      const low = Math.max(1, Math.min(minLen, maxLen));
      const high = Math.max(low, Math.max(minLen, maxLen));
      if (field.regex) {
        const result = generateFromRegex(field.regex, low, high);
        if (result) return result;
      }
      const length = Math.floor(Math.random() * (high - low + 1)) + low;
      return randomString(length);
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

function toSql(rows: RecordMap[], table = "sample") {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const values = rows
    .map((row) => {
      const vals = headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "NULL";
          if (typeof val === "number") return val.toString();
          return `'${String(val).replace(/'/g, "''")}'`;
        })
        .join(", ");
      return `(${vals})`;
    })
    .join(",\n");
  return `INSERT INTO ${table} (${headers.join(", ")}) VALUES\n${values};`;
}

function validateCustomFields(fields: FieldDef[]) {
  if (!fields.length) throw new Error("Add at least one field to the custom schema.");
  const names = fields.map((field) => field.name.trim()).filter(Boolean);
  if (names.length !== fields.length) throw new Error("All custom fields must have a name.");
  const unique = new Set(names.map((name) => name.toLowerCase()));
  if (unique.size !== names.length) throw new Error("Custom field names must be unique.");
}

function generateCustomRecord(fields: FieldDef[]): RecordMap {
  const record: RecordMap = {};
  fields.forEach((field) => {
    record[field.name] = generateFieldValue(field);
  });
  return record;
}

function generateData(opts: Options, customFields: FieldDef[]) {
  if (!Number.isFinite(opts.count) || opts.count <= 0) throw new Error("Count must be greater than 0.");
  if (opts.count > 500) throw new Error("Count capped at 500 for performance.");
  let rows: RecordMap[] = [];
  if (opts.schema === "custom") {
    validateCustomFields(customFields);
    rows = Array.from({ length: opts.count }, () => generateCustomRecord(customFields));
  } else {
    const maker = builtInSchemas[opts.schema]?.fields;
    if (!maker) throw new Error("Unknown schema.");
    rows = Array.from({ length: opts.count }, () => maker());
  }
  if (opts.format === "csv") return toCsv(rows);
  if (opts.format === "sql") return toSql(rows, opts.schema === "custom" ? "custom" : opts.schema);
  return opts.pretty ? JSON.stringify(rows, null, 2) : JSON.stringify(rows);
}

export default function MockDataClient() {
  const [options, setOptions] = useState<Options>({ count: 10, format: "json", pretty: true, schema: "user" });
  const [customFields, setCustomFields] = useState<FieldDef[]>([
    {
      id: randomId(),
      name: "id",
      type: "uuid",
      optional: false,
      nullable: false,
    },
    {
      id: randomId(),
      name: "email",
      type: "email",
      optional: false,
      nullable: false,
    },
    {
      id: randomId(),
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

  const handleGenerate = () => {
    setError("");
    setCopied(false);
    try {
      const result = generateData(options, customFields);
      setOutput(result);
    } catch (err: any) {
      setError(err?.message || "Unable to generate data.");
      setOutput("");
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const ext = options.format === "json" ? "json" : options.format === "csv" ? "csv" : "sql";
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mock-data.${ext}`;
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
                onChange={(e) => setOptions((prev) => ({ ...prev, schema: e.target.value as SchemaKey }))}
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
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="sql">SQL</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Count (max 500)
              <input
                type="number"
                min={1}
                max={500}
                value={options.count}
                onChange={(e) => setOptions((prev) => ({ ...prev, count: Number(e.target.value) }))}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerate}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              aria-label="Generate mock data"
            >
              Generate
            </button>
            <button
              onClick={() => {
                setOptions({ count: 10, format: "json", pretty: true, schema: "user" });
                setOutput("");
                setError("");
                setCopied(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset options"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          {error ? <p className="text-sm font-medium text-amber-600">{error}</p> : <p className="text-sm text-slate-600">{status}</p>}
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
                      id: randomId(),
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
                                        { id: randomId(), value: `option_${(item.enumOptions?.length ?? 0) + 1}`, weight: 1 },
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
