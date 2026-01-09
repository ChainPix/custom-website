# JSON ⇄ YAML Converter – Assessment & Backlog

## Current State (observed)
- Converts both directions with indent selection, optional sort keys, auto-convert toggle, download/copy.
- Error messaging: JSON errors include line/column when parsable; YAML errors are generic (no line/col).
- Auto-convert re-runs on every change; no debounce and dependencies are suppressed in the effect.
- File upload: only size-checked (10MB); no strict type validation beyond accept attribute.
- Output: plain `<pre>` with no syntax highlighting, line numbers, or search.
- Loading state puts a `<div>` inside `<pre>` (invalid nesting).
- Accessibility: basic labels/aria on controls; no live region for status/errors; no keyboard shortcuts.
- Performance: warns on size; worker used for large inputs; no history.
- No tests (unit/e2e) for conversion, options, errors, or uploads.

## Notes (recent)
- Large conversions now run in a Web Worker (triggered at ~512KB) to keep the UI responsive during parse/serialize/sort.
- Conversions are blocked when pasted input exceeds the 10MB size limit (matching upload behavior).
- YAML output key ordering now comes solely from the shared sort routine to avoid double-sorting.
- YAML-to-JSON conversion now rejects non-JSON-safe values (Date/Map/Set/NaN/etc.) with a clear path.
- YAML parsing is restricted to the JSON schema to avoid unsafe tags or custom object types.
- Auto-convert now queues a pending run instead of starting while another conversion is active.
- Breadcrumb label now reflects the active conversion direction.
- Input/output now use Monaco editor for syntax highlighting and dev-friendly editing.
- Conversion runs in a worker for all sizes, with progress stages, cancel support, and a 50MB cap.

## Recommended Improvements
- UX: add syntax highlighting/line numbers for output; output search; mode-specific placeholder text; drag-and-drop upload with overlay and type/size validation.
- Errors: surface YAML parse line/col when available; add role="alert"/aria-live for errors/status; remove `<div>` inside `<pre>`.
- Auto-convert: debounce input changes; short-circuit on empty input; show a subtle “auto-converted” status.
- File handling: stricter mime/extension checks and clearer messages; allow re-upload of same file by resetting input.
- Performance: optional worker path or debounce for large inputs; keep warnings for >1MB.
- Accessibility: ensure focus styles, keyboard shortcuts (format/clear/copy), and proper ARIA for status.
- Testing: add a Playwright smoke test covering json→yaml, yaml→json, sort keys, indent change, auto-convert, and file upload error paths.

## Competitive Feature Gaps (future)
- Syntax highlighting + line numbers for inputs/outputs; find/search with highlight; optional light/dark toggle.
- JSON5 support toggle; YAML version toggle (1.1/1.2) and flow/block style options.
- Anchor/alias visibility: list anchors, warn on unresolved/duplicate anchors, option to flatten/remove anchors on export.
- Schema validation for YAML/JSON (JSON Schema) with inline line/column markers and auto-scroll to errors.
- Templates/snippets: quick inserts for Kubernetes manifest, GitHub Actions, package.json, etc.; local history of last N conversions.
- Diff mode: compare before/after (JSON vs YAML) with highlight.
- Drag-and-drop overlay with validation; export options beyond copy/download (e.g., choose extension/filename).
