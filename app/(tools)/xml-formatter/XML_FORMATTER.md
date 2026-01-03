# XML Formatter & Validator — Assessment & Plan

## Current state
- Features: Paste XML, validate via DOMParser in a web worker, and beautify via DOM tree traversal (preserves mixed content, CDATA, comments, processing instructions, DOCTYPE) with 2/4 space indent; minify mode; inline mixed content toggle; format-on-paste + auto-format toggles; upload/drag-drop .xml/.xsd/.wsdl; copy input/output; diff view (original vs formatted); parse errors show line/column when available with jump-to-error highlight; reset to sample; guards for empty/very large input (~200KB); aria-live status and labeled regions; metadata + FAQPage JSON-LD; on-page How-to/privacy note.
- UX: Two-pane layout consistent with other tools; status/errors; soft shadows.
- Accessibility/SEO: aria labels/live region; output region labeled; focus-visible styles; per-tool metadata.

## Gaps / Future ideas
- Add trim/strip XML declaration toggle.
- Add minify option and configurable line wrapping.
- Surface parse error location (line/column) if available.
- Add Playwright smoke test for format/copy/download.
