import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  findNearestColor,
  findNearestLightnessForContrast,
  getContrastResult,
  hexToRgb,
  hslToRgb,
  rgbToHex,
  rgbToHsl,
  rotateHue,
} from "@/app/(tools)/color-converter/color";

describe("hex ⇄ rgb", () => {
  it("parses 6- and 3-digit hex with or without #", () => {
    expect(hexToRgb("#FF8000")).toEqual({ r: 255, g: 128, b: 0 });
    expect(hexToRgb("f80")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("rejects invalid hex", () => {
    expect(hexToRgb("#12345")).toBeNull();
    expect(hexToRgb("zzzzzz")).toBeNull();
  });

  it("round-trips rgb → hex → rgb", () => {
    expect(rgbToHex(255, 128, 0)).toBe("#FF8000");
    expect(hexToRgb(rgbToHex(12, 200, 99))).toEqual({ r: 12, g: 200, b: 99 });
  });
});

describe("rgb ⇄ hsl", () => {
  it("converts primaries", () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 });
    expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 });
  });

  it("handles greys (zero saturation)", () => {
    expect(rgbToHsl(128, 128, 128)).toEqual({ h: 0, s: 0, l: 50 });
    expect(hslToRgb(0, 0, 50)).toEqual({ r: 128, g: 128, b: 128 });
  });
});

describe("WCAG contrast", () => {
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };

  it("black on white is 21:1 and passes everything", () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
    const result = getContrastResult(black, white);
    expect(result.aaNormal).toBe(true);
    expect(result.aaaNormal).toBe(true);
  });

  it("mid-grey on white fails AA normal", () => {
    const grey = { r: 160, g: 160, b: 160 };
    const result = getContrastResult(grey, white);
    expect(result.ratio).toBeLessThan(4.5);
    expect(result.aaNormal).toBe(false);
  });

  it("findNearestLightnessForContrast returns a passing lightness", () => {
    const best = findNearestLightnessForContrast(210, 50, 80, white);
    expect(best).not.toBeNull();
    const rgb = hslToRgb(210, 50, best as number);
    expect(contrastRatio(rgb, white)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("palette helpers", () => {
  it("rotateHue wraps in both directions", () => {
    expect(rotateHue(350, 20)).toBe(10);
    expect(rotateHue(10, -20)).toBe(350);
  });

  it("findNearestColor picks the closest palette entry", () => {
    const palette = [
      { name: "red", hex: "#FF0000", rgb: { r: 255, g: 0, b: 0 } },
      { name: "blue", hex: "#0000FF", rgb: { r: 0, g: 0, b: 255 } },
    ];
    expect(findNearestColor({ r: 250, g: 10, b: 10 }, palette).name).toBe("red");
    expect(findNearestColor({ r: 10, g: 10, b: 250 }, palette).name).toBe("blue");
  });
});
