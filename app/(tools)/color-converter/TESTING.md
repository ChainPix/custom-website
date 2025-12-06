# Color Converter – Manual Test Checklist

## Functional
- Enter hex (`#2563EB`), rgb (`rgb(37, 99, 235)`), and hsl (`hsl(221, 79%, 53%)`) inputs; outputs update for HEX/RGB/HSL/RGBA/HSLA.
- Color picker and preset swatches update input and preview.
- Alpha slider updates RGBA/HSLA strings.
- Copy individual formats, copy all, and download outputs; disabled states when invalid.
- Trim and uppercase toggles behave as expected.

## Validation & Feedback
- Invalid input shows inline error and “Invalid input” status.
- Trim toggle fixes inputs with whitespace; uppercase toggle changes HEX casing.
- Status announces copy/download actions via aria-live.

## Accessibility
- `aria-live` status present; outputs and buttons/inputs have labels; regions focusable.
- Keyboard-only navigation through inputs, toggles, copy/download.

## Sample Inputs
- Valid: `#2563eb`, `rgb(20, 184, 166)`, `hsl(16, 92%, 54%)`.
- Invalid: `not-a-color` shows error.
