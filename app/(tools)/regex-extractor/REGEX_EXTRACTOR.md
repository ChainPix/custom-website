# Regex Extractor – Assessment & Plan

## Current state (after improvements)
- Features: Sample buttons (emails/URLs), swap pattern/text, escape helper; forced global with flags i/m/s; size guard/truncation; matches table with headers (Match/Index/Groups), match counts; copy/download results (JSON/CSV) and copy pattern; warnings for invalid/empty pattern and no matches.
- Accessibility: `aria-live` status, labeled results region, aria-labels on controls; status badge on copy.
- Validation: Inline warnings for invalid/empty pattern; caps matches (500) and warns on large input (~30k chars).
- Content/SEO: Page metadata, on-page How-to + FAQ with privacy note, FAQPage JSON-LD added.

## Remaining gaps / next ideas
- Optional literal toggle (treat pattern as plain text) instead of manual escape.
- Allow custom match cap and show “show more” for truncated results.
- Add path filter/search for matches content and highlight search term in results.

## Testing
- Valid pattern finds matches and groups; invalid/empty pattern shows inline warning.
- Sample buttons populate pattern/text; reset clears; swap works.
- Copy/download results works (JSON/CSV); copy pattern works.
- Size guard warns on large input; truncation warning appears at 500 matches.
- Accessibility: aria-live announces status; results region labeled; controls have aria-labels.
