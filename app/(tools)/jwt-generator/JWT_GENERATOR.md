# JWT Generator – Assessment & Plan

## Current State (observed)
- Functionality: HS256 signing with JSON payload + secret; shows signed JWT and decoded header/payload; reset and copy token. Client-side only.
- UX: No presets or sample secrets; no expiry/iat fields helper; no key length guidance; no copy/download for header/payload; no warning about secret strength; no toggle for different algos; no error messaging for malformed JWT on decode path; no status or aria-live.
- Validation: Minimal; payload must be valid JSON; secret can be empty; no length warning; no issuer/audience claims guidance.
- Accessibility: No `aria-live` status; buttons lack explicit aria labels; regions not labeled.
- SEO/Content: Metadata present; no on-page how-to/FAQ/privacy note; no structured data; no note about local-only security.
- Testing: No manual checklist or sample payloads; no automation.

## Immediate Improvement Plan
- Validation & feedback: Add `aria-live` status; friendly errors for invalid payload or decode; warn on empty/short secret; note local-only; optional issued-at/expiry helpers.
- UX: Add sample payload/secret buttons; copy/download token and decoded header/payload; show token length; add claim presets (iat/exp/iss/aud) and expiry shortcut; add HS256-only note; optional auto-regenerate on payload change toggle.
- Accessibility: Label inputs/output regions; aria-label buttons; announce copy/download/status.
- SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- Testing: Add `TESTING.md` with manual steps (valid payload, invalid JSON, empty secret warning, copy/download, decoded view).

## Future Ideas
- Support additional algos (RS256/ES256) with key generation/import; keypair upload; JWK support.
- Add claim validation and JWT inspection helpers (expiry status, clock skew); add “sign/verify” mode split.
- Add Playwright smoke test for sign/copy/decode flows; add file upload/download for payload.

## Notes
- Base64URL encode/decode now uses chunked conversion with UTF-8 safe decoding.
- Auto-regenerate is debounced (350ms) and cancels stale signing work.
- Signing merges helper claims into a new payload and shows added/overridden claim info.
- Secret input defaults to password mode with a reveal toggle and optional clear-on-exit preference.
- Decode now validates base64url, safely parses JSON, and falls back to showing raw decoded text.
