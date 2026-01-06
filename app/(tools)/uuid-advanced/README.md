# UUID Advanced Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-03-02

---

## Overview

Advanced UUID generator for v1, v3, v4, and v5 with namespace presets, deterministic v3/v5 support, batch name mapping, format controls, and exports. Everything runs locally in your browser.

### Primary Use Cases
- Generate random v4 UUIDs for apps, configs, and test data
- Create deterministic v3/v5 UUIDs from namespace + name
- Batch-generate UUIDs from multiple names
- Export UUID lists as TXT/CSV/JSON

---

## Key Features

### Version Support
- **v1**: Time-based UUIDs (note: can expose timestamp/node-ish info)
- **v3**: Deterministic UUIDs (namespace + name, MD5)
- **v4**: Random UUIDs (recommended default)
- **v5**: Deterministic UUIDs (namespace + name, SHA-1)

### Deterministic v5 Playground
- Live explanation that the same input yields the same UUID
- Batch names input (one per line, up to 50)
- Tabular output: `name | namespace | uuid`

### Formatting & Output
- Uppercase/lowercase toggle
- With/without hyphens
- `urn:uuid:` prefix option
- Copy all or copy single UUID
- Download outputs as `.txt`, `.csv`, or `.json`

### Productivity
- Auto-generate toggle and Enter-to-generate
- History of the last 10 generations with quick restore
- Search/filter within results
- Unique-only mode for v4 with badge

---

## Quick Start

1. Choose a UUID version.
2. Set count (1–50) or paste batch names for v5.
3. For v3/v5, choose a namespace preset or enter a custom UUID.
4. Click **Generate**, then copy or download results.

---

## Inputs & Controls

- **Version:** v1, v3, v4, v5
- **Count:** 1–50 (NaN-safe fallback to 1)
- **Namespace (v3/v5):** Required valid UUID string
- **Name (v3/v5):** Any string; falls back to `"example"` if empty
- **Batch Names (v5):** One per line, up to 50
- **Format:** Uppercase, no hyphens, `urn:uuid:` prefix

---

## Validation & Limits

- **Count** clamped to 1–50 (fallback to 1 if invalid).
- **Batch names** limited to 50 entries.
- **Namespace** validated with UUID regex before v3/v5 generation.
- **Unique-only v4** attempts to guarantee uniqueness, with a warning if it can’t.

---

## Privacy & Data Handling

- All processing runs locally in your browser.
- No uploads or server storage.
- Clipboard actions require user gesture and HTTPS.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API
- ES modules / modern JavaScript runtime

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/uuid-advanced/
- client.tsx
- page.tsx
- layout.tsx
- README.md
```

---

## Dependencies

- `uuid`
- `lucide-react`
- `next/link`

---

## SEO & Structured Data

Uses enhanced metadata and JSON-LD in `app/(tools)/uuid-advanced/page.tsx`:
- Metadata: title, description, keywords, canonical, robots
- Open Graph and Twitter cards
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage

---

## Troubleshooting

**Copy doesn’t work**
- Clipboard access requires HTTPS and a user gesture. If unsupported, use manual copy.

**v3/v5 errors**
- Ensure the namespace is a valid UUID and the name is not empty.

**Unique-only v4 shows a warning**
- Extremely unlikely collisions are possible; retry generation.

---
