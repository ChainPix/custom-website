# Hash Generator – Assessment & Plan

## Current State (observed)
- Functionality: Hashes text to SHA-256 or SHA-1 using Web Crypto; copy and clear buttons; simple textarea input.
- UX: No sample input, no binary/file hashing, no multi-algorithm selection beyond two choices, no auto-hash toggle; no status/feedback when hashing completes.
- Error handling: Minimal—alerts on empty input; no size guard, no clear messaging for unsupported browsers.
- Accessibility: Output not labeled as a region; no `aria-live` for status/errors; buttons lack broader context; no keyboard shortcuts.
- Performance: Web Crypto is fast for text, but no streaming for large payloads and no size warnings.
- SEO: Basic metadata only; no on-page guidance, FAQ, or structured data (FAQPage/SoftwareApplication); no trust/privacy note.
- Testing: No manual checklist, sample inputs, or automation.

## Immediate Improvement Plan
- ✅ Validation & feedback: Add size guard and friendlier error text (empty/oversized/unsupported algorithm); show status via `aria-live`.
- UX options: Add sample input, optional auto-hash on input change, and a “Copy all”/download option for output.
- Accessibility: Label output as `role="region"` with heading, add `aria-live` for status/errors, ensure buttons are clearly labeled.
- SEO/Content: Add brief guidance + FAQ block; consider FAQPage JSON-LD and a short privacy note (“runs locally via Web Crypto”).
- Testing: Add `TESTING.md` with manual steps and sample inputs (short text, long text).

## Future Ideas
- More algorithms (SHA-512, MD5 for legacy checks with warning), HMAC with user-provided secret (client-side only).
- File hashing (drag-drop upload with type/size guard) and hex/base64 output options.
- Streaming/worker path for very large inputs to avoid UI jank.
- Playwright smoke test covering hash, copy/download, validation, and auto-hash toggle.
