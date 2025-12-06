# JSON Validator – Manual Test Checklist

## Core Scenarios
- **Valid JSON**: Paste `{"name":"Test","items":[1,2,3]}` → validates, outputs pretty JSON, status shows success.
- **Invalid JSON with line/column**: Introduce a missing quote or trailing comma; error message surfaces without crash. (Line/column hints depend on parser message.)
- **JSON5 toggle**: Enable JSON5 mode, paste JSON with comments/trailing commas; validates; disable to confirm failure in strict mode.
- **Trim toggle**: Turn off trim, include leading/trailing whitespace; parsing still succeeds; toggle on to remove surrounding whitespace.
- **Large input warning**: Paste >200k characters; warning appears; validation still runs.

## Actions
- **Auto-validate vs manual**: Turn off auto-validate, change input, click Validate to update output; turn on to validate on change.
- **Copy/Download**: With output present, Copy updates clipboard and status; Download saves `validated.json`.
- **Samples**: Sample object/array buttons populate input and validate (if auto-validate on).

## Accessibility
- `aria-live` status announces errors/warnings/actions.
- Input/output regions and buttons have aria labels; focus-visible remains.

## Regression checks
- Clear resets input/output/status.
- Invalid input does not crash; empty input prompts guidance.
- Stats (before/after chars/lines) appear after successful validate; reset when invalid.
