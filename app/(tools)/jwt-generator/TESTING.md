# JWT Generator – Manual Test Checklist

## Quick setup
- Open `/jwt-generator` in the browser.
- Ensure a non-empty secret is required (inline warning/aria-live).

## Scenarios
1) **Valid payload + token roundtrip**
   - Payload: `{"sub":"123","name":"Alice","admin":true}`
   - Secret: `super-secret`
   - Click **Generate**.
   - Verify token appears, header/payload decode panels render, and status announces success.
   - Copy token, then download; confirm download file is non-empty.
   - Check token length is shown.

2) **Invalid JSON payload**
   - Payload: `{"sub":123,}` (trailing comma).
   - Secret: `super-secret`.
   - Generate → see inline error/aria-live message; no token should update.

3) **Empty/short secret warning**
   - Payload valid JSON.
   - Secret: empty string.
   - Generate → see warning and blocked generation.
   - Enter `abc` (too short) → warning persists; enter `super-secret` → warning clears.

4) **Claim helpers**
   - Toggle/add iat/exp helpers (e.g., “+1 hour” shortcut); verify exp claim updates.
   - Fill issuer/audience fields; confirm they appear in decoded payload.

5) **Auto-regenerate toggle**
   - Enable auto-regenerate.
   - Change payload field; token updates automatically and status message announces update.
   - Disable auto-regenerate; changes no longer auto-update.

6) **Decoded view + download**
   - Use generated token.
   - Verify header/payload JSON blocks render prettified.
   - Copy header/payload buttons work; download decoded JSON produces a file.

7) **Accessibility/status**
   - Screen reader announces status via `aria-live` for success/error/copy/download.
   - Buttons/inputs have visible focus, and regions are labeled (token, decoded).
