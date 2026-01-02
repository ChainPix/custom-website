# JSON Diff – Assessment & Plan

## Quick note
- Fixed path escaping for dot-keys, refreshed metadata copy, and kept the shared diff engine + tests aligned.

## Current state
- Features: Compare two JSON objects; highlight added/removed/changed/same entries by path; basic array rejection; simple clear buttons.
- UI: Two textareas; diff list with color cues.
- Validation: Minimal (invalid JSON → generic error; arrays rejected).
- Accessibility: No `aria-live` status, no labeled diff region, controls lack explicit aria-labels; no copy/download.
- UX gaps: No sample buttons, no pretty-print/indent option, no swap sides, no path filter/search, no grouping/collapse, no ignore toggles (order/case/nulls), no counts.
- Content/SEO: Page metadata present; no on-page How-to/FAQ, no privacy note, no JSON-LD.

## Immediate improvement plan
1) **UX & actions**
   - Add sample JSON buttons (small objects) and “Swap sides.”
   - Add copy/download for diff results and normalized inputs; optional pretty-print toggle.
   - Add ignore options (e.g., ignore order for arrays, ignore case for string comparisons, ignore nulls) where feasible.
   - Add path filter/search box; group diffs by type with counts; optional collapse/expand sections.
2) **Validation & feedback**
   - Inline, clear errors for invalid JSON or arrays; show status text.
   - Warn on very large inputs and consider truncating diff output with a notice.
3) **Accessibility**
   - Add `aria-live` status for parse/diff/copy; label diff output region; aria-labels for inputs/buttons; keep focus-visible styles.
4) **Content/SEO**
   - Add How-to + FAQ with privacy note (“diff runs locally in your browser”).
   - Inject FAQPage JSON-LD in page metadata.

## Testing (add TESTING.md)
- Valid JSON objects diff shows added/removed/changed.
- Invalid JSON shows inline error; arrays rejected with clear message.
- Sample buttons populate inputs; swap works.
- Copy/download of diff and inputs works; ignore toggles and pretty-print behave as expected.
- Accessibility: aria-live announces status; diff region is labeled.
