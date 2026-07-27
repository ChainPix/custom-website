import { describe, expect, it } from "vitest";
import {
  parseJsonTableInput,
  flattenRow,
  resolveJsonPath,
  buildHeaders,
  type JsonTableParseOptions,
} from "@/app/(tools)/json-table/parse";

const opts = (over: Partial<JsonTableParseOptions> = {}): JsonTableParseOptions => ({
  jsonPath: "$",
  flattenTable: false,
  arrayMode: "join",
  maxChars: 100_000,
  lenientMode: false,
  ...over,
});

describe("parseJsonTableInput", () => {
  it("turns an array of objects into rows with a sorted union of headers", () => {
    const result = parseJsonTableInput('[{"b":2,"a":1},{"a":3,"c":4}]', opts());
    expect(result.error).toBe("");
    expect(result.headers).toEqual(["a", "b", "c"]);
    expect(result.rows).toEqual([{ b: 2, a: 1 }, { a: 3, c: 4 }]);
  });

  it("wraps a single object as one row and a primitive array under `value`", () => {
    expect(parseJsonTableInput('{"x":1}', opts()).rows).toEqual([{ x: 1 }]);

    const prim = parseJsonTableInput("[1,2,3]", opts());
    expect(prim.headers).toEqual(["value"]);
    expect(prim.rows).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
  });

  it("reports invalid JSON with a message and no rows", () => {
    const result = parseJsonTableInput("{bad}", opts());
    expect(result.rows).toEqual([]);
    expect(result.error).toBe("Invalid JSON input.");
  });

  it("repairs trailing commas and single quotes in lenient mode only", () => {
    expect(parseJsonTableInput("{'a':1,}", opts()).error).toBe("Invalid JSON input.");

    const lenient = parseJsonTableInput("{'a':1,}", opts({ lenientMode: true }));
    expect(lenient.error).toBe("");
    expect(lenient.rows).toEqual([{ a: 1 }]);
  });

  it("flattens nested objects into dotted columns when requested", () => {
    const result = parseJsonTableInput('[{"a":{"c":2,"b":1}}]', opts({ flattenTable: true }));
    expect(result.headers).toEqual(["a.b", "a.c"]);
    expect(result.rows).toEqual([{ "a.b": 1, "a.c": 2 }]);
  });

  it("enforces the maxChars limit", () => {
    const result = parseJsonTableInput("[1,2,3]", opts({ maxChars: 3 }));
    expect(result.rows).toEqual([]);
    expect(result.error).toContain("exceeds");
  });
});

describe("flattenRow", () => {
  it("joins primitive arrays with '; ' in join mode", () => {
    expect(flattenRow({ tags: ["x", "y"] }, "join")).toEqual({ tags: "x; y" });
  });

  it("stringifies arrays in stringify mode", () => {
    expect(flattenRow({ tags: [1, 2] }, "stringify")).toEqual({ tags: "[1,2]" });
  });
});

describe("resolveJsonPath", () => {
  it("resolves a wildcard segment to the matching array items", () => {
    const data = { data: { items: [{ a: 1 }, { a: 2 }] } };
    expect(resolveJsonPath(data, "$.data.items[*]")).toEqual({
      value: [{ a: 1 }, { a: 2 }],
      error: "",
    });
  });

  it("rejects a path that does not start with $", () => {
    expect(resolveJsonPath({}, "data").error).toBe("JSONPath must start with $.");
  });
});

describe("buildHeaders", () => {
  it("returns the sorted union of keys across rows", () => {
    expect(buildHeaders([{ z: 1 }, { a: 2, m: 3 }])).toEqual(["a", "m", "z"]);
  });
});
