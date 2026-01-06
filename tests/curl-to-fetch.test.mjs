import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const corpusPath = path.join(root, "tests/fixtures/curl-to-fetch-corpus.json");
const snapshotPath = path.join(root, "tests/fixtures/curl-to-fetch-snapshots.json");
const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const snapshots = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));

const parser = loadParser();

function loadParser() {
  const parserPath = path.join(root, "app/(tools)/curl-to-fetch/parser.ts");
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
  return module.exports;
}

const defaultOptions = {
  wrapAsync: true,
  prettyOptions: true,
  target: "fetch-browser",
  responseMode: "auto",
  typescript: false,
  useSatisfies: false,
};

test("curl-to-fetch corpus has at least 50 commands", () => {
  assert.ok(corpus.length >= 50);
});

test("curl-to-fetch snapshots stay stable", () => {
  assert.equal(snapshots.length, corpus.length);
  for (let i = 0; i < snapshots.length; i += 1) {
    const snapshot = snapshots[i];
    const options = { ...defaultOptions, ...(snapshot.options || {}) };
    const parsed = parser.parseCurl(snapshot.command);
    const output = parser.buildSnippet(parsed, options, "standard");
    assert.deepEqual(parsed, snapshot.parse, `parse mismatch for ${snapshot.name}`);
    assert.equal(output, snapshot.output, `output mismatch for ${snapshot.name}`);
  }
});

test("tokenize handles ansi-c quoting and continuations", () => {
  const tokens = parser.tokenize("curl --header $'x: y\\nz: w' https://example.com");
  assert.ok(tokens.includes("x: y\nz: w"));
});

test("fuzz tokenize/parse/build stays resilient", () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_=+:/?.&%$'\"\\^ \n\t";
  for (let i = 0; i < 200; i += 1) {
    let input = "";
    const len = 20 + Math.floor(Math.random() * 80);
    for (let j = 0; j < len; j += 1) {
      input += chars[Math.floor(Math.random() * chars.length)];
    }
    assert.ok(Array.isArray(parser.tokenize(input)));
    try {
      const parsed = parser.parseCurl(input);
      const output = parser.buildSnippet(parsed, defaultOptions, "standard");
      assert.equal(typeof output, "string");
      assert.ok(output.length > 0);
      assert.ok(!output.includes("undefined"));
    } catch (err) {
      assert.equal(typeof err?.message, "string");
      assert.ok(err.message.length > 0);
    }
  }
});
