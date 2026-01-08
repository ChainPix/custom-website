# TOML/INI → JSON Converter – Assessment & Plan

## Current state (after improvements)
- Features: Mode selector (TOML/INI), multiple samples (simple/nested), swap mode, copy original, pretty/minify toggle, size guard warning, line count, copy/download JSON output, status messages via aria-live.
- Validation: Mode-specific errors; TOML errors can include line/column when available; warns on large input (~40k chars).
- Accessibility: aria-live status, labeled output region, aria-labels on controls; status on copy/reset/download.
- Content/SEO: Page metadata plus on-page How-to + FAQ with local-processing note; FAQPage JSON-LD added.
- Implementation: Parsing memo stays pure; status/warning updates now flow through an effect.
- UX: Removed the misleading input formatter button that only worked for JSON input.

## Remaining gaps / next ideas
- Optional auto-detect TOML vs INI (heuristic) with confirmation.
- Inline view for structured output (expand objects/arrays) beyond JSON string.
- Optional truncate/preview for very large output; show size/line counts for output.

## Testing
- Valid TOML/INI converts to JSON; invalid input shows clear error.
- Sample buttons populate inputs; reset clears; copy/download JSON works.
- Size guard warns on large input; pretty/minify toggle updates output.
- Accessibility: aria-live announces status; output region labeled; controls have aria-labels.
- See `TESTING.md` for the full checklist.
