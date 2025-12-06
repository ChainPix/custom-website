# JWT Decoder – Assessment & Plan

## Current State (observed)
- Functionality: Decodes header/payload of a JWT (base64url) and shows claims; copy buttons per section; basic claim highlights (iss/sub/exp) with human-readable exp.
- UX: No sample token; no signature section or “not verified” warning near outputs; no auto-detect of structural issues beyond simple count; no JSON formatting/pretty toggle; no download/share; no status/warnings or input size guard.
- Validation: Minimal—only checks token parts count; no inline errors for malformed base64; no exp clock skew warning; no empty-input guidance.
- Accessibility: No `aria-live` status; output regions not labeled; no keyboard focus states indicated; copy status only via button text change.
- SEO/Content: Basic copy only; no how-to/FAQ; no privacy note that decoding is local; no structured data.
- Testing: No manual checklist or sample JWTs; no automation.

## Immediate Plan
- ✅ Validation & feedback: Add `aria-live` status, empty/invalid format messaging, size advisory, and clear “signature not verified” warning. Show decode errors for header/payload separately.
- UX: Add sample JWT button, copy-all/download JSON outputs, and optional auto-format/pretty toggle. Highlight exp/nbf as expired/not-yet-valid with color cues; add signature segment display.
- Accessibility: Label outputs as regions, add aria labels for controls, and keep focus states; announce status for copy/clear.
- SEO/Content: Add how-to + FAQ, privacy note (client-side only), and FAQPage JSON-LD.
- Testing: Add `TESTING.md` with manual steps (valid JWT, malformed, expired token, copy/download).

## Future Ideas
- Add JWT validation with JWKS/secret (optional, client-side) with clear security caveats.
- Add support for JWE header display (without decryption) and structured claim view with search/filter.
- Worker/off-main-thread decoding for very large tokens; Playwright smoke test for main flows.
