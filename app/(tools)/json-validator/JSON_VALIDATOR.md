# JSON Validator – Assessment & Plan

## Current State (observed)
- Functionality: Validate JSON via `JSON.parse`; pretty-print formatted output; copy (input or output). Clear button and initial sample. Client-side only.
- UX: No line/column error surface; no schema validation; no sample buttons beyond default state; no download; no input size guard; no trimming option; no debounce/auto-run toggle; no highlight of errors or matched braces.
- Validation: Generic error message; no pointer to line/column; does not handle trailing commas/comments; no optional JSON5 mode.
- Accessibility: No `aria-live` for status/errors; buttons lack aria labels; output not labeled as a region; no status for copy action.
- SEO/Content: Metadata present; no on-page how-to/FAQ/privacy note; no structured data.
- Testing: No manual checklist or sample files; no automation.

## Immediate Improvement Plan
- ✅ Validation & feedback: Add `aria-live` status; show line/column for parse errors; optional trim input toggle; warn on large input; optional JSON5 mode toggle; show status on copy/download.
- ✅ UX: Add sample JSON buttons; download formatted output; add auto-validate toggle with manual validate; show before/after size (chars/lines) to highlight prettify; optional schema validation placeholder messaging for future.
- ✅ Accessibility: Label inputs/buttons, output region; announce errors/status; maintain focus-visible styles.
- ✅ SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- ✅ Testing: Add `TESTING.md` with manual steps (valid JSON, invalid with line/column, large input warning, trim toggle, JSON5 toggle if added, copy/download).

## JSON_VALIDATOR Note
- Validation now derives from a single `lastValidatedInput`, with auto-validate debounced (300ms) and manual validate updating that input directly.

## Future Ideas
- Add JSON5 parsing and switch; add JSON schema validation using AJV; show error path; highlight offending lines in input.
- Add diff view between input and formatted output; add merge/minify option.
- Add file upload/download with size/type validation and drag-drop overlay.
- Add key sorting toggle; add minify/pretty toggle; add Playwright smoke tests.
