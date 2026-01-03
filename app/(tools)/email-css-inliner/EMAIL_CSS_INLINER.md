# Email CSS Inliner – Assessment & Plan

## Recent upgrades
- Rebuilt the parser/inlining core with AST-aware cascade handling (`css-tree` + `specificity`), inline-style merging, and optional flattening of `@media (max-width)` rules plus a reusable style-source collector that honors `<style>` blocks inside the HTML.
- Added an HTML diff panel (via `diff`/`DOMParser`) and warnings for preserved media selectors, making it easier to trust what changed before copying or downloading.
- Added email-client warnings, Outlook-safe output (table rewrites + VML awareness), and legacy HTML attribute fallbacks for better client compatibility.
- Added selector coverage reporting, email lint + auto-fix panel, preset library with saved templates, and expanded export/copy options (EML, Gmail, Mailchimp).
- Improved performance/correctness with fast-path selector matching, parsed inline-style merging, minified output toggle, and output-only reset.

## Current state
- Features: Paste HTML and CSS; inline styles (tag/class/id selectors); keep style tag toggle; copy/download inlined HTML; reset sample; guards for empty/very large HTML; aria-live status; labeled output region; on-page How-to/FAQ; FAQPage JSON-LD; marketing/newsletter sample presets; beautify output toggle; preview pane with CSP note; output size warning; skipped badge + list; applied/total selector coverage.
- UX: Two-pane layout with toggleable preview; status/errors shown; skipped selectors/media listed; badge links to skipped section; large-output warning.
- Validation: Empty/length guard (200k chars); CSS parser strips @media and reports skipped selectors; brace mismatch surfaces as skipped note.
- Accessibility: `aria-live`, aria-labels, focus-visible styles on controls; output/preview regions labeled; skip badge is linkable.
- Content/SEO: Metadata present; FAQPage JSON-LD; on-page FAQ/privacy note.

## Gaps / Risks
- Parser still simple (no deep nesting support); media queries skipped, not applied; selector complexity can still be skipped.
- No visual diff of applied vs skipped selectors (informational only).
- Testing is manual (see TESTING.md); no automated coverage yet.
- No beautify/preview performance guard for very large outputs (could be heavy for >200k chars).
- No linting of CSS; malformed declarations simply drop silently.
- No CSP note for images/external assets in preview (if loaded).

## Immediate improvement plan
1) **Parsing & feedback**
   - Consider lightweight handling for common @media queries or clearer messaging for skipped blocks (status now notes skipped count).
   - Surface an “ignored flags/selectors” badge with count, link to list.
   - Optional CSS sanity checks (e.g., warn on unclosed braces).
2) **UX & features**
- Added “applied styles” coverage stats (applied vs total selectors) and skipped badge.
- Added lightweight “warn if inline output > X KB” note; users can proceed.
- Added CSP-safe preview note (images/external assets may not load in preview).
3) **Testing**
   - Keep `TESTING.md` in sync; consider adding a small Playwright smoke (inline, copy, preview toggles).
