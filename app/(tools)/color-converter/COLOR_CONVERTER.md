# Color Converter – Assessment & Plan

## Current State (observed)
- Functionality: Converts between HEX/RGB/HSL with live preview. Parses hex (3/6), rgb(), and hsl() strings; copy buttons per format; reset to default blue.
- UX: No sample inputs; no copy-all/download; no auto-trim or uppercase toggle; no transparency/alpha support; no color picker input; no history. Error messaging only when parsing fails.
- Validation: No size/length guard (minor), no `aria-live` status, no explicit “invalid input” state beyond inline text; no sanitization needed but no instructions on formats accepted.
- Accessibility: Outputs not labeled as regions; buttons lack status announcements; input lacks aria label; no status region for copy/clear. Preview lacks descriptive label.
- SEO/Content: Minimal guidance; no how-to/FAQ, privacy note, or structured data.
- Testing: No manual checklist or sample colors; no automation.

## Immediate Plan
- ✅ Validation & feedback: Add `aria-live` status, clearer invalid-input messaging, optional auto-trim/uppercase hex toggle, and copy status text; add sample color button.
- ✅ UX: Add color picker input, copy-all/download outputs, optional alpha input, and preset swatches; keep live preview with label.
- ✅ Accessibility: Label output sections as regions, add aria labels for inputs/buttons, add sr-only status; ensure focus states persist.
- ✅ SEO/Content: Add brief how-to + FAQ, privacy note (client-side only), and FAQPage JSON-LD.
- ✅ Testing: Add `TESTING.md` with manual steps (hex/rgb/hsl inputs, invalid input, sample, copy/download).

## Future Ideas
- Support HSV/CMYK; add contrast checker and WCAG pass/fail; add palette extraction from image upload (client-side).
- Add history/recent colors and export palette; add alpha-aware formats (rgba/hsla) and toggle for uppercase hex.
- Playwright smoke test for conversions, copy, and accessibility basics.
