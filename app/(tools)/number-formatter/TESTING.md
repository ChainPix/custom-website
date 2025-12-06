# Number Formatter – Manual Test Checklist

## Core Scenarios
- **Decimal vs currency**: Format `1234567.89` in decimal and currency; verify grouping and symbols update with locale/currency changes.
- **Fraction controls**: Adjust min/max fraction digits; invalid min>max shows friendly error; values update accordingly.
- **Invalid locale/currency**: Enter bad codes (e.g., `xx-XX`, `ZZZ`) → error surfaces without crash.
- **Large number warning**: Use very large input (e.g., `1234567890123456`) → warning shown, output still renders.
- **Notation modes**: Switch standard/compact/scientific and confirm output changes.
- **Grouping toggle**: Turn grouping off/on and verify separators disappear/appear.
- **Rounding mode**: Change rounding mode and confirm fractional output changes (e.g., 1.005).

## Actions
- **Copy/Download**: Copy and download buttons enabled when output exists; status announces action; clipboard/download succeeds.
- **Samples/Presets**: Sample buttons populate input; locale/currency preset buttons adjust options and format updates.
- **Clean input**: Toggle on to strip commas/trim; off to keep raw text.
- **Reset**: Reset returns defaults and clears status.

## Accessibility
- aria-live status announces errors/warnings/actions.
- Inputs, buttons, and output region have labels/aria-labels; focus-visible rings remain.

## Regression checks
- Switching options updates output without page reload.
- Invalid input doesn’t crash; empty input prompts guidance.
