"use strict";

const DEFAULT_LOCALE = "en-US";
const DEFAULT_DOMAIN_PACK = "default";
const DEFAULT_COUNT = 10;
const MAX_COUNT = 10000;

const localeData = {
  "en-US": {
    names: ["Alex", "Taylor", "Jordan", "Casey", "Morgan", "Riley", "Jamie", "Avery"],
    cities: ["New York", "Austin", "Seattle", "Denver", "Chicago", "San Diego"],
    dateLocale: "en-US",
    currency: "USD",
  },
  "en-GB": {
    names: ["Oliver", "Amelia", "Noah", "Isla", "Jack", "Mia"],
    cities: ["London", "Manchester", "Birmingham", "Edinburgh"],
    dateLocale: "en-GB",
    currency: "GBP",
  },
  "de-DE": {
    names: ["Luca", "Mia", "Finn", "Emma", "Ben", "Sofia"],
    cities: ["Berlin", "Hamburg", "Munich", "Cologne"],
    dateLocale: "de-DE",
    currency: "EUR",
  },
  "fr-FR": {
    names: ["Louis", "Emma", "Gabriel", "Jade", "Hugo", "Louise"],
    cities: ["Paris", "Lyon", "Marseille", "Toulouse"],
    dateLocale: "fr-FR",
    currency: "EUR",
  },
  "es-ES": {
    names: ["Hugo", "Lucia", "Mateo", "Sofia", "Daniel", "Valeria"],
    cities: ["Madrid", "Barcelona", "Valencia", "Seville"],
    dateLocale: "es-ES",
    currency: "EUR",
  },
};

const domainPackData = {
  default: {
    jobs: ["Engineer", "Designer", "Product Manager", "Analyst", "Support", "QA", "DevOps", "Marketing"],
    statuses: ["pending", "paid", "failed", "refunded"],
    currencies: ["USD", "EUR", "GBP"],
    emails: ["example.com", "mock.local"],
  },
  fintech: {
    jobs: ["Risk Analyst", "Compliance Officer", "Quant", "Trader", "FinOps"],
    statuses: ["pending", "settled", "reversed", "failed"],
    currencies: ["USD", "EUR", "GBP"],
    emails: ["finco.test", "ledger.dev"],
  },
  healthcare: {
    jobs: ["Nurse", "Physician", "Care Coordinator", "Lab Tech", "Therapist"],
    statuses: ["scheduled", "completed", "cancelled", "no-show"],
    currencies: ["USD", "EUR"],
    emails: ["clinic.test", "health.local"],
  },
  ecommerce: {
    jobs: ["Merchandiser", "Supply Planner", "Fulfillment", "Support", "Growth"],
    statuses: ["pending", "paid", "shipped", "returned"],
    currencies: ["USD", "EUR", "GBP"],
    emails: ["shop.test", "store.local"],
  },
  iot: {
    jobs: ["Firmware Engineer", "Field Ops", "Device QA", "Reliability"],
    statuses: ["online", "offline", "degraded", "maintenance"],
    currencies: ["USD"],
    emails: ["iot.dev", "sensor.local"],
  },
};

function hashSeed(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRng(seed) {
  if (seed === undefined || seed === null || seed === "") return Math.random;
  return mulberry32(hashSeed(String(seed)));
}

function randomString(length, rng) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(rng() * chars.length)];
  }
  return out;
}

function randomName(rng, locale) {
  const list = (localeData[locale] || localeData[DEFAULT_LOCALE]).names;
  const first = list[Math.floor(rng() * list.length)];
  const last = list[Math.floor(rng() * list.length)];
  return `${first} ${last}`;
}

function randomCity(rng, locale) {
  const list = (localeData[locale] || localeData[DEFAULT_LOCALE]).cities;
  return list[Math.floor(rng() * list.length)];
}

function randomJob(rng, pack) {
  const list = (domainPackData[pack] || domainPackData.default).jobs;
  return list[Math.floor(rng() * list.length)];
}

function randomStatus(rng, pack) {
  const list = (domainPackData[pack] || domainPackData.default).statuses;
  return list[Math.floor(rng() * list.length)];
}

function randomCurrency(rng, locale, pack) {
  const localeCurrency = (localeData[locale] || localeData[DEFAULT_LOCALE]).currency;
  const packCurrencies = (domainPackData[pack] || domainPackData.default).currencies || [localeCurrency];
  const list = packCurrencies.length ? packCurrencies : [localeCurrency];
  return list[Math.floor(rng() * list.length)];
}

function randomEmail(rng, pack) {
  const domains = (domainPackData[pack] || domainPackData.default).emails;
  const handle = rng().toString(36).slice(2, 8);
  return `${handle}@${domains[Math.floor(rng() * domains.length)]}`;
}

function randomUuid(rng) {
  const hex = (len) => {
    let out = "";
    for (let i = 0; i < len; i += 1) {
      out += Math.floor(rng() * 16).toString(16);
    }
    return out;
  };
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${((8 + Math.floor(rng() * 4)) | 0).toString(16)}${hex(3)}-${hex(12)}`;
}

function randomDateBetween(rng, minDate, maxDate) {
  const now = Date.now();
  const oneYearAgo = now - 1000 * 60 * 60 * 24 * 365;
  const min = Number.isFinite(Date.parse(minDate || "")) ? Date.parse(minDate) : oneYearAgo;
  const max = Number.isFinite(Date.parse(maxDate || "")) ? Date.parse(maxDate) : now;
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const ts = low + rng() * (high - low || 1);
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
    value: String(opt.value),
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

function generateFieldValue(field, rng, locale, pack) {
  if (shouldNull(field.optional, field.nullable, rng)) return null;
  const fieldName = field.name.toLowerCase();

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
    case "email":
      return randomEmail(rng, pack);
    case "uuid":
      return randomUuid(rng);
    case "enum":
      return weightedEnumPick(field.enumOptions || [], rng);
    case "string":
    default: {
      if (fieldName.includes("name")) return randomName(rng, locale);
      if (fieldName.includes("city")) return randomCity(rng, locale);
      if (fieldName.includes("job") || fieldName.includes("role")) return randomJob(rng, pack);
      if (fieldName.includes("status")) return randomStatus(rng, pack);
      if (fieldName.includes("currency")) return randomCurrency(rng, locale, pack);
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

function normalizeSchemaFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.map((field, index) => {
    const normalized = {
      name: String(field.name || `field_${index + 1}`),
      type: field.type || "string",
      optional: Boolean(field.optional),
      nullable: Boolean(field.nullable),
      min: typeof field.min === "number" ? field.min : undefined,
      max: typeof field.max === "number" ? field.max : undefined,
      regex: field.regex || undefined,
      minDate: field.minDate || undefined,
      maxDate: field.maxDate || undefined,
      enumOptions: [],
    };

    if (Array.isArray(field.enumOptions)) {
      normalized.enumOptions = field.enumOptions.map((opt) => ({
        value: opt.value,
        weight: opt.weight,
      }));
    } else if (Array.isArray(field.enum)) {
      const weights = Array.isArray(field.enumWeights) ? field.enumWeights : [];
      normalized.enumOptions = field.enum.map((value, idx) => ({
        value,
        weight: typeof weights[idx] === "number" ? weights[idx] : 1,
      }));
    } else if (Array.isArray(field.values)) {
      normalized.enumOptions = field.values.map((value) => ({
        value,
        weight: 1,
      }));
    }

    return normalized;
  });
}

function toCsv(rows) {
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
        .join(",")
    ),
  ];
  return lines.join("
");
}

function toSql(rows, tableName) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const values = rows
    .map((row) => {
      const rendered = headers
        .map((h) => {
          const value = row[h];
          if (value === null || value === undefined) return "NULL";
          if (typeof value === "number") return String(value);
          if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
          return `'${String(value).replace(/'/g, "''")}'`;
        })
        .join(", ");
      return `(${rendered})`;
    })
    .join(",
");
  return `INSERT INTO ${tableName} (${headers.join(", ")}) VALUES
${values};`;
}

function generateMockData(options) {
  const fields = normalizeSchemaFields(options.fields || []);
  const count = Math.max(1, Math.min(Number(options.count) || DEFAULT_COUNT, MAX_COUNT));
  const format = options.format || "json";
  const pretty = options.pretty !== undefined ? options.pretty : format === "json";
  const locale = options.locale || DEFAULT_LOCALE;
  const domainPack = options.domainPack || DEFAULT_DOMAIN_PACK;
  const schemaName = options.schemaName || "data";
  const rng = createSeededRng(options.seed);

  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const record = {};
    for (const field of fields) {
      record[field.name] = generateFieldValue(field, rng, locale, domainPack);
    }
    rows.push(record);
  }

  let output = "";
  if (format === "csv") {
    output = toCsv(rows);
  } else if (format === "sql") {
    output = toSql(rows, schemaName);
  } else {
    output = JSON.stringify(rows, null, pretty ? 2 : 0);
  }

  return { rows, output, format };
}

module.exports = {
  generateMockData,
  normalizeSchemaFields,
};
