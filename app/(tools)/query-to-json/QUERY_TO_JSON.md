# Query String → JSON – Assessment & Plan

## Current state
- Features: Accepts full URL or query string; options for decode, duplicate handling (arrays/first/last), sort keys, pretty vs compact JSON; sample; copy input/output; copy key/value list; download JSON and raw query; filter keys in preview; length/empty guards; inline errors; status via aria-live; labeled output region; on-page How-to/FAQ with privacy note; FAQPage JSON-LD.
- UX: Centered layout, consistent styling; buttons disable when empty; filter affects preview and copy-list; sample resets state; status text near output actions.
- Validation: Empty/overlength guard (5k chars); clearer error for malformed percent-encoding; trims after “?” when full URL provided.
- Accessibility: `aria-live` for status/copy, aria-labels on controls, focus-visible outlines, labeled output region.
- Content/SEO: Metadata set; FAQPage JSON-LD; on-page How-to/FAQ with privacy note (runs locally).

## Gaps / Risks
- No nested query parsing (e.g., foo[bar]=baz); flat only.
- No settings import/export; no CSV export of key/value table.
- Large-input handling relies on length guard; no streaming/async parsing.

## Immediate improvement plan
1) **Features**
   - Add nested query parsing support (e.g., bracket notation) and CSV export of key/value pairs.
   - Add settings import/export.
2) **Performance**
   - Consider async parsing for very large inputs beyond current guard.
3) **Testing**
   - Extend `TESTING.md` if nested parsing/CSV features are added.
