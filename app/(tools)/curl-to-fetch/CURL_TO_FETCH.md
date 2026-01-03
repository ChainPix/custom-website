# cURL → Fetch Converter — Assessment & Plan

## Current state
- Features: Paste a cURL command; converts URL, method, headers, body into a fetch snippet; wrap-in-async toggle; pretty options; copy/download output; sample GET/POST presets; empty/length guards; `aria-live` status with labeled regions.
- Parsing: Tokenizes quoted args; supports -X/--request, -H/--header, -d/--data/--data-raw/--data-binary, --compressed (ignored), -u/--user → Basic auth header; body implies POST if method missing.
- UX: Two-column layout with status text; preset chips; soft shadows consistent with other tools.
- Accessibility/SEO: aria labels, live region, headings; metadata + FAQPage JSON-LD in page.tsx; notes on local processing.
- Body handling: JSON content-types now emit `body: JSON.stringify({...})` with object literals, while non-JSON bodies stay as string literals.
- Tokenizer/parse: Adds ANSI-C `$'...'` support, multiline headers, caret line continuations, and basic handling for multipart forms and `--data-urlencode`, with notes when file placeholders are needed.
- Pretty options: Compact output no longer collapses whitespace inside string literals to avoid mangling payloads.
- Headers: Preserve ordering and duplicates by emitting `Headers.append(...)`, with cookie flags mapped to explicit `Cookie` headers.
- URL detection: Supports `--url` and `-I/--head`, and prefers URL-like tokens (including no-scheme hosts like `example.com` or `localhost:8080`).
- Warnings: Flags like `-G`, `-L`, `--compressed`, `--cookie-jar`, and `--request-target` now surface explicit notes about behavior differences in fetch.
- Parsing: Honors `--user-agent`/`--referer`, detects JSON by header or body shape, and warns on multiple JSON `-d` bodies.
- Output: Added target selection (fetch/axios/Python/Go), response parsing mode, TS-friendly fetch options, and copy variants (JS/TS/minimal/production).
- UX: Debounced auto-convert, parsed preview panel with redaction toggle, and expanded sample gallery for multipart/auth/cookies/-G/file bodies.
- Quality: Parser moved into a standalone module with snapshot and fuzz tests plus a 50+ command corpus; errors now guide missing URLs and multipart handling.
- Advanced mode: Supports DevTools “Copy as cURL” pastes, shareable URL hashes, and runnable `.mjs` exports with env placeholders.

## Gaps / Future ideas
- Optional “axios/node fetch” variants or TS fetch typing.
- Detect JSON bodies and emit `JSON.stringify` helper when appropriate.
- Add simple Playwright smoke (convert sample, copy).
- Add explicit note for auth headers (redact/seal secret?) and optional redact-output toggle.
- Allow setting mode/caching/credentials flags if present in cURL equivalents.
