# Markdown Previewer Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based Markdown previewer with live rendering, HTML source view, strict sanitization, syntax highlighting, Mermaid diagrams, and export tools. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Preview Markdown before publishing to docs, README files, or wikis
- Inspect generated HTML for embeds, emails, or CMS uploads
- Share drafts with encoded links and local draft tabs
- Export full HTML or print-ready PDFs for offline review

---

## Key Features

### Core Preview
- Live Markdown rendering with GFM support (tables, task lists, strikethrough)
- HTML source panel and Markdown source panel with line numbers
- Heading anchors and auto-linked URLs
- Syntax highlighting with highlight.js
- Optional Mermaid diagram rendering

### Editor Productivity
- Split or stacked layout
- Line numbers, find/replace, and tab indentation
- Markdown toolbar (bold, code, link, table)
- Word/character count + reading-time estimate
- Scroll sync between editor and preview

### Export and Sharing
- Copy full HTML document or HTML fragment
- Copy rich text (HTML clipboard) when supported
- Download HTML, Markdown, and print-ready PDF
- Shareable links with compressed Markdown payloads
- Local draft persistence and multi-document tabs

### Safety and Trust
- DOMPurify sanitization with strict allowlist
- Explicit blocking of dangerous URL schemes
- Unsafe-mode warning + badge when sanitization is off
- Reset confirmation for large drafts

---

## Quick Start

1. Paste Markdown or upload a `.md` file.
2. Review the **Preview**, **HTML**, and **Markdown** panels.
3. Toggle strict sanitization or Mermaid rendering if needed.
4. Copy, download, or share your output.

---

## Limits and Performance

- Preview truncates inputs over 20,000 characters.
- Large inputs are debounced to keep typing responsive.
- Share links can exceed URL limits for extremely large drafts.
- Mermaid rendering is opt-in and only runs in Preview mode.

---

## Privacy & Data Handling

- All rendering and exports happen client-side.
- Drafts are saved to localStorage only.
- No uploads, tracking, or server-side storage.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy)
- ClipboardItem (rich-text copy, optional)
- Blob API (downloads)
- localStorage (drafts)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/markdown-preview/
- client.tsx
- page.tsx
- layout.tsx
- utils.ts
- README.md
- TESTING.md
```

---

## Dependencies

- `marked`, `marked-highlight`, `marked-footnote`
- `highlight.js`
- `dompurify`
- `mermaid`
- `lz-string`
- `lucide-react`

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Manual checklist: `app/(tools)/markdown-preview/TESTING.md`
- Unit tests: `tests/markdown-preview.unit.spec.ts`
- E2E tests: `tests/markdown-preview.spec.ts`
- Run: `npx playwright test tests/markdown-preview.unit.spec.ts tests/markdown-preview.spec.ts`

---

## Troubleshooting

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

**Mermaid diagrams do not render**
- Enable the Mermaid toggle and ensure code blocks use ` ```mermaid `.

**Sanitized output strips content**
- Strict allowlist removes unsupported tags/attributes. Disable sanitize only if you trust the input.

**Share link too long**
- Large drafts may exceed URL limits; use export or local drafts instead.

---

## Roadmap

- Optional theme export for downloaded HTML
- More toolbar shortcuts (lists, quotes, headings)
- Configurable debounce and max preview length
