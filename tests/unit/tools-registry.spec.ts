import { expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { allTools } from "../../lib/tools";

const toolsDir = path.join(process.cwd(), "app", "(tools)");

const registrySlugs = allTools.map((tool) => tool.slug.replace(/^\//, ""));

const fsSlugs = fs
  .readdirSync(toolsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(toolsDir, name, "page.tsx")));

test("registry has no duplicate slugs", () => {
  const seen = new Set(registrySlugs);
  expect(seen.size).toBe(registrySlugs.length);
});

test("every registry slug has a page under app/(tools)/", () => {
  const missing = registrySlugs.filter((slug) => !fsSlugs.includes(slug));
  expect(missing, `registry entries without a page: ${missing.join(", ")}`).toEqual([]);
});

test("every tool page under app/(tools)/ is in the registry", () => {
  const unregistered = fsSlugs.filter((slug) => !registrySlugs.includes(slug));
  expect(
    unregistered,
    `tool pages missing from lib/tools.ts: ${unregistered.join(", ")}`
  ).toEqual([]);
});

test("all slugs start with a slash and are url-safe", () => {
  for (const tool of allTools) {
    expect(tool.slug).toMatch(/^\/[a-z0-9-]+$/);
  }
});
