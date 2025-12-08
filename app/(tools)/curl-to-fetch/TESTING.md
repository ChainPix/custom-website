# cURL → fetch — Manual Test Checklist

- **Sample POST**: Load “POST JSON” preset and convert; verify fetch uses POST, headers, and body; status shows success with no ignored flags.
- **Sample GET with headers**: Load GET preset; confirm method is GET and headers are present; no body emitted.
- **Unknown flags**: Add an unsupported flag (e.g., `--foo bar`); convert; status shows ignored flag list without failing conversion.
- **Auth header**: Use `-u user:pass`; confirm Authorization header is Basic <base64>.
- **Body implies POST**: Remove `-X` but keep `-d`; converter should default to POST.
- **Empty/long guard**: Blank input → inline error; very long input (>8000 chars) → length warning.
- **Copy/download**: After conversion, use Copy/Download; clipboard and file contain the generated snippet.
- **Accessibility**: `aria-live` status updates; output region labeled; controls focusable with visible outlines.
