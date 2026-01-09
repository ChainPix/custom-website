# CSV ⇄ JSON Converter – Assessment & Plan

## Current State (observed)
- Functionality: Converts CSV→JSON and JSON→CSV with configurable delimiter, header toggle, JSON indent, auto-convert, copy/download, stats, and file upload (10MB limit). Basic error messaging with line/column hints for JSON.
- CSV parsing: Now handles quoted multiline cells, BOM in first header/value, and throws a clear error for unclosed quotes without trimming whole rows.
- Auto-convert: Debounced to avoid parsing on every keystroke for large inputs.
- Row limit: Apply line-count guard only for CSV input; JSON row limits are enforced after parsing.
- Strict mode: Row index reporting now uses the actual parsed row position (no duplicate-row confusion).
- CSV output types: Optional inference for numbers/booleans to avoid forcing every value to string.
- Headers: Duplicate or blank header names are made unique to avoid silent overwrites.
- Serious mode behavior: Added CSV preview and schema/type snapshot for deterministic inspection before converting.
- Parsing: Switched to Papa Parse for RFC-friendly CSV handling with auto delimiter detection and better errors.
- Performance: Large conversions now run in a Web Worker with an optional cancel button.
- Auto-convert: Debounced typing, immediate paste/file triggers, and pause messaging for large inputs.
- Type inference: Added empty→null, boolean mapping, date parsing, and per-column type overrides.
- Flatten/unflatten: Added JSON flattening (dot paths, array modes, explode rows) and dot-notation headers for nested CSV→JSON.
- Schema mapping: Added column mapping controls (rename/reorder/remove) with warnings for duplicate/empty headers and inconsistent rows.
- Error reporting: CSV errors now include line/column details with preview highlighting; JSON errors include a snippet.
- JSON headers: Added deterministic ordering controls (first row, alphabetical, custom) and header source options.
- CSV dialects: Added RFC4180-ish/Excel presets, line-ending control, and auto-detect delimiter support.
- Privacy: Added offline badge, paste-from-clipboard action, and clear-on-tab-close toggle (session-only).
- Column filters: Added include/exclude patterns for JSON → CSV header selection.
- Transformations: Added per-column trim/case/replace/split plus combine-columns rules in CSV → JSON.
- Validation: Added CSV shape checks, JSON required/type validation, and a quality report summary.
- Presets: Added localStorage-backed saved presets for quick config reuse.
- Performance: Added streaming output mode via worker with download-ready chunks for large conversions.
- SEO: Added richer metadata and structured data (SoftwareApplication, BreadcrumbList, HowTo, FAQ).
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
- ✅ Testing: Add `TESTING.md` with manual steps (CSV→JSON, JSON→CSV, uneven columns, large input warning, auto-convert toggle, file upload).

## Future Ideas
- Support configurable quote char/escape, CRLF normalization, and per-column type inference.
- Add CSV schema/headers editor with reorder/rename options.
- Worker-based parsing for very large files; streaming download for huge outputs.
- Playwright smoke test for core flows and error states.
