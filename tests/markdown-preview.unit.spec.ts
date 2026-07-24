import { test, expect } from "@playwright/test";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import {
  MAX_PREVIEW_LENGTH,
  SAMPLE_MARKDOWN,
  getWarningMessage,
  sanitizeHtml,
  truncateInput,
} from "../app/(tools)/markdown-preview/utils";

test("sanitizeHtml strips scripts and blocked URL schemes", () => {
  const window = new JSDOM("").window as unknown as Window & typeof globalThis;
  const domPurify = createDOMPurify(window) as unknown as Parameters<typeof sanitizeHtml>[1];
  const raw = `<p>safe</p><script>alert("x")</script><a href="javascript:alert(1)">bad</a>`;
  const cleaned = sanitizeHtml(raw, domPurify, true);
  expect(cleaned).toContain("<p>safe</p>");
  expect(cleaned).not.toContain("script");
  expect(cleaned).not.toContain("javascript:");
});

test("truncateInput respects MAX_PREVIEW_LENGTH and warning appears", () => {
  const longInput = "a".repeat(MAX_PREVIEW_LENGTH + 25);
  const truncated = truncateInput(longInput, MAX_PREVIEW_LENGTH);
  expect(truncated.length).toBe(MAX_PREVIEW_LENGTH);
  expect(getWarningMessage(longInput, MAX_PREVIEW_LENGTH, false)).toBe(
    "Large input; preview truncated for performance."
  );
});

test("sample markdown values are stable", () => {
  expect(SAMPLE_MARKDOWN.basic).toContain("**Bold**");
  expect(SAMPLE_MARKDOWN.code).toContain("```js");
  expect(SAMPLE_MARKDOWN.table).toContain("| Name | Role |");
});
