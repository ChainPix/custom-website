# CSS Units Converter – Manual Test Checklist

## Validation
- Empty/invalid value shows inline error and prevents copying.
- Invalid base/viewport values (non-numeric or <=0) show inline errors.
- Extremely large values trigger warnings.

## Conversions
- px → rem/em with base font change reflects expected output.
- rem/em → px updates when base font changes.
- vw/vh conversions change when viewport presets (Mobile/Tablet/Desktop) are applied.
- Precision input changes rounding (0–8).
- Reverse calculation matches original value when swapping units.

## Actions
- Reset restores defaults and clears errors.
- Copy result copies the numeric result.
- CSS snippet copy adds `font-size: Xunit;`.

## Accessibility
- `aria-live` announces status/copy.
- Controls have aria-labels; focus-visible outlines present.
- Keyboard-only navigation reaches inputs, presets, and copy buttons.
