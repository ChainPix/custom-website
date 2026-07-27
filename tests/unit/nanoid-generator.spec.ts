import { expect, test } from "vitest";
import { clampCount, clampLength, getAlphabetValidation, randomNanoId } from "../../lib/nanoid-generator";

const createDeterministicFill = (seed: number) => {
  let state = seed >>> 0;
  return (bytes: Uint8Array) => {
    for (let i = 0; i < bytes.length; i += 1) {
      state = (state * 1664525 + 1013904223) >>> 0;
      bytes[i] = state & 0xff;
    }
  };
};

test("clamps length and count", async () => {
  expect(clampLength(2)).toBe(4);
  expect(clampLength(40)).toBe(32);
  expect(clampLength(16)).toBe(16);

  expect(clampCount(0)).toBe(1);
  expect(clampCount(99)).toBe(50);
  expect(clampCount(12)).toBe(12);
});

test("alphabet validation flags whitespace and duplicates", async () => {
  const whitespace = getAlphabetValidation("ab c", false);
  expect(whitespace.issues.join(" ")).toContain("whitespace");

  const duplicates = getAlphabetValidation("aabc", false);
  expect(duplicates.issues.join(" ")).toContain("duplicate");
});

test("nanoid mode distribution looks roughly uniform", async () => {
  const alphabet = "abcdefg";
  const rng = createDeterministicFill(123);
  const totalIds = 5000;
  const size = 10;
  const counts: Record<string, number> = {};

  for (const char of alphabet) counts[char] = 0;

  for (let i = 0; i < totalIds; i += 1) {
    const id = randomNanoId(size, alphabet, "nanoid", rng);
    for (const char of id) {
      counts[char] += 1;
    }
  }

  const totalChars = totalIds * size;
  const expected = totalChars / alphabet.length;
  const tolerance = expected * 0.35;

  for (const char of alphabet) {
    expect(counts[char]).toBeGreaterThan(expected - tolerance);
    expect(counts[char]).toBeLessThan(expected + tolerance);
  }
});
