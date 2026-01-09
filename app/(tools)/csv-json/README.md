# CSV ⇄ JSON Converter Documentation

- **Category:** Developer Tools
- **Status:** Stable

---

## Overview

Browser-based CSV ⇄ JSON converter with schema preview, column mapping, type inference, and large-file performance mode. All conversion happens locally in your browser with no uploads.

### Primary Use Cases
- Convert CSV exports to JSON for apps, scripts, or APIs
- Flatten JSON into CSV for spreadsheets or analysis
- Validate and clean CSV/JSON before importing
- Map, transform, and reorder columns before export

---

## Key Features

### CSV → JSON
- Papa Parse CSV engine with quote/escape handling and delimiter auto-detection
- Header handling: rename, reorder, remove, and dedupe
- Type inference: number/boolean/date with empty-as-null support
- Column transforms: trim, case, replace, split into multiple fields
- Combine columns into new fields
- Dot-notation headers to build nested JSON

### JSON → CSV
- Flatten nested objects and arrays (index or join modes)
- Explode arrays into multiple rows
- Deterministic header ordering (first row, alphabetical, custom)
- Header source (first row only vs union)
- Include/exclude header patterns (wildcards)

### Validation & Quality Report
- CSV shape checks (row length consistency, parser errors)
- JSON required keys and type checks (string/number/boolean/array/object)
- Quality report summary panel for quick diagnostics

### Performance & Reliability
- Web Worker conversions for large inputs
- Streaming output mode for huge exports (download without huge in-memory strings)
- Debounced auto-convert with pause on large inputs

### Productivity
- Sample inputs, copy input/output, download output
- File upload support (CSV/JSON)
- Saved presets in localStorage
- Offline mode badge and clipboard paste support

---

## Quick Start

1. Paste CSV or JSON into the input panel (or upload a file).
2. Choose conversion direction and options (delimiter, headers, mapping, transforms).
3. Convert and copy/download the output.

---

## Output & Export

- JSON output: pretty-printed with configurable indent
- CSV output: selectable delimiter and line endings (LF/CRLF)
- Download as `.json` or `.csv`

---

## Limits & Validation

- CSV row guard: 20,000 rows (soft limit for reliability)
- File upload limit: 10MB
- Warnings for large inputs (line/byte thresholds)
- Strict mode detects uneven columns and reports row index

---

## Privacy & Data Handling

- All processing runs locally in the browser
- No server uploads or network calls required for conversion
- Presets stored in localStorage only when saved

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- Blob/File APIs
- localStorage (optional presets)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/csv-json/
- client.tsx
- page.tsx
- layout.tsx
- worker.ts
- README.md
- TESTING.md
```

---

## Dependencies

- `papaparse` for CSV parsing
- `lucide-react` for icons

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD schemas: SoftwareApplication, BreadcrumbList, HowTo, FAQPage

---

## Testing

See `app/(tools)/csv-json/TESTING.md` for the manual test checklist.

---

## Troubleshooting

**CSV parse errors**
- Check quotes or delimiters; try Auto delimiter or strict mode.

**Large output is slow**
- Enable Performance mode to stream output and download without large in-memory strings.

**Clipboard actions fail**
- Clipboard access requires HTTPS and a user gesture.
