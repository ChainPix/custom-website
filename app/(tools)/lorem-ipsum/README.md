# Lorem Ipsum & Mock Data Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based generator for lorem ipsum text and lightweight mock data. Create paragraphs, sentences, bullets, and headline blocks, or generate realistic records (names, emails, addresses, phones, UUIDs, timestamps, prices, countries, URLs). Everything runs locally in the browser with no uploads.

### Primary Use Cases
- Fill design mocks and wireframes with realistic placeholder copy
- Generate blog skeletons, landing pages, or UI error messages
- Produce quick mock datasets for UI and QA demos
- Export JSON/CSV/SQL/TypeScript samples for prototypes

---

## Key Features

### Lorem Ipsum Generation
- Paragraphs, sentences, bullets, and headline formats
- Structure controls: paragraph length slider, sentence min/max range
- Punctuation controls: comma frequency and question ratio
- Optional headings + body sections (H2 + paragraphs)
- Start with classic "Lorem ipsum..." toggle
- Presets + real-world templates (wireframe, blog, product landing, errors)
- Themes: classic, tech, nature, startup

### Mock Data Mode
- Records include names, emails, addresses, phones, UUIDs, timestamps, prices, countries, and URLs
- Output formats: JSON array, CSV, SQL INSERT, TypeScript types + samples
- Seeded output for deterministic results

### Export and Sharing
- Copy as plain text, Markdown, HTML, or rich text
- Download with correct MIME types and extensions
- Output preview tabs: Plain / Markdown / HTML
- Shareable links with query params (`?preset=blog&theme=tech&seed=foo`)

### Productivity
- Keyboard shortcuts: `R` regenerate, `C` copy, `D` download
- Recent generations saved locally (localStorage)
- Favorite presets with one-click apply
- Copy individual blocks (paragraph or bullet list)

---

## Quick Start

1. Choose **Mode**: Lorem Ipsum or Mock data.
2. Pick a preset/template or adjust structure controls.
3. Use Preview tabs to verify output.
4. Copy, download, or share the link.

---

## Templates

- **UI wireframe filler**: Short labels + medium paragraphs
- **Blog post skeleton**: Title, subtitle, five paragraphs
- **Product landing**: Hero headline, tagline, three feature bullets
- **Error messages**: Short warning strings for UI states

---

## Mock Data Fields

Each record includes:
- `name` (first + last)
- `email`
- `address`
- `phone`
- `uuid`
- `timestamp` (ISO 8601)
- `price` (number)
- `country`
- `url`

---

## Output Formats

### Lorem Ipsum
- Text, Markdown, HTML
- Rich-text copy (HTML clipboard)

### Mock Data
- JSON array
- CSV
- SQL INSERT
- TypeScript types + sample objects

---

## Limits and Validation

- Paragraphs clamp to 20, sentences clamp to 50
- Mock data records clamp to 100
- Output truncates at 8,000 characters with a safe boundary
- "Copy full (unsafe)" is available when truncated

---

## Privacy & Data Handling

- All generation runs client-side.
- History and favorites are stored in localStorage.
- No uploads, tracking, or server storage.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (text, HTML)
- ClipboardItem for rich-text copy (fallback to HTML text)
- Blob API (downloads)
- localStorage (history/favorites)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/lorem-ipsum/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- On-page how-to and FAQ with privacy notes

---

## Testing

See `app/(tools)/lorem-ipsum/TESTING.md` for manual scenarios.

---

## Troubleshooting

**Copy buttons fail**
- Clipboard access requires HTTPS and user interaction.

**Share link not updating**
- Preset or theme changes update the link; seed may remain blank for random output.

**Truncated output**
- Increase counts carefully or use "Copy full (unsafe)" to grab the full text.

---

## Roadmap

- Add custom word lists for lorem generation
- Expand mock data schema options
- Add OG image for improved social sharing
