# JWT Generator Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-01-15
- **Status:** ✅ Stable

---

## Overview

Browser-based JWT generator and verifier with HS/RS/ES (256/384/512) and EdDSA support. Build payloads, manage keys, inspect tokens, and verify signatures entirely client-side. No uploads, no server processing.

### Primary Use Cases
- Sign JWTs for local testing across HMAC and asymmetric algorithms
- Verify JWT signatures with secrets or public keys
- Inspect header/payload segments and token sizing
- Import/export JWKS or PEM keys for realistic workflows
- Share tokens as .env or Authorization header snippets

---

## Key Features

### Signing & Verification
- HS/RS/ES (256/384/512) + EdDSA signing
- Verify signatures with HMAC secrets or public keys
- alg mismatch warnings and expired token warnings

### Claims Builder
- Standard claims: `sub`, `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`
- Time helpers (15m/1h/7d) with absolute timestamps + countdown
- Payload diff: user payload vs final signed payload

### Key Management
- Generate HMAC secrets with configurable charset/length
- Generate RSA/EC keypairs in-browser
- Import/export JWKS and PEM (PKCS8 private, SPKI public)

### Token Inspector & Exports
- Colored segments with per-segment copy
- Byte size stats for header/payload/signature
- Export .env snippet or Authorization header
- Local presets (stored in `localStorage`)

---

## Quick Start

1. Paste a JSON payload.
2. Select an algorithm and provide a secret or key.
3. Use the claims builder to set standard claims.
4. Generate the token and inspect it.
5. Paste a token into Verify to check the signature.

---

## Validation & Warnings

- Inline JSON parse errors with line/column detail
- Claim linting (type checks for `sub`, `iss`, `aud`, `jti`)
- Time warnings: `exp` in the past, `iat > exp`, `nbf > exp`
- Header `alg` mismatch warnings for signing/verification

---

## Privacy & Data Handling

- All processing runs locally in your browser.
- Secrets are never uploaded.
- Default mode does not persist secrets.
- Presets are stored locally in `localStorage`.

---

## Browser Compatibility

Requires modern browsers with:
- WebCrypto (HMAC, RSA, ECDSA, Ed25519 support varies by browser)
- Clipboard API for copy actions
- Blob API for downloads

Works on current Chrome, Firefox, Safari, and Edge. EdDSA depends on WebCrypto support.

---

## File Structure

```
app/(tools)/jwt-generator/
- client.tsx
- page.tsx
- layout.tsx
- utils.ts
- README.md
- TESTING.md
```

---

## Dependencies

- `lucide-react` for icons
- Native WebCrypto APIs

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

Manual checklist: `app/(tools)/jwt-generator/TESTING.md`

---

## Limitations

- Claim validation is advisory only; it does not enforce semantics.
- EdDSA support depends on browser WebCrypto availability.
- PEM import requires PKCS8 (private) and SPKI (public) formats.

---

## Troubleshooting

**Signature verification fails**
- Ensure algorithm matches the token header.
- Confirm key type (public vs private) and format (PEM/JWKS).

**Invalid JSON error**
- Payload must be a JSON object; fix line/column issues shown.

**EdDSA not supported**
- Use HS/RS/ES algorithms or a browser with Ed25519 support.

---

## Roadmap

- Auto-detect verify algorithm from token header
- Key rotation helpers and active key detail view
- Optional verification of claim timing (exp/nbf) with leeway
