# Regex Extractor Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-12-27

---

## Overview

Regex workbench for extracting matches and capture groups, replacing text, or splitting input. Supports named capture groups, CSV/JSON exports, and an optional safe RE2 engine for large inputs. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Extract matches and capture groups from logs or text blobs
- Validate complex patterns before using them in code
- Generate replace output safely on large inputs
- Split strings by regex for data cleanup
- Share or export regex sessions with teammates

---

## Key Features

### Modes
- **Extract**: Match table with indices and group columns
- **Replace**: Preview replaced output
- **Split**: Preview segmented output

### Capture Groups
- Named group support (`(?<name>...)`) with named columns
- Fallback to numbered `group1..N` when no names exist

### Results UX
- Inline highlight preview with click-to-jump from table rows
- Filter, unique-only toggle, sort, and pagination
- Column copy (match, index, or group column)

### Sharing & Persistence
- Shareable URLs with pattern/flags/text
- Presets saved in `localStorage`
- Import/export session JSON

### Safety & Performance
- Web Worker matching to keep UI responsive
- Debounced input updates (200ms)
- Optional **Safe engine (RE2)** mode to avoid catastrophic backtracking

---

## Quick Start

1. Enter a regex pattern and choose flags (global is always on).
2. Paste or type text to process.
3. Pick Extract, Replace, or Split.
4. Copy or download results, or share a link.

---

## Limits & Validation

- **Input length**: 30k characters (truncated beyond this limit)
- **Match cap**: 500 results
- **Pattern swap guard**: 5k character limit for swapping text into pattern
- Invalid regex patterns show the exact parser message
- Safe mode (RE2) does **not** support backreferences or lookahead

---

## Privacy & Data Handling

- All processing runs in your browser.
- No uploads, tracking, or server storage.
- Presets and history are stored locally in `localStorage` only.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API (copy actions)
- Blob API (downloads)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/regex-extractor/
- client.tsx               # Main UI and logic
- regex-extractor.worker.ts # Worker for regex execution
- page.tsx                 # SEO metadata + JSON-LD schemas
- layout.tsx               # Layout wrapper
- README.md                # This documentation
- TESTING.md               # Manual test checklist
```

---

## Dependencies

- `re2-wasm` (optional safe engine)
- `lucide-react` (icons)

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

See `app/(tools)/regex-extractor/TESTING.md` for manual scenarios and edge cases.

---

## Troubleshooting

**Regex errors are too strict in Safe mode**
- RE2 does not support lookaheads or backreferences. Disable Safe mode for those patterns.

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

**Share link is too long**
- Large inputs can exceed URL limits. Use session export/import instead.
