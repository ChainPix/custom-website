# Diff Viewer Tool Documentation

- **Status:** Stable
- **Last Updated:** 2025-12-27

---

## Overview

Browser-based diff viewer that aligns inserts, deletes, and changes using Myers/LCS. Compare text side-by-side or unified, search and navigate changes, and export patches or reports. Everything runs locally in the browser with no uploads by default.

### Primary Use Cases
- Compare config files, logs, or JSON payloads before deploys
- Review edits with aligned side-by-side diffs
- Generate patches for PRs and code reviews
- Share a diff view via a privacy-safe link

---

## Key Features

### Diff Engine
- Myers/LCS line alignment (proper insert/delete pairing)
- Unified and side-by-side views
- Inline word/char diff with alignment and fallback
- Collapsed unchanged blocks with context controls

### Navigation & Productivity
- Next/previous change buttons (keyboard `n`/`p`)
- Search with highlight + jump
- Filters: all / changed / add / remove / modify
- Click-to-copy a single diff line/block
- Select a range and copy as patch

### Input & Formatting
- Paste, type, or upload files
- Drag-and-drop overlay for quick compare
- JSON formatting toggle (pretty print before diff)
- Whitespace modes (trailing/all/indentation, CRLF/LF normalization, tabs as spaces)

### Exports & Sharing
- Unified patch (`.diff/.patch`)
- GitHub-style unified output
- Markdown report (PR-ready)
- Shareable link (local encoding)

### UX Enhancements
- Sticky control header while scrolling
- Mini-map showing change density
- Language detection with lightweight syntax highlighting (JSON/XML/YAML)

---

## Supported Inputs

- File types: `.txt`, `.json`, `.md`, `.log`
- Drag & drop: one file fills the left side (if empty), otherwise the right; two files fill both
- Clipboard: paste buttons per side

---

## How to Use

1. Paste or upload original text on the left and changed text on the right.
2. Choose Unified or Side-by-side view and adjust whitespace modes if needed.
3. Use context controls to collapse unchanged blocks.
4. Navigate changes with Next/Previous or search for a term.
5. Export a patch, Markdown report, or copy a shareable link.

---

## Export Formats

- **Unified patch**: standard `.patch` output
- **GitHub diff**: includes diff header
- **Markdown report**: summary + diff block
- **Share link**: URL-encoded content (client-side only)

---

## Privacy & Security

- All processing runs in your browser
- No uploads by default
- Share links encode content locally in the URL
- Clipboard actions require HTTPS and user gesture

---

## Performance & Limits

- Debounced diff computation to avoid re-running on every keystroke
- Heavy inputs use a Web Worker for diffing
- Virtualized rendering for long diffs
- Large input warning appears for very big inputs

---

## Known Limitations

- Syntax highlighting is lightweight and line-based (not a full parser)
- Share links can exceed URL length for very large inputs
- Patch output is a single hunk (not chunked by context)

---

## File Structure

```
app/(tools)/diff-viewer/
- client.tsx        # Main UI and diff logic
- diff-worker.ts    # Worker for heavy diff computations
- page.tsx          # SEO metadata + JSON-LD schemas
- layout.tsx        # Layout wrapper
- README.md         # This documentation
- TESTING.md        # Manual test checklist
```

---

## Dependencies

- No external diff libraries (custom Myers/LCS)
- Uses browser APIs + lucide-react for icons

---

## SEO and Structured Data

This tool follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

See `app/(tools)/diff-viewer/TESTING.md` for manual scenarios and edge cases.

