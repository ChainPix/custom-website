# PDF → Text – Assessment & Plan

## Current State (observed)
- Functionality: Upload-only (PDF). Extracts text with pdf.js worker; shows filename, basic parsing spinner, copy button. No download of extracted text, no drag-and-drop overlay state, no multi-file queue.
- UX: States limited to “Parsing” text; no size guard/validation, no visible error for oversized files. No option to trim whitespace or normalize line breaks. No success toast; copy only.
- Performance: Parses entire PDF synchronously in main thread; no chunking/worker offload beyond pdf.js worker. No limit on pages/size besides recommended text.
- Accessibility: No `aria-live` for errors/status; copy button lacks status text; drop label uses hidden input but no keyboard-trigger guidance; output area has no role/label.
- SEO: No tool-specific structured data; relies on page metadata only. No sample PDF link.
- Testing: No manual checklist or automation; no sample PDFs in repo.

## Immediate Improvement Plan
- Add size/type validation with user-friendly errors; show progress/state updates via `aria-live`.
- Add drag-and-drop overlay with visual feedback and keyboard-activated upload button.
- Provide download of extracted text and a “Clear”/“Normalize whitespace” option.
- Add optional line breaks normalization and trimming; warn on image-only PDFs (no text extracted).
- Add manual test checklist + sample PDF in `test-data/`.
- Add structured data (SoftwareApplication) if not already in page metadata.
- Accessibility: label output region, add `aria-live` for parsing/errors, and explicit button labels.

## Future Enhancements
- OCR fallback (e.g., client-side via Tesseract) for scanned PDFs with opt-in toggle.
- Multi-file queue and batch download.
- Performance guardrails: page limit slider, skip images, progress per page.
- Playwright smoke test covering upload, parse, copy, download, and error cases.
