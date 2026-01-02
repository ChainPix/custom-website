# Regex Tester – Assessment & Plan

## Current State (after updates)
- Functionality: Regex + flags (i/g/m/s/y), escape-literal toggle, sample pattern/text button, match highlighting, group display, copy all, copy JSON, download JSON, auto-run toggle with manual run counter. Runs fully client-side.
- Validation: Invalid patterns surface friendly error; `aria-live` status; size advisory at 50k chars; status messages for copy/download/run.
- Accessibility: Status region with `aria-live`, labeled matches region, aria-labels on controls, focus-visible styles remain.
- Content/SEO: How-to and FAQ/privacy block on page; FAQPage JSON-LD added.
- Testing: Manual checklist added (`TESTING.md`).
- Update note: Added sticky `y` flag, correct non-global single-match behavior, zero-length match markers, and named/capture group counts.
- Update note: Added debounce on input, time budget with "Pattern too expensive" feedback, and safe mode for size/pattern guardrails.
- Update note: Added replace and split testers, explain mode token list, test case panel for expected outputs, and quick recipe presets.
- Update note: Added line numbers with match highlights, match navigation, copy-as-CSV, URL-shareable state, and recent pattern history.
- Update note: Added regex literal display, execution timing with matches/sec for large inputs, and keyboard shortcuts.

## Immediate Plan
- ✅ Validation & feedback: `aria-live` status, friendly invalid message, size advisory at 50k chars, copy/download status, escape literal toggle.
- ✅ UX: Sample pattern/text, auto-run toggle, highlighted preview, group display, copy/download as text or JSON.
- ✅ Accessibility: Labeled matches region, aria labels, status announcements, focusable buttons.
- ✅ SEO/Content: How-to + FAQ with privacy note, FAQPage JSON-LD in page metadata.
- ✅ Testing: `TESTING.md` with manual cases (valid/invalid regex, large input warning, copy/download, flags).

## Future Ideas
- Add preset regex library (emails, URLs, hex, UUIDs) with explanations.
- Add performance warning for catastrophic regex (e.g., monitor execution time).
- Add regex builder assistance and syntax highlighting for pattern/test areas.
- Playwright smoke test for pattern/flags, invalid regex, copy/download.
