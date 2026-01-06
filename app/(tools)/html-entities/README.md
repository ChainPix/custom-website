# HTML Entities Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-02-14

---

## Overview

Browser-based HTML entity encoder/decoder with Unicode-safe output, named/numeric modes, unsafe-only encoding, and fast decoding for large inputs. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Escape user input for safe HTML display
- Decode stored entities back to readable text
- Compare encoded vs decoded output with a diff view
- Batch-process `.txt`/`.html` files and download a zip
- Copy API-ready helpers for JS/TS, Python, or Java

---

## Key Features

### Encoding & Decoding
- Unicode-safe encoding using code points (handles emoji/non-BMP)
- Named entities when available (`&amp;`, `&lt;`, `&quot;`, `&apos;`, `&nbsp;`)
- Numeric decimal or hex entity output
- Unsafe-only mode to keep output readable (`& < > " '`, optional `/`)
- Fast entity decoder (no DOMParser)

### Performance & Responsiveness
- Web Worker for large decodes with progress indicator
- Debounced auto-run to avoid typing jank
- Large input warning for very big text

### Review & Productivity
- Diff view (before vs after) with highlights
- Entity count + input/output stats and timing
- Explicit copy buttons for input/output
- One-click swap for chaining encode/decode
- History (last ~10) with compare

### Batch & API
- Batch upload `.txt`/`.html`
- Download single output or a zip for multiple files
- API snippets for JS/TS, Python, and Java

---

## How to Use

1. Choose Encode or Decode.
2. Paste text or HTML, then click **Run** (or enable Auto-run).
3. Adjust encoding mode (named/numeric/hex) and unsafe-only options as needed.
4. Copy, download, or compare results with the Diff view.

---

## Privacy & Security

- All processing runs locally in your browser.
- No uploads or server processing.
- Encoding is for safely displaying text in HTML, not sanitizing unsafe HTML.
- Clipboard access requires HTTPS and a user gesture.

---

## Performance & Limits

- Large inputs show a warning and may process slower.
- Decoding large inputs uses a Web Worker and progress updates.
- Diff view on very large texts can be slower due to line alignment.

---

## Known Limitations

- Named entity list is intentionally small (common HTML entities only).
- Diff view is line-based (not a semantic HTML diff).
- Batch mode accepts only `.txt` and `.html`.

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- Blob/File APIs

Works on current Chrome, Firefox, Safari, and Edge.

---

## Dependencies

- `jszip` (batch zip downloads)

---

## File Structure

```
app/(tools)/html-entities/
- client.tsx                # UI, state machine, encode/decode logic
- html-entities.worker.ts   # Worker for large decode jobs
- page.tsx                  # SEO metadata + JSON-LD schemas
- layout.tsx                # Layout wrapper
- README.md                 # This documentation
- TESTING.md                # Manual test checklist
```
