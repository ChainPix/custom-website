# UUID Generator – Assessment & Plan

## Current State (after improvements)
- Functionality: Generates up to 50 v4 UUIDs with format + output separators, copy-all/download, per-UUID copy, and a sample loader.
- UX: Count input validation with friendly errors, toast feedback, auto-generate toggle, and privacy note. Clear resets output; sample preloads known UUIDs.
- Error handling: Guarded against NaN/out-of-range counts with inline alerts.
- Accessibility: `aria-live` status/error region; output labeled as a region; buttons clearly titled.
- SEO: Page metadata plus FAQPage JSON-LD; on-page FAQ guidance.
- Testing: Manual checklist added in `TESTING.md` with sample values.

## UUID_GENERATOR note
- Added auto-generate toggle, quick generate buttons, format + separator dropdowns, per-UUID copy, and toast feedback for copy/generate actions.

## Immediate Plan ✅
- Validate count input (numeric, default fallback) and add friendly error/warning for invalid/empty values.
- Add `aria-live` status, label output as a region, and keep buttons clearly labeled.
- Add options: uppercase toggle, include/exclude dashes, and copy/download outputs.
- Add a sample button and a short FAQ/guidance (with optional FAQPage JSON-LD).
- Provide a manual test checklist in this folder.

## Future Ideas
- Bulk export to file; per-line copy.
- Deterministic/seeded UUIDs (v5 with namespace/name) if needed.
- Playwright smoke test for generation, options, copy/download, and validation.
