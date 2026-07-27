import { expect, test } from "@playwright/test";

test("sql formatter format + copy + download flow", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/sql-formatter");

  const textarea = page.getByLabel("SQL input");
  await textarea.fill("select id, name from users;");
  // Default keyword case is "Preserve"; opt into UPPER so casing is asserted too.
  await page.getByLabel("Keyword case").selectOption("upper");
  await page.getByRole("button", { name: "Format SQL" }).click();

  const outputRegion = page.getByLabel("Formatted SQL output");
  await expect(outputRegion).toContainText("SELECT");

  await page.getByRole("button", { name: "Copy formatted SQL" }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("SELECT");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download formatted SQL" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("formatted.sql");
});
