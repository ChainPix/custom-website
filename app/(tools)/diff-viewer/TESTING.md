# Diff Viewer – Manual Test Checklist

## Core Scenarios
- **Small diff**: Enter a few-line texts with minor changes; verify highlights appear and counts (add/remove/change/same) update.
- **Large input warning**: Paste combined inputs >200k chars or >10k lines; warning shows; UI remains responsive.
- **Whitespace toggle**: Toggle "Trim/ignore whitespace" to ensure spacing-only changes disappear/reappear.
- **Inline highlight**: Enable inline highlight to see word-level differences in changed lines.
- **View modes**: Switch Unified vs Side-by-side; ensure line numbers and colors stay correct.
- **Swap**: Use Swap ↔ button; left/right text swap and status updates.
- **Sample input**: Load sample; diff renders without errors.

## Actions
- **Copy diff**: With diff present, Copy diff writes text to clipboard and status announces success/failure.
- **Download JSON**: Download button saves `diff.json` with entries including type/lines/text; status updates.

## Accessibility
- Status region (aria-live) announces warnings/actions.
- Both text areas and diff output are labeled regions; buttons have aria-labels.
- Focus-visible rings remain on interactive elements.

## Regression checks
- Empty inputs: shows empty warning, no crash.
- Ignore whitespace off/on: line counts and outputs remain stable.
