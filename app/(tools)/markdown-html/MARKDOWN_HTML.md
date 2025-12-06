# Markdown ⇄ HTML Converter – Assessment & Plan

## Current State (observed)
- Functionality: Converts Markdown→HTML (marked) and HTML→Markdown (Turndown). Copy output, clear input/output. Simple direction toggle and textarea input.
- UX: No sample input or presets; no live preview pane for HTML; no auto-convert toggle; no download; no sanitization toggle for HTML; no option for GitHub-flavored Markdown settings. Error handling is generic.
- Validation: No size guard; no line/character warning; no empty-input messaging; no status feedback for copy/convert; no warning about HTML sanitization (XSS risk in preview).
- Accessibility: No `aria-live` for status/errors; output not labeled as a region; controls have minimal labels.
- SEO/Content: No on-page how-to/FAQ/privacy note; no structured data; metadata basic but could mention bidirectional conversion and client-side privacy.
- Testing: No manual checklist or sample inputs; no automation.

## Immediate Plan
- ✅ Validation & feedback: Add `aria-live` status, clearer errors for empty/invalid input, size advisory, and copy/convert status text.
- ✅ UX: Add sample Markdown/HTML buttons, auto-convert toggle, download output, and optional live preview for HTML result; add sanitization note/toggle if preview is added.
- ✅ Accessibility: Label output as `role="region"` with aria-labelledby; ensure file/controls have accessible labels; keep keyboard focus states.
- ✅ SEO/Content: Add how-to + FAQ and privacy note; inject FAQPage JSON-LD in page metadata.
- Testing: Add `TESTING.md` with manual steps (md→html, html→md, empty input, large input warning, copy/download).

## Future Ideas
- Add GFM options (tables, strikethrough), frontmatter passthrough toggle, and code highlighting with Prism for preview.
- Add HTML sanitization toggle and warning for unsafe tags; support paste-cleaning and minify HTML toggle.
- Worker/off-main-thread conversion for very large documents; Playwright smoke test for both directions.
