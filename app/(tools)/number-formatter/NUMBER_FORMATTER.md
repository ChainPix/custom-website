# Number Formatter – Assessment & Plan

## Recent Updates
- Added Compare View to show the same input across multiple locales with selectable chips, pinned presets, and shareable links.
- Added power-user Intl options: currencyDisplay, currencySign, signDisplay, compactDisplay, unit + unitDisplay, and percent/unit styles.
- Added Safe mode to refuse inputs that exceed JS precision limits before parsing.
- Added shareable URLs for tool state plus saved presets stored in localStorage.
- Added inline validation for locale, parse locale, and currency with clearer field-level errors.
- Expanded manual test coverage and added a Playwright smoke test for batch + compare.

## Current State (observed)
- Functionality: Locale-aware formatting + parsing with batch mode, compare view, safe mode, shareable links, and saved presets. Supports decimal/currency/percent/unit styles and advanced Intl options.
- UX: Single/Batch toggle, presets, locale chips, download/copy status, parsed normalized preview, and example locale hint. Currency input disables when not used.
- Validation: Inline locale/parse-locale/currency errors, min/max fraction guard, safe-mode precision refusal, and large-number warning.
- Accessibility: `aria-live` status and labeled regions/buttons in place; focus-visible preserved.
- SEO/Content: Enhanced metadata and multi-schema JSON-LD (Breadcrumb, SoftwareApplication, HowTo, FAQ, WebPage).
- Testing: Expanded manual checklist plus Playwright smoke test for batch/compare.

## Immediate Improvement Plan
- ✅ Validation & feedback: Add `aria-live` status; surface errors for invalid number/locale/currency; guard extremely large input; keep friendly messages for fraction settings.
- ✅ UX: Add sample buttons (e.g., 1234567.89, 0.1234, large number); presets for locales/currencies; add options for grouping on/off, notation (standard/compact/scientific), and rounding mode; copy/download buttons with status; show formatted preview with label; optional input cleanup (trim/replace commas).
- ✅ Accessibility: Label inputs and output region; aria-labels for buttons; announce copy/download/status; ensure focus-visible styles remain.
- ✅ SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- ✅ Testing: Add `TESTING.md` with manual steps (decimal vs currency, fraction controls, invalid locale, copy/download, grouping toggle, notation).

## Future Ideas
- Add locale-specific input masks and a lightweight sample gallery for tricky locales.
- Add OG image for number formatter and extend metadata with screenshots.
- Add optional big-number math parsing for safe-mode formatting beyond JS number limits.
- Add worker offload for very large batch inputs.
