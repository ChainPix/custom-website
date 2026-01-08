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
- UI: Removed demo-only “Swap text” control to keep the toolbar focused on real actions.
- Export: Deterministic header ordering, CSV uses `text/csv`, optional TSV, and a flatten toggle for nested data.
- Rendering: Table preview caps displayed rows to avoid DOM churn on huge datasets.
- Data: Auto-wraps single objects, supports arrays of primitives via a `value` column, and lets users target deep arrays with a JSONPath selector.
- Columns: Search/filter columns, hide/show all, drag to reorder, pin to the left, and persist hidden/row limit/sort/input in localStorage.
- Flattening: Optional dot-notation flattening for table view with array handling modes (join, index keys, stringify).
- Display: Typed sorting for numbers, booleans, and ISO-like dates; cleaner cell rendering with null/undefined badges and truncation expansion.
- Performance: Debounced filtering, row search pre-indexing, worker parsing for large inputs, and virtualized table rendering for big datasets.
- Export: Filtered-only exports, visible-column copy for CSV/TSV, and NDJSON download support.
- Errors: Line/column error reporting with a caret preview and optional lenient parsing for trailing commas/single quotes.

## Remaining gaps / next ideas
- Allow expanding nested objects/arrays instead of stringifying; optional “flatten” view.
- Add pagination for very large tables; optional export respecting filters/sort/visible columns (already partially applied).
- Add custom column ordering and saved view presets.

## Testing
- Valid JSON array renders rows/columns; invalid/non-array shows inline error.
- Samples populate inputs; reset clears; copy/download JSON/CSV works.
- Sorting/filter updates table; row limit warns on truncation.
- Accessibility: aria-live announces status; table region labeled; focus/aria-labels present.
