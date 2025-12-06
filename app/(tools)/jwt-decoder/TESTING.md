# JWT Decoder – Manual Test Checklist

## Functional
- Load sample JWT; header/payload decode and signature shown as “not verified.”
- Paste a valid JWT with exp/nbf; check that exp/nbf highlight (expired/not-yet-valid).
- Pretty-print toggle changes spacing; copy header/payload/all; download JSON saves decoded data.
- Clear resets token, outputs, and status.

## Validation & Feedback
- Empty input → status “Awaiting input,” outputs cleared.
- Malformed JWT (missing segments) → “Invalid JWT format” error.
- Bad base64 segment → header/payload show decode error.
- Large token warning appears over 5,000 chars.

## Accessibility
- `aria-live` announces status/errors; outputs are labeled regions.
- Buttons/controls have aria labels; keyboard-only navigation works for copy/download toggles.

## Sample Inputs
- Sample JWT in app (loads via button).
- Expired JWT (set exp < now) to see “Expired.”
- Not-yet-valid JWT (nbf > now) to see “Not yet valid.”
