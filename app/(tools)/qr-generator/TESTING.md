# QR Code Generator – Manual Test Checklist

## Functional
- Load samples (URL/Text/Wi-Fi) and ensure QR preview updates; status shows “Sample loaded”.
- Validate URL toggle: invalid URL shows error and blocks generation; valid URL proceeds.
- Size slider and error correction dropdown regenerate QR accordingly.
- Color pickers change foreground/background; preview updates.
- Copy input copies current text; button disabled when empty.
- Download PNG saves the rendered QR; disabled when no preview.

## Validation & Feedback
- Empty input → status “Awaiting input”, no QR.
- Large input (>2000 chars) triggers warning.
- Status updates on copy/download/error.

## Accessibility
- `aria-live` announces status/warnings/errors.
- Preview container labeled as region; buttons/inputs have labels; download uses aria-disabled state.
- Keyboard-only: tab through samples, toggles, sliders, copy/download.

## Sample Inputs
- URL: `https://toolstack-nu.vercel.app/`
- Text: `Quick share text via QR`
- Wi-Fi: `WIFI:T:WPA;S:ToolStackWiFi;P:SuperSecret123;;`
