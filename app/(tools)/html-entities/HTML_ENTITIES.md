# HTML Entities Tool – Assessment & Improvement Plan

## Update note
- Encoding now uses Unicode code points, supports named/numeric output styles, and can be limited to unsafe HTML characters.
- Decoding now uses a fast entity parser (no DOMParser) with Web Worker support and progress updates for large inputs.
- Added premium UX touches: auto-detect suggestions, diff view, stats panel, explicit copy buttons, swap, and history navigation.

## Current state
- Features: Encode/Decode buttons, single textarea input, output pane, copy button, clear.
- UI: Minimal two-column layout; dark output pane; tip text.
- SEO: Page metadata present (title/description/keywords/canonical/OG/Twitter).
- Accessibility: No `aria-live` status; output not labeled as a region; buttons lack explicit labels; error copy is inline only.
- UX gaps: No sample text button; no auto-encode/decode toggle; no size guard or warning for huge inputs; no download output; no status feedback on copy/encode/decode; no FAQ/privacy note; no guidance for common entities or unsafe characters.
- Validation/error handling: No trim/normalize option; no invalid HTML handling note; no detection for empty input; no performance guard.

## Immediate improvements (to implement next)
1) **Accessibility & status**
   - Add `aria-live="polite"` status region for encode/decode/copy errors/success.
   - Label output container as `role="region"` with `aria-labelledby`.
   - Add explicit `aria-label` for buttons and textarea.
2) **UX & helpers**
   - Add sample input buttons (HTML snippet, plain text with quotes/ampersands).
   - Add auto-encode/auto-decode toggle and manual run buttons.
   - Add trim/normalize toggle (trim whitespace before processing).
   - Add output download (.txt) and copy-all with status text.
   - Add clear statuses (“Cleared”, “Copied”, etc.).
   - Add size guard warning for very large inputs (e.g., >50k chars).
3) **Content & guidance**
   - Add brief “How to use” + FAQ (privacy: runs client-side; why encode; common pitfalls).
   - Include FAQPage JSON-LD in page metadata.
   - Add reassurance text near controls (“All processing runs locally in your browser.”).
4) **Validation**
   - Warn on empty input when encode/decode pressed.
   - Handle decode failures gracefully (show user-friendly error).
5) **Performance**
   - Consider deferring heavy decode (DOMParser) for very large strings and show progress text.

## Testing
Add `TESTING.md` with manual cases:
- Encode HTML snippet with `<`, `&`, quotes.
- Decode entity string back to text.
- Empty input warning.
- Large input warning.
- Copy/download output status.
- Auto-encode/auto-decode toggles.
- Accessibility: `aria-live` updates, region labels.
