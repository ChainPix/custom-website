import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const parserPath = path.join(root, "app/(tools)/curl-to-fetch/parser.ts");
const corpusPath = path.join(root, "tests/fixtures/curl-to-fetch-corpus.json");
const snapshotPath = path.join(root, "tests/fixtures/curl-to-fetch-snapshots.json");

const source = fs.readFileSync(parserPath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});

const require = createRequire(import.meta.url);
const module = { exports: {} };
const sandbox = {
  module,
  exports: module.exports,
  require,
  console,
  URL,
  URLSearchParams,
  btoa,
};
vm.createContext(sandbox);
vm.runInContext(transpiled.outputText, sandbox, { filename: "parser.js" });
const parser = module.exports;

const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const defaultOptions = {
  wrapAsync: true,
  prettyOptions: true,
  target: "fetch-browser",
  responseMode: "auto",
  typescript: false,
  useSatisfies: false,
};

const snapshots = corpus.map((entry) => {
  const options = { ...defaultOptions, ...(entry.options || {}) };
  const parsed = parser.parseCurl(entry.command);
  const output = parser.buildSnippet(parsed, options, "standard");
  return {
    name: entry.name,
    command: entry.command,
    options,
    parse: parsed,
    output,
  };
});

fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshots, null, 2)}\n`);
console.log(`Wrote ${snapshots.length} snapshots to ${snapshotPath}`);
