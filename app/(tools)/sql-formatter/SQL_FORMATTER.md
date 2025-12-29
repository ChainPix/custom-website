# SQL Formatter – Assessment & Plan

## Update note
- Renamed compact toggle to keyword-case selector (Preserve/UPPER/lower) and clarified soft wrap as view-only.
- Added minify, comma style, indent style (tabs vs spaces), and lines-between-statements controls.
- Added output presets: Readable, Compact, and Team Style, with a Custom state for manual tweaks.

## Current state
- Features: Dialect selector (sql/mysql/postgresql/sqlite/mariadb), output presets (Readable/Compact/Team Style + custom), keyword case selector, comma style, indent size + tabs/spaces, lines-between-statements, minify, soft wrap (view only), multiple samples (select/insert/join/CTE), copy input, copy formatted, download formatted SQL. Guards for empty/overlength input.
- UX: Reset sample, per-dialect tips (PostgreSQL/MySQL), clearer errors when formatting fails, copy/download actions, status announcements.
- Validation: Empty guard, length guard (50k), clearer error messaging on format failure.
- Accessibility: `aria-live` status, labeled output region, aria-labels on inputs/buttons/toggles, focus-visible outlines, status text on copy.
- Content/SEO: Metadata present; on-page How-to + FAQ with privacy note; FAQPage JSON-LD injected.

## Gaps / Risks
- No CSV/JSON export of settings/output; only download formatted SQL.
- No import-from-cron-style formatting config; keyword case options limited (compact tweaks only).
- Formatting errors remain generic; could show more detailed parse hints per dialect.

## Immediate improvement plan
1) **Features**
   - Add keyword casing options and JSON/CSV export of formatted output + settings.
   - Add optional line-width control; consider minify mode explicitly.
2) **Validation & feedback**
   - Provide richer error hints per dialect on failure (e.g., unmatched quotes).
3) **Testing**
   - Extend `TESTING.md` if new export/casing options are added.
