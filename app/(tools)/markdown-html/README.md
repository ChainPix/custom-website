# Markdown ⇄ HTML Converter Tool Documentation

- **Version:** 1.3.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based Markdown ⇄ HTML converter with sanitized preview by default, formatting controls, minify mode, and developer-grade conversion options. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Convert Markdown to HTML for docs, CMS, and emails
- Clean pasted HTML into readable Markdown
- Preview sanitized HTML safely before publishing
- Compare input/output diffs for cleanup work
- Export formatted or minified HTML

---

## Key Features

### Core Conversion
- Bidirectional Markdown → HTML and HTML → Markdown
- Auto-detect HTML on paste and switch mode with toast
- Swap input/output and direction in one click
- Copy and download output with correct MIME types

### Preview & Safety
- Sanitized HTML preview enabled by default (DOMPurify)
- Raw preview gated by confirmation for trusted input
- Privacy badge with local-only processing message

### Formatting & Developer Controls
- Format HTML output (pretty-print) or minify HTML
- Format Markdown output with Prettier
- GFM tables, line breaks, heading IDs, link target control
- HTML → Markdown rules for links/images/styles/BR handling
- Optional code highlighting hook in Markdown → HTML

### UX & Productivity
- Auto-convert with debounce + deferred rendering
- Diff view with highlighted changes (input vs output)
- Conversion history (last 10) with restore + clear
- Sample Markdown/HTML buttons and status feedback

### Performance
- Lazy-load converters on tool load or conversion
- Web Worker for large inputs
- Progress indicator for very large conversions

---

## Quick Start

1. Choose **Markdown → HTML** or **HTML → Markdown**.
2. Paste your content (HTML paste auto-switches mode).
3. Review output, preview, and diff if needed.
4. Format/minify, then copy or download.

---

## Options & Controls

### Markdown → HTML
- **GFM tables**: enable table conversion
- **Line breaks**: convert single newlines to `<br>`
- **Heading IDs**: generate heading anchors
- **Open links in new tab**: add `target="_blank"`
- **Highlight code blocks**: highlight.js hook

### HTML → Markdown
- **Preserve links/images**: keep or strip `<a>`/`<img>`
- **Inline styles**: keep or strip `style` attributes
- **BR handling**: single or double newline
- **GFM table conversion**: use turndown GFM plugin

### Output Formatting
- **Format HTML output**: pretty-print HTML
- **Format Markdown output**: Prettier markdown
- **Minify output**: HTML minification (MD → HTML only)

---

## Privacy & Data Handling

- All conversion runs in your browser.
- No uploads or server-side processing.
- History is stored in `localStorage` only.

---

## Limits & Performance

- Large inputs show warnings and use a Web Worker.
- Very large inputs show a progress indicator (estimated).
- Preview sanitization is default; raw preview is opt-in.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- Blob API (downloads)
- localStorage

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/markdown-html/
- client.tsx
- page.tsx
- layout.tsx
- markdown-html.worker.ts
- README.md
- TESTING.md
```

---

## Dependencies

- `marked`
- `turndown`
- `turndown-plugin-gfm`
- `dompurify`
- `highlight.js`
- `diff`
- `prettier`
- `html-minifier-terser`
- `lucide-react`

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Manual checklist: `app/(tools)/markdown-html/TESTING.md`

---

## Troubleshooting

**Preview looks empty**
- Ensure the conversion output exists and preview is enabled (sanitized by default).

**Raw preview warning**
- Raw preview can execute unsafe HTML. Use only for trusted input.

**Copy/Download fails**
- Clipboard and downloads require HTTPS and a user gesture.

**Formatting errors**
- If formatting fails, try turning off Format/Minify and re-run conversion.

---

## Roadmap

- Optional export presets (GFM, GitHub HTML, email-safe)
- Configurable default formatting and minify modes
- More granular sanitization presets
