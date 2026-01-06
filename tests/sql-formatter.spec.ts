import { expect, test } from "@playwright/test";

test("sql formatter format + copy + download flow", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/sql-formatter");

  const textarea = page.getByLabel("SQL input");
  await textarea.fill("select id, name from users;");
  await page.getByRole("button", { name: /^format$/i }).click();

  const outputRegion = page.getByLabel("Formatted SQL output");
  await expect(outputRegion).toContainText("SELECT");

  await page.getByRole("button", { name: /copy output/i }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("SELECT");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("formatted.sql");
});
