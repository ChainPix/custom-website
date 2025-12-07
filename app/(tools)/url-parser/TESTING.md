# URL Parser – Manual Test Checklist

## Core validation
- Empty input shows “Enter a URL” warning and blocks parsing.
- Valid URL (e.g., `https://example.com/path?foo=bar#hash`) parses without errors.
- Invalid URL shows clear error (requires absolute URL with http/https).
- Very long URL (>5k chars) shows length warning and skips parsing.

## Samples & parsing
- Sample buttons populate input correctly (basic, auth, port, multi-params).
- Non-http scheme triggers a non-supported scheme warning.
- Fragments, username/password, port, origin, pathname display correctly.

## Query params
- “Show decoded” toggle switches between decoded and raw params.
- Copy query string, copy individual param, and download JSON/CSV work and reflect the selected decoded/raw state.
- No params state shows “No query params.”

## Accessibility
- `aria-live` announces status/warnings.
- Parsed details region is labeled; buttons/inputs have aria-labels and focus-visible outlines.
- Keyboard-only navigation reaches all controls and actions.

## Clipboard/actions
- Copying fields/query reflects success status (icon/text).
- Downloads produce valid JSON/CSV files with current params.
