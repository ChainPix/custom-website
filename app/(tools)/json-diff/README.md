# JSON Diff Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-01-15

---

## Overview

Browser-based JSON diff tool with a tree diff explorer, side-by-side viewer, JSON Patch output, and merge mode. Supports objects or arrays, key-aware array matching, ignore rules, and exportable reports. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Compare API payloads or config files
- Review changes in nested JSON structures
- Generate RFC 6902 patches for automation
- Merge accepted changes into a new JSON output
- Share diffs with teammates using shareable links

---

## Key Features

### Diff Engine
- Array diff modes: by index, as set (ignore order), or by key
- Moved detection for ignore-order and key-based arrays
- Stable ordering for deterministic output
- Ignore rules for paths, keys, null vs missing, and empty values
- Optional top-level array support

### Explorer & Review
- Tree diff view with expand/collapse and per-node badges
- Side-by-side value viewer with change highlighting
- Clickable paths that scroll to the tree node
- Filters by type, path, and value

### Exports & Sharing
- Download diff as JSON, Markdown report, or CSV
- JSON Patch (RFC 6902) output
- Merge mode with accept/reject per change
- Shareable links via URL or localStorage fallback

---

## Quick Start

1. Paste or upload JSON on the left and right.
2. Choose array diff mode and set ignore rules.
3. Review the diff list and tree explorer.
4. Export a report, JSON Patch, or merged JSON.

---

## Validation & Limits

- Large inputs show warnings and may truncate visible rows.
- Share links fall back to localStorage if the URL exceeds length limits.
- JSON Patch and merge skip paths that use key-based array notation.

---

## Privacy & Data Handling

- All diffing runs client-side in your browser.
- No uploads or server processing.
- Share tokens are stored in localStorage when URL payloads are too large.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- Blob API
- URLSearchParams and localStorage

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/json-diff/
- client.tsx
- diff-worker.ts
- layout.tsx
- page.tsx
- README.md
- TESTING.md
lib/
- diff.ts
tests/
- json-diff.unit.spec.ts
```

---

## Dependencies

- `lucide-react` for icons
- Web Worker for diff processing

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Manual checklist: `app/(tools)/json-diff/TESTING.md`
- Unit tests: `tests/json-diff.unit.spec.ts`
- Run: `npx playwright test tests/json-diff.unit.spec.ts`

---

## Limitations

- JSON Patch skips moved-only entries and key-based array paths.
- Merge mode skips changes that cannot be mapped to a JSON Pointer.
- Share links may be blocked by strict clipboard permissions.

---

## Troubleshooting

**Diff not updating**
- Large inputs debounce for smooth typing; pause briefly after edits.

**Share link too long**
- The tool automatically falls back to a localStorage share token.

**Patch output missing entries**
- Key-based array paths are not emitted to JSON Patch.
