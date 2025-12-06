# URL Encoder/Decoder – Assessment & Plan

## Current State (observed)
- Functionality: Encode/decode a single input; separate encoded/decoded outputs. No bulk mode, no auto-clean, no URL validation.
- UX: Encode/Decode/Clear buttons + textarea. No example input, no auto-copy, no download/export.
- Error handling: Only generic decode error; no validation of malformed URLs or partial encodings; no size guard.
- Performance: Runs synchronously on click; fine for small inputs.
- Accessibility: No `aria-live` for errors/status; labels rely on placeholder; copy buttons rely on icons/text.
- SEO: Metadata on page, but no structured data; no FAQ or guidance beyond a tip.
- Testing: No manual checklist or automation.

## Immediate Plan
- Add validation and clearer errors for invalid encodings; add size guard for very large inputs.
- Add sample input button and optional “auto-encode/decode” toggle; add output download/copy-all.
- Add `aria-live` for errors/status; explicit labels for textarea and outputs.
- Provide manual test checklist and sample inputs in this folder.
- Add a short on-page FAQ or guidance and consider simple structured data.

## Future Ideas
- Bulk mode: multi-line encode/decode; encode only query params or path segments.
- URL validator/normalizer (e.g., add protocol, trim spaces).
- Shareable links (populate input via query param).
- Playwright smoke test for encode/decode, errors, and copy buttons.
