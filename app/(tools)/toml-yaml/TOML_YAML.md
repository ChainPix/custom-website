# TOML ⇄ YAML Converter – Assessment & Plan

## Current State (observed)
- Functionality: Converts TOML ⇄ YAML with presets (Kubernetes/GitHub/Minimal/Stable), YAML indent/schema, sort keys, auto-convert, file upload, size warnings, swap, diff view, sample gallery, and copy/download variants. Strict TOML output uses `@iarna/toml` with an optional Basic TOML mode for the custom serializer.
- Error handling: Better TOML/YAML errors with line/column; warns on large input; mixed-array errors in strict TOML. File type/size validation is enforced on upload/drag-drop.
- UX: Converter UI with Monaco editors (syntax highlighting), side-by-side layout, diff toggle, auto-detect format suggestion, round-trip warning for YAML → TOML, FAQ section, and explicit client-side privacy note. FAQ JSON-LD is in `app/(tools)/toml-yaml/page.tsx`.
- Accessibility: Labels plus `aria-live` status/error updates; output region uses `aria-busy` and labeled region semantics.
- Performance: Worker conversion for large inputs with progress and cancel, plus smarter auto-convert debounce.
- Testing: No manual checklist or sample files in folder; no automation.
- SEO: Page metadata plus FAQ structured data.

## Notes (Jan 2025)
- TOML serializer now quotes complex keys, clamps bigint values to 64-bit range, uses friendlier string styles, and tolerates mixed arrays by emitting array-of-tables with `value` for primitives.
- Conversion state is now managed with a reducer to keep status/error/output transitions consistent and avoid stale auto-convert closures.
- Drag/drop upload now reuses a shared file loader instead of simulating input events.
- Current state section refreshed to reflect existing drag/drop, FAQ, a11y, and structured data features.
- YAML schema selection added (JSON-safe vs full), and TOML output now defaults to `@iarna/toml` with a Basic TOML toggle for the custom serializer.
- Added Monaco editors, auto-detect format suggestion, swap control, diff view, and round-trip warning for YAML → TOML.
- Added worker-based conversion with progress/cancel controls and smarter auto-convert debounce for large inputs.
- Added format presets, sample gallery, copy variants, and surfaced path-aware serialization errors.

## Immediate Plan ✅
- Add `aria-live` status/errors and label outputs as regions; add a client-side-only/privacy note.
- Add sample inputs and manual test checklist + sample TOML/YAML files in `test-data/`.
- Add drag-and-drop upload with type/size validation feedback.
- Add short FAQ/guidance and optional FAQPage JSON-LD.
- Consider download/copy buttons consistency and clearer error messages for invalid file types.

## Future Ideas
- Auto-detect input format; two-pane view for both formats.
- Worker offload for large inputs; chunked parsing.
- Playwright smoke test for conversions, options, file upload, and errors.
