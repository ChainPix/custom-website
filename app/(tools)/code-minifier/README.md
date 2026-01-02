# Code Minifier Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-02-20

---

## Overview

Browser-based HTML/CSS/JS minifier and pretty-printer with batch tabs, Monaco editor, and export tools. All processing runs locally in your browser with no uploads.

### Primary Use Cases
- Minify HTML/CSS/JS for production payloads
- Pretty-print code for reviews or documentation
- Compare before/after output with diff view
- Batch-process multiple files and export a ZIP
- Share a formatted result via encoded URL

---

## Key Features

### Formatting Core
- Engines: Terser (JS), csso (CSS), html-minifier-terser (HTML), Prettier (pretty-print)
- Modes: Minify and Pretty-print
- Safe Mode (default) to reduce aggressive transforms
- Per-language options for comment stripping and whitespace normalization

### Productivity
- Monaco editor input/output with syntax highlighting
- Batch tabs + Convert All
- Diff view for before/after review
- Keyboard shortcuts: Cmd/Ctrl+Enter (convert), Cmd/Ctrl+Shift+C (copy output)
- Format-on-paste and clipboard prompt

### Export & Sharing
- Download output with correct extension
- Batch ZIP download for multiple files
- Copy output or shareable link
- Snippet library saved locally

---

## Quick Start

1. Pick HTML, CSS, or JS and select Minify or Pretty-print.
2. Paste or load a sample, adjust options, then click **Convert**.
3. Review output or diff, then copy, download, or share.

---

## Options

- **Safe Mode:** Limits aggressive minification to reduce breakage risk.
- **Strip comments:** Per-language toggle.
- **Normalize whitespace:** Per-language toggle.
- **Indent style:** Tabs / 2 spaces / 4 spaces (pretty-print only).

---

## Export Formats

- **HTML**: `.html`
- **CSS**: `.css`
- **JavaScript**: `.js`
- **Batch**: `.zip` with per-tab output

---

## Validation & Limits

- Large inputs are supported but may take longer; conversions run in a Web Worker.
- Share links have URL size limits (large inputs may exceed limits).
- Stats are informational only; validate output before shipping.

---

## Privacy & Data Handling

- All processing is client-side.
- Clipboard access requires a user gesture.
- Optional localStorage persistence for session restore and snippets.
- Share links encode content in the URL; no server storage.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- Blob/URL APIs
- CompressionStream (gzip estimate; optional)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/code-minifier/
- client.tsx
- page.tsx
- layout.tsx
- code-minifier.worker.ts
- README.md
lib/formatters/
- code-minifier.ts
tests/
- code-minifier.unit.spec.ts
```

---

## Dependencies

- `terser`
- `csso`
- `html-minifier-terser`
- `prettier`
- `@monaco-editor/react`
- `monaco-editor`
- `jszip`
- `lz-string`
- `lucide-react`

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit tests: `tests/code-minifier.unit.spec.ts`
- Run: `npx playwright test tests/code-minifier.unit.spec.ts`

---

## Troubleshooting

**Conversion fails**
- Try Safe Mode or switch to Pretty-print.
- Ensure the input is valid syntax for the selected language.

**Clipboard actions fail**
- Clipboard access requires HTTPS and a user gesture.

**Share link too long**
- Remove output from the link or shorten input.

---

## Notes

- Minification can change semantics in edge cases; always validate output.
- Batch ZIP export only includes tabs with output content.
