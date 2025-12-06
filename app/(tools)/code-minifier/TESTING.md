# Code Minifier – Manual Test Checklist

## Core Scenarios
- **Minify HTML/CSS/JS**: Paste sample for each language, run Minify, verify output is shorter and stats update.
- **Pretty-print**: Switch to Pretty, choose indent style (2/4 spaces, tabs) and verify indentation.
- **Strip comments toggle**: Turn off/on and confirm comments are preserved/removed.
- **Normalize whitespace toggle**: Disable to keep extra spaces; enable to compress them.
- **Large input warning**: Paste >200k chars and ensure warning appears; conversion still completes.
- **Empty input**: Shows error and no crash.

## Actions
- **Copy output**: Copies text and updates status; disabled when empty.
- **Download output**: Saves file with current mode/lang naming; status updates.
- **Samples**: HTML/CSS/JS sample buttons load example code and set status.

## Accessibility
- aria-live status announces errors/warnings/actions.
- Controls and output region have labels/aria-labels; buttons remain focus-visible.

## Regression checks
- Switching modes/language keeps options and updates stats.
- Clear resets input/output/stats.
- Pretty mode respects indent style selection.
