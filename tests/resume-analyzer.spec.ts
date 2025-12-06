import { test, expect } from "@playwright/test";

test("resume analyzer basic flow", async ({ page }) => {
  await page.goto("/resume-analyzer");

  const textarea = page.getByLabel(/resume text input/i);
  await textarea.fill("Built and deployed Next.js apps using TypeScript and AWS. Led a team of engineers.");

  await expect(page.getByText(/Words:/)).toBeVisible();
  await expect(page.getByText(/Top keywords/)).toBeVisible();

  // Sample JD comparison
  const jdField = page.getByPlaceholder(/job description/i);
  await jdField.fill("Experience with Next.js, TypeScript, AWS, and team leadership.");

  await expect(page.getByText(/Match score:/i)).toBeVisible();
});
