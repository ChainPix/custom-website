# Email CSS Inliner – Assessment & Plan

## Current state
- Features: Paste HTML and CSS; inline styles (tag/class/id selectors); keep style tag toggle; copy/download inlined HTML; reset sample; guards for empty/very large HTML; aria-live status; labeled output region; on-page How-to/FAQ; FAQPage JSON-LD; marketing/newsletter sample presets; beautify output toggle; preview pane.
- UX: Two-pane layout with toggleable preview; status/errors shown; skipped selectors/media listed.
- Validation: Empty/length guard (200k chars); CSS parser strips @media and reports skipped selectors.
- Accessibility: `aria-live`, aria-labels, focus-visible styles on controls; output/preview regions labeled.
- Content/SEO: Metadata present; FAQPage JSON-LD; on-page FAQ/privacy note.

## Gaps / Risks
- Parser still simple (no deep nesting support); media queries skipped, not applied; selector complexity can still be skipped.
- No visual diff of applied vs skipped selectors (informational only).
- Testing is manual (see TESTING.md); no automated coverage yet.

## Immediate improvement plan
1) **Parsing & feedback**
   - Consider lightweight handling for common @media queries or clearer messaging for skipped blocks.
2) **UX & features**
   - Optional: add “applied styles” summary and selector coverage stats.
3) **Testing**
   - Keep `TESTING.md` in sync; consider adding a small Playwright smoke (inline, copy, preview toggles).
