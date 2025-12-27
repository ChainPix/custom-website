# Permission / chmod Calculator — Assessment & Plan

## Current state
- Features: Toggle read/write/execute for user/group/other plus setuid/setgid/sticky; converts to octal and symbolic; copy chmod command; reset; octal input backfills checkboxes; explain mode hover breakdown for octal digits; security hint warnings for risky selections; path-aware helper for common recommendations; history/compare log for last 10 changes; aria-live status; labeled sections; on-page notes/privacy; metadata + FAQ JSON-LD.
- UX: Two-pane layout with cheat sheet; status/errors shown; soft shadows consistent with other tools.
- Accessibility/SEO: aria labels/live region; focus-visible styles; output region labeled; metadata set.

## Gaps / Future ideas
- Add inline validation for invalid octal and clearer success state on octal input.
- Add “apply preset” buttons (644, 755, 700).
- Add Playwright smoke (octal input, toggles, copy).
