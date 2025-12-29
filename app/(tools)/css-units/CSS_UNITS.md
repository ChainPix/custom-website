# CSS Units Converter – Assessment & Plan

## Notes
- Converted result + validation to derived state via `useMemo` (no `setState` inside memo); banner error now derived from field errors.
- Added swap button, decimal input mode with comma-friendly parsing, and soft validation that shows errors after blur.
- Split copy feedback between result/snippet and added copy options for number-only vs with unit.
- Added separate root (rem) and element (em) font size inputs for more accurate conversions.
- Added a live viewport toggle with a lock to freeze current vw/vh values.
- Added % context, vmin/vmax, ch/ex approximations, and print units with a DPI input; noted fr as a separate grid context need.
- Added a multi-output table showing common unit conversions (px/rem/em/vw/vh/vmin/vmax) at once.
- Added a design tokens mode to convert pasted tokens to rem or a Tailwind-like spacing scale.
- Added a clamp() helper for min/preferred/max outputs, including vw + rem preferred mode.

## Current state
- Features: Convert px/rem/em/vw/vh with custom base font and viewport; precision control; viewport presets (mobile/tablet/desktop); reverse result; copy result and CSS snippet; reset defaults. Metadata + FAQPage JSON-LD; on-page How-to/FAQ with privacy note.
- UX: Centered layout, consistent styling, inline hints for inputs; status via aria-live; reverse display; presets for convenience.
- Validation: Inline per-field errors, guards for invalid/large values; requires positive numeric inputs.
- Accessibility: `aria-live` status, aria-labels on inputs/buttons, focus-visible styling.
- Content/SEO: Metadata + FAQPage JSON-LD; on-page How-to/FAQ present.

## Gaps / Risks
- No export/history; no live preview snippet beyond CSS snippet copy.
- Reverse uses same precision; could expose a separate precision for reverse.
- No device list beyond three presets; no percent unit support.

## Immediate improvement plan
1) **UX & features**
   - Add export/history of conversions; support percent units and more device presets; optional “swap units” quick toggle.
2) **Validation & feedback**
   - Allow separate precision for reverse; add warning for unusual unit mixes (e.g., vh→em without context).
3) **Testing**
   - Extend `TESTING.md` if new units/presets are added.
