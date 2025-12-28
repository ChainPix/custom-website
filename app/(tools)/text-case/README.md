# Text Case Converter Tool Documentation

- **Version:** 1.3.2
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based text case converter with advanced developer options, exports, and performance safeguards. Convert between common naming conventions (camel, snake, constant, kebab, dot, path, train, sentence, studly), preserve acronyms, and export for code or spreadsheets. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Convert identifiers for codebases, APIs, and database fields
- Normalize headings, labels, and content across styles
- Export case maps as JSON/CSV or copy code snippets
- Batch-convert line-by-line for lists or files
- Apply case transforms during find/replace

---

## Key Features

### Case Coverage
- camelCase, PascalCase, snake_case, kebab-case
- CONSTANT_CASE, dot.case, path/case
- Train-Case, Sentence case, Sentence-case
- StudlyCaps, Title Case, UPPERCASE, lowercase

### Conversion Quality
- Acronym preservation (HTTP, JWT, ID)
- Smart number handling (`user2FAEnabled`)
- Optional `. / :` delimiter handling
- Keep punctuation mode
- Locale-aware casing (e.g., Turkish i/I)

### Output & Exports
- Copy selected or copy all outputs
- Export JSON or CSV
- Copy snippets as TypeScript objects, env vars, or YAML
- Download outputs or exports to files

### Developer UX
- Keyboard shortcuts (copy, copy all, focus input)
- Swap input with selected output (roundtrip)
- Undo history (last 10 inputs)
- Pin favorite cases (show pinned only)
- Find & replace with case transform
- Per-line conversion mode

### Performance
- Deferred input processing for smoother typing
- Web Worker for large inputs, idle callback fallback
- Output virtualization hint for large case lists
- Large input warning for oversized text

---

## Quick Start

1. Paste text or load a sample.
2. Choose the target case and toggle quality options.
3. Copy the selected output or export structured formats.
4. Use pins or “Show only selected” to focus.

---

## Output Formats

### JSON
```
{
  "camel": "exampleValue",
  "snake": "example_value"
}
```

### CSV
```
case,value
"camel","exampleValue"
"snake","example_value"
```

### Code Snippets
- TypeScript object (`const cases = { ... }`)
- Env vars (`CAMEL=...`)
- YAML keys

---

## Options & Modes

- **Trim** whitespace before conversion
- **Preserve acronyms** to keep uppercase blocks
- **Smart numbers** to split letter/number boundaries
- **Extra delimiters** treat `. / :` as separators
- **Keep punctuation** while converting words
- **Locale** for casing rules
- **Per-line mode** convert each line independently

---

## Privacy & Data Handling

- All conversions run client-side in your browser.
- No uploads, tracking, or server storage.
- Optional API endpoint is disabled by default.

---

## Validation and Limits

- Large inputs (50k+ chars) show a warning and use worker/idle conversion.
- Diff highlighting is simplified for very large text to keep UI responsive.
- Clipboard access requires HTTPS and a user gesture.
- Shareable URLs are best for configuration, not huge inputs.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- Blob API (downloads)
- Web Workers (large input acceleration)
- Intl APIs for locale-aware casing

Works on current Chrome, Firefox, Safari, and Edge.

---

## Shareable URLs

Mode state is reflected in query params, e.g.:
```
/text-case?case=snake&trim=1&line=0&acronyms=1
```

---

## Optional API Endpoint

`POST /api/text-case` (disabled unless `TEXT_CASE_API_ENABLED=true`)

Body:
```json
{
  "input": "Hello World",
  "case": "snake",
  "options": {
    "preserveAcronyms": true,
    "smartNumbers": true,
    "extraDelimiters": false,
    "keepPunctuation": false,
    "locale": "en",
    "perLine": false
  }
}
```

---

## File Structure

```
app/(tools)/text-case/
- client.tsx
- page.tsx
- layout.tsx
- text-case.worker.ts
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

See `app/(tools)/text-case/TESTING.md` for manual tests and golden fixtures.

---

## Troubleshooting

**Copy buttons fail**
- Clipboard access requires HTTPS and user interaction.

**Large inputs feel slow**
- Large inputs use a worker/idle pipeline; wait for conversion to complete.

**Locale casing looks unexpected**
- Verify the locale setting (e.g., `tr` for Turkish).

---

## Roadmap

- Preset packs for common codebases (API, DB, CSS)
- More export targets (TS enums, CSV headers)
- Optional worker-based diff highlighting for large inputs
