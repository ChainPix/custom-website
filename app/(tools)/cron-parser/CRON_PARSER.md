# Cron Parser – Assessment & Plan

## Current State (observed)
- Functionality: Accepts 5-field cron (m h dom mon dow), parses ranges/steps, shows summary text and next run times (local timezone). Reset button. Client-side only.
- UX: No sample presets (e.g., hourly, daily); no timezone selection; no field-by-field validation messages; no line-highlighting or visual timeline; no copy/download of results.
- Validation: Generic “Invalid field values” and “must have 5 fields”; does not surface which field failed; no guard for excessive run computations; no support for common 6/7-field crons (@reboot, seconds).
- Accessibility: No `aria-live` status; inputs/buttons lack explicit aria labels; output not labeled as a region; no status for copy/download.
- SEO/Content: Basic metadata only; no on-page how-to/FAQ/privacy note; no structured data.
- Testing: No manual checklist or sample crons; no automation.

## Notes
- Parsing: Step syntax now supports `*/n` by expanding the full field range before applying the step.

## Immediate Improvement Plan
- Validation & feedback: Add `aria-live` status; field-specific error messages; warn on large/invalid ranges; optional toggle for 6-field (seconds) support; cap iterations to avoid lockups; show timezone note.
- UX: Add sample buttons (e.g., every 5m, hourly, daily at 2am, weekdays 9-5, first of month); add copy/download next runs; show counts; add simple timeline/list with numbering; optional local/UTC toggle.
- Accessibility: Label input and output regions; aria-labels for buttons; announce errors/status; keep focus-visible styles.
- SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- Testing: Add `TESTING.md` with manual steps (valid cron, invalid field, 5 vs 6 fields if added, large input warning, copy/download).

## Future Ideas
- Support common shorthands (@daily/@weekly/@monthly) and 6/7-field cron syntax.
- Visual calendar preview of next N runs; export to .ics.
- Validate against specific schedulers (Quartz/CRON_TZ) with presets.
- Persist last cron or presets in localStorage (opt-in).
- Add Playwright smoke test for parsing, errors, and sample buttons.
