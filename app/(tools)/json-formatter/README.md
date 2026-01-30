# JSON Formatter Tool Documentation

- **Version:** 2.1.0
- **Category:** Developer Tools
- **Last Updated:** 2026-01-02
- **Status:** ✅ Stable

---

## Overview

JSON Formatter is a client-side tool for formatting, validating, and inspecting JSON. It supports JSON5 parsing, schema validation, JSONPath queries, diff mode, and tree inspection with copyable paths. Everything runs locally in the browser with no uploads.

### Primary Use Cases
- Beautify or minify JSON for logs, API responses, and configs.
- Validate JSON with JSON Schema and jump to error nodes.
- Query JSON via JSONPath-style selectors.
- Compare two JSON payloads and export a merge patch.
- Share or restore inputs using URL hashes and local history.

---

## Key Features

### Formatting and Inspection
- Format/minify with custom indentation.
- JSON5 mode (comments + trailing commas) with a one-click fix to strict JSON.
- Tree view with search, auto-expand, and path copy tools.
- JSONPath queries with match count and copyable output.

### Validation and Quality Checks
- JSON Schema validation with clickable error paths.
- Duplicate key detection.
- Trailing comma/comment detection for JSON5 inputs.
- Preserve number formatting option (e.g., `1e-6`).

### Diff and Sharing
- JSON diff mode with merge patch output.
- Shareable links using URL hashes (no server storage).
- Local history of last 10 inputs with clear-all.
- One-click samples (API response, config, OpenAPI snippet).

### Performance
- Web Worker formatting for inputs >= 1MB.
- Tree builds only when Tree view is active.
- Debounced stats and auto-format to keep typing responsive.

---

## Quick Start

1. Paste JSON or drop a file into the input editor.
2. Choose formatting options (indent, JSON5, sort scope).
3. Click Format/Minify or enable auto-format.
4. Validate against a schema or inspect in Tree view.

---

## Keyboard Shortcuts

- Cmd/Ctrl+Enter: format
- Cmd/Ctrl+M: minify
- Cmd/Ctrl+K: clear input/output
- Cmd/Ctrl+C: copy output (when available)

---

## Validation and Limits

- Maximum input size: 10MB.
- Share links can exceed URL limits for large payloads.
- JSONPath support is a minimal subset (property, index, wildcard).
- Duplicate key detection is best-effort for strict JSON.
- JSON5 fix normalizes to strict JSON and removes comments.

---

## Privacy & Data Handling

- All processing runs in-browser, including the Web Worker.
- No data is uploaded or stored on servers.
- History is stored locally in `localStorage`.
- Share links are URL fragments only.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- FileReader and Blob APIs

Tested on recent Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/json-formatter/
├── README.md
├── client.tsx
├── page.tsx
├── layout.tsx
├── TreeView.tsx
├── json-formatter.worker.ts
├── components/
│   ├── Editors.tsx
│   ├── Toolbar.tsx
│   ├── OptionsBar.tsx
│   ├── SchemaPanel.tsx
│   ├── EscapePanel.tsx
│   ├── QueryPanel.tsx
│   └── DiffPanel.tsx
└── hooks/
    ├── useJsonProcessor.ts
    └── useKeyboardShortcuts.ts

lib/
└── json-utils.ts
```

---

## Dependencies

- `json5` for JSON5 parsing
- `ajv` for JSON Schema validation
- `@monaco-editor/react` + `monaco-editor` for editors
- `lz-string` for shareable hash links
- `diff` for JSON diff output

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## JSON_FORMATTER Notes

- Replaced legacy `JSON_FORMATTER.md` with this README to align with tool documentation standards.

---

## Testing

Manual checks recommended:
- Format/minify, JSON5 fix, and auto-format
- Schema validation and error-to-tree highlighting
- JSONPath queries, diff mode, and merge patch output
- Share link, history restore, and drag/drop upload

---

## Troubleshooting

**Copy fails**
- Clipboard access requires a user gesture and HTTPS.

**Share link too long**
- Large inputs may exceed URL limits; use download instead.

**Worker error**
- Refresh and retry; very large inputs may exceed memory limits.

**Schema errors not highlighting**
- Schema errors must include JSON Pointer paths to map to tree nodes.
