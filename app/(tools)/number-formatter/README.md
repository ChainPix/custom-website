# Number Formatter Tool Documentation

- **Version:** 1.4.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-29
- **Status:** ✅ Stable

---

## Overview

Locale-aware number formatter and parser with batch processing, compare view, and safe-mode precision checks. Format decimals, currency, percent, or unit styles; parse messy inputs; and export results. Everything runs locally in the browser with no uploads.

### Primary Use Cases
- Format currency/percent values for dashboards and reports
- Normalize numbers from international sources before processing
- Compare how the same value renders across locales
- Batch format columns for CSVs or spreadsheets

---

## Key Features

### Formatting Options
- Decimal, currency, percent, and unit styles
- Grouping, fraction digit controls, notation, and rounding modes
- Currency display/sign and sign display options
- Compact display (short/long) for compact notation

### Locale-Aware Parsing
- Handles comma/period swaps (`1.234.567,89`)
- Accepts spaces as group separators
- Supports currency symbols and parentheses negatives
- Shows parsed normalized value with confidence note

### Batch Mode
- Paste newline/comma/tab-separated values
- Output as newline, CSV, or JSON
- Export `formatted.csv` with raw, parsed, formatted, error columns

### Compare View
- Compare the same input across 4-8 locales
- Locale chips + custom locale entry
- Pin and reuse locale sets

### Sharing and Presets
- Shareable links encode tool state
- Saved presets stored in localStorage

### Safety and Validation
- Safe mode rejects values that exceed JS precision
- Inline locale, parse locale, and currency validation

---

## Quick Start

1. Paste a number and set the locale and style.
2. Review parsed normalized output and formatting preview.
3. Switch to Batch for multi-line input or Compare for locale side-by-side.
4. Copy or download results and share a link or save a preset.

---

## Validation and Limits

- Safe mode blocks values that lose precision in JavaScript Number parsing.
- Locale support depends on `Intl.NumberFormat` in the browser.
- Currency validation uses a lightweight ISO-4217 subset for fast feedback.
- Share links can exceed URL limits if inputs are very large.

---

## Privacy & Data Handling

- All parsing and formatting happens client-side.
- No uploads, tracking, or server storage.
- Presets are stored locally in your browser.

---

## Browser Compatibility

Requires modern browsers with:
- `Intl.NumberFormat`
- Clipboard API (copy actions)
- Blob API (downloads)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/number-formatter/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Testing

- Manual: `app/(tools)/number-formatter/TESTING.md`
- Playwright: `tests/number-formatter.spec.ts`
- Run: `npx playwright test tests/number-formatter.spec.ts`

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Troubleshooting

**Copy button fails**
- Clipboard access requires HTTPS and a user gesture.

**Currency or locale error**
- Use valid locale tags (e.g., `en-US`, `de-DE`) and ISO 4217 codes (e.g., `USD`, `EUR`).
