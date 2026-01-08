# TOML/INI/JSON Converter – Assessment & Plan

## Current state (after improvements)
- Features: Mode selector (TOML/INI/JSON), output format selector, multiple samples, swap formats, copy original, pretty output toggle, size guard warning, line count, copy/download output, status messages via aria-live.
- Validation: Mode-specific errors; TOML errors can include line/column when available; warns on large input (~40k chars) and lossy TOML↔INI conversions.
- Accessibility: aria-live status, labeled output region, aria-labels on controls; status on copy/reset/download.
- Content/SEO: Page metadata plus on-page How-to + FAQ with local-processing note; FAQPage JSON-LD added.
- Implementation: Parsing memo stays pure; status/warning updates now flow through an effect.
- UX: Removed the misleading input formatter button that only worked for JSON input.
- UX: Swap now converts and flips input/output formats.
- UX: Clarified dotted INI sections and added a toggle to treat dots as literal vs nested.
- Errors: Updated large-input warning to match behavior; added basic INI line validation and more robust TOML error messaging.
- Performance: Added debounced parsing with a worker path for very large inputs to keep the UI responsive.
- Copy: Converter messaging now reflects true format conversions.
- Conversion: Added JSON as an input/output format with true TOML/INI/JSON conversion; pretty formatting now applies to output only.
- Safety: Added a lossy conversion warnings panel and preserved raw input when output format matches and pretty is off.
- Validation: Added optional JSON Schema validation with inline error summaries.
- Editor: Replaced textareas with Monaco editors for syntax highlighting, squiggles, and formatting shortcuts.
- Files: Added upload and drag-and-drop support for TOML/INI/JSON inputs.
- Compare: Added diff mode with a split view comparing input to converted or custom output.
- Parser: Added an INI-focused parser options panel (array delimiter, duplicate keys, dot nesting, type coercion).
- Metadata: Added applicationName and robots defaults; OG image remains a future upgrade.
- SEO: Expanded metadata fields and added JSON-LD (SoftwareApplication, BreadcrumbList, HowTo, FAQPage, WebPage).

## Remaining gaps / next ideas
- Optional auto-detect TOML vs INI (heuristic) with confirmation.
- Inline view for structured output (expand objects/arrays) beyond JSON string.
- Optional truncate/preview for very large output; show size/line counts for output.
- Schema-based autocomplete once a code editor is introduced.

## Testing
- Valid TOML/INI/JSON converts to the chosen output format; invalid input shows clear error.
- Sample buttons populate inputs; reset clears; copy/download output works.
- Size guard warns on large input; pretty output toggle updates output.
- Accessibility: aria-live announces status; output region labeled; controls have aria-labels.
- See `TESTING.md` for the full checklist.
