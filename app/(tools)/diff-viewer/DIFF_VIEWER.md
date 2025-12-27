# Diff Viewer – Assessment & Plan

## Recent Updates
- Diff engine now uses Myers/LCS alignment with independent left/right line numbers and aligned insert/delete/change blocks.
- Added collapsing of unchanged blocks with configurable context (0/3/10 lines).
- Added whitespace controls (trailing/all/indentation ignore, line ending normalization, tabs as spaces).
- Side-by-side view now renders empty placeholders for missing lines to keep alignment.
- Inline diff now uses LCS token alignment with a char-level fallback and clearer removed/added highlights.

## Current State (observed)
- Functionality: Two textareas (Original/Changed) with line-by-line diff; adds/removes highlighted, unchanged lines shown; clear buttons. Runs entirely client-side.
- Algorithm: Myers/LCS diff with aligned insert/delete/change blocks, inline word highlight option, whitespace/trim controls, copy/download helpers.
- UX: No sample inputs, no inline guidance, no “swap” button, no side-by-side line numbers, no density/contrast toggle, no clipboard/export helpers.
- Validation: No size guard for very large inputs; no feedback if inputs are empty; no error/status messaging beyond the visual diff.
- Accessibility: Textareas lack explicit labels/aria-describedby; no `aria-live` status; diff region not labeled as a region; buttons lack aria-labels for screen readers.
- Performance: Diff recomputes on every keystroke; no debounce or warning for huge payloads.
- SEO/Content: Basic metadata only; no how-to/FAQ/privacy note; no structured data.
- Testing: No manual checklist or sample cases.

## Immediate Improvement Plan
- ✅ Validation & feedback: `aria-live` status region, warnings for empty/very large inputs, trim/ignore-whitespace toggle.
- ✅ UX: Sample inputs, swap button, copy/download as text/JSON, inline word-level highlight toggle, line numbers & counts, unified vs side-by-side toggle.
- ✅ Accessibility: Label both textareas and diff output as regions; add aria-labels for buttons; ensure focus-visible styles remain; announce copy/download status.
- ✅ SEO/Content: Added how-to, FAQ, privacy note (client-side only), and FAQPage JSON-LD in page metadata.
- Testing: Add `TESTING.md` with manual scenarios (small diff, large diff warning, whitespace-ignore toggle, copy/download, swap, accessibility checks).

## Future Ideas
- Collapsed unchanged blocks for large diffs.
- File upload (txt/patch) with size/type validation and drag-drop overlay.
- Syntax highlighting for common formats (JSON/Markdown) with pretty-print toggle.
- Persist last inputs in localStorage (opt-in) and add history of recent diffs.
- Add performance guard to offload heavy diffs to a worker for very large files.
