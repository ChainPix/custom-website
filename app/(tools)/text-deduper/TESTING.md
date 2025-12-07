# Text Deduper – Manual Test Checklist

## Validation & input handling
- Empty input: shows warning and prevents copy/download.
- Overlength input (>50k chars) shows length warning.
- Trim toggle: with trim ON, trailing/leading spaces removed; OFF preserves spacing in output.
- Keep blank lines toggle: blanks preserved when ON; removed when OFF.

## Dedupe logic
- Case-insensitive ON: `Apple` and `apple` merge; OFF keeps both.
- Normalize whitespace ON: multiple spaces collapse and trim applied.
- Sort toggle: output sorted alphabetically when ON; preserves order when OFF.
- Counts display (lines, unique, removed) update correctly with toggles.

## Actions
- Copy output copies deduped text; copy input copies raw input.
- Download saves `deduped.txt` with current output.

## Samples
- Loading names/emails/URLs samples populates input and dedupes accordingly.

## Accessibility
- `aria-live` announces status/errors and copy actions.
- Output region labeled; controls have aria-labels; focus-visible outlines present.
- Keyboard-only navigation can reach all controls and actions.
