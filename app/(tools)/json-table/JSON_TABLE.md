# JSON Table Viewer – Assessment & Plan

## Current state (after improvements)
- Features: Flat/nested samples, copy CSV/JSON, download CSV/JSON, filter, sort by headers, row limit with truncation notice, column visibility toggles, row/column summary, swap/reset, status/aria-live, warnings for large input, pretty/minify toggle.
- Validation: Inline errors for invalid/non-array JSON; warns when input > ~40k chars; truncation message when row limit hit.
- Accessibility: aria-live status, table region labeled, aria-labels on controls, summary and empty states improved.
- Content/SEO: Page metadata plus on-page How-to + FAQ with privacy note; FAQPage JSON-LD added.
- UI: Pretty/minify button now reflects the action (minify when pretty mode is on, pretty-print when off).
- Sorting: Type-aware ordering for numbers/strings/booleans/arrays/objects with stable fallback.
- Filtering: Pre-indexed search strings avoid re-stringifying rows on each keystroke.
- Limits: Parsing is disabled for inputs above the MAX_CHARS threshold to avoid UI lockups.

## Remaining gaps / next ideas
- Allow expanding nested objects/arrays instead of stringifying; optional “flatten” view.
- Add pagination for very large tables; optional export respecting filters/sort/visible columns (already partially applied).
- Add custom column ordering and saved view presets.

## Testing
- Valid JSON array renders rows/columns; invalid/non-array shows inline error.
- Samples populate inputs; reset clears; copy/download JSON/CSV works.
- Sorting/filter updates table; row limit warns on truncation.
- Accessibility: aria-live announces status; table region labeled; focus/aria-labels present.
