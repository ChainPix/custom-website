import { describe, expect, it } from "vitest";
import {
  detectUnit,
  formatConversionMath,
  parseLocalDateTime,
  parseTimestamp,
  unitToMs,
} from "@/app/(tools)/timestamp-converter/convert";

describe("detectUnit", () => {
  it("detects by digit length for the standard widths", () => {
    expect(detectUnit("1516239022", "auto")).toEqual({ unit: "s", reason: "length" });
    expect(detectUnit("1516239022000", "auto")).toEqual({ unit: "ms", reason: "length" });
    expect(detectUnit("1516239022000000", "auto")).toEqual({ unit: "us", reason: "length" });
    expect(detectUnit("1516239022000000000", "auto")).toEqual({ unit: "ns", reason: "length" });
  });

  it("falls back to magnitude for non-standard lengths", () => {
    expect(detectUnit("999999999", "auto").unit).toBe("s"); // 9 digits
    expect(detectUnit("99999999999999", "auto").unit).toBe("ms"); // 14 digits
  });

  it("respects a manual unit", () => {
    expect(detectUnit("1516239022", "ms")).toEqual({ unit: "ms", reason: "manual" });
  });
});

describe("unitToMs", () => {
  it("converts each unit to milliseconds", () => {
    expect(unitToMs(1, "s")).toBe(1000);
    expect(unitToMs(1000, "ms")).toBe(1000);
    expect(unitToMs(1_000_000, "us")).toBe(1000);
    expect(unitToMs(1_000_000_000, "ns")).toBe(1000);
  });
});

describe("parseTimestamp", () => {
  it("parses a seconds timestamp to the right instant", () => {
    const result = parseTimestamp("1516239022", "auto");
    expect(result.error).toBe("");
    expect(result.date?.toISOString()).toBe("2018-01-18T01:30:22.000Z");
    expect(result.unit).toBe("s");
  });

  it("rejects non-numeric input", () => {
    expect(parseTimestamp("not-a-number", "auto").error).toBe("Invalid timestamp");
    expect(parseTimestamp("", "auto").error).toBe("Enter a timestamp");
  });

  it("warns when the manual unit disagrees with the digit length", () => {
    const result = parseTimestamp("1516239022000", "s");
    expect(result.warning).toContain("milliseconds");
  });

  it("warns on non-standard lengths in auto mode", () => {
    expect(parseTimestamp("12345", "auto").warning).toContain("Non-standard length");
  });
});

describe("parseLocalDateTime", () => {
  it("parses date-time strings with and without seconds", () => {
    expect(parseLocalDateTime("2024-03-05T10:30")?.getMinutes()).toBe(30);
    expect(parseLocalDateTime("2024-03-05T10:30:45")?.getSeconds()).toBe(45);
  });

  it("returns null for malformed input", () => {
    expect(parseLocalDateTime("2024-03-05")).toBeNull();
    expect(parseLocalDateTime("garbage")).toBeNull();
    expect(parseLocalDateTime("")).toBeNull();
  });
});

describe("formatConversionMath", () => {
  it("shows the multiplier per unit", () => {
    expect(formatConversionMath(5, "s", 5000)).toBe("5 × 1000 = 5000");
    expect(formatConversionMath(5000, "us", 5)).toBe("5000 ÷ 1000 = 5");
  });
});
