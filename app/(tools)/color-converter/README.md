# Color Converter Tool Documentation

- **Version:** 1.3.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-27
- **Status:** Stable

---

## Overview

Browser-based color converter that transforms HEX, RGB, and HSL formats with live preview, contrast checks, palette generation, smart paste extraction, and naming hints. Everything runs locally in the browser with no uploads.

### Primary Use Cases
- Convert color values between HEX, RGB, and HSL formats
- Verify accessibility contrast (WCAG) against white or black
- Generate palettes (complementary, triadic, analogous) and a 50-900 scale
- Identify nearest CSS named color and approximate Tailwind color
- Keep a local history and pin favorite colors for export

---

## Key Features

### Core Conversion
- **HEX, RGB, HSL parsing** with live preview
- **RGBA/HSLA outputs** with alpha control
- **Smart paste** extracts the first valid color from CSS-like strings
- **Copy all / download** color outputs as text

### Contrast Checker (WCAG)
- **Contrast vs white and black**
- **AA/AAA pass/fail** for normal and large text
- **One-click AA nudges** to adjust lightness

### Palette Generator
- **Complementary, triadic, analogous** palettes
- **Tints and shades scale** (50-900)
- **Export formats**: Tailwind snippet, CSS variables, JSON

### Color Naming
- **Closest CSS named color**
- **Approximate Tailwind color** (500-level palette)

### History + Pinboard
- **Last 20 colors** stored locally
- **Pin favorites** and restore with one click
- **Export favorites** as JSON

### Dev-Mode Output Options
- **RGB commas vs spaces**
- **Alpha as percent or 0–1**
- **Hex with/without #**
- **Short hex when possible** (e.g., #AABBCC -> #ABC)

---

## Quick Start

1. Paste a color value or pick one from the color picker.
2. Adjust alpha or output toggles as needed.
3. Copy formats, check contrast, generate palettes, or pin favorites.

---

## Smart Paste Examples

The input will extract the first valid color:

```
background: #2563eb;
color: rgb(37 99 235 / 70%);
--primary: hsl(221 79% 53%);
```

---

## Output Formats

### HEX
- `#2563EB` or `2563EB`
- Short hex when possible: `#ABC`

### RGB
- Comma syntax: `rgb(37, 99, 235)` or `rgba(37, 99, 235, 0.7)`
- Space syntax: `rgb(37 99 235)` or `rgb(37 99 235 / 70%)`

### HSL
- Comma syntax: `hsl(221, 79%, 53%)` or `hsla(221, 79%, 53%, 0.7)`
- Space syntax: `hsl(221 79% 53%)` or `hsl(221 79% 53% / 70%)`

---

## Privacy & Data Handling

- All conversion, contrast, and palette generation runs locally.
- History and pinned favorites are stored in localStorage on the device.
- No uploads, tracking, or server storage.

---

## Limits and Validation

- Input accepts HEX (3/6), RGB, and HSL formats.
- Alpha input is applied to RGBA/HSLA outputs only.
- Named color matching is approximate (distance-based).
- Smart paste extracts only the first valid color.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (for copy buttons)
- Blob API (for downloads)
- localStorage (for history/pinboard)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/color-converter/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Dependencies

- **color-name** for CSS named colors
- **lucide-react** for icons

---

## SEO and Structured Data

The page follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage

---

## Testing

See `app/(tools)/color-converter/TESTING.md` for manual test coverage.

---

## Troubleshooting

**Smart paste didn’t extract a color**
- Ensure the text includes a valid HEX/RGB/HSL value.

**Copy buttons fail**
- Clipboard access requires HTTPS and user interaction.

**History doesn’t persist**
- localStorage may be disabled by browser privacy settings.

---

## Roadmap

- Add HSV/CMYK support
- Palette export in additional formats
- Enhanced Tailwind match across more shades
