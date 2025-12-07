# URL Parser – Assessment & Improvement Plan

## Current state
- Features: URL input with samples (basic/auth/port/multi-params), validation/guards (empty + 5k char limit), scheme warning; displays origin/protocol/username/password/host/port/pathname/fragment; query params with decoded/raw toggle; copy per-field and per-param; download params as JSON/CSV; copy full query string.
- UX: Reset + samples, per-field copy buttons, decoded/raw toggle, non-http scheme warning.
- Validation: Empty input and overlength warning; clear invalid URL error (requires absolute http/https); size guard skips overly long URLs.
- Accessibility: `aria-live` status, labeled results region, aria-labels on controls, focus-visible styles.
- Content/SEO: Page metadata + FAQPage JSON-LD; privacy note included in FAQ (runs locally).

## Gaps / Risks
- No auto-encode helper for building URLs; raw/decoded toggle only applies to params display.
- No download/export of full URL parts JSON; could add.
- Large/malformed edge cases beyond guard still rely on browser URL parsing; could add stricter scheme whitelist option.

## Immediate improvement plan
1) **UX & features**
   - Add builder/export of full URL parts JSON; optional auto-encode helper for params.
2) **Validation & safety**
   - Optional stricter scheme whitelist toggle beyond http/https; finer-grained length warning (params vs overall).
3) **Testing**
   - Keep `TESTING.md` aligned when new exports/helpers are added.
