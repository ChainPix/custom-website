# JSON Formatter – Feature Notes and Backlog

## Implemented Functional Improvements (live)
- JSON5 support: toggle to parse relaxed JSON (unquoted keys, trailing commas, comments).
- Escape/Unescape strings: panel with escape/unescape actions; handles Unicode escapes.
- JSON Path viewer: click any node in Tree view to see `Root > path` under the output header.
- Tree/Text toggle: two output modes with collapsible, type-colored tree nodes and item counts.
- JSON Schema validation: paste a schema, validate with Ajv (allErrors/verbose, strict off), show paths and messages.
- Format on paste: optional checkbox auto-formats pasted JSON/JSON5, now guarded against stale timers and shows errors on invalid paste.
- Keyboard shortcuts: Cmd/Ctrl+Enter format, Cmd/Ctrl+M minify, Cmd/Ctrl+K clear, Cmd/Ctrl+C copy (when output exists).
- File handling: 10MB cap, type check for JSON/plain text, clearer errors; copy/download buttons for output.

## Recent fixes
- Format-on-paste now cancels stale runs, clears validation state, and surfaces parse errors instead of silently failing.
- Unescape now safely decodes quotes/backslashes/newlines and Unicode escapes via pre-escaped `JSON.parse` with fallback.
- Schema validation reuses a single Ajv instance (`strict: false`) to avoid rejecting common schemas and reduce overhead.
- Added keyboard shortcuts and screen-reader status updates for accessibility; improved file type validation.

## Backlog / Upcoming Improvements
- Output search/filter + density toggle (compact/comfortable) to handle large payloads.
- Drag-and-drop upload with overlay dropzone and type/size validation.
- Error highlighting: mark error line/column in input and auto-scroll on parse failure.
- Local history (last 5 formats) with quick restore/clear.
- Automated smoke test (Playwright): format/minify, JSON5 toggle, schema validation, Tree/Text toggle.
- Performance path for huge inputs: consider web worker for parsing/formatting.
  6. Additional Features

  A. Sample Templates

  Quick-start templates dropdown:
  - API Response
  - Config File
  - Package.json
  - GraphQL Query

  B. Compare Mode

  Side-by-side comparison of two JSON objects:
  - Highlight differences
  - Useful for debugging API changes

  C. Export Options

  Additional download formats:
  - .txt (plain text)
  - .js (as JavaScript object)
  - Configurable filename

  D. Stats Enhancement

  Add more detailed stats:
  - Object depth level
  - Number of keys
  - Array counts
  - Data types breakdown

  E. URL Query Support

  Allow JSON in URL for sharing:
  // ?json=base64encoded
  // Good for sharing examples
