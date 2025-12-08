# cURL → Fetch Converter — Assessment & Plan

## Current state
- Features: Paste a cURL command; converts URL, method, headers, body into a fetch snippet; wrap-in-async toggle; pretty options; copy/download output; sample GET/POST presets; empty/length guards; `aria-live` status with labeled regions.
- Parsing: Tokenizes quoted args; supports -X/--request, -H/--header, -d/--data/--data-raw/--data-binary, --compressed (ignored), -u/--user → Basic auth header; body implies POST if method missing.
- UX: Two-column layout with status text; preset chips; soft shadows consistent with other tools.
- Accessibility/SEO: aria labels, live region, headings; metadata + FAQPage JSON-LD in page.tsx; notes on local processing.

## Gaps / Future ideas
- Optional “axios/node fetch” variants or TS fetch typing.
- Detect JSON bodies and emit `JSON.stringify` helper when appropriate.
- Add simple Playwright smoke (convert sample, copy).
- Add explicit note for auth headers (redact/seal secret?) and optional redact-output toggle.
- Allow setting mode/caching/credentials flags if present in cURL equivalents.
