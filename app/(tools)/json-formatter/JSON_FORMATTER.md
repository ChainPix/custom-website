# JSON Formatter – Feature Notes and Backlog

## Implemented Functional Improvements (live)
- JSON5 support: toggle to parse relaxed JSON (unquoted keys, trailing commas, comments).
- Escape/Unescape strings: panel with escape/unescape actions; handles Unicode escapes.
- JSON Path viewer: click any node in Tree view to see `Root > path` under the output header.
- Tree/Text toggle: two output modes with collapsible, type-colored tree nodes and item counts.
- JSON Schema validation: paste a schema, validate with Ajv (allErrors/verbose, strict off), show paths and messages.
- Format on paste: optional checkbox auto-formats pasted JSON/JSON5, now guarded against stale timers and shows errors on invalid paste.

## Recent fixes
- Format-on-paste now cancels stale runs, clears validation state, and surfaces parse errors instead of silently failing.
- Unescape now safely decodes quotes/backslashes/newlines and Unicode escapes via pre-escaped `JSON.parse` with fallback.
- Schema validation reuses a single Ajv instance (`strict: false`) to avoid rejecting common schemas and reduce overhead.

## Backlog / Potential Improvements
- Syntax highlighting and line numbers for text output.
- Density toggle (compact/comfortable/spacious) and output search/highlight.
- Local history (last N formats) with quick restore/clear.
- Keyboard shortcuts (Cmd/Ctrl+Enter format, Cmd/Ctrl+M minify, Cmd/Ctrl+K clear, Cmd/Ctrl+C copy).
- Better error display: highlight error line/column in the input; auto-scroll to error.
- Drag & drop file upload with overlay dropzone and type checks.
- Performance: web worker for large inputs, virtualized output for huge payloads, optional debounced live format.
- Accessibility: clear focus states, live region for status/error updates, ARIA-linked error summaries.
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
