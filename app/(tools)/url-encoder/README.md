# URL Encoder & Decoder Tool Documentation

- Version: 1.0.0
- Category: Developer Tools
- Last Updated: 2026-01-03
- Status: Stable
- SEO Status: Advanced (5 JSON-LD schemas, expanded metadata)

---

## Overview

Browser-based URL encoder/decoder with component and full URL modes, querystring support, batch processing, and a built-in URL parser. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Encode query parameters safely for API calls or redirects
- Decode percent-encoded URLs for debugging
- Batch-convert lists of parameters or URLs line-by-line
- Inspect and edit URL query parameters
- Compare encoded and decoded outputs side-by-side

---

## Key Features

### Encoding and Decoding Modes
- Component mode (`encodeURIComponent`) for parameter values
- Full URL mode (`encodeURI`) for full URLs
- Querystring mode to encode spaces as `+` and decode `+` to space
- Safe decode with invalid percent index reporting
- Optional lenient decode for stray `%` sequences

### Power Tools
- Auto-detect encode vs decode with confidence hint
- Swap outputs or move output back into input
- Batch mode (one value per line)
- Highlight changes in output (percent tokens, spaces, special chars)

### Parsing and Productivity
- URL parser with editable params and rebuild
- History (last 10) with optional localStorage toggle
- Keyboard shortcuts: Ctrl/Cmd+Enter to run, Ctrl/Cmd+Shift+C to copy
- Timestamped downloads with TXT/JSON/CSV for batch output

### UX and Safety
- Live input size counter with 512KB guard
- Clear error states with specific decode index
- Copy buttons with status feedback

---

## Quick Start

1. Paste a URL or text into the input.
2. Choose Component, Full URL, or Querystring mode.
3. Click Encode or Decode (or Auto-detect).
4. Copy or download the output.

---

## Options and Modes

- Auto mode: encode or decode on change
- Batch mode: treat each line as a separate value
- Querystring mode: spaces as `+`, plus decodes to space
- Lenient decode: fixes stray `%` characters
- Highlight changes: show percent tokens and special chars

---

## Export Formats

- TXT: raw output
- JSON (batch): JSON array of lines
- CSV (batch): `index,value` rows

---

## Validation and Limits

- Input size is capped at 512KB (client-side guard)
- Invalid percent sequences show the exact failing index
- Batch decode reports the line number that failed

---

## Privacy and Data Handling

- Runs 100% client-side
- No uploads or server storage
- Optional history uses localStorage and can be disabled

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy)
- Blob API (downloads)
- URL API (parser)
- TextEncoder (size measurement)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/url-encoder/
- client.tsx
- page.tsx
- layout.tsx
- use-url-codec.ts
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
- Open Graph and Twitter cards with images
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

Manual checklist: `app/(tools)/url-encoder/TESTING.md`

---

## Troubleshooting

**Decode fails with an index error**
- The input contains a stray `%` or malformed percent sequence.

**Plus signs are not treated as spaces**
- Enable Querystring mode.

**Auto-detect picks the wrong action**
- Use Encode or Decode directly when the input is ambiguous.

**Download format is fixed to TXT**
- Batch mode is required to enable JSON/CSV exports.

---

## Roadmap

- Optional URL validation/normalization
- Shareable links that prefill input
- Expanded export formats for batch mode
