import { expect, test } from "@playwright/test";

test("nanoid generator copy/download availability states", async ({ page }) => {
  await page.goto("/nanoid-generator");

  // Buttons carry aria-labels, which override the visible text as accessible name.
  const copyAllButton = page.getByRole("button", { name: "Copy generated IDs", exact: true });
  const copyJsonButton = page.getByRole("button", { name: "Copy generated IDs as JSON" });
  const saveButton = page.getByRole("button", { name: "Download generated IDs" });

  await expect(copyAllButton).toBeDisabled();
  await expect(copyJsonButton).toBeDisabled();
  await expect(saveButton).toBeDisabled();

  await page.getByRole("button", { name: "Generate NanoIDs" }).click();

  await expect(copyAllButton).toBeEnabled();
  await expect(copyJsonButton).toBeEnabled();
  await expect(saveButton).toBeEnabled();
});
