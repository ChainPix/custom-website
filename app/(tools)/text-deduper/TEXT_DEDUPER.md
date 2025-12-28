# Text Deduper – Assessment & Plan

## Current state
- Features: Dedupes lines with options (case-insensitive, trim, keep blank, sort, normalize whitespace), samples (names/emails/URLs), counts (lines/unique/removed), copy input/output, download deduped text, reset.
- UX: Warnings for empty/length, status updates, sample buttons, sort toggle for alphabetized output; keeps first occurrence order when sort off.
- Validation: Empty/length guard; inline errors; counts displayed.
- Guardrails: Enforces `MAX_LEN` with a clear error message and disables processing when input is too large.
- Stats: Counts now follow the same normalization pipeline (total, non-blank, unique, duplicates removed, blank removed).
- Performance: Debounced input processing to keep large pastes responsive.
- UX: Renamed normalization toggle to "Normalize whitespace" with a tooltip clarifying the behavior.
- Analytics: Added a frequency table with duplicate/unique filters and CSV/JSON duplicates download.
- Matching: Added matching modes for whitespace collapse, Unicode normalization, punctuation/diacritic ignores, URL normalization, and email normalization.
- Output control: Added keep modes (first, last/most recent, shortest, longest, prefer non-empty).
- Output: Added export formats (plain, CSV, JSON array, quoted list, numbered lines).
- Scale: Added drag-and-drop file support with worker-backed streaming/chunk processing for huge inputs.
- QoL: Added swap panels, removed-lines copy/download, highlighted removal counts, and persisted options in local storage.
- Refactor: Extracted a pure `dedupeText` helper to centralize dedupe logic for UI and worker use.
- Tests: Added unit coverage for newline variants, whitespace-only lines, Unicode normalization, sorting, large inputs, and keep-mode removals.
- Performance: Dedupe now computes counts and output in a single pass per split to avoid redundant work on large inputs.
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
