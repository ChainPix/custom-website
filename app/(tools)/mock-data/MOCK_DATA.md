# Mock Data Generator — Assessment & Plan

## Current state
- Features: Generate fake data for user or transaction schemas; formats: JSON/CSV/SQL; count capped at 500; pretty-print toggle for JSON; copy/download output; reset; aria-live status with labeled output region.
- Data: Simple random generators for ids, names, emails, cities, job titles, dates, amounts, statuses.
- UX: Minimal two-pane layout with soft shadows; status/errors shown; consistent buttons.
- Accessibility/SEO: aria labels/live region; headings and output region labeled; metadata + FAQPage JSON-LD in page.tsx; on-page notes/privacy.

## Gaps / Future ideas
- Add custom field builder (define columns/types) and more presets (addresses, products, SKUs).
- Add seed support for reproducible output (user-provided seed, deterministic RNG).
- Add “copy as types” (TypeScript interface) and “faker-like snippets.”
- Add Playwright smoke test for generate/copy/download.
