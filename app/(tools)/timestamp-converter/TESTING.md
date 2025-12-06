# Timestamp Converter – Manual Test Checklist

## Core Scenarios
- **Seconds vs ms**: Enter `1700000000` (seconds) with ms off → valid; toggle ms on/off to confirm behavior. Enter a ms-looking value (e.g., `1700000000000`) → ms on shows valid, warning when ms off.
- **Invalid timestamp**: Enter non-numeric text or empty → shows friendly error, no crash.
- **Invalid date**: Clear date input or enter bad value → error shown, timestamps cleared.
- **UTC toggle**: Switch UTC on/off and verify displayed date changes label/format.
- **Format selector**: Switch ISO/locale formats and verify output updates.
- **Relative time**: Enter a near-future and near-past timestamp and see relative text update.
- **Large value warning**: Very large timestamp shows warning and still handles gracefully.

## Actions
- **Copy/Download (date)**: With valid date, copy/download buttons work and status updates.
- **Copy/Download (ts sec/ms)**: With valid timestamps, copy/download buttons work and status updates.
- **Presets**: “Now” buttons set current time; ms toggle resets as expected.

## Accessibility
- `aria-live` announces status/warnings/errors.
- Input/output regions labeled; buttons have aria-labels; focus-visible styles remain.

## Regression checks
- Toggling UTC or format does not lose input values.
- Status resets appropriately after errors and subsequent valid entries.
- Trimmed timestamp input handles leading/trailing spaces.
