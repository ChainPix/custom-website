# Base64 Encoder/Decoder – Assessment & Plan

## Update Note
- Switched Base64 to UTF-8-safe TextEncoder/TextDecoder over Uint8Array and fixed auto-mode to process the latest input value.
- Added strict vs lenient decode handling (whitespace/padding/Base64URL) and a toggle to preserve or clear the opposite panel.
- Added byte/ratio metrics plus Base64 validity feedback with first invalid character index.
- Added Base64URL output toggle with a convert action, plus file mode (drag/drop encode, data URI MIME detection, decode to file download).
- Added data URI preview for image/audio/pdf and a Detect action to choose encode vs decode automatically.
- Added worker-backed conversions with progress, keyboard shortcuts, swap-to-input actions, local history, and shareable hash links.
- Added output wrapping, input normalization, toast-based copy feedback, and cleaned up metadata strings.

## Current State (observed)
- Functionality: Single textarea; Encode/Decode/Clear buttons; separate encoded/decoded outputs with copy buttons. Uses `btoa`/`atob` wrapped with `encodeURIComponent`/`decodeURIComponent`. Text-only; no file/binary support.
- UX: No sample input, no auto-encode/decode, no download/export, no size guard. Generic errors only.
- Error handling: Decode error message is generic; no guidance on padding/malformed Base64; no limit on input length.
- Accessibility: No `aria-live` for errors/status; textarea relies on placeholder; outputs lack explicit labels.
- Performance: Synchronous; large inputs could stall UI.
- SEO: Page metadata only; no structured data or on-page FAQ/guidance.
- Testing: No manual checklist or sample data; no automation.

## Immediate Plan
- Add size guard and clearer errors for invalid Base64/padding.
- Add sample input button and optional auto-encode/decode toggle; add output download/copy-all.
- Add `aria-live` for status/errors; explicit labels for textarea and outputs.
- Add a short FAQ/guidance and consider simple structured data (FAQPage).
- Provide manual test checklist and sample inputs in `test-data/`.
- Sample inputs:
  - Encode sample: `https://example.com/api?token=abc123==`
  - Decode sample: `aHR0cHM6Ly9leGFtcGxlLmNvbS9hcGk/dG9rZW49YWJjMTIzPT0=`

## Future Ideas
- File/binary support (upload file → Base64, Base64 → file download).
- Batch mode (multi-line encode/decode); trim/normalize options.
- Playwright smoke test for encode/decode, errors, copy/download, and auto mode.
