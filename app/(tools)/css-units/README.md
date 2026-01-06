# CSS Units Converter Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Convert between CSS units with accurate context settings for root and element fonts, viewport dimensions, percent context, and print DPI. Includes multi-output conversions, design token helpers, clamp() builder, explain mode, and shareable links. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Convert px, rem, em, and viewport units for responsive layouts
- Translate percent and print units with explicit context values
- Generate rem-based design tokens or Tailwind-like spacing scales
- Build clamp() expressions for fluid type and spacing
- Share conversion states via URL parameters

---

## Key Features

### Core Conversion
- Units: px, rem, em, vw, vh, vmin, vmax, %, ch, ex, pt, pc, in, cm, mm
- Separate root font (rem) and element font (em)
- Precision control with consistent rounding
- Reverse conversion preview

### Context Controls
- Viewport width and height with presets
- "Use current viewport" toggle with live updates and lock
- Percent context input for % conversions
- DPI input for print units
- ch/ex ratio inputs with font-dependent disclaimer

### Output & Sharing
- Multi-output table for px/rem/em/vw/vh/vmin/vmax
- Copy number, copy with unit, copy CSS snippet
- Shareable link with query params
- Local history of the last 10 conversions

### Power Tools
- Design tokens mode (rem or Tailwind-like scales)
- Clamp helper for px or vw + rem preferred values
- Explain mode showing formulas for current conversion

---

## Quick Start

1. Enter a value and pick the from/to units.
2. Set root/element fonts and viewport/context values.
3. Review the multi-output table and copy results.
4. Share a link or reuse a recent conversion.

---

## Examples

- 16px -> 1rem (root font 16px)
- 24px -> 1.5rem (root font 16px)
- 8px -> 0.5rem (root font 16px)

---

## Validation and Limits

- Value must be numeric and under 1,000,000.
- Root/element fonts, viewport sizes, percent context, and DPI must be positive.
- Viewport values above 10,000 show a warning.
- ch/ex ratios are approximations and font-dependent.
- Shareable URLs can get long if many settings are included.

---

## Privacy & Data Handling

- All calculations run locally in your browser.
- No uploads or server-side processing.
- History and presets are stored in localStorage.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- URLSearchParams (shareable links)
- localStorage (history)
- Resize events (live viewport)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/css-units/
- client.tsx
- page.tsx
- layout.tsx
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

- Manual checklist: `app/(tools)/css-units/TESTING.md`
- Unit tests: `tests/css-units.unit.spec.ts`
- Run: `npx playwright test tests/css-units.unit.spec.ts`

---

## Troubleshooting

**Copy buttons do not work**
- Clipboard access requires HTTPS and a user gesture.

**ch/ex values look off**
- Update the ratios to match your font metrics.

**Viewport values feel wrong**
- Enable "Use current viewport" or update the presets.

---

## Roadmap

- Optional grid fr helper with layout context
- Optional worker-based token parsing for huge inputs
