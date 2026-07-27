import { test, expect } from "@playwright/test";

test("number formatter batch + compare smoke", async ({ page }) => {
  await page.goto("/number-formatter");

  await page.getByRole("button", { name: "Batch" }).click();
  await page.getByLabel("Batch input").fill("1234.5\n9876");
  const outputPanel = page.getByRole("region", { name: /formatted output/i });
  await expect(outputPanel).toContainText("1,234.5");
  await expect(outputPanel).toContainText("9,876");

  const compareRegion = page.getByRole("region", { name: /compare locales/i });
  await compareRegion.getByLabel(/compare input/i).fill("1234.56");
  await expect(compareRegion).toContainText("en-US");
});
