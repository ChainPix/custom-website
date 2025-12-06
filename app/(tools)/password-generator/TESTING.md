# Password Generator – Manual Test Checklist

## Functional
- Toggle presets (Strong/Maximum/Memorable) and confirm length/character sets update correctly.
- Length slider min (6) and max (64) generate passwords; strength label updates.
- Regenerate button produces a new password with same settings.
- Show/Hide toggles between visible characters and masked bullets.
- Copy button copies current password and shows “Copied” state; disabled when invalid/empty.

## Validation
- All character sets off → inline alert “Select at least one character set” and no password generated.
- Copy while empty/invalid → button disabled; status remains informative.

## Strength
- Check entropy label changes as you adjust length and character sets (Weak → Moderate → Strong → Very strong).

## Accessibility
- `aria-live` announces status/error; output is a labeled region.
- Length slider has aria-label; character sets are grouped under a legend.
- Keyboard-only: tab through presets, toggles, slider, regen, copy, show/hide.

## Sample flows
- Quick Strong: preset → strength at least Strong; copy works.
- Memorable: preset removes symbols; verify visible output lacks symbols; strength still reasonable.
- Maximum: preset sets length 24 with all sets; strength “Very strong”.
