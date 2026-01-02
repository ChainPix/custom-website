import { expect, test } from "@playwright/test";
import { performance } from "node:perf_hooks";
import { computeNextRuns, getCronDiagnostics, getCronParts, normalizeExprForMode } from "../lib/cron-tester";

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

test("computeNextRuns returns deterministic next runs in UTC", () => {
  const result = computeNextRuns("*/5 9-17 * * 1-5", 3, false, "UTC", fixedDate);
  expect(result.error).toBe("");
  expect(result.dates).toHaveLength(3);
  const iso = result.dates.map((date) => date.toISOString()).join("\n");
  expect(iso).toMatchSnapshot("cron-next-runs.txt");
});

test("diagnostics identify invalid token and allowed values", () => {
  const diag = getCronDiagnostics("0 25 * * *", false);
  expect(diag).not.toBeNull();
  expect(diag?.fieldLabel).toBe("Hour");
  expect(diag?.token).toBe("25");
  expect(diag?.allowed).toContain("0-23");
  expect(diag?.suggestion).toContain("*/5");
});

test("property-based: generated cron strings round-trip to parts", () => {
  const rng = mulberry32(1337);
  for (let i = 0; i < 100; i += 1) {
    const expr = [
      randomField(rng, 0, 59),
      randomField(rng, 0, 23),
      randomField(rng, 1, 31),
      randomField(rng, 1, 12),
      randomField(rng, 0, 6),
    ].join(" ");
    const normalized = normalizeExprForMode(expr, false);
    const parts = getCronParts(normalized, false);
    expect(parts).not.toBeNull();
    const rebuilt = `${parts?.minField} ${parts?.hourField} ${parts?.domField} ${parts?.monField} ${parts?.dowField}`;
    expect(normalized).toBe(rebuilt);
    const result = computeNextRuns(normalized, 2, false, "UTC", fixedDate);
    expect(result.error).toBe("");
    expect(result.dates.length).toBe(2);
  }
});

test("snapshot: known cron examples", () => {
  const examples = [
    { expr: "0 * * * *", label: "hourly" },
    { expr: "15 6 1 * *", label: "first-of-month" },
    { expr: "*/10 9-17 * * 1-5", label: "work-hours" },
  ];
  const snapshots = examples.map(({ expr, label }) => {
    const result = computeNextRuns(expr, 2, false, "UTC", fixedDate);
    return { label, expr, runs: result.dates.map((date) => date.toISOString()) };
  });
  const payload = JSON.stringify(snapshots, null, 2);
  expect(payload).toMatchSnapshot("cron-examples.json");
});

test("performance: worst-case expressions resolve quickly", () => {
  const start = performance.now();
  const result = computeNextRuns("*/1 * * * *", 500, false, "UTC", fixedDate);
  const duration = performance.now() - start;
  expect(result.error).toBe("");
  expect(duration).toBeLessThan(1500);
});
