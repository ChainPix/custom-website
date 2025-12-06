# CSV ⇄ JSON Converter – Assessment & Plan

## Current State (observed)
- Functionality: Converts CSV→JSON and JSON→CSV with configurable delimiter, header toggle, JSON indent, auto-convert, copy/download, stats, and file upload (10MB limit). Basic error messaging with line/column hints for JSON.
- UX: Single input/output; no inline samples; no schema validation; no column type handling; no toggle for trimming/quoting options; no preview of detected headers/rows; no selectable quote/escape rules.
- Validation: Warns on large input, limits file size to 10MB, but no explicit guard for malformed CSV edge cases (embedded newlines, uneven columns) beyond generic errors; no row count limit guard; auto-convert retries on every change.
- Accessibility: Buttons/inputs mostly labeled; lacks `aria-live` status/errors; output region not labeled as a region; file upload feedback relies on text only.
- Performance: Handles small/moderate inputs; no worker/off-main thread path for very large datasets; no streaming/line-by-line parsing.
- SEO/Content: Minimal on-page guidance; no FAQ or structured data; privacy note absent.
- Testing: No manual checklist or sample files referenced in docs.

## Immediate Plan
- ✅ Validation & feedback: Add `aria-live` for status/errors; clearer inline errors for uneven columns/empty lines; guard row limits; optional “strict” mode (consistent columns).
- ✅ UX: Add quick sample buttons for both directions; optional trim quotes/whitespace toggles; show detected headers/row counts; add “clear output” and “copy input” helpers.
- ✅ Accessibility: Label output as region, include status region; ensure upload has descriptive text and keyboard focus states.
- ✅ Performance: Add gentle guard for very large line counts; consider deferring heavy parse to a microtask; show progress state for large inputs.
- ✅ SEO/Content: Add brief “How to use” and FAQ; consider FAQPage JSON-LD; add privacy note (client-side only).
- Testing: Add `TESTING.md` with manual steps (CSV→JSON, JSON→CSV, uneven columns, large input warning, auto-convert toggle, file upload).

## Future Ideas
- Support configurable quote char/escape, CRLF normalization, and per-column type inference.
- Add CSV schema/headers editor with reorder/rename options.
- Worker-based parsing for very large files; streaming download for huge outputs.
- Playwright smoke test for core flows and error states.
