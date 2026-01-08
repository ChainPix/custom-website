# TOML/INI/JSON Converter Documentation

- **Status:** Stable
- **Category:** Developer Tools
- **Last Updated:** 2025-12-27
- **SEO Status:** Advanced (metadata + JSON-LD)

---

## Overview

Browser-based converter for TOML, INI, and JSON configuration files. Supports format switching, schema validation, diff mode, and file workflows. All processing runs locally in the browser.

### Primary Use Cases
- Convert config files between TOML, INI, and JSON
- Validate configuration shapes with JSON Schema
- Compare production vs QA configs with diff mode
- Normalize or reformat configs before commits

---

## Key Features

### Conversion & Formatting
- Convert TOML, INI, and JSON between formats
- Pretty output toggle (formatting applies to output)
- Download as `.json`, `.toml`, or `.ini`

### Parser Options (INI)
- Array delimiter: comma vs newline
- Duplicate keys: last-wins vs collect array
- Dot notation nesting on/off
- Type coercion on/off (numbers/booleans)

### Validation
- Parse errors with line/column when available
- JSON Schema validation with inline error summaries
- Lossy conversion warnings for TOML ↔ INI

### Editor Experience
- Monaco editors for input/output
- Syntax highlighting for TOML/INI/JSON
- Inline error squiggles
- Diff mode split view (input vs converted/custom)

### File Workflow
- Upload `.toml`, `.ini`, or `.json`
- Drag & drop onto the editor
- Copy input and output

---

## Supported Inputs

- File types: `.toml`, `.ini`, `.json`
- Paste or type directly in the editor
- Drag & drop onto the input editor

---

## How to Use

1. Select TOML, INI, or JSON and paste/upload your config.
2. Choose the output format (JSON/TOML/INI).
3. Toggle parser options (INI) or schema validation as needed.
4. Copy or download the converted output.
5. Enable diff mode to compare against converted or custom output.

---

## Privacy & Security

- All conversion runs in the browser.
- No network uploads by default.
- Clipboard actions require HTTPS and a user gesture.

---

## Performance & Limits

- Debounced parsing to reduce CPU on large inputs
- Web Worker path for very large payloads
- Large input warnings at ~40k characters

---

## Known Limitations

- TOML ↔ INI conversions are lossy (nesting and arrays can flatten).
- Comments are not preserved unless output format matches input and formatting is off.
- INI type coercion is best-effort and may differ across INI parsers.
- Schema error locations are most precise in JSON output.

---

## File Structure

```
app/(tools)/toml-ini-converter/
├── client.tsx           # UI + parsing + Monaco + schema validation
├── toml-ini.worker.ts   # Worker parsing + schema validation
├── page.tsx             # Metadata + JSON-LD schemas
├── layout.tsx           # Layout wrapper
├── README.md            # This documentation
└── TESTING.md           # Manual test checklist
```

---

## Dependencies

- `toml` for TOML parsing
- `@iarna/toml` for TOML stringify
- `ini` for INI parsing/stringify
- `ajv` for JSON Schema validation
- `@monaco-editor/react` + `monaco-editor` for editor UI
- `lucide-react` for icons

---

## SEO and Structured Data

This tool follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD: SoftwareApplication, BreadcrumbList, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

See `app/(tools)/toml-ini-converter/TESTING.md` for manual scenarios and edge cases.
