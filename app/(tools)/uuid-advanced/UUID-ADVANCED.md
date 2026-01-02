# UUID Advanced Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-03-01

---

## Overview

Generate UUID v1 (time-based), v4 (random), or v5 (namespace + name) directly in the browser. Supports bulk generation, copy-all, and a quick reset to defaults.

### Primary Use Cases
- Create unique identifiers for testing data or demos
- Generate deterministic v5 UUIDs for namespaced resources
- Produce small batches of UUIDs for configuration files
- Validate namespace/name inputs before using them in code

---

## Key Features

### Version Support
- **v1**: Time-based UUIDs
- **v4**: Random UUIDs
- **v5**: Deterministic UUIDs based on namespace + name

### Batch Generation
- Generate 1–50 UUIDs per run
- Output rendered as a newline-delimited list

### Productivity
- **Copy all** output in one click
- **Reset** returns to defaults (v4, DNS namespace, example name, count 5)

---

## Quick Start

1. Choose a UUID version.
2. Set the count (1–50).
3. For v5, enter a namespace UUID and name.
4. Click **Generate** and copy the results.

---

## Inputs

- **Version:** v1, v4, or v5
- **Count:** 1–50 (clamped if outside range)
- **Namespace (v5 only):** Must be a valid UUID string
- **Name (v5 only):** Any string; falls back to `"example"` if empty

---

## Validation & Limits

- **Count** is clamped to 1–50.
- **v5** requires a valid namespace UUID; invalid input shows an error and clears output.
- Errors are scoped to generation only; other versions ignore namespace/name.

---

## Privacy & Data Handling

- All generation runs locally in your browser.
- No uploads or server storage.
- Clipboard copy uses the standard browser Clipboard API.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (for copy)
- ES modules / modern JavaScript runtime

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/uuid-advanced/
- client.tsx
- page.tsx
- layout.tsx
- UUID-ADVANCED.md
```

---

## Dependencies

- `uuid`
- `lucide-react`
- `next/link`

---

## SEO

Uses standard metadata in `app/(tools)/uuid-advanced/page.tsx`:
- title, description, keywords
- canonical URL
- Open Graph and Twitter cards

---

## Update Notes

- Added per-UUID copy controls with lightweight toast feedback.
- Added download support for `.txt`, `.csv`, and `.json` outputs.
- Added auto-generate toggle, Enter-to-generate, history restore, and search filter.
- Added format controls (uppercase, hyphen removal, `urn:uuid:` prefix) plus v4 uniqueness mode with badge.
- Added UUID v3 support with namespace presets, live namespace validation, and explicit hash algorithm labels.
- Added privacy note for v1 and a "Recommended" badge for v4.
- Added validation/clipboard safeguards plus a reusable UUID generation helper.
- Added FAQ content and structured data with updated metadata including v4.
