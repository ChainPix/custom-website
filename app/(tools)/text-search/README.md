# Text Search Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based text search and replace tool with plain and regex modes, multi-tab inputs, exports, and performance safeguards. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Search logs or large text blocks with regex or simple queries
- Find and replace across multiple pasted inputs or uploaded files
- Export match lists for spreadsheets, tickets, or QA
- Debug regex patterns with grouped results and explainers

---

## Key Features

### Search & Match Options
- Plain and regex modes
- Case sensitive and whole-word options
- Regex flag toggles (`i g m s u y`)
- Custom word character definition for whole-word matching

### Inputs & Results
- Multiple tabs (add, rename, remove)
- Upload `.txt` and `.log` files
- Paste multi-file text with separator parsing
- Grouped results by tab with per-tab counts
- Line + column metadata for each match

### Preview & Navigation
- Active-match preview window (avoids giant span rendering)
- Snippets list with match highlighting
- Next/previous navigation and auto-scroll to active snippet
- Match count by line mini view

### Replace Workflow
- Replace current match
- Replace all matches
- Replace in selection
- Preview before/after snippets
- Undo stack (10 steps)

### Exports & Copy
- Copy matches or contexts
- Download results as JSON, CSV, or TXT

### Productivity & Sharing
- Keyboard shortcuts (Run, Next/Prev, Focus query)
- Saved presets (localStorage)
- Shareable URL state for reproducible searches

### Performance
- Performance mode for large inputs
- Match limits with "Load more" per tab
- Deferred input updates to keep typing responsive

---

## Quick Start

1. Paste text into a tab or upload a file.
2. Enter a query and choose plain or regex mode.
3. Review matches in the preview and snippets list.
4. Replace or export results as needed.

---

## Validation and Limits

- Empty query shows a gentle prompt instead of running.
- Invalid regex patterns surface a clear error message.
- Performance mode caps matches to keep UI responsive.
- Whole-word with custom word characters uses lookbehind, which requires modern browsers.
- Shareable URLs can hit length limits for very large inputs.

---

## Privacy & Data Handling

- All processing is client-side; no uploads.
- Presets are stored locally in `localStorage`.
- Shareable URLs encode the current tool state in the query string.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- Blob API (downloads)
- File API (uploads)
- `URLSearchParams` (shareable links)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/text-search/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Dependencies

- `lucide-react` for icons

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

Manual checklist: `app/(tools)/text-search/TESTING.md`

---

## Troubleshooting

**Replace buttons are disabled**
- Replace requires a valid compiled regex and synchronized run inputs.

**Regex error is unclear**
- Switch to regex mode and check the error message below the query field.

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

**Share link is missing state**
- Some settings only serialize when they differ from defaults.

---

## Roadmap

- Web Worker search for extremely large inputs
- Additional export formats (Markdown, TSV)
- Optional match virtualization in snippet lists
