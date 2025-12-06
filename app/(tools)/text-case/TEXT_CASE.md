# Text Case Converter – Assessment & Plan

## Current State (observed)
- Functionality: Converts input to camel, pascal, snake, kebab, title, upper, and lower. Copy per case; highlight selected case. Clear input button. Lightweight splitter handles underscores, hyphens, and camel splits.
- UX: No sample input; no bulk copy/download; no trim/normalize options; no sentence case or capitalized-words mode; no search/filter among cases. No toggle to show only selected case vs all. No “copy all outputs”.
- Validation: No length guard; no whitespace trimming toggle; no feedback on copy status except button text; empty input still renders “Converted text will appear here.”
- Accessibility: No `aria-live` status, output regions not labeled; radio/select lacks descriptive text for screen readers; Copy buttons rely on icon + label only.
- SEO/Content: Basic on-page copy only; no FAQ/how-to or structured data; no privacy note.
- Testing: No manual checklist; no sample inputs documented.

## Immediate Plan
- ✅ Validation & feedback: Add `aria-live` status for copy/clear; optional trim whitespace toggle; length advisory for very large inputs.
- ✅ UX: Add sample input, “copy selected”/“copy all” options, and a toggle to show only selected case. Consider sentence case and capitalized mode. Add download output (text file).
- ✅ Accessibility: Label output sections as regions; add sr-only status region; ensure controls have labels/aria; keep focus states.
- ✅ SEO/Content: Add brief how-to/FAQ and privacy note; consider FAQPage JSON-LD in page metadata.
- ✅ Testing: Add `TESTING.md` with manual steps and sample strings (camel, snake, mixed separators).

## Future Ideas
- Add configurable custom separators; preserve acronyms (e.g., HTTP vs Http) via heuristic toggle.
- Add multi-line sentence case and proper noun handling; integrate a small profanity filter toggle if needed.
- Support batch conversion via multiline input (one item per line) with bulk copy/download.
- Add Playwright smoke test for conversions, copy, trim toggle, and show-selected toggle.
