# Data URI Converter – Assessment & Plan

## Current state
- Features: Text → data URI with base64 toggle; file upload (5MB guard); MIME input; strip-prefix toggle; copy URI, copy decoded payload, download URI; reset sample.
- UX: Size/type guards, base64 toggle, prefix stripping, per-action feedback; on-page How-to/FAQ; sample defaults; download option.
- Validation: Empty/length guard for text, 5MB file cap, unknown MIME warning, decode errors handled.
- Accessibility: `aria-live` status, aria-labels on controls, focus-visible styles, labeled inputs.
- Content/SEO: Metadata present; FAQPage JSON-LD injected; on-page How-to + FAQ with privacy note (runs locally).
- Note: Text base64 encoding/decoding now uses UTF-8-safe `TextEncoder`/`TextDecoder` instead of deprecated escape hacks.
- Note: File dropzone now supports drag-and-drop with visual feedback, not just file picking.
- Note: Strip-prefix now affects copy, download, and decoded-copy actions.
- Note: Data URI parsing now splits on the first comma to handle mediatype parameters safely.
- Note: File uploads now clarify that they always generate base64 data URIs (base64 toggle disabled).
- Note: File uploads now prefer the file's MIME type unless the MIME field was edited.
- Note: Copy failures now surface an error message for clipboard permission issues.
- Note: Drag-and-drop now rejects multiple files with a clear error message.
- Note: Added an Inspector panel showing parsed data URI parts and size estimates.
- Note: Added a Preview panel for common media and text MIME types.
- Note: Download now supports payload vs full URI files when strip-prefix is enabled.
- Note: Added developer snippet buttons for HTML/CSS/Markdown and fetch workflows.
- Note: Added history with payload compare and quick reload for the last 10 URIs.
- Note: Added live size estimates with warnings for large data URIs.
- Note: Added an optional base64url toggle for URL-safe base64 payloads.
- Note: Added smart MIME suggestions (JSON/SVG) and smarter payload download extensions.
- Note: Added a decode mode with validation, payload extraction, and file reconstruction.
- Note: Added validation linting for MIME strings, base64 payloads, commas, and percent-encoding.
- Note: Added JSON formatting toggle, output clear action, and safer decoded copy/download handling.

## Gaps / Risks
- No drag-and-drop overlay or drop feedback.
- No preview of decoded output; only copy decoded.
- No CSV/JSON export of settings; no per-MIME preset list.

## Immediate improvement plan
1) **UX**
   - Add drag-and-drop overlay with visual feedback; decoded preview box.
2) **Features**
   - Preset MIME list; optional export of payload/settings.
3) **Testing**
   - Extend `TESTING.md` if drag/drop and preview are added.
