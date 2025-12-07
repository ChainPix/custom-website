# Text Deduper – Assessment & Plan

## Current state
- Features: Dedupes lines with options (case-insensitive, trim, keep blank, sort, normalize whitespace), samples (names/emails/URLs), counts (lines/unique/removed), copy input/output, download deduped text, reset.
- UX: Warnings for empty/length, status updates, sample buttons, sort toggle for alphabetized output; keeps first occurrence order when sort off.
- Validation: Empty/length guard; inline errors; counts displayed.
- Accessibility: `aria-live` status, labeled output region, aria-labels on controls, focus-visible styling; copy status announced.
- Content/SEO: Metadata plus on-page How-to/FAQ with privacy note; FAQPage JSON-LD injected.

## Gaps / Risks
- No CSV/JSON export; only text download.
- No regex-based custom normalization beyond whitespace collapse; no per-line preview.
- Size guard is basic; could add streaming for very large inputs.

## Immediate improvement plan
1) **Features**
   - Add CSV/JSON export; optional per-line preview; user-defined regex normalization.
2) **Performance**
   - Consider chunking/streaming for very large inputs; add stronger warning for huge pastes.
3) **Testing**
   - Extend `TESTING.md` if new export/regex/preview features are added.
