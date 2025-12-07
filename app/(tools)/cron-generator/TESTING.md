# Cron Generator – Manual Test Checklist

## Validation & fields
- Empty/invalid chars trigger warnings; copy/download buttons disable until resolved.
- Toggle 5-field vs 6-field (seconds) and ensure cron string updates.
- Overlength expressions (>80 chars) warn.

## Presets
- Each preset (Every 5m, Hourly, Daily 2am, Weekdays 9-5, First of month) populates fields correctly.
- Copy cron/summary reflect the preset values.

## Next runs
- Next runs show 5 upcoming times; toggle UTC updates display (values change).
- With seconds enabled, step respects seconds (advance 1s); without, advances by minutes.

## Copy/Download
- Copy cron and copy summary place correct text on clipboard.
- Download JSON file contains cron, fields, summary, and timezone flag.

## Accessibility
- `aria-live` announces errors/status and copy actions.
- Inputs/buttons have aria-labels; focus-visible outlines present.
- Result/preview area is reachable via keyboard.
