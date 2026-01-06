# JWT Decoder Tool Documentation

- **Category:** Security / Developer Tools
- **Status:** ✅ Stable

---

## Overview

Browser-based JWT decoder and inspector for JWS/JWE structure, claim analysis, optional signature verification, and export workflows. Everything runs locally in your browser; tokens are not uploaded.

### Primary Use Cases
- Inspect JWT headers and payloads for debugging auth issues
- Detect JWS vs JWE structure quickly
- Validate signature authenticity with a secret, public key, or JWKS
- Compare two tokens to find claim differences
- Share safely with redacted payload exports

---

## Key Features

### Decoding & Structure
- ✅ **Deterministic parsing** - Strict JWS (3 parts) vs JWE (5 parts)
- ✅ **JWE banner** - Clear notice when payload is encrypted
- ✅ **Unicode-safe decode** - base64url → Uint8Array → TextDecoder
- ✅ **Granular errors** - Separate structure/header/payload error messages

### Claim Intelligence
- ✅ **Relative timestamps** - exp/iat/nbf show "in 2h" or "3 days ago"
- ✅ **Expiry and validity cues** - expired / not active yet badges
- ✅ **Security lint** - warns for `alg: none`, missing exp, skew, long expiry
- ✅ **Audience and issuer helpers** - display aud type and issuer formatting

### Verification (Optional)
- ✅ **HMAC** - HS256/384/512 with secret input
- ✅ **Public key** - RS256/ES256 PEM verification
- ✅ **JWKS** - fetch keys by `kid` and verify client-side
- ✅ **Clear outcomes** - ✅ valid / ❌ invalid / ⚠️ cannot verify

### Diff & Share
- ✅ **Diff mode** - Compare two tokens (header + payload diffs)
- ✅ **Share-safe view** - Redact sensitive claims by default
- ✅ **One-click copy** - Redacted payload, cURL header, env var
- ✅ **Markdown report** - Export a shareable bug-ticket report

### UX & Productivity
- ✅ **Tree view** - Collapsible JSON viewer
- ✅ **Search/filter** - Type to filter claims
- ✅ **Click-to-copy claims** - Copy individual values in tree view
- ✅ **Deferred parsing** - Smooth typing for large tokens

---

## Quick Start

1. Paste a JWT into the input.
2. Review header/payload or switch to tree view.
3. (Optional) Verify the signature or compare with a second token.
4. Copy or export the results.

---

## Privacy & Data Handling

- All decoding runs **client-side** in your browser.
- No token uploads or server processing.
- Optional local persistence is **off by default** and requires enabling "Remember token".
- JWKS verification fetches keys from the provided URL (network request from the browser).

---

## Validation & Limits

- JWS must be **3 segments**; JWE must be **5 segments**.
- Tokens with empty segments (extra dots) are invalid.
- JWE payloads cannot be decoded without decryption.
- Large input warning appears for unusually large tokens.

---

## Security Notes

- Decoding does **not** imply trust. Always verify signatures when required.
- Do not paste production secrets unless you fully trust your environment.
- Redaction masks common sensitive fields but is not a formal DLP system.

---

## Known Limitations

- No JWE decryption (payload remains encrypted).
- JWKS verification requires a `kid` in the header and network access.
- ES/RS verification support is limited to RS256 and ES256.
- Tree view is read-only (no inline editing).

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- Web Crypto API (verification)
- Blob API (downloads)
- URL/Fetch APIs (JWKS)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/jwt-decoder/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Dependencies

- `lucide-react` for icons
- Web Crypto API for verification
- `json-utils` for tree rendering

---

## Testing

Manual scenarios are documented in `app/(tools)/jwt-decoder/TESTING.md`.
