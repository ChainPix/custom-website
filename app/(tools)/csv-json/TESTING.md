# CSV ⇄ JSON Converter – Manual Test Checklist

## Functional
- CSV → JSON: convert sample CSV (with headers) and verify JSON array matches rows/columns.
- JSON → CSV: convert sample JSON array and verify headers and rows match keys.
- Auto-convert toggle: when enabled, edits re-run conversion; when disabled, conversion waits for button press.
- Strict mode: uneven columns should error with a clear row/column count message.
- Trim/Strip toggles: trimming removes surrounding whitespace; strip removes wrapping quotes.
- Copy input/output: buttons copy respective text to clipboard; clear output empties output pane.
- Download: outputs save as `.json` or `.csv` depending on direction.

## Validation & Limits
- Empty/whitespace input → no crash; output cleared.
- Row guard: inputs over 20,000 rows show the limit error; large inputs (5k+ lines) show warning and progress text.
- File upload: reject files >10MB; load valid CSV/JSON; status updates to “File loaded.”
- JSON parsing: invalid JSON shows line/column in error; array required for JSON → CSV.

## Accessibility
- `aria-live` announces status/error; output is a labeled region.
- Upload button is keyboard reachable and announces state.
- Tab through controls, convert, copy, download, and FAQ.

## Sample Inputs
- CSV sample: `name,role,team` rows for Ada/Lin/Kai.
- JSON sample: `[{"name":"Ada","role":"Engineer","team":"ML"}, ...]`.
- Uneven CSV: one row missing a column (should fail in strict mode).
- Large input: repeat rows to exceed 5,000 lines to see warning; exceed 20,000 to trigger guard.
