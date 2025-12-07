# SQL Formatter – Manual Test Checklist

## Validation & inputs
- Empty input shows warning and blocks formatting.
- Very large input (>50k chars) shows length warning and blocks formatting.
- Invalid SQL shows clear error; changing dialect can resolve dialect-specific syntax.
- Indent size respects numeric input (1–8); compact toggle shortens output; wrap toggle preserves/adjusts whitespace.

## Samples & dialects
- Each sample (select/insert/join/CTE) loads correctly and formats without errors.
- Dialect tips show for PostgreSQL/MySQL; formatting reflects chosen dialect.

## Copy/Download
- Copy input copies the raw SQL; copy formatted copies formatted SQL when available.
- Download button saves formatted SQL as `formatted.sql`.

## Accessibility
- `aria-live` announces status/errors and copy actions.
- Inputs/buttons/toggles have aria-labels and focus-visible outlines.
- Output region labeled; keyboard-only navigation reaches all controls.
