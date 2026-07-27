import { test, expect } from "@playwright/test";

test("qr generator sample load renders preview", async ({ page }) => {
  await page.goto("/qr-generator");
  await page.getByRole("button", { name: /sample url/i }).click();
  await expect(page.getByAltText(/generated qr code/i)).toBeVisible();
});

test("invalid url blocks generation and download", async ({ page }) => {
  await page.goto("/qr-generator");
  await page.getByLabel(/validate as url/i).check();
  const textarea = page.getByPlaceholder(/paste text or url/i);
  await textarea.fill("not a url");
  // The message also appears in an sr-only live region; target the visible alert.
  await expect(page.getByRole("alert").filter({ hasText: /valid url/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download QR code as PNG" })).toBeDisabled();
});

test("download enabled after qr generated", async ({ page }) => {
  await page.goto("/qr-generator");
  const textarea = page.getByPlaceholder(/paste text or url/i);
  await textarea.fill("https://example.com");
  await expect(page.getByAltText(/generated qr code/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Download QR code as PNG" })).toBeEnabled();
});
