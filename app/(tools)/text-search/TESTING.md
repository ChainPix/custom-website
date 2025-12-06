# Text Search – Manual Test Checklist

## Core Scenarios
- **Plain search**: Query "tool" on sample text; matches highlight, count updates.
- **Regex search**: Switch to regex mode; pattern `\btext\b` finds whole words; invalid pattern `([` shows error without crash.
- **Case sensitivity / whole word**: Toggle and verify counts change appropriately.
- **Large input warning**: Paste >120k characters; warning appears, UI remains responsive.
- **Auto-run vs manual**: Turn off auto-run, change query/text, click Run to refresh matches; debounce on/off works with auto-run.
- **Replace**: Enable replace, set replacement, click Replace all; text updates and matches adjust.

## Actions
- **Copy matches**: With results, Copy matches writes matches to clipboard and status updates.
- **Download JSON**: Download button saves `text-search-matches.json` containing match/index/context entries.
- **Navigation**: Prev/Next buttons move active match and status updates; active row is highlighted.

## Accessibility
- aria-live status announces errors/warnings/actions.
- Regions labeled for controls, preview, and snippets; inputs/buttons have aria-labels.

## Regression checks
- Empty query/text shows guidance but no crash.
- Invalid regex handled gracefully.
- Replace disabled when toggle off or query empty.
