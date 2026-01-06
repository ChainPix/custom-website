# cURL to Fetch Tool Documentation

- **Version:** 2.1.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based cURL converter that transforms real-world cURL commands into runnable fetch, axios, Python requests, or Go http.NewRequest snippets. Includes JSON body intelligence, multipart support, shareable local-only links, and a parsed preview panel. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Convert DevTools “Copy as cURL” into ready-to-run code
- Migrate legacy cURL scripts into fetch/axios snippets
- Debug headers, cookies, and bodies across environments
- Export runnable Node scripts for quick API testing
- Share conversions privately via URL hash

---

## Key Features

### Parsing & Fidelity
- Tokenizer handles quotes, escapes, line continuations, and ANSI-C $'..' strings
- Preserves header order and duplicates via Headers.append
- Supports URL flags (`--url`), `-G/--get`, `-d/--data-*`, `-F/--form`, `--data-urlencode`, cookies, referer, and user-agent
- JSON body intelligence: detects JSON by header or body shape
- Warnings for impactful flags (redirects, request-target, compressed, cookie jar)

### Output Targets
- fetch (browser) and fetch (Node 18+)
- axios
- Python requests
- Go http.NewRequest

### Developer Experience
- TS-friendly fetch output with RequestInit typing and optional `satisfies`
- Response parsing auto mode (JSON vs text) with manual override
- Copy variants: JS, TS, minimal, production (retry + timeout + AbortController)
- Runnable `.mjs` export with optional env placeholders
- Shareable links encoded in URL hash (local-only)

### UX & Safety
- Debounced instant convert (400ms) with manual Convert button
- Parsed panel showing URL/method/headers/body preview
- Redact secrets toggle for Authorization, cookies, and API key params
- Sample gallery: JSON, multipart, basic auth, -G query, cookies, @file body

---

## Quick Start

1. Paste a cURL command (including DevTools “Copy as cURL”).
2. Choose an output target and response mode.
3. Copy the snippet or export a runnable `.mjs` file.
4. Share a local-only link if needed.

---

## Supported cURL Flags

- Method: `-X`, `--request`, `--method`, `-I/--head`
- URL: `--url`, scheme-less hosts, localhost:port
- Headers: `-H/--header` (multi-line supported)
- Body: `-d/--data`, `--data-raw`, `--data-binary`, `--data-urlencode`
- Forms: `-F/--form`, `--form-string` (FormData output)
- Auth: `-u/--user` (Basic)
- Cookies: `-b/--cookie`, `-c/--cookie-jar`
- Other: `-G/--get`, `-A/--user-agent`, `-e/--referer`, `--request-target`, `--compressed`

Unsupported flags are surfaced in warnings when they change semantics.

---

## Output Modes

- **Standard**: async wrapper, status check, response parse
- **Minimal**: no wrapper, no response checks
- **Production**: retries + timeout + AbortController

---

## Validation & Limits

- Empty input and overlong commands show clear errors.
- URL detection prefers URL-like tokens and `--url`.
- GET mode (`-G`) moves data into the query string.
- Large inputs can exceed URL hash limits for share links.

---

## Privacy & Data Handling

- All parsing and conversion runs locally.
- Share links store the command in the URL hash only.
- Redaction masks Authorization headers, cookies, and API-key-like params.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- Blob API (downloads)
- URL/History APIs (share links)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/curl-to-fetch/
- client.tsx       # UI and UX controls
- parser.ts        # Tokenize, parse, and snippet builders
- page.tsx         # Metadata + JSON-LD schemas
- layout.tsx       # Layout wrapper
- README.md        # This documentation
- TESTING.md       # Manual test checklist
```

---

## Dependencies

- `lucide-react` for icons
- Native browser APIs (URL, Headers, FormData, URLSearchParams)

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Manual checklist: `app/(tools)/curl-to-fetch/TESTING.md`
- Unit + fuzz tests: `tests/curl-to-fetch.test.mjs`
- Snapshot corpus: `tests/fixtures/curl-to-fetch-corpus.json`
- Regenerate snapshots: `npm run snapshots:curl-to-fetch`

---

## Known Limitations

- Very large inputs may exceed URL length for share links.
- Some cURL flags have no direct fetch equivalent (e.g., request-target).
- Browser fetch cannot set certain headers (e.g., Host, User-Agent).
- Multipart file placeholders require replacing with real File/Blob data.

---

## Troubleshooting

**“No URL found”**
- Quote the URL or use `--url https://...`.

**Output doesn’t match my server**
- Check warnings for unsupported flags and header limitations.

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

---

## Roadmap

- Add explicit node-fetch import option
- Add request timing and HAR-style export
- Add advanced redaction presets for PCI/PII
