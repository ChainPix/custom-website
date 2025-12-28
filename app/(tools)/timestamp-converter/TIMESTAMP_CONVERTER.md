# Timestamp Converter – Assessment & Plan

## Current State (observed)
- Functionality: Convert Unix timestamp (sec/ms toggle) to date string and back via datetime-local input. “Now” buttons. Client-side only.
- UX: No copy/download; no quick presets (e.g., sample timestamps); no UTC toggle; no relative time display; no validation hints beyond “Invalid”; no note about local vs UTC; no formatting options.
- Validation: Minimal; no guard for extremely large timestamps; no trimming; no accessibility status.
- Accessibility: No `aria-live` status; inputs/buttons lack explicit aria labels; output regions not labeled.
- SEO/Content: Metadata present; no on-page how-to/FAQ/privacy note; no structured data.
- Testing: No manual checklist or sample cases.

## Immediate Improvement Plan
- ✅ Validation & feedback: Add `aria-live` status; friendly errors for invalid timestamps/dates; warn on very large values; clarify local vs UTC display.
- ✅ UX: Add copy/download for results; add presets (now, epoch start, future/past example); add UTC toggle; show relative time (e.g., x minutes ago/at); optional format selector; trim input.
- ✅ Accessibility: Label inputs/output regions; aria-label buttons; announce copy/download; keep focus-visible styles.
- ✅ SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- ✅ Testing: Add `TESTING.md` with manual steps (sec/ms toggle, invalid timestamp/date, UTC toggle, copy/download, large value warning).

## Future Ideas
- Batch convert list of timestamps; file upload/download with validation.
- Add timezone selector; calendar picker; ISO/custom format selection.
- Add Playwright smoke test for roundtrip conversions and error states.

## Notes
- Warning messaging is derived from input via `useMemo` to avoid side effects during render.
- UTC toggle now formats locale output using `Intl.DateTimeFormat(..., { timeZone: "UTC" })`, and ISO output uses Zulu or local offset variants.
- `datetime-local` is parsed explicitly as local time, and the UI calls that out to avoid timezone ambiguity.
- Copy states are tracked per field with timers to prevent cross-section UI conflicts.
