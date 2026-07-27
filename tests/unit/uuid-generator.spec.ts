import { expect, test } from "vitest";
import { formatUuid, generateUuids, normalizeCount } from "../../lib/uuid-generator";

const SAMPLE_UUID = "2c2e5bfe-7a6f-4d3e-9cb7-8f9c6c4a53c1";

test("normalizes count within bounds", async () => {
  expect(normalizeCount(0)).toBe(1);
  expect(normalizeCount(99)).toBe(50);
  expect(normalizeCount(12)).toBe(12);
  expect(normalizeCount(Number.NaN)).toBe(5);
});

test("formats UUID casing and dashes", async () => {
  expect(formatUuid(SAMPLE_UUID, { format: "upper-dash" })).toBe(SAMPLE_UUID.toUpperCase());
  expect(formatUuid(SAMPLE_UUID, { format: "lower-dash" })).toBe(SAMPLE_UUID.toLowerCase());
  expect(formatUuid(SAMPLE_UUID, { format: "upper-nodash" })).toBe(SAMPLE_UUID.replace(/-/g, "").toUpperCase());
  expect(formatUuid(SAMPLE_UUID, { format: "lower-nodash" })).toBe(SAMPLE_UUID.replace(/-/g, "").toLowerCase());
});

test("generates deterministic v5 UUIDs", async () => {
  const list = generateUuids(1, {
    version: "v5",
    namespace: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    name: "example.com",
  });
  expect(list).toEqual(["cfbff0d1-9375-5685-968c-48ce8b15ae17"]);
});
