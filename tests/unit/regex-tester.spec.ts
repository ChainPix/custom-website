import { expect, test } from "vitest";
import { buildRegex, computeMatches } from "../../lib/regex-tester";

test("computeMatches: non-global returns a single match", () => {
  const result = buildRegex("\\w+", [], false);
  expect(result.error).toBe("");
  expect(result.regex).not.toBeNull();
  const matches = computeMatches("one two three", result.regex!).matches;
  expect(matches).toHaveLength(1);
  expect(matches[0].match).toBe("one");
});

test("computeMatches: zero-length matches are handled safely", () => {
  const result = buildRegex("^|$", ["g"], false);
  expect(result.error).toBe("");
  const matches = computeMatches("ab", result.regex!).matches;
  expect(matches).toHaveLength(2);
  expect(matches.every((m) => m.zeroLength)).toBe(true);
});

test("buildRegex: invalid pattern returns error", () => {
  const result = buildRegex("(", ["g"], false);
  expect(result.regex).toBeNull();
  expect(result.error).toBe("Invalid regex pattern.");
});

test("buildRegex: unicode escape requires the u flag", () => {
  const withUnicode = buildRegex("\\u{1F600}", ["u"], false);
  expect(withUnicode.error).toBe("");
  const matches = computeMatches("😀", withUnicode.regex!).matches;
  expect(matches).toHaveLength(1);
  expect(matches[0].match).toBe("😀");

  // Without the u flag, \u{1F600} is a valid annex-B pattern that matches the
  // literal text "u{1F600}" instead of the emoji code point.
  const withoutUnicode = buildRegex("\\u{1F600}", [], false);
  expect(withoutUnicode.error).toBe("");
  expect(withoutUnicode.regex).not.toBeNull();
  expect(computeMatches("😀", withoutUnicode.regex!).matches).toHaveLength(0);
  const literalMatches = computeMatches("u{1F600}", withoutUnicode.regex!).matches;
  expect(literalMatches).toHaveLength(1);
  expect(literalMatches[0].match).toBe("u{1F600}");
});
