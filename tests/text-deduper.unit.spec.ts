import { expect, test } from "@playwright/test";
import { dedupeText, type DedupeConfig } from "../app/(tools)/text-deduper/dedupe";

const baseConfig: DedupeConfig = {
  options: {
    caseInsensitive: false,
    trimLines: true,
    keepBlank: false,
    sort: false,
    normalizeWhitespace: false,
  },
  matchingMode: "exact",
  emailNormalization: "domain",
  keepMode: "first",
};

test("dedupeText handles mixed newline styles", () => {
  const input = "alpha\r\nbeta\nbeta";
  const result = dedupeText(input, baseConfig);
  expect(result.stats.totalLines).toBe(3);
  expect(result.stats.uniqueLines).toBe(2);
  expect(result.stats.duplicatesRemoved).toBe(1);
  expect(result.outputLines).toEqual(["alpha", "beta"]);
});

test("dedupeText drops whitespace-only lines when trimming", () => {
  const input = " \n\t\nx\n ";
  const result = dedupeText(input, baseConfig);
  expect(result.stats.totalLines).toBe(4);
  expect(result.stats.nonBlankLines).toBe(1);
  expect(result.stats.blankLinesRemoved).toBe(3);
  expect(result.stats.duplicatesRemoved).toBe(0);
  expect(result.outputLines).toEqual(["x"]);
});

test("dedupeText supports Unicode normalization (NFKC)", () => {
  const config: DedupeConfig = { ...baseConfig, matchingMode: "nfkc" };
  const result = dedupeText("ﬀ\nff", config);
  expect(result.stats.uniqueLines).toBe(1);
  expect(result.stats.duplicatesRemoved).toBe(1);
  expect(result.outputLines[0]).toBe("ﬀ");
});

test("dedupeText ignores diacritics when configured", () => {
  const config: DedupeConfig = { ...baseConfig, matchingMode: "ignore-diacritics" };
  const result = dedupeText("résumé\nresume", config);
  expect(result.stats.uniqueLines).toBe(1);
  expect(result.stats.duplicatesRemoved).toBe(1);
  expect(result.outputLines[0]).toBe("résumé");
});

test("dedupeText sorts output with case-insensitive matching", () => {
  const config: DedupeConfig = {
    ...baseConfig,
    options: { ...baseConfig.options, caseInsensitive: true, sort: true },
  };
  const result = dedupeText("b\nA\na", config);
  expect(result.outputLines).toEqual(["A", "b"]);
  expect(result.stats.duplicatesRemoved).toBe(1);
});

test("dedupeText uses case-insensitive ordering when sorting", () => {
  const config: DedupeConfig = {
    ...baseConfig,
    options: { ...baseConfig.options, caseInsensitive: true, sort: true },
  };
  const result = dedupeText("a\nB\nc", config);
  expect(result.outputLines).toEqual(["a", "B", "c"]);
});

test("dedupeText handles large inputs with expected counts", () => {
  const lines = Array.from({ length: 1000 }, (_, i) => `line-${i % 10}`);
  const result = dedupeText(lines.join("\n"), baseConfig);
  expect(result.stats.totalLines).toBe(1000);
  expect(result.stats.uniqueLines).toBe(10);
  expect(result.stats.duplicatesRemoved).toBe(990);
});

test("dedupeText tracks removed lines with keep-last mode", () => {
  const config: DedupeConfig = { ...baseConfig, keepMode: "last" };
  const result = dedupeText("x\nx\ny\nx", config);
  expect(result.removedLines.length).toBe(2);
  expect(result.outputLines).toEqual(["x", "y"]);
});
