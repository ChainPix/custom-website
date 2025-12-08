# WebP Image Converter — Assessment & Plan

## Current state
- Features: Upload/drag-drop JPG/PNG/GIF (max 10MB); convert to WebP in-browser; quality slider; preview input/output; copy data URL; download WebP; reset; aria-live status and labeled regions.
- Validation: File type/size guards; browser support check (throws if WebP export unsupported); clear errors.
- UX: Two-pane layout consistent with other tools; status text; size pill for output; soft shadows.
- Accessibility/SEO: aria labels, live region, labeled output region; metadata and FAQPage JSON-LD in page.tsx; on-page notes/privacy.

## Gaps / Future ideas
- Add drag-hover state and multi-file queue/batch convert.
- Optional “strip data URL prefix” copy helper.
- Allow custom filename override; show input/output sizes more prominently.
- Add Playwright smoke (upload sample, convert, copy/download).
