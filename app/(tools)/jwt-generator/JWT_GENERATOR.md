# JWT Generator – Assessment & Plan

## Current State (observed)
- Functionality: HS/RS/ES (256/384/512) + EdDSA signing with JSON payload + secret or keys; verification flow; JWKS import/export; PEM import/export; claims builder; payload diff; token inspector; share/export utilities; presets. Client-side only.
- UX: Sample payload buttons; algorithm selector; key management; secret generator + reveal + clear-on-exit; status updates in aria-live; claims time helpers with countdown.
- Validation: Payload must be valid JSON; inline line/column error; standard claim linting; warns on short HS secrets.
- Accessibility: Labeled regions, aria-live status, descriptive button labels.
- SEO/Content: On-page how-to and FAQ/privacy note.
- Testing: Manual checklist in `TESTING.md`; no automation.

## Immediate Improvement Plan
- UX: Add key detail view and a compact copy/export row for active JWKS.
- Accessibility: Improve focus states for key management controls.
- Testing: Add automated smoke coverage for signing + decode flows.

## Future Ideas
- Add alg auto-detect for verify flow and key rotation helpers.
- Add claim validation and JWT inspection helpers (expiry status, clock skew); add “sign/verify” mode split.
- Add Playwright smoke test for sign/copy/decode flows; add file upload/download for payload.

## Notes
- Base64URL encode/decode now uses chunked conversion with UTF-8 safe decoding.
- Auto-regenerate is debounced (350ms) and cancels stale signing work.
- Signing merges helper claims into a new payload and shows added/overridden claim info.
- Secret input defaults to password mode with a reveal toggle and optional clear-on-exit preference.
- Decode now validates base64url, safely parses JSON, and falls back to showing raw decoded text.
- Added HS/RS/ES (256/384/512) + EdDSA signing, verification, key generation, PEM import/export, and JWKS workflows.
- Added claims builder with time helpers, payload diff, token inspector, export snippets, and local presets.
- Refactored crypto/parsing helpers into a utility module with debounced regeneration and cleaner toast/copy state.
- Added safety UX: runs-locally badge, clear-secret control, and warnings for alg mismatch and expired tokens.
- Added expanded SEO metadata and structured data schemas (Breadcrumb, SoftwareApplication, HowTo, FAQ, WebPage).
