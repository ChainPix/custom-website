# Lorem Ipsum & Mock Data – Assessment & Plan

## Current state (after improvements)
- Features: Presets (short/medium/long/sentences/bullets), formats (paragraphs/sentences/bullets/headlines), seed for reproducible output, themed word sets (classic/tech/nature/startup), bullet prefix customization, regenerate button, copy, export (text/markdown/html), truncation warning at 8k chars, clamping warnings for high counts, word/char counts, status badge.
- UX: Active preset chips, format/theme/selects, output toolbar with counts/clear, status updates on copy/download/reset/regenerate; randomized word selection with optional seed; stats under controls.
- Accessibility: `aria-live` status, labeled output region, aria-labels on controls.
- Validation: Counts clamp to 20 paragraphs / 50 sentences with inline warning; truncation warning for very long output.
- Tech: Generation memo is pure; warning is derived and synced via effect.
- Input: Blank seed auto-generates a random seed (regenerates on demand) while typed seeds stay deterministic.
- Export: Download uses current export format for MIME type and file extension.
- Variation: Sentence/bullet generation varies per line with min/max word ranges, comma frequency, and question ratio controls.
- Bullets: Store raw bullet lines and apply the prefix only at render/join time.
- Structure: Paragraph length presets + slider, sentence length range, optional section headings with per-section paragraphs, and classic first sentence toggle.
- Mock data: Added generator for realistic records (names, emails, addresses, phones, UUIDs, timestamps, prices, countries, URLs) with JSON/CSV/SQL/TS output formats.
- Templates: Added real-world presets for wireframes, blog skeletons, product landing sections, and error message mocks.
- History: Recent generations saved to localStorage with favorites and per-block copy actions.
- UX: Added rich text copy, one-click Markdown/HTML copy, keyboard shortcuts (R/C/D), and output preview tabs.
- Content/SEO: On-page How-to + FAQ with privacy note (local generation); FAQPage JSON-LD in metadata.

## Remaining gaps / polish ideas
- Expand word pool further or allow custom word list input.
- Optional Markdown/HTML preview pane for exported content.
- Light “regenerate” animation or toast (keep minimal).

## Testing
See `TESTING.md` for manual scenarios:
- Generate defaults → non-empty output; copy/download work.
- Out-of-range counts show warning and clamp.
- Presets switch counts/format correctly.
- Bullet/paragraph/sentence/headline formats render as expected.
- Accessibility: aria-live announces actions; output region labeled.
