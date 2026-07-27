import { expect, test } from "vitest";
import { convert, convertToToml, type ConvertOptions } from "../../app/(tools)/toml-yaml/conversion";

const baseOptions: ConvertOptions = {
  yamlIndent: 2,
  yamlSchemaMode: "json",
  sortKeys: false,
  lineWidth: -1,
  useBasicToml: true,
};

test("basic TOML serializer quotes complex keys and formats arrays", () => {
  const data = {
    "api version": 1,
    "nested.key": "value",
    list: [1, 2, 3],
  };
  const output = convertToToml(data, { sortKeys: false });
  expect(output).toContain('"api version" = 1');
  expect(output).toContain('"nested.key" = "value"');
  expect(output).toContain("list = [1, 2, 3]");
});

test("basic TOML serializer rejects bigint outside 64-bit range", () => {
  const data = { value: BigInt("9223372036854775808") };
  expect(() => convertToToml(data, { sortKeys: false })).toThrow("Unsupported bigint");
});

test("basic TOML serializer supports datetimes and mixed arrays via tables", () => {
  const data = {
    createdAt: new Date("2024-02-18T12:30:00Z"),
    items: [{ name: "alpha" }, 2],
  };
  const output = convertToToml(data, { sortKeys: false });
  expect(output).toContain("createdAt = 2024-02-18T12:30:00.000Z");
  expect(output).toContain("[[items]]");
  expect(output).toContain('name = "alpha"');
  expect(output).toContain("value = 2");
});

test("convert returns path-aware errors for invalid arrays", () => {
  const input = "items:\n  - 1\n  - null\n";
  const result = convert("yaml-to-toml", input, { ...baseOptions, yamlSchemaMode: "full" });
  expect("error" in result).toBe(true);
  if ("error" in result) {
    expect(result.meta.path).toContain("items");
  }
});

test("golden: YAML to TOML (basic) conversion stays stable", () => {
  const input = "service:\n  name: api\n  ports: [80, 443]\n";
  const result = convert("yaml-to-toml", input, baseOptions);
  expect(result).toEqual({
    output: '[service]\nname = "api"\nports = [80, 443]',
    meta: { path: "" },
  });
});

test("golden: TOML to YAML conversion stays stable", () => {
  const input = 'title = "Example"\n[owner]\nname = "Alex"\n';
  const result = convert("toml-to-yaml", input, baseOptions);
  expect(result).toEqual({
    output: "title: Example\nowner:\n  name: Alex\n",
    meta: { path: "" },
  });
});
