import { expect, test } from "@playwright/test";
import { convert, type ConversionContext } from "../lib/cssUnits";

const baseContext: ConversionContext = {
  rootFont: 16,
  elementFont: 16,
  vw: 1440,
  vh: 900,
  percentContext: 320,
  dpi: 96,
  chRatio: 0.5,
  exRatio: 0.5,
};

const createRng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test("convert handles common rem conversions", () => {
  expect(convert(16, "px", "rem", baseContext)).toBe(1);
  expect(convert(24, "px", "rem", baseContext)).toBe(1.5);
  expect(convert(8, "px", "rem", baseContext)).toBe(0.5);
});

test("convert handles viewport units", () => {
  expect(convert(50, "vw", "px", baseContext)).toBe(720);
  expect(convert(25, "vh", "px", baseContext)).toBe(225);
  expect(convert(10, "vmin", "px", baseContext)).toBe(90);
});

test("round-trip conversions stay within epsilon", () => {
  const rand = createRng(1337);
  const epsilon = 1e-9;
  for (let i = 0; i < 200; i += 1) {
    const px = rand() * 5000;
    const ctx: ConversionContext = {
      ...baseContext,
      rootFont: 12 + rand() * 20,
      elementFont: 10 + rand() * 24,
    };
    const rem = convert(px, "px", "rem", ctx);
    const remBack = convert(rem, "rem", "px", ctx);
    expect(Math.abs(remBack - px)).toBeLessThanOrEqual(epsilon);
    const em = convert(px, "px", "em", ctx);
    const emBack = convert(em, "em", "px", ctx);
    expect(Math.abs(emBack - px)).toBeLessThanOrEqual(epsilon);
  }
});
