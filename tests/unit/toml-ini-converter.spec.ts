import { describe, expect, it } from "vitest";
import {
  parseInput,
  findIniLineError,
  extractJsonErrorLocation,
  validateSchema,
  type ParseRequest,
} from "@/app/(tools)/toml-ini-converter/parse";

const req = (over: Partial<ParseRequest> = {}): ParseRequest => ({
  type: "parse",
  requestId: 1,
  input: "",
  mode: "toml",
  outputFormat: "json",
  pretty: true,
  nestIniDots: true,
  iniArrayDelimiter: "comma",
  iniDuplicateKeys: "last",
  iniCoerceTypes: true,
  schemaEnabled: false,
  schemaInput: "",
  ...over,
});

describe("parseInput — TOML", () => {
  it("converts TOML to JSON", () => {
    const result = parseInput(req({ input: 'title = "hi"\n[owner]\nname = "Tom"' }));
    expect(result.error).toBe("");
    expect(JSON.parse(result.output)).toEqual({ title: "hi", owner: { name: "Tom" } });
    expect(result.status).toBe("Converted TOML to JSON");
  });

  it("reports invalid TOML with an error message", () => {
    const result = parseInput(req({ input: "a =" }));
    expect(result.output).toBe("");
    expect(result.error).toContain("Invalid TOML");
  });

  it("passes same-format non-pretty input through as validation", () => {
    const input = 'a = 1';
    const result = parseInput(req({ input, outputFormat: "toml", pretty: false }));
    expect(result.output).toBe(input);
    expect(result.status).toBe("Validated TOML input");
  });
});

describe("parseInput — INI", () => {
  it("coerces numbers/booleans and splits comma arrays when enabled", () => {
    const result = parseInput(
      req({ mode: "ini", input: "[db]\nport = 5432\nssl = true\ntags = a, b, c" })
    );
    expect(result.error).toBe("");
    expect(JSON.parse(result.output)).toEqual({
      db: { port: 5432, ssl: true, tags: ["a", "b", "c"] },
    });
  });

  it("keeps values as strings when coercion is disabled", () => {
    const result = parseInput(
      req({ mode: "ini", iniCoerceTypes: false, input: "[db]\nport = 5432" })
    );
    expect(JSON.parse(result.output)).toEqual({ db: { port: "5432" } });
  });

  it("nests dotted section names only when nestIniDots is on", () => {
    const nested = parseInput(req({ mode: "ini", input: "[a.b]\nc = 1" }));
    expect(JSON.parse(nested.output)).toEqual({ a: { b: { c: 1 } } });

    const flat = parseInput(req({ mode: "ini", nestIniDots: false, input: "[a.b]\nc = 1" }));
    expect(JSON.parse(flat.output)).toEqual({ "a.b": { c: 1 } });
  });

  it("rejects a malformed section header with its line number", () => {
    const result = parseInput(req({ mode: "ini", input: "[unclosed\nk = v" }));
    expect(result.error).toContain("Invalid INI section header at line 1");
    expect(result.errorLocation).toEqual({ line: 1, column: 1 });
  });
});

describe("parseInput — JSON", () => {
  it("converts JSON to INI", () => {
    const result = parseInput(
      req({ mode: "json", outputFormat: "ini", input: '{"section":{"key":"value"}}' })
    );
    expect(result.error).toBe("");
    expect(result.output).toContain("[section]");
    expect(result.output).toMatch(/key\s*=\s*value/);
  });

  it("converts JSON to TOML", () => {
    const result = parseInput(
      req({ mode: "json", outputFormat: "toml", input: '{"a":1,"b":{"c":"x"}}' })
    );
    expect(result.error).toBe("");
    expect(result.output).toContain("a = 1");
    expect(result.output).toContain("[b]");
  });

  it("reports invalid JSON with a line/column location", () => {
    const result = parseInput(req({ mode: "json", input: "{bad" }));
    expect(result.error).toContain("Invalid JSON");
    expect(result.errorLocation?.line).toBe(1);
  });
});

describe("schema validation", () => {
  it("flags missing required properties", () => {
    const result = parseInput(
      req({
        mode: "json",
        input: '{"x":1}',
        schemaEnabled: true,
        schemaInput: '{"type":"object","required":["name"]}',
      })
    );
    expect(result.schemaValidation?.valid).toBe(false);
    expect(result.schemaValidation?.errors.length).toBeGreaterThan(0);
  });

  it("passes a conforming document", () => {
    const result = parseInput(
      req({
        mode: "json",
        input: '{"name":"ok"}',
        schemaEnabled: true,
        schemaInput: '{"type":"object","required":["name"]}',
      })
    );
    expect(result.schemaValidation).toEqual({ valid: true, errors: [], schemaError: "" });
  });

  it("surfaces an unparseable schema as schemaError", () => {
    expect(validateSchema("{not json", {}).schemaError).toContain("Invalid schema");
    expect(validateSchema("", {}).schemaError).toBe("Schema is empty.");
  });
});

describe("helpers", () => {
  it("findIniLineError skips comments and blank lines", () => {
    expect(findIniLineError("; comment\n# also\n\n[ok]\nk = v")).toBeNull();
    expect(findIniLineError("[ok]\n[bad")).toEqual({
      line: 2,
      message: "Invalid INI section header at line 2.",
    });
  });

  it("extractJsonErrorLocation maps a position to line/column", () => {
    expect(extractJsonErrorLocation("Unexpected token at position 7", "{\n  \"a\"x")).toEqual({
      line: 2,
      column: 6,
    });
    expect(extractJsonErrorLocation("no position here", "{}")).toBeNull();
  });
});
