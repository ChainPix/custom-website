# Data URI Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable

---

## Overview

Create and decode data URIs from text or files with MIME controls, base64/base64url support, previews, and inspector details. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Embed small assets into HTML/CSS (images, fonts, SVGs).
- Generate data URIs for tests, fixtures, and offline demos.
- Decode and inspect data URIs from APIs or config files.
- Compare payload changes across versions.

---

## Key Features

### Encode Mode
- Text to data URI with MIME type control.
- Base64 and base64url (URL-safe) encoding for UTF-8 text.
- Drag-and-drop file uploads (single file, 5 MB limit).
- Strip-prefix payload view with copy/download support.
- Smart MIME suggestions (JSON/SVG) and payload extension hints.
- Live size estimates + warnings for large data URIs.

### Decode Mode
- Validate data URI structure and payload encoding.
- Extract payload and reconstruct downloadable files.
- MIME/charset/base64 inspection and payload size details.

### Inspector & Preview
- Parsed header details (MIME, charset, base64 flag).
- Payload length + decoded byte size estimates.
- Preview for image/audio/video/PDF/text payloads.
- JSON formatting toggle in preview.

### Developer Workflows
- Copy-ready snippets: HTML img, CSS background, Markdown, fetch, and download link.
- History of the last 10 URIs with quick reload.
- Text payload diff between two history entries.

---

## Quick Start

1. Choose **Encode** to generate a data URI or **Decode** to inspect one.
2. Enter text or drop a file (Encode), or paste a full data URI (Decode).
3. Adjust MIME type and base64 options as needed.
4. Copy the URI/payload or download the reconstructed file.

---

## Validation and Limits

- **Text limit:** 20k characters for encoding.
- **File limit:** 5 MB for uploads.
- **MIME validation:** Requires `type/subtype` format.
- **Decode linting:** Detects missing comma separators, invalid MIME, invalid base64, and non-percent-encoded payloads.
- **Clipboard:** Requires a user gesture and HTTPS; failures show "Clipboard blocked, use Ctrl/Cmd+C".

---

## Privacy & Data Handling

- All processing is client-side; no uploads or server calls.
- History exists only in memory for the current session.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- File API + FileReader (uploads)
- TextEncoder/TextDecoder (UTF-8)
- Blob + URL APIs (downloads)

Tested on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/data-uri/
├── client.tsx
├── page.tsx
├── layout.tsx
├── README.md
└── TESTING.md
```

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

Manual checklist: `app/(tools)/data-uri/TESTING.md`

---

## Limitations

- Base64url is supported, but not all consumers accept base64url in data URIs.
- Large data URIs may break in some browsers, emails, or CSS contexts.
- Payload diffs are available for text/JSON payloads only.
