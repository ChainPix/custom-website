# JSON Validator Tool Documentation

## Overview
JSON Validator is a client-side tool for validating, formatting, and inspecting JSON. It supports JSON5 parsing, schema validation, JSONPath queries, duplicate key detection, and safe export workflows with optional secret redaction.

### Primary Use Cases
- Validate and format API responses or config files.
- Locate JSON errors with line/column hints when available.
- Validate against JSON Schema and inspect error paths.
- Query JSON using JSONPath-style selectors.
- Share sanitized JSON via local-only URL fragments.

## Key Features

### Validation and Formatting
- Fast validation in a Web Worker to keep the UI responsive.
- Line and column hints when the parser provides position data.
- JSON5 mode toggle with normalized strict JSON output.
- Big-int mode for lossless integers in strict JSON.
- Duplicate key detection with line/column hints.

### Developer Tools
- JSON Schema validation with AJV error paths.
- JSONPath queries (property, index, wildcard).
- Key tools: sort keys, remove nulls, dedupe arrays, case conversion.
- Minify and canonicalize output for diffs and commits.

### Workspace and Sharing
- Tabbed workspace with multiple documents.
- Local history (last 20 validated inputs) stored in the browser.
- File upload + drag and drop + clipboard paste.
- Diff view for input vs formatted or transformed output.
- Shareable links using URL fragments (no server storage).

### Trust and Safety
- Redact secrets toggle for copy, download, and share.
- Local-only guarantee badge and technical note in the UI.
- No network calls during validation or transformation.

## Quick Start
1. Paste JSON or drop a file into the input area.
2. Toggle JSON5, trim, or Big-int mode as needed.
3. Validate manually or leave auto-validate on.
4. Copy, download, or share the output.

## Keyboard Shortcuts
- Cmd/Ctrl+Enter: validate
- Cmd/Ctrl+S: download formatted JSON
- Cmd/Ctrl+C: copy output (when no selection is active)

## Output and Exports
- Pretty-printed JSON output by default.
- Minified output via the "Minify" transform.
- Downloads are `validated.json`.
- Redaction applies to copy/download/share when enabled.

## Validation and Limits
- Large inputs show a warning; parsing still happens locally.
- Line/column hints depend on parser error messages.
- JSONPath support is a minimal subset (no filters).
- Duplicate key detection is best-effort for strict JSON.
- JSON5 output is normalized to strict JSON.

## Privacy and Data Handling
- All processing runs in-browser, including the Web Worker.
- History is stored locally in `localStorage`.
- Share links are URL fragments (never uploaded).
- Clipboard access is user-triggered and permissioned.

## Browser Compatibility
- Requires modern browser APIs (Web Workers, Clipboard API).
- Tested on recent Chrome, Firefox, Safari, Edge.

## File Structure
- `app/(tools)/json-validator/client.tsx`: UI and interaction logic.
- `app/(tools)/json-validator/validator.worker.ts`: validation core.
- `app/(tools)/json-validator/page.tsx`: metadata and JSON-LD.
- `app/(tools)/json-validator/TESTING.md`: manual test checklist.

## Dependencies
- `json5` (lazy-loaded for JSON5 parsing).
- `ajv` (JSON Schema validation).
- `lz-string` (shareable URL fragments).
- `lucide-react` (icons).

## SEO and Structured Data
- Rich metadata: title, description, keywords, canonical URL.
- OpenGraph and Twitter cards.
- JSON-LD: BreadcrumbList, SoftwareApplication, HowTo, FAQ.
- On-page privacy copy and local-only guarantee.

## Testing
- Manual checklist in `app/(tools)/json-validator/TESTING.md`.
- Focus areas: large inputs, invalid JSON, schema errors, JSON5 mode, redaction, diff view, and share links.

## Troubleshooting
- "Clipboard blocked": your browser denied permission; use manual copy.
- "Nothing to download": validate JSON to generate formatted output.
- "Share failed": URL fragment creation failed; retry or copy output.
- Missing line/column hints: parser did not provide offset data.

## Roadmap
- Extended JSONPath features (filters, slices).
- Optional schema presets and validation profiles.
- Highlighted error ranges in the input editor.
