# Query String to JSON Tool Documentation

- **Version:** 1.1.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-28
- **Status:** Stable

---

## Overview

Browser-based query string parser that converts URL parameters into structured JSON with nested parsing, type inference, diff mode, and cleanup tools. Supports full URLs or raw query strings, with options for flat or nested keys, duplicate handling, and export formats. Everything runs locally in the browser with no uploads for privacy.

### Primary Use Cases
- Parse and inspect URL query parameters for debugging APIs
- Convert query strings to JSON for configuration or data processing
- Compare two query strings with diff mode for changes
- Clean and normalize query data by removing tracking params or duplicates
- Export parsed data to JSON, query strings, tables, or Postman collections

---

## Key Features

### Core Parsing
- **Full URL or query string input** with automatic extraction after "?"
- **Flat or nested parsing** for bracket notation (e.g., `user[name]=John` becomes nested object)
- **Duplicate key handling** as arrays, first value, or last value
- **Type inference** for numbers, booleans, and null values
- **Plus-as-space decoding** toggle

### Diff Mode
- **Side-by-side comparison** of two query strings
- **Highlights added, removed, and changed** parameters
- **JSON, table, and query views** for each input

### Cleanup and Normalization
- **Remove tracking parameters** (e.g., utm_*)
- **Deduplicate keys** with chosen strategy
- **Remove empty values** (null, undefined, empty strings)
- **Sort keys** for consistent output

### Output Views
- **JSON view** with pretty-print and compact options
- **Table view** for key-value pairs
- **Query string view** for reconstructed URLs
- **Paths view** for nested structure inspection

### Sharing and Export
- **Shareable links** with encoded state
- **Export to JSON**, query string, table format, or Postman collection
- **Copy actions** for individual views or all formats

### UX Enhancements
- **Live debounced parsing** with real-time updates
- **Large input warnings** for performance
- **Inline error feedback** with position hints
- **Filter preview** by key/value matching
- **Sample data** for quick testing

---

## Quick Start

1. Paste a full URL or raw query string (e.g., `?foo=1&bar=2`).
2. Choose parsing options: flat/nested, type inference, duplicate handling.
3. Review JSON output or switch to table/query views.
4. Use diff mode to compare two inputs.
5. Normalize data if needed, then copy or export.

---

## Examples

### Basic Parsing
Input: `?name=John&age=30&active=true`

Output JSON:
```json
{
  "name": "John",
  "age": 30,
  "active": true
}
```

### Nested Parsing
Input: `?user[name]=John&user[age]=30&tags[]=dev&tags[]=api`

Output JSON (nested enabled):
```json
{
  "user": {
    "name": "John",
    "age": 30
  },
  "tags": ["dev", "api"]
}
```

### Diff Mode
Compares two query strings and highlights differences in JSON/table/query views.

### Export Formats
- **JSON**: Pretty or compact for APIs
- **Query String**: Reconstructed for URLs
- **Table**: Key-value pairs for spreadsheets
- **Postman**: Collection format for API testing

---

## Privacy & Data Handling

- All parsing and processing runs locally in your browser
- No data is uploaded or stored on servers
- Shareable links encode state in the URL fragment (not sent to server)
- History is session-only; refresh clears everything

---

## Limits and Validation

- **Input length**: Warns for inputs over 5k characters; soft limit for performance
- **Malformed encoding**: Shows inline errors with position hints
- **Nested depth**: No hard limit but warns for deeply nested structures
- **Large diffs**: Debounced updates to avoid performance issues

---

## Browser Compatibility

Requires modern browsers with:
- URLSearchParams API for parsing
- Clipboard API for copy actions
- Blob API for downloads

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/query-to-json/
- client.tsx          # Main UI and parsing logic
- page.tsx            # SEO metadata + JSON-LD schemas
- layout.tsx          # Layout wrapper
- README.md           # This documentation
- TESTING.md          # Manual test checklist
- QUERY_TO_JSON.md    # Assessment and plan (replaced)
lib/queryToJson.ts    # Core parsing functions
```

---

## Dependencies

- **lucide-react** for icons
- No external parsing libraries (uses browser URLSearchParams)

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

See `app/(tools)/query-to-json/TESTING.md` for manual test coverage, including edge cases for parsing, diff mode, and exports.

---

## Troubleshooting

**Parsing fails or shows errors**
- Ensure input is a valid query string or URL. Use the sample button for examples.

**Diff mode not highlighting changes**
- Check that both inputs are parsed successfully. Empty or invalid inputs may cause issues.

**Copy buttons don't work**
- Clipboard access requires HTTPS and user interaction. Some browsers block it.

**Large inputs are slow**
- Tool warns for inputs over 5k chars. Break into smaller parts or use local tools for massive data.

**Nested parsing not working**
- Enable nested mode in options. Bracket notation like `foo[bar]=baz` is required for nesting.

---

## Roadmap

- Add CSV export for key-value tables
- Support for more complex nested structures (deep arrays/objects)
- Settings import/export for configurations
- Improved performance for very large inputs with Web Workers
- Additional export formats (e.g., YAML, XML)