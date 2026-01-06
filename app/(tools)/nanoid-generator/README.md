# NanoID Generator Tool Documentation

- **Version:** 1.4.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based NanoID generator with unbiased randomness, entropy/collision estimates, formatting controls, and export options. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Generate short, URL-safe IDs for slugs, refs, and UI keys
- Create token-like IDs with entropy and collision visibility
- Format IDs with prefixes, suffixes, and grouping separators
- Export ID lists for fixtures, spreadsheets, or QA data

---

## Key Features

### Core Generation
- NanoID-compatible mask/step rejection sampling (unbiased)
- Simple mode option for fast modulo mapping
- Length (4–32) and count (1–50) with clamping
- Preset alphabets (URL-safe, Hex, Lowercase, Letters+Digits, Crockford Base32)

### Security & Collision Math
- Entropy bits = length × log2(alphabet size)
- Birthday collision probability estimate for the requested count
- Guidance warnings for low-entropy configurations

### Formatting & Transformations
- Prefix, suffix, and grouped separators
- Case transforms: upper/lower/none
- Exclude ambiguous characters (O/0, I/1, l)

### Uniqueness Controls
- Unique-only mode with attempts + collisions reporting
- Clear failure message when the retry cap is hit

### Exports & Actions
- Output formats: TXT, CSV, JSON array, NDJSON
- Copy all, copy as JSON, copy per-ID
- Regenerate a single ID on hover
- Download list with format-aware filename

### Productivity & Sharing
- Keyboard shortcuts: G generate, C copy, R reset
- Auto-generate on change (debounced)
- Shareable settings via URL query params
- Local history of last 5 runs (localStorage)

---

## Quick Start

1. Pick a length and count, then choose or enter an alphabet.
2. Enable NanoID compatible mode for unbiased output.
3. Add prefix/suffix or grouping as needed.
4. Generate IDs, review entropy/collision stats, then copy or export.

---

## Output Formats

- **TXT**: One ID per line
- **CSV**: Comma-separated with quoting as needed
- **JSON**: Array of strings
- **NDJSON**: One JSON string per line

---

## Validation & Limits

- Length clamps to 4–32.
- Count clamps to 1–50.
- Alphabet validation warns on:
  - whitespace characters
  - duplicate characters
  - too-small alphabets after filtering
- Unique-only mode retries are capped; failure returns a clear message.

---

## Privacy & Data Handling

- All generation runs client-side using Web Crypto.
- No uploads or server processing.
- History and preferences live in localStorage only.

---

## Browser Compatibility

Requires modern browsers with:
- Web Crypto API
- Clipboard API
- Blob API
- localStorage

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/nanoid-generator/
- client.tsx          # UI and interactions
- page.tsx            # SEO metadata + JSON-LD schemas
- layout.tsx          # Layout wrapper
- README.md           # This documentation
lib/
- nanoid-generator.ts # Core generator + validation utilities
tests/
- nanoid-generator.unit.spec.ts
- nanoid-generator.spec.ts
```

---

## Dependencies

- `lucide-react` for icons

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit tests: `tests/nanoid-generator.unit.spec.ts`
- E2E tests: `tests/nanoid-generator.spec.ts`
- Run: `npx playwright test tests/nanoid-generator.unit.spec.ts tests/nanoid-generator.spec.ts`

---

## Known Limitations

- Shareable URLs can get long with large custom alphabets.
- Collision estimates are approximate (birthday bound).
- Unique-only mode is best-effort and capped to avoid infinite loops.

