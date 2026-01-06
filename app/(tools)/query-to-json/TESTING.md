# Query String → JSON – Manual Test Checklist

## Validation & parsing
- Full URL vs raw query string both parse; leading `?` ignored.
- Empty input is blocked; overlength (>5k chars) shows warning.
- Malformed percent-encoding shows a clear error.
- Modes: Arrays keep all values; First keeps first only; Last keeps last value.
- Decode toggle off shows percent-encoded output (URLSearchParams-style, including `+` for spaces); on shows decoded values/keys.
- Sort toggle orders keys alphabetically when on.
- Pretty toggle switches between pretty and compact JSON.

## Filter/table
- Filter input narrows keys in the preview; copying key/value list respects current filter.

## Actions
- Copy input copies raw input; Copy JSON copies current JSON; Copy key/value list copies filtered pairs.
- Download JSON saves formatted JSON; Download raw saves the raw query string.

## Accessibility
- `aria-live` announces status/errors and copy actions.
- Output region labeled; controls have aria-labels; focus-visible outlines present.
- Keyboard-only navigation reaches parse, copy/download, and filter controls.
