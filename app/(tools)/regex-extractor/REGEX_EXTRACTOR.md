# Regex Extractor – Assessment & Plan

## Current state (after improvements)
- Features: Sample buttons (emails/URLs), swap pattern/text, escape helper; forced global with flags i/m/s; size guard/truncation; matches table with headers (Match/Index/Groups), match counts; copy/download results (JSON/CSV) and copy pattern; warnings for invalid/empty pattern and no matches.
- Performance: Debounced pattern/text input and worker-based extraction so typing and large scans stay responsive; group header count is computed once and reused.
- Errors: Regex parser errors surface the actual JS message (sanitized) instead of a generic invalid pattern notice.
- UX: Results rows jump the highlighted preview of the source text; named capture groups render by name when present, falling back to numbered group columns.
- Workbench: Added Extract/Replace/Split modes with output panels plus a lightweight regex explain section and cheat sheet.
- Sharing: Presets saved to localStorage, shareable URL parameters for pattern/flags/text, and import/export session JSON for team handoff.
- Safety + UX: Optional RE2 safe engine toggle, plus filter/sort/unique/pagination controls and column-copy for large result sets.
- Verification: Parsing is pure (no state set in memo), flags are deterministic with g forced, inputs are debounced, max group count is memoized, and match highlighting supports click-to-jump.
- Accessibility: `aria-live` status, labeled results region, aria-labels on controls; status badge on copy.
- Validation: Inline warnings for invalid/empty pattern; caps matches (500) and warns on large input (~30k chars).
- Content/SEO: Page metadata, on-page How-to + FAQ with privacy note, FAQPage JSON-LD added.

## Remaining gaps / next ideas
- Optional literal toggle (treat pattern as plain text) instead of manual escape.
- Allow custom match cap and show “show more” for truncated results.
- Add path filter/search for matches content and highlight search term in results.

## Testing
- Valid pattern finds matches and groups; invalid/empty pattern shows inline warning.
- Sample buttons populate pattern/text; reset clears; swap works.
- Copy/download results works (JSON/CSV); copy pattern works.
- Size guard warns on large input; truncation warning appears at 500 matches.
- Accessibility: aria-live announces status; results region labeled; controls have aria-labels.
