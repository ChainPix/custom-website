import { test, expect } from "@playwright/test";

test("seconds vs milliseconds unit conversion", async ({ page }) => {
  await page.goto("/timestamp-converter");

  const singlePanel = page.getByRole("region", { name: /timestamp to date/i });
  const tsInput = singlePanel.getByPlaceholder(/unix timestamp/i);
  const unitSelect = singlePanel.getByLabel(/unit/i);
  const formatSelect = singlePanel.getByLabel(/format/i);

  await formatSelect.selectOption("iso");

  await unitSelect.selectOption("s");
  await tsInput.fill("1");
  await expect(singlePanel.getByText("UTC time").locator("..").locator("span").nth(1)).toContainText(
    "1970-01-01T00:00:01",
  );

  await unitSelect.selectOption("ms");
  await tsInput.fill("1000");
  await expect(singlePanel.getByText("UTC time").locator("..").locator("span").nth(1)).toContainText(
    "1970-01-01T00:00:01",
  );
});

test("utc formatting output", async ({ page }) => {
  await page.goto("/timestamp-converter");
  const singlePanel = page.getByRole("region", { name: /timestamp to date/i });
  await singlePanel.getByLabel(/format/i).selectOption("iso");
  await singlePanel.getByLabel(/time zone/i).selectOption("utc");
  await singlePanel.getByPlaceholder(/unix timestamp/i).fill("0");

  const utcRow = singlePanel.getByText("UTC time").locator("..");
  await expect(utcRow).toContainText("1970-01-01T00:00:00.000Z");
});

test("round-trip date to timestamp to date", async ({ page }) => {
  await page.goto("/timestamp-converter");

  const datePanel = page.getByRole("region", { name: /date to timestamp/i });
  const dateInput = datePanel.locator('input[type="datetime-local"]');
  await dateInput.fill("2020-01-02T03:04");

  const tsSeconds = datePanel.getByText("Unix (seconds)").locator("..").getByText(/\d+/);
  const value = await tsSeconds.textContent();
  expect(value).not.toBeNull();

  const singlePanel = page.getByRole("region", { name: /timestamp to date/i });
  await singlePanel.getByLabel(/unit/i).selectOption("s");
  await singlePanel.getByPlaceholder(/unix timestamp/i).fill(value!.trim());

  const roundTripSeconds = singlePanel.getByText("Unix (seconds):").locator("..");
  await expect(roundTripSeconds).toContainText(value!.trim());
});

test("copy button writes primary output", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/timestamp-converter");
  const singlePanel = page.getByRole("region", { name: /timestamp to date/i });
  await singlePanel.getByLabel(/format/i).selectOption("iso");
  await singlePanel.getByLabel(/time zone/i).selectOption("utc");
  await singlePanel.getByLabel(/unit/i).selectOption("s");
  await singlePanel.getByPlaceholder(/unix timestamp/i).fill("1");

  await singlePanel.getByRole("button", { name: /^copy$/i }).click();

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain("1970-01-01T00:00:01.000Z");
});
