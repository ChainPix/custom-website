import { test, expect } from "@playwright/test";

test("octal input syncs checkboxes", async ({ page }) => {
  await page.goto("/chmod-calculator");
  const octalInput = page.getByLabel("Octal input");
  await octalInput.fill("640");

  await expect(page.getByLabel("user r")).toBeChecked();
  await expect(page.getByLabel("user w")).toBeChecked();
  await expect(page.getByLabel("user x")).not.toBeChecked();
  await expect(page.getByLabel("group r")).toBeChecked();
  await expect(page.getByLabel("group w")).not.toBeChecked();
  await expect(page.getByLabel("group x")).not.toBeChecked();
  await expect(page.getByLabel("other r")).not.toBeChecked();
  await expect(page.getByLabel("other w")).not.toBeChecked();
  await expect(page.getByLabel("other x")).not.toBeChecked();
  await expect(page.getByLabel("Setuid")).not.toBeChecked();
  await expect(page.getByLabel("Setgid")).not.toBeChecked();
  await expect(page.getByLabel("Sticky bit")).not.toBeChecked();
});

test("toggles update octal output", async ({ page }) => {
  await page.goto("/chmod-calculator");
  const octalInput = page.getByLabel("Octal input");

  await page.getByLabel("other w").check();
  await expect(octalInput).toHaveValue("757");

  await page.getByLabel("Setuid").check();
  await expect(octalInput).toHaveValue("4757");
});

test("copy button writes chmod command", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/chmod-calculator");

  await page.getByRole("button", { name: /copy chmod/i }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());

  expect(clipboard).toBe("chmod 755  # rwxr-xr-x");
});
