# Code Minifier – Assessment & Plan

## Current State (observed)
- Functionality: Single textarea input, minify/pretty-print toggle for HTML/CSS/JS with lightweight regex-based transforms; copy output; clear button. Fully client-side.
- UX: No sample input; no size guard or performance warning; no counts of chars/lines saved; no download option; no diff view of before/after; no error messaging beyond empty input; no replace of tabs/spaces choice.
- Validation: Minimal; invalid JS/CSS/HTML not handled; regex minifier may break edge cases (e.g., inline scripts/styles, strings with `//`); no sanitization warning.
- Accessibility: No `aria-live` for status/errors; inputs/buttons lack explicit aria-labels; output region not labeled; focus-visible styles implicit only.
- SEO/Content: Basic metadata only; no on-page how-to/FAQ/privacy note; no structured data.
- Testing: No manual checklist or sample cases; no automation.

## Immediate Improvement Plan
- ✅ Validation & feedback: Add `aria-live` status/errors; warn on empty input; add size guard for very large inputs; note that minifier is lightweight and may alter code.
- ✅ UX: Add sample input buttons (HTML/CSS/JS); show before/after counts (chars/lines and % reduction); add download output and copy status; optional tabs/spaces for pretty mode; optional “strip comments” toggle; optional “normalize whitespace” toggle.
- ✅ Accessibility: Label controls and output region; aria-labels for buttons; announce copy/download; maintain focus-visible styles.
- ✅ SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- ✅ Testing: Add `TESTING.md` with manual steps (minify/pretty per language, large input warning, strip comments toggle, copy/download).

## Future Ideas
- Use a more robust parser/minifier (e.g., terser/clean-css/html-minifier) optionally via web workers for large inputs.
- Add side-by-side diff view (before vs after) and “undo last”.
- Support file upload/download with type/size validation and drag-drop overlay.
- Add language auto-detect; remember last settings in localStorage (opt-in).
- Add batch mode for multiple files; add Prettier-based formatting option for more predictable pretty-print.

## Update Note
- Added Safe Mode (default on), undo history (last 10), auto-detect language, diff view, keyboard shortcuts, and smarter downloads with correct extensions + optional filename.
- Replaced regex-based formatting with real engines: Prettier (format), Terser (JS), csso (CSS), and html-minifier-terser (HTML).
