# Hash Generator – Manual Test Checklist

## Functional
- Hash sample text with SHA-256 and SHA-1; ensure output changes with algorithm.
- Toggle “Auto-hash as you type”; typing should update output when input is valid and under the size limit.
- Sample button loads text and (if auto-hash enabled) computes hash automatically.
- Copy and Download buttons are disabled when output is empty; enabled after hashing; copy places hash on clipboard; download saves `hash-<algorithm>.txt`.
- Clear resets input, output, status, and messages.

## Validation & Errors
- Empty input → inline error and status “Waiting for input.”
- Oversized input (>100,000 chars) → inline error and status “Input too large”; auto-hash should not run.
- Unsupported browser (simulate by disabling Web Crypto) → friendly error “Hashing failed in this browser.”

## Accessibility
- Screen reader announces status/error via `aria-live`.
- Output is labelled as a region by the “Hash” heading.
- Buttons have clear labels; verify keyboard-only navigation (tab through inputs/toggles/buttons).

## Sample Inputs
- Short: `Hash this sample text for quick verification.`
- Medium: Lorem ipsum paragraph (~200 chars).
- Oversize: 100,001+ characters (should show size error, no hashing).
