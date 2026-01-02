# UUID Generator – Assessment & Plan

## Current State (after improvements)
- Functionality: Supports v1/v4/v5/v7 UUIDs with namespace/name + bulk v5 generation, uniqueness checks, history (last 5), and format/output separators.
- UX: Count input validation with friendly errors, toast feedback, auto-generate toggle, per-UUID copy, and privacy warning for v1.
- Error handling: Guarded against NaN/out-of-range counts with inline alerts.
- Accessibility: `aria-live` status/error region; output labeled as a region; buttons clearly titled.
- SEO: Page metadata plus FAQPage JSON-LD; on-page FAQ guidance.
- Testing: Manual checklist added in `TESTING.md` with sample values.

## UUID_GENERATOR note
- Added multi-version UUID support (v1/v4/v5/v7), v5 namespace + bulk mode, uniqueness checks, and a 5-item history panel with restore/copy.
- Added v4 fallback RNG, clipboard fallback with selection guidance, and delayed download URL revoke.
- Added keyboard shortcuts, focusable output with click-to-select, and improved screen-reader announcements for copy/generate status.
- Extracted UUID helpers into pure functions and added unit + Playwright coverage for formatting, count clamping, v5 determinism, copy/download, and invalid count handling.
- Added shareable query param links, an API mode teaser, related tool links, and a "Why v7?" explainer section.
- Refined count input handling to keep invalid values out of state and refreshed UUID page metadata copy.

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
