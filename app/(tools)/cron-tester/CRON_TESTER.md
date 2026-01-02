# Cron Expression Tester — Assessment & Plan

## Current state
- Features: Validate 5- or 6-field cron; show next run times (configurable count); UTC toggle; sample presets; summary of fields; copy run list; local-only processing; safety caps to avoid runaway calculations.
- UX: Two-pane layout; status/errors; soft shadows; inline summary; reset and sample chips.
- Accessibility/SEO: aria-live status, labeled regions, focus-visible styles; metadata + FAQPage JSON-LD; on-page notes/privacy.

## Recent updates
- Added true 5-field semantics (DOM/DOW OR matching), step parsing for `*/n` and `a-b/n`, mixed lists/ranges, and optional `7` as Sunday.
- UTC mode now uses UTC getters for matching and formatting (no local time mix).
- Switched next-run computation to `cron-parser` for instant, iterator-based scheduling.
- Dialect clarified: Linux/Vixie 5-field cron with an optional seconds field (non-Quartz).
- Added human-readable schedule descriptions for common cron patterns.
- Added dialect + timezone dropdowns (Vixie/Quartz/GitHub Actions/AWS EventBridge) with timezone-aware previews.

## Gaps / Future ideas
- Add color-coded field validation (per-field error hints).
- Show cron expression tokens labeled inline (e.g., chips per field).
- Add Playwright smoke (validate sample, toggle seconds/UTC, copy runs).
- Support named months/days (JAN/MON) parsing.
