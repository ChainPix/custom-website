import { expect, test } from "@playwright/test";
import { allTools, toolPath } from "../../lib/tools";

/**
 * Smoke test over every registered tool page: the page renders an h1 and
 * produces no uncaught page errors. Guards the shared-layout refactor and
 * every future registry change.
 */
for (const tool of allTools) {
  test(`smoke: ${toolPath(tool)}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    const response = await page.goto(toolPath(tool));
    expect(response, `no response for ${toolPath(tool)}`).not.toBeNull();
    expect(
      response!.status(),
      `HTTP ${response!.status()} for ${toolPath(tool)}`
    ).toBeLessThan(400);

    await expect(page.locator("h1").first()).toBeVisible();

    expect(pageErrors, `page errors on ${toolPath(tool)}: ${pageErrors.join("; ")}`).toEqual([]);
  });
}
