import { expect, test } from "@playwright/test";

test("nanoid generator copy/download availability states", async ({ page }) => {
  await page.goto("/nanoid-generator");

  const copyAllButton = page.getByRole("button", { name: /copy all/i });
  const copyJsonButton = page.getByRole("button", { name: /copy json/i });
  const saveButton = page.getByRole("button", { name: /save file/i });

  await expect(copyAllButton).toBeDisabled();
  await expect(copyJsonButton).toBeDisabled();
  await expect(saveButton).toBeDisabled();

  await page.getByRole("button", { name: /generate/i }).click();

  await expect(copyAllButton).toBeEnabled();
  await expect(copyJsonButton).toBeEnabled();
  await expect(saveButton).toBeEnabled();
});
