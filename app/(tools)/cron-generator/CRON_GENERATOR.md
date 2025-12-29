# Cron Generator – Assessment & Plan

## Current state
- Features: 5/6-field cron (optional seconds), live cron and summary, presets (every 5m, hourly, daily 2am, weekdays 9-5, first of month), next 5 run times with local/UTC toggle, copy cron/summary, download JSON export.
- UX: Validation for empty/invalid chars/length; errors disable copy/download; presets populate fields; UTC toggle for preview; summary and cron shown together.
- Validation: Allowed chars check, empty guard, length guard; copy disabled on errors.
- Accessibility: `aria-live` status, aria-labels on inputs/buttons/toggles, focus-visible outlines.
- Content/SEO: Metadata present; on-page How-to + FAQ with privacy note; FAQPage JSON-LD injected.

## Gaps / Risks
- Validation is basic; could add deeper cron linting and field-specific range guidance.
- Next-run computation uses simple iteration; could be optimized and show more runs/configurable count.
- No CSV export; JSON only. No import/backfill from cron string.

## Immediate improvement plan
1) **Validation & safety**
   - Add stricter cron linting and per-field range warnings; support import/parsing of an existing cron string.
2) **UX & features**
   - Add CSV export; allow configurable number of next runs; optional “copy next run times”.
3) **Testing**
   - Keep `TESTING.md` aligned as linting/import/export features evolve.

## CRON_GENERATOR note
- Added a cron dialect selector (Unix, Quartz, AWS EventBridge, Kubernetes CronJob) with dialect-aware validation, summaries, and run simulation.
- Fixed timezone behavior to respect local vs UTC getters and added an IANA timezone picker for DST-safe previews.
- Precompiled numeric field parsing so next-run simulation uses constant-time set lookups.
- Replaced fixed-iteration next-run preview with a window-based search that expands by days and surfaces "no run found" messaging.
- Moved validation into effects with actionable per-field errors and input highlighting.
- Added two-way conversion: natural-language summaries plus basic human-to-cron parsing for common phrases.
- Added a calendar/timeline preview for the next runs with ISO timestamp copy support.
