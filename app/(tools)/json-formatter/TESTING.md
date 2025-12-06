# JSON Formatter – Manual Test Checklist

Run these in the browser to cover core flows and edge cases.

## Core formatting
- Paste valid JSON, click **Format** → pretty output + Tree view populated.
- Click **Minify** → single-line JSON.
- Introduce a syntax error (missing quote) → error message shown, output cleared.

## JSON5 toggle
- Paste relaxed JSON (trailing commas, single quotes, comments). With JSON5 off: error. With JSON5 on: formats correctly.

## Options
- Toggle **Sort keys** on/off and change indent (2/4/8) → output reflects order/spacing changes.
- Enable **Format on paste** → paste valid JSON auto-formats; paste invalid JSON shows error and clears output.

## Escape / Unescape
- Enter text with quotes/newlines/backslashes and **Escape** → escapes appear.
- **Unescape** → returns to human-readable; confirm `\u263A` decodes to a smiley.

## Tree/Text + Path
- Switch to **Tree** view, expand/collapse nodes; click nodes updates **Path** line (e.g., `Root > items[1].name`).

## Schema validation
- Enable **Schema Validator**, paste schema `{ "type":"object","required":["name"] }` and matching JSON → ✓ valid.
- Change data to violate schema → errors list shows paths/messages.

## File handling
- Upload a small `.json` file → input populates, formatting succeeds.
- Upload a >10MB file or wrong type → error message shown; no crash.

## Clipboard / download
- After formatting, **Copy** → "Copied" state; paste elsewhere to verify.
- **Download** → saves `formatted.json` with current output.

## Keyboard shortcuts
- Cmd/Ctrl+Enter format; Cmd/Ctrl+M minify; Cmd/Ctrl+K clear; Cmd/Ctrl+C copy (when output exists).

## Performance / warnings
- Paste ~1–2MB JSON → warning about large input; UI remains responsive.

## Accessibility
- Confirm focusable controls, visible focus ring, and that screen readers announce status (formatting, errors, validation).
