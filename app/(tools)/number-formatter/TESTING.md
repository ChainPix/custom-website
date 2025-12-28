# Number Formatter – Manual Test Checklist

## Core Scenarios
- **Decimal vs currency**: Format `1234567.89` in decimal and currency; verify grouping and symbols update with locale/currency changes.
- **Fraction controls**: Adjust min/max fraction digits; invalid min>max shows friendly error; values update accordingly.
- **Invalid locale/currency**: Enter bad codes (e.g., `xx-XX`, `ZZZ`) → error surfaces without crash.
- **Large number warning**: Use very large input (e.g., `1234567890123456`) → warning shown, output still renders.
- **Notation modes**: Switch standard/compact/scientific and confirm output changes.
- **Grouping toggle**: Turn grouping off/on and verify separators disappear/appear.
- **Rounding mode**: Change rounding mode and confirm fractional output changes (e.g., 1.005).
- **Locale parsing**: Try `1.234.567,89` with parse locale `de-DE` → normalized value shows `1234567.89`.

## Tricky Parse Inputs
- **Spaces as group separator**: `1 234 567,89` with parse locale `fr-FR` parses correctly.
- **Comma/period swap**: `1.234.567,89` with parse locale `de-DE` parses correctly; confidence note indicates inference as needed.
- **Currency symbols**: `€ 1 234,50` or `$1,234.50` parses to expected normalized value.
- **Parentheses negatives**: `(1234)` parses to `-1234`.
- **Mixed signs**: `-1,234` parses as negative without double-sign errors.

## Precision Edge Cases (Safe Mode)
- **Safe integer boundary**: `9007199254740991` succeeds; `9007199254740992` is rejected in safe mode.
- **Long decimals**: `0.12345678901234567` is rejected in safe mode; allowed when safe mode is off.
- **Rounding check**: Format `0.1` with max fraction digits to confirm no unexpected rounding warnings.

## Batch Mode
- **Delimiter parsing**: Newline/comma/tab inputs split correctly and preserve order.
- **Output formats**: Newline outputs a line per value; CSV outputs a header + rows; JSON outputs array objects.
- **Export correctness**: Export `formatted.csv` and verify columns `raw, parsed, formatted, error`.
- **Batch errors**: Include an invalid line; error column populated while other lines format.

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
