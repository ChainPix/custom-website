# Image → Base64 – Assessment & Plan

## Current state (after recent updates)
- Features: Two-way tabs (Image → Base64, Base64 → Image), batch mode, smart output modes (data URL/raw/CSS/HTML/JSON/Markdown), compression helpers, decode validation, and API/CLI snippets for JS/Node/Python.
- UX: Output mode pills, batch inflation table, history panel with local-only IndexedDB storage and clear-all control, memory-size warnings, sticky mobile action bar, clipboard paste for images, and copy-failure hints.
- Downloads: Preserve original filename with correct extension when saving output images or Base64 text.
- Performance: Worker-based Base64 encoding with progress updates; object URL previews and collapsed output; warns on large inputs to avoid freezes.
- Accessibility: `aria-live` status, labeled preview/output regions, explicit aria-labels on controls, keyboard dropzone activation, focus states via base styles.
- Content/SEO: Page metadata plus FAQPage JSON-LD; How-to + FAQ section; local-processing reassurance.

## Remaining gaps / risks
- Extremely large files still blocked; decoding Base64 happens on the main thread; history storage can grow if users never clear it.
- No text-to-image option (future: allow pasting a data URI to preview).
- No max-dimension guidance; currently size-only guard.

## Next steps (short)
1) Consider chunked/streamed reading for very large files (optional enhancement).
2) Add optional max-dimension guidance or resize hint for huge images.
3) Add text-input-to-image preview for data URIs pasted directly.

## Testing
See `TESTING.md` for manual scenarios:
- Small PNG/JPG upload → preview and Base64 shown; copy/download works.
- Non-image file blocked with clear error.
- Oversized image shows warning/blocks per limit.
- Drag-and-drop and keyboard activation of upload.
- Status announcements via `aria-live`; output region labeled.
- Download Base64 txt and decoded image produce valid files.
