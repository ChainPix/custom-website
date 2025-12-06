# Text Case Converter – Manual Test Checklist

## Functional
- Input sample: “convert THIS_sample-text to Multiple Cases easily” → verify camel/pascal/snake/kebab/title/upper/lower/sentence/capitalized outputs look correct.
- Trim toggle: when on, leading/trailing whitespace removed before conversion; when off, whitespace preserved.
- Show only selected: toggles the grid to display only the chosen case.
- Copy selected/copy all: copies respective text to clipboard; copy buttons disabled if input is empty.
- Download outputs: saves text file with all cases.
- Sample loader sets input and updates outputs.

## Validation & Feedback
- Large input warning appears above 50,000 chars; status `aria-live` updates on copy/download/sample.
- Empty input → outputs show placeholder text; no crash.

## Accessibility
- `aria-live` conveys status; case select has label; outputs are labeled regions and focusable.
- Keyboard-only: tab through select, toggles, buttons; copy/download via keyboard.

## Sample Strings
- Mixed separators: `user-id_number` → camel: `userIdNumber`; snake: `user_id_number`; kebab: `user-id-number`.
- Acronym-ish: `APIResponseHandler` → sentence: `Apiresponsehandler`; capitalized: `Apiresponsehandler` (note: heuristic not preserving acronyms).
