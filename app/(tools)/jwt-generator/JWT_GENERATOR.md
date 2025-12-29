# JWT Generator – Assessment & Plan

## Current State (observed)
- Functionality: HS256/RS256/ES256/EdDSA signing with JSON payload + secret or keys; JWKS import/export; claim helpers with final payload diff; signed JWT output; decoded header/payload with raw fallback; copy/download; reset; auto-regenerate. Client-side only.
- UX: Sample payload buttons; algorithm selector; key management; secret warning + reveal + clear-on-exit; status updates in aria-live.
- Validation: Payload must be valid JSON; warns on short HS secrets; no claim validation or verification flow.
- Accessibility: Labeled regions, aria-live status, descriptive button labels.
- SEO/Content: On-page how-to and FAQ/privacy note.
- Testing: Manual checklist in `TESTING.md`; no automation.

## Immediate Improvement Plan
- Validation & feedback: Add verification mode and clearer errors for missing keys or unsupported algorithms.
- UX: Add key detail view and a compact copy/export row for active JWKS.
- Accessibility: Improve focus states for key management controls.
- Testing: Add automated smoke coverage for signing + decode flows.

## Future Ideas
- Add verification mode, key rotation helpers, and JWKS validation tooling.
- Add claim validation and JWT inspection helpers (expiry status, clock skew); add “sign/verify” mode split.
- Add Playwright smoke test for sign/copy/decode flows; add file upload/download for payload.

## Notes
- Base64URL encode/decode now uses chunked conversion with UTF-8 safe decoding.
- Auto-regenerate is debounced (350ms) and cancels stale signing work.
- Signing merges helper claims into a new payload and shows added/overridden claim info.
- Secret input defaults to password mode with a reveal toggle and optional clear-on-exit preference.
- Decode now validates base64url, safely parses JSON, and falls back to showing raw decoded text.
- Added RS256, ES256, and EdDSA signing with key management plus JWKS import/export.
