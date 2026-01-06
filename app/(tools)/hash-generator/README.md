# Hash Generator Tool Documentation

- **Version:** 1.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-01-05
- **Status:** ✅ Stable

---

## Overview

Hash text and HMACs locally in the browser using Web Crypto. Supports SHA-256, SHA-512, and legacy SHA-1, plus output formats for hex, Base64, and Base64URL. Includes batch hashing, compare mode, and verification helpers without sending data to a server.

### Primary Use Cases
- Verify payload integrity (hash and compare)
- Generate HMAC signatures with local-only secrets
- Batch hash multiple lines for quick checks
- Create hex/Base64 outputs for API and tooling workflows

---

## Key Features

### Core Hashing
- SHA-256, SHA-512, and legacy SHA-1
- HMAC mode with secret input and show/hide controls
- Auto-hash with debounce and stale-result protection

### Output & Verification
- Hex (uppercase/lowercase), Base64, Base64URL
- Compare mode for expected hash verification
- Copy hash, copy verification command, and download output

### Power-User Helpers
- Batch hashing (one hash per line)
- Prefix, suffix, and salt helpers
- Input stats (character count, byte estimate) and timing

---

## Quick Start

1. Paste or type text into the input box.
2. Choose algorithm and output format (hex/Base64/Base64URL).
3. Optional: switch to HMAC and add a secret key.
4. Generate, compare, copy, or download the output.

---

## Output Formats

- **Hex:** Lowercase or uppercase.
- **Base64:** Standard Base64 encoding.
- **Base64URL:** URL-safe Base64 (no padding).

---

## Validation and Limits

- Input size is capped at 100,000 characters for responsiveness.
- SHA-1 is available for legacy checks only; avoid for security-sensitive use.
- Compare mode is disabled for batch hashing to prevent ambiguity.
- Copy command is available for single-line hash mode only.

---

## Privacy & Data Handling

- All hashing runs locally in your browser via Web Crypto.
- No uploads, no server storage, no logging.
- HMAC secrets stay in the session and can be cleared at any time.

---

## Browser Compatibility

Requires modern browsers with:
- Web Crypto (`crypto.subtle`)
- Clipboard API
- Blob API (downloads)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/hash-generator/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Dependencies

- Web Crypto API (browser-provided)
- lucide-react (icons)

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Manual: `app/(tools)/hash-generator/TESTING.md`

---

## Troubleshooting

**Web Crypto unavailable**
- The browser blocks `crypto.subtle`. Use a modern browser or secure context (HTTPS).

**Unsupported algorithm**
- Some environments may not support SHA-1/HMAC combinations; switch to SHA-256 or SHA-512.

**HMAC import failure**
- Ensure a secret is provided and the selected algorithm supports HMAC in your browser.

---

## Limitations

- Web Crypto hashing is not streaming; very large inputs are constrained by the 100,000 character cap.
- File hashing is not supported yet (text input only).
- SHA-1 is legacy and should not be used for security-critical workflows.
