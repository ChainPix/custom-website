import { expect, test } from "@playwright/test";
import { encodeValue, safeDecodeValue } from "../lib/url-codec";

const baseOptions = {
  encodeMode: "component" as const,
  querystringMode: false,
  lenientDecode: false,
};

test("safe decode reports invalid percent sequences with index", async () => {
  const cases = ["%", "%2", "%GG"];
  for (const value of cases) {
    const result = safeDecodeValue(value, baseOptions);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("index 0");
    }
  }
});

test("encode handles unicode and emoji", async () => {
  const unicode = encodeValue("café", baseOptions);
  expect(unicode).toContain("%C3%A9");
  const emoji = encodeValue("😺", baseOptions);
  expect(emoji).toContain("%F0%9F%98%BA");
});

test("full URL mode preserves reserved characters", async () => {
  const fullOptions = { ...baseOptions, encodeMode: "full" as const };
  const input = "https://example.com/a?b=c#d";
  const result = encodeValue(input, fullOptions);
  expect(result).toBe(input);
  const spaced = encodeValue("https://example.com/a b?c=d", fullOptions);
  expect(spaced).toBe("https://example.com/a%20b?c=d");
});

test("querystring mode encodes spaces as + and decodes + to space", async () => {
  const qsOptions = { ...baseOptions, querystringMode: true };
  const encoded = encodeValue("hello world", qsOptions);
  expect(encoded).toBe("hello+world");
  const decoded = safeDecodeValue("hello+world", qsOptions);
  expect(decoded.ok).toBe(true);
  if (decoded.ok) {
    expect(decoded.value).toBe("hello world");
  }
});

test("lenient decode keeps stray percent signs", async () => {
  const lenientOptions = { ...baseOptions, lenientDecode: true };
  const decoded = safeDecodeValue("100% legit", lenientOptions);
  expect(decoded.ok).toBe(true);
  if (decoded.ok) {
    expect(decoded.value).toBe("100% legit");
  }
});
