# Number Formatter – Assessment & Plan

## Recent Updates
- Added Compare View to show the same input across multiple locales with selectable chips, pinned presets, and shareable links.
- Added power-user Intl options: currencyDisplay, currencySign, signDisplay, compactDisplay, unit + unitDisplay, and percent/unit styles.

## Current State (observed)
- Functionality: Locale-aware formatting via Intl.NumberFormat; supports decimal/currency, currency code input, min/max fraction digits; copy output; reset to defaults. Client-side only.
- UX: Basic form; no sample inputs; no thousands separator toggle; no preset locales/currencies; no rounding mode/notation options; no copy/download status feedback; no input validation message beyond “Invalid number” text; no save history.
- Validation: Handles minFraction > maxFraction manually; otherwise minimal. No size guard; no guidance for invalid locale/currency codes; no warning for NaN or extremely large numbers beyond simple message.
- Accessibility: No `aria-live` status; inputs/buttons lack explicit aria labels; output not labeled as a region; focus-visible presumed by browser default.
- SEO/Content: Metadata present; no on-page how-to/FAQ/privacy note; no structured data.
- Testing: No manual checklist or sample numbers; no automation.

## Immediate Improvement Plan
- ✅ Validation & feedback: Add `aria-live` status; surface errors for invalid number/locale/currency; guard extremely large input; keep friendly messages for fraction settings.
- ✅ UX: Add sample buttons (e.g., 1234567.89, 0.1234, large number); presets for locales/currencies; add options for grouping on/off, notation (standard/compact/scientific), and rounding mode; copy/download buttons with status; show formatted preview with label; optional input cleanup (trim/replace commas).
- ✅ Accessibility: Label inputs and output region; aria-labels for buttons; announce copy/download/status; ensure focus-visible styles remain.
- ✅ SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- ✅ Testing: Add `TESTING.md` with manual steps (decimal vs currency, fraction controls, invalid locale, copy/download, grouping toggle, notation).

## Future Ideas
- Add Intl.NumberFormat options for currencyDisplay/signDisplay/compactDisplay; add percent/unit formatting; add custom patterns (e.g., phone/mask).
- Add per-locale presets and recent-history (localStorage, opt-in).
- Add CSV/JSON batch formatter with download; add “compare locales” side-by-side view.
- Add Playwright smoke test for formatting and error states; add worker offload for very large batch inputs.
