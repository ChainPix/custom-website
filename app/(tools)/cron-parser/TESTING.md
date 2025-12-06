# Cron Parser – Manual Test Checklist

## Core Scenarios
- **Valid 5-field cron**: `*/5 * * * *` parses, shows summary, and lists next 6 runs.
- **Invalid field**: Use `61 * * * *` → minutes field error surfaces, no crash.
- **5 vs 6 fields**: Toggle seconds on, set `*/10 * * * * *` parses; toggle off and ensure it expects 5 fields.
- **Large iteration guard**: Use a very sparse cron (e.g., `0 0 1 1 *`) and confirm it returns runs without hanging; safety message if no occurrences before cap.
- **UTC toggle**: Switch UTC on/off and verify timestamps change labels accordingly.

## Actions
- **Copy/Download runs**: After parsing, Copy writes runs to clipboard; Download saves `cron-runs.txt` and updates status.
- **Reset**: Reset returns default expression and clears runs/status.

## Accessibility
- `aria-live` status announces errors/warnings/actions.
- Input/options and output regions are labeled; buttons have aria-labels.

## Regression checks
- Summary updates correctly when toggling seconds or changing expression.
- Warning cleared on valid input; error does not block further parses once fixed.
