# TOML ⇄ YAML Converter – Assessment & Plan

## Current State (observed)
- Functionality: Converts TOML ⇄ YAML with options for indent (YAML), sort keys, auto-convert, file upload, size warnings, and copy/download. Custom TOML serializer for object arrays, nested tables.
- Error handling: Better TOML/YAML errors with line/column; warns on large input; invalid mix arrays error. No explicit warning for invalid file types beyond accept; no drag/drop. Auto-convert runs on debounce.
- UX: Encode/Decode style with options; no sample input; no FAQ; no structured data. No explicit note about client-side processing.
- Accessibility: Basic labels; no `aria-live` for status/errors; output regions not labeled as regions.
- Performance: Synchronous parsing/serialization; 10MB soft limit only for warnings; no worker.
- Testing: No manual checklist or sample files in folder; no automation.
- SEO: Page metadata only; no structured data/FAQ content.

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
