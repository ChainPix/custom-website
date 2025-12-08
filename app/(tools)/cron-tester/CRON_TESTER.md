# Cron Expression Tester — Assessment & Plan

## Current state
- Features: Validate 5- or 6-field cron; show next run times (configurable count); UTC toggle; sample presets; summary of fields; copy run list; local-only processing; safety caps to avoid runaway calculations.
- UX: Two-pane layout; status/errors; soft shadows; inline summary; reset and sample chips.
- Accessibility/SEO: aria-live status, labeled regions, focus-visible styles; metadata + FAQPage JSON-LD; on-page notes/privacy.

## Gaps / Future ideas
- Add color-coded field validation (per-field error hints).
- Show cron expression tokens labeled inline (e.g., chips per field).
- Add Playwright smoke (validate sample, toggle seconds/UTC, copy runs).
- Support named months/days (JAN/MON) parsing.
