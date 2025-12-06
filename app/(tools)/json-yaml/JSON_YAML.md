# JSON ⇄ YAML Converter – Assessment & Backlog

## Current State (observed)
- Converts both directions with indent selection, optional sort keys, auto-convert toggle, download/copy.
- Error messaging: JSON errors include line/column when parsable; YAML errors are generic (no line/col).
- Auto-convert re-runs on every change; no debounce and dependencies are suppressed in the effect.
- File upload: only size-checked (10MB); no strict type validation beyond accept attribute.
- Output: plain `<pre>` with no syntax highlighting, line numbers, or search.
- Loading state puts a `<div>` inside `<pre>` (invalid nesting).
- Accessibility: basic labels/aria on controls; no live region for status/errors; no keyboard shortcuts.
- Performance: warns on size; no debounce/worker for large inputs; no history.
- No tests (unit/e2e) for conversion, options, errors, or uploads.

## Recommended Improvements
- UX: add syntax highlighting/line numbers for output; output search; mode-specific placeholder text; drag-and-drop upload with overlay and type/size validation.
- Errors: surface YAML parse line/col when available; add role="alert"/aria-live for errors/status; remove `<div>` inside `<pre>`.
- Auto-convert: debounce input changes; short-circuit on empty input; show a subtle “auto-converted” status.
- File handling: stricter mime/extension checks and clearer messages; allow re-upload of same file by resetting input.
- Performance: optional worker path or debounce for large inputs; keep warnings for >1MB.
- Accessibility: ensure focus styles, keyboard shortcuts (format/clear/copy), and proper ARIA for status.
- Testing: add a Playwright smoke test covering json→yaml, yaml→json, sort keys, indent change, auto-convert, and file upload error paths.
