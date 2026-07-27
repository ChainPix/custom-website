import { describe, expect, it } from "vitest";
import {
  parseWithBetterError,
  sortObjectKeys,
  escapeString,
  getJSONPath,
} from "@/lib/json-utils";

describe("parseWithBetterError", () => {
  it("parses valid JSON", () => {
    const result = parseWithBetterError('{"a":1,"b":[2,3]}');
    expect(result.error).toBeNull();
    expect(result.parsed).toEqual({ a: 1, b: [2, 3] });
  });

  it("reports an error and location for invalid JSON", () => {
    const result = parseWithBetterError("{bad}");
    expect(result.parsed).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("Invalid JSON");
  });

  it("accepts JSON5 (trailing commas, comments) when enabled", () => {
    const strict = parseWithBetterError("{a:1,}", false);
    expect(strict.error).toBeTruthy();

    const lenient = parseWithBetterError("{a:1,}", true);
    expect(lenient.error).toBeNull();
    expect(lenient.parsed).toEqual({ a: 1 });
  });
});

describe("sortObjectKeys", () => {
  it("sorts keys alphabetically at every level by default", () => {
    const sorted = sortObjectKeys({ b: { d: 1, c: 2 }, a: 3 });
    expect(JSON.stringify(sorted)).toBe('{"a":3,"b":{"c":2,"d":1}}');
  });

  it("sorts only the top level when recursive is false", () => {
    const sorted = sortObjectKeys({ b: { d: 1, c: 2 }, a: 3 }, false);
    expect(JSON.stringify(sorted)).toBe('{"a":3,"b":{"d":1,"c":2}}');
  });

  it("leaves primitives and array element order untouched", () => {
    expect(sortObjectKeys(42)).toBe(42);
    expect(sortObjectKeys([3, 1, 2])).toEqual([3, 1, 2]);
  });
});

describe("escapeString", () => {
  it("escapes quotes, newlines, tabs and backslashes", () => {
    expect(escapeString('say "hi"')).toBe('say \\"hi\\"');
    expect(escapeString("line1\nline2")).toBe("line1\\nline2");
    expect(escapeString("tab\there")).toBe("tab\\there");
    expect(escapeString("a\\b")).toBe("a\\\\b");
  });

  it("escapes the backspace character without touching word boundaries", () => {
    // Regression: /\b/ matches a zero-width word boundary, so "say hi"
    // must be returned verbatim and only a real U+0008 becomes \b.
    expect(escapeString("say hi")).toBe("say hi");
    expect(escapeString("a\bb")).toBe("a\\bb");
  });
});

describe("getJSONPath", () => {
  it("returns Root for an empty path", () => {
    expect(getJSONPath({}, [])).toBe("Root");
  });

  it("uses dot notation for keys and bracket notation for indices", () => {
    expect(getJSONPath({}, ["user", "name"])).toBe("Root > user.name");
    expect(getJSONPath({}, ["users", "2", "name"])).toBe("Root > users[2].name");
  });
});
