import { expect, test } from "@playwright/test";
import { performance } from "node:perf_hooks";
import { parseExpression } from "cron-parser";
import { computeNextRuns } from "../lib/cron";

const fixedDate = new Date("2025-01-01T00:00:00.000Z");

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(rng: () => number, items: T[]) => items[Math.floor(rng() * items.length)];

const randomInt = (rng: () => number, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

const randomList = (rng: () => number, min: number, max: number, count: number) => {
  const set = new Set<number>();
  while (set.size < count) {
    set.add(randomInt(rng, min, max));
  }
  return Array.from(set).sort((a, b) => a - b).join(",");
};

const randomField = (rng: () => number, min: number, max: number) => {
  const mode = pick(rng, ["*", "range", "list", "step", "single"]);
  if (mode === "*") return "*";
  if (mode === "step") {
    const step = randomInt(rng, 2, Math.min(10, max - min + 1));
    return `*/${step}`;
  }
  if (mode === "range") {
    const start = randomInt(rng, min, max - 1);
    const end = randomInt(rng, start + 1, max);
    return `${start}-${end}`;
  }
  if (mode === "list") {
    const count = randomInt(rng, 2, 4);
    return randomList(rng, min, max, count);
  }
  return String(randomInt(rng, min, max));
};

test("parser edge cases: valid expressions return runs", () => {
  const expressions = ["*/5 * * * *", "1-10/2 * * * *", "*/15,7 * * * *", "0 0 1 1 0", "59 23 31 12 6"];
  for (const expr of expressions) {
    const result = computeNextRuns(expr, 3, false, "UTC", fixedDate);
    expect(result.error).toBe("");
    expect(result.dates).toHaveLength(3);
  }
});

test("parser edge cases: invalid step or range rejected", () => {
  const expressions = ["*/0 * * * *", "60 * * * *", "0 24 * * *"];
  for (const expr of expressions) {
    const result = computeNextRuns(expr, 1, false, "UTC", fixedDate);
    expect(result.error).not.toBe("");
  }
});

test("property-based: results always match the expression", () => {
  const rng = mulberry32(4242);
  for (let i = 0; i < 120; i += 1) {
    const expr = [
      randomField(rng, 0, 59),
      randomField(rng, 0, 23),
      randomField(rng, 1, 31),
      randomField(rng, 1, 12),
      randomField(rng, 0, 6),
    ].join(" ");
    const result = computeNextRuns(expr, 2, false, "UTC", fixedDate);
    expect(result.error).toBe("");
    for (const date of result.dates) {
      const iterator = parseExpression(expr, { currentDate: new Date(date.getTime() - 1000), tz: "UTC" });
      const next = iterator.next().toDate();
      expect(next.toISOString()).toBe(date.toISOString());
    }
  }
});

test("property-based: parser never hangs on valid inputs", () => {
  const rng = mulberry32(9001);
  const start = performance.now();
  for (let i = 0; i < 150; i += 1) {
    const expr = [
      randomField(rng, 0, 59),
      randomField(rng, 0, 23),
      randomField(rng, 1, 31),
      randomField(rng, 1, 12),
      randomField(rng, 0, 6),
    ].join(" ");
    const result = computeNextRuns(expr, 1, false, "UTC", fixedDate);
    expect(result.error).toBe("");
  }
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1500);
});

test("performance: sparse cron still returns quickly", () => {
  const start = performance.now();
  const result = computeNextRuns("0 0 1 1 *", 3, false, "UTC", fixedDate);
  const duration = performance.now() - start;
  expect(result.error).toBe("");
  expect(result.dates).toHaveLength(3);
  expect(duration).toBeLessThan(1000);
});
