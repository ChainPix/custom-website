# Image Base64 Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-01-15

---

## Overview

Browser-based Image ↔ Base64 converter with batch processing, output snippets, compression helpers, and validation. Encode images to Base64 data URLs or raw payloads, then decode Base64 back to images - all locally in your browser with no uploads.

### Primary Use Cases
- Convert images to Base64 for data URLs, embeds, or quick transport
- Decode Base64 strings back into image files
- Batch encode assets and review size inflation
- Generate CSS/HTML/Markdown/JSON snippets for docs
- Resize or compress before encoding (JPEG/WebP)

---

## Key Features

### Encode and Decode
- Image → Base64 and Base64 → Image workflows
- Output modes: Data URL, raw Base64, CSS, HTML, JSON, Markdown
- Decoding validation (invalid characters, padding, MIME mismatch)
- Correct file extensions on downloads

### Batch Mode
- Multi-file upload and drag/drop
- Table with filename, MIME, original size, Base64 size, inflation %
- Copy per-item output in selected mode

### Compression Helpers
- Optional resize before encode (max width/height)
- JPEG/WebP quality slider
- Optional PNG → WebP conversion for smaller payloads

### Productivity
- Clipboard image paste (where supported)
- Sticky action bar on mobile
- API/CLI snippets (JS, Node, Python)
- Local history (IndexedDB) with clear-all control

---

## Quick Start

1. Choose **Image → Base64** or **Base64 → Image**.
2. Upload an image or paste from clipboard.
3. Pick an output mode and copy or download.
4. For decoding, paste a Base64 string or data URL and save the image.

---

## Output Modes

- **Data URL**: `data:image/png;base64,...`
- **Raw Base64**: payload only
- **CSS**: `background-image: url(...)`
- **HTML**: `<img src="..." alt="Image" />`
- **JSON**: `{"image":"..."}`
- **Markdown**: `![Image](...)`

---

## Validation & Limits

- Image files only (`image/*`)
- Size guard: warn at ~5 MB, block over ~10 MB
- Base64 validation for bad characters and padding
- MIME mismatch detection during decoding
- Memory warning for large Base64 strings

---

## Privacy & Data Handling

- All encoding/decoding happens in the browser.
- No uploads or server processing.
- History is stored locally in IndexedDB on this device only.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions, optional image paste)
- File API + Blob API (uploads/downloads)
- Web Workers (Base64 encoding)
- Canvas API (resize/quality conversion)

Works on current Chrome, Firefox, Safari, and Edge. Clipboard image paste may require HTTPS and user permission.

---

## File Structure

```
app/(tools)/image-base64/
- client.tsx
- image-base64.worker.ts
- helpers.ts
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Dependencies

- `lucide-react` for icons

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

Manual checklist: `app/(tools)/image-base64/TESTING.md`
