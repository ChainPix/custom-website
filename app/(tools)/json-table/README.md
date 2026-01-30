# JSON Table Viewer Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable

---

## Overview

Convert JSON into a clean, sortable table with column controls, filters, stats, and exports. Supports nested data via JSONPath and flattening. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Inspect API responses quickly without writing scripts
- Convert JSON arrays into CSV/TSV for spreadsheets
- Explore large datasets with filters, grouping, and stats
- Share a dataset view with a privacy-safe link

---

## Key Features

### Input & Parsing
- Accepts arrays, single objects (auto-wrapped), and arrays of primitives
- JSONPath selector for deep arrays (e.g. `$.items[*]`)
- Lenient mode fixes common issues (trailing commas, single quotes)
- Inline error reporting with line/column and caret preview

### Table Controls
- Typed sorting (numbers, booleans, ISO-like dates)
- Column search, hide/show all, drag reorder, pin-left
- LocalStorage persistence for input, row limit, hidden columns, sort
- Long cell truncation with click-to-expand

### Exploration
- Per-column filters: contains, equals, >, <
- Group-by counts (top 20)
- Column stats: null count, unique values, numeric min/max

### Exports & Sharing
- Export JSON, CSV, TSV, or NDJSON
- Copy visible columns only; export filtered rows only
- Flatten export for nested data
- Share links (URL-encoded or session fallback)
- Load JSON files + drag-and-drop into the editor

### Performance & UX
- Debounced filtering with pre-indexed row search
- Web Worker parsing for large inputs
- Virtualized table rendering for big datasets
- Input size guard to prevent UI lockups

---

## Quick Start

1. Paste JSON, upload a `.json` file, or drop one into the editor.
2. If your array is nested, set JSONPath (e.g. `$.items[*]`).
3. Filter, sort, and explore columns; check stats or group-by counts.
4. Export CSV/TSV/NDJSON or share a link.

---

## Inputs & Formats

Supported JSON forms:
- Array of objects (standard table)
- Single object (auto-wrapped into an array)
- Array of primitives (shown as a `value` column)

JSONPath support (subset):
- Dot paths and array selectors, e.g. `$.items[*]`, `$.data[0].rows`
- Wildcard `[*]` or numeric index `[0]`
- No filters or recursive descent

---

## Exports

- **JSON:** full array output
- **CSV/TSV:** deterministic headers with proper escaping
- **NDJSON:** one object per line
- **Flatten export:** dot-notation keys for nested data
- **Filtered-only:** optional export of filtered rows
- **Visible-only:** copy CSV/TSV for visible columns

---

## Limits & Known Constraints

- Input parsing is disabled above the size guard (40k chars).
- Share links are limited by URL length; large inputs use session storage.
- JSONPath support is intentionally limited to keep parsing fast and safe.
- Numeric filters require numeric values or parseable numbers.

---

## Privacy & Data Handling

- All parsing, filtering, and exports run locally in the browser.
- Share links encode data client-side; no server storage is used.
- LocalStorage is used only for preferences (input, hidden columns, row limit, sort).

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- Blob API (downloads)
- Web Workers (large input parsing)

Works in recent Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/json-table/
- client.tsx           # UI and table logic
- json-table.worker.ts # Worker for large-input parsing
- page.tsx             # SEO metadata + JSON-LD schemas
- layout.tsx           # Layout wrapper
- README.md            # This documentation
- TESTING.md           # Manual test checklist
```

---

## SEO & Structured Data

Matches other tools:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD: BreadcrumbList, SoftwareApplication, HowTo, FAQPage
- Privacy-first language in metadata and FAQs

---

## Testing

See `app/(tools)/json-table/TESTING.md` for manual scenarios and edge cases.

---

## Troubleshooting

**“Invalid JSON input.” with lenient mode on**
- The input likely has a structural issue beyond trailing commas or single quotes.

**Share link fails to load**
- The URL may be too large; use session share or re-share from the current tab.

**Filters seem wrong for numbers**
- Ensure the filter value is numeric for `>` or `<` operators.
