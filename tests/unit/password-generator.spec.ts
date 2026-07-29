import { describe, expect, it } from "vitest";
import {
  generateOutput,
  generatePassphrase,
  generatePassword,
  symbols,
  wordList,
  type Settings,
} from "@/app/(tools)/password-generator/generate";

const base: Settings = {
  length: 16,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
  enforceSets: false,
  mode: "password",
  wordCount: 4,
  separator: "-",
  capitalize: false,
  numberSuffix: false,
};

describe("generatePassword", () => {
  it("respects the requested length", () => {
    expect(generatePassword(base).length).toBe(16);
    expect(generatePassword({ ...base, length: 32 }).length).toBe(32);
  });

  it("only uses characters from the enabled sets", () => {
    const digitsOnly = generatePassword({
      ...base,
      lowercase: false,
      uppercase: false,
      symbols: false,
      length: 40,
    });
    expect(digitsOnly).toMatch(/^[0-9]{40}$/);
  });

  it("returns empty when no sets are enabled", () => {
    expect(
      generatePassword({ ...base, lowercase: false, uppercase: false, numbers: false, symbols: false })
    ).toBe("");
  });

  it("enforceSets guarantees one char from each enabled set", () => {
    for (let i = 0; i < 10; i += 1) {
      const value = generatePassword({ ...base, enforceSets: true, length: 8 });
      expect(value).toMatch(/[a-z]/);
      expect(value).toMatch(/[A-Z]/);
      expect(value).toMatch(/[0-9]/);
      expect(value.split("").some((c) => symbols.includes(c))).toBe(true);
    }
  });

  it("enforceSets refuses lengths shorter than the set count", () => {
    expect(generatePassword({ ...base, enforceSets: true, length: 3 })).toBe("");
  });
});

describe("generatePassphrase", () => {
  it("joins the requested number of dictionary words", () => {
    const phrase = generatePassphrase({ ...base, mode: "passphrase", wordCount: 5 });
    const words = phrase.split("-");
    expect(words).toHaveLength(5);
    for (const word of words) {
      expect(wordList).toContain(word);
    }
  });

  it("clamps word count to 3..8", () => {
    expect(generatePassphrase({ ...base, mode: "passphrase", wordCount: 1 }).split("-")).toHaveLength(3);
    expect(generatePassphrase({ ...base, mode: "passphrase", wordCount: 20 }).split("-")).toHaveLength(8);
  });

  it("capitalizes words and appends a two-digit suffix when asked", () => {
    const phrase = generatePassphrase({
      ...base,
      mode: "passphrase",
      wordCount: 3,
      capitalize: true,
      numberSuffix: true,
    });
    const parts = phrase.split("-");
    expect(parts).toHaveLength(4);
    expect(parts[3]).toMatch(/^\d{2}$/);
    for (const word of parts.slice(0, 3)) {
      expect(word[0]).toBe(word[0]?.toUpperCase());
    }
  });
});

describe("generateOutput", () => {
  it("routes by mode", () => {
    expect(generateOutput({ ...base, mode: "passphrase" })).toContain("-");
    expect(generateOutput(base)).toHaveLength(16);
  });
});
