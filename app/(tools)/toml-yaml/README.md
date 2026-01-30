# TOML ⇄ YAML Converter Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-01-16
- **Status:** ✅ Stable

---

## Overview

Browser-based TOML ⇄ YAML converter with validation, presets, diff view, and copy/download tools. Includes strict TOML output via `@iarna/toml` with an optional Basic TOML mode, YAML schema control, and path-aware error reporting. Everything runs locally in the browser with no uploads.

### Primary Use Cases
- Convert configuration files between TOML and YAML safely
- Normalize key ordering for consistent diffs and reviews
- Preview changes with side-by-side and diff views
- Share outputs via copy variants or downloads

---

## Key Features

### Conversion Core
- **Bidirectional conversion** with validation and clear errors
- **Strict TOML output** using `@iarna/toml`
- **Basic TOML mode** for tolerant YAML → TOML conversion (mixed arrays normalized)
- **Path-aware errors** surfaced in the UI for faster fixes

### YAML Controls
- **Schema selection**: JSON-safe vs Full YAML
- **Indent control** with preset-aware defaults

### Presets & Diff
- **Presets**: Kubernetes YAML, GitHub Actions YAML, Minimal, Stable sorted
- **Diff view** toggle with Monaco diff editor
- **Swap** input/output for quick round trips

### Power Workflow
- **Samples gallery** (TOML, YAML, edge cases)
- **Copy variants**: output, minified, escaped string
- **Download** output as `.toml` or `.yml`

### Performance
- **Web Worker conversion** for large inputs
- **Progress + cancel** for heavy conversions
- **Smarter auto-convert debounce** to avoid thrashing

---

## Quick Start

1. Paste TOML or YAML into the input editor.
2. Choose a preset or adjust schema/indent/sort options.
3. Click **Convert** and review output or diff.
4. Copy, download, or swap output back into input.

---

## Options & Presets

- **Presets**
  - **Kubernetes YAML**: readable, stable defaults for k8s manifests
  - **GitHub Actions YAML**: clean YAML output for workflows
  - **Minimal**: compact output without enforced sorting
  - **Stable sorted**: deterministic key ordering
- **YAML Schema**
  - **JSON-safe**: avoids surprise timestamp/object coercions
  - **Full YAML**: enables richer YAML types
- **Basic TOML mode**
  - Normalizes mixed arrays into arrays of tables with `value`
  - Useful for YAML inputs that are TOML-unsafe

---

## Validation & Limits

- **Root requirement:** TOML output expects an object-like YAML root.
- **Mixed arrays:** Strict TOML rejects mixed arrays and null/undefined values.
- **Integer bounds:** TOML integers are constrained to 64-bit signed range.
- **Large inputs:** 10MB recommended limit with warnings; large inputs use a worker.

---

## Privacy & Data Handling

- All conversion runs locally in your browser.
- No uploads, tracking, or server-side storage.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- Blob API

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/toml-yaml/
├── client.tsx              # UI + Monaco editors + controls
├── conversion.ts           # Pure conversion core
├── toml-yaml.worker.ts     # Worker wrapper for large inputs
├── page.tsx                # SEO metadata + JSON-LD schemas
├── layout.tsx              # Layout wrapper
├── README.md               # This documentation
├── TESTING.md              # Manual test checklist
└── test-data/              # Sample inputs
```

---

## Dependencies

- `@iarna/toml`
- `js-yaml`
- `toml`
- `@monaco-editor/react` + `monaco-editor`
- `lucide-react`

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit + golden tests: `tests/toml-yaml.unit.spec.ts`
- Run: `npx playwright test tests/toml-yaml.unit.spec.ts`
- Manual checklist: `app/(tools)/toml-yaml/TESTING.md`

---

## Troubleshooting

**Mixed arrays fail to convert**
- Strict TOML disallows mixed arrays; enable **Basic TOML mode** to normalize.

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

**Worker cancel doesn’t stop instantly**
- Cancellation is best-effort; large inputs may finish quickly after cancel.
