#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const { generateMockData, normalizeSchemaFields } = require("../lib/mock-data/generator");

function printUsage() {
  const usage = `mockgen generate <schema.json> [options]

Options:
  --format <json|csv|sql>   Output format (default: json)
  --count <number>          Record count
  --seed <value>            Seed for deterministic output
  --pretty                  Pretty-print JSON output
  --compact                 Compact JSON output
  --locale <locale>         Locale key (e.g. en-US)
  --domain-pack <pack>      Domain pack (default, fintech, healthcare, ecommerce, iot)
  --table <name>            SQL table name
`;
  process.stdout.write(`${usage}
`);
}

function fail(message) {
  process.stderr.write(`${message}
`);
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length || args[0] !== "generate") {
  printUsage();
  process.exit(1);
}

const schemaPath = args[1];
if (!schemaPath) fail("Missing schema.json path.");

const flags = args.slice(2);
const overrides = {};
for (let i = 0; i < flags.length; i += 1) {
  const flag = flags[i];
  switch (flag) {
    case "--format":
      overrides.format = flags[i + 1];
      i += 1;
      break;
    case "--count":
      overrides.count = Number(flags[i + 1]);
      i += 1;
      break;
    case "--seed":
      overrides.seed = flags[i + 1];
      i += 1;
      break;
    case "--pretty":
      overrides.pretty = true;
      break;
    case "--compact":
      overrides.pretty = false;
      break;
    case "--locale":
      overrides.locale = flags[i + 1];
      i += 1;
      break;
    case "--domain-pack":
      overrides.domainPack = flags[i + 1];
      i += 1;
      break;
    case "--table":
      overrides.schemaName = flags[i + 1];
      i += 1;
      break;
    default:
      fail(`Unknown flag: ${flag}`);
  }
}

let raw;
try {
  raw = fs.readFileSync(schemaPath, "utf8");
} catch (error) {
  fail(`Unable to read schema file: ${schemaPath}`);
}

let payload;
try {
  payload = JSON.parse(raw);
} catch (error) {
  fail("Schema file is not valid JSON.");
}

const fields = Array.isArray(payload)
  ? payload
  : payload.fields || (payload.schema && payload.schema.fields) || payload.schema || [];

if (!Array.isArray(fields) || fields.length === 0) {
  fail("Schema file must include a fields array.");
}

const normalizedFields = normalizeSchemaFields(fields);
const options = {
  fields: normalizedFields,
  count: overrides.count ?? payload.count ?? 10,
  format: overrides.format ?? payload.format ?? "json",
  seed: overrides.seed ?? payload.seed,
  pretty: overrides.pretty ?? payload.pretty,
  locale: overrides.locale ?? payload.locale,
  domainPack: overrides.domainPack ?? payload.domainPack,
  schemaName: overrides.schemaName ?? payload.schemaName ?? payload.name ?? "data",
};

const { output } = generateMockData(options);
process.stdout.write(`${output}
`);
