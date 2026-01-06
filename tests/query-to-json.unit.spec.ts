import { expect, test } from "@playwright/test";
import { parseQuery, type Options } from "../lib/queryToJson";

const baseOptions: Options = {
  decode: true,
  mode: "arrays",
  sort: false,
  pretty: true,
  keyMode: "nested",
  inferTypes: false,
  plusAsSpace: true,
};

test("parseQuery: duplicates honor arrays/first/last", () => {
  const arrays = parseQuery("a=1&a=2", baseOptions);
  expect(arrays.a).toEqual(["1", "2"]);

  const first = parseQuery("a=1&a=2", { ...baseOptions, mode: "first" });
  expect(first.a).toBe("1");

  const last = parseQuery("a=1&a=2", { ...baseOptions, mode: "last" });
  expect(last.a).toBe("2");
});

test("parseQuery: invalid percent encoding throws", () => {
  expect(() => parseQuery("a=%E0%", baseOptions)).toThrow(/Bad percent encoding/);
});

test("parseQuery: bracket nesting creates objects and arrays", () => {
  const parsed = parseQuery("user[name]=Jane&user[role]=eng&arr[]=1&arr[]=2", baseOptions);
  expect(parsed).toEqual({
    user: { name: "Jane", role: "eng" },
    arr: ["1", "2"],
  });
});

test("parseQuery: plus-as-space toggles handling", () => {
  const withPlus = parseQuery("q=hello+world", baseOptions);
  expect(withPlus.q).toBe("hello world");

  const literalPlus = parseQuery("q=hello+world", { ...baseOptions, plusAsSpace: false });
  expect(literalPlus.q).toBe("hello+world");
});

test("parseQuery: empty keys and values are preserved", () => {
  const parsed = parseQuery("=1&empty=&noval", { ...baseOptions, keyMode: "flat" });
  expect(parsed[""]).toBe("1");
  expect(parsed.empty).toBe("");
  expect(parsed.noval).toBe("");
});
