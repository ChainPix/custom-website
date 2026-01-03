# Image → Base64 – Assessment & Plan

## Current state (after recent updates)
- Features: Upload via click/drag (keyboard-activatable), image-only check with size guard (warn 5–10 MB, block >10 MB), preview via object URL, Base64 output with strip-prefix toggle and collapsed preview, sample PNG loader, copy/download Base64, download decoded image, clear, inline tip, status/warning messages.
- UX: Two-column layout; dropzone shows drag state; stats show file size/MIME and data URI lengths.
- Performance: Worker-based Base64 encoding with progress updates; warns on large inputs to avoid freezes.
- Accessibility: `aria-live` status, labeled preview/output regions, explicit aria-labels on controls, keyboard dropzone activation, focus states via base styles.
- Content/SEO: Page metadata plus FAQPage JSON-LD; How-to + FAQ section; local-processing reassurance.

## Remaining gaps / risks
- Extremely large files still blocked; decoding Base64 happens on the main thread.
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
