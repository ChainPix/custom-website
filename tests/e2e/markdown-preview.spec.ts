import { test, expect } from "@playwright/test";

test("markdown preview core flows", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/markdown-preview");

  const input = page.getByLabel("Markdown input");
  await input.fill("# Title\n\nHello");

  await page.getByRole("button", { name: "Copy rendered HTML" }).click();
  await expect(page.getByText("Copied HTML")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel("Download HTML").click();
  const download = await downloadPromise;
  expect(await download.suggestedFilename()).toMatch(/markdown\.html/i);

  const sanitizeToggle = page.getByLabel("Sanitize HTML (recommended)");
  await sanitizeToggle.uncheck();
  await expect(page.getByText("Sanitize off")).toBeVisible();

  const largeInput = "a".repeat(21000);
  await input.fill(largeInput);
  await page.getByRole("region", { name: /preview/i }).click();
  // Exact match: the sr-only live region concatenates status + warning text.
  await expect(page.getByText("Large input; preview truncated for performance.", { exact: true })).toBeVisible();
});
