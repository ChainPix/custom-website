import { expect, test } from "@playwright/test";

test("uuid generator generate copy download flow", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/uuid-generator");

  await page.getByRole("button", { name: /^generate$/i }).click();

  await page.getByRole("button", { name: /copy all/i }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toMatch(/[0-9a-f-]{36}/i);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("uuids.txt");
});

test("uuid generator flags invalid count", async ({ page }) => {
  await page.goto("/uuid-generator");

  const countInput = page.getByLabel("How many?");
  await countInput.fill("0");

  await expect(page.getByRole("alert")).toContainText("Enter a count between 1 and 50.");
});
