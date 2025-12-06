# UUID Generator – Manual Test Checklist

## Quick functional checks
- Generate default 5 UUIDs; ensure count input clamps to 1–50 and errors shown for out-of-range/NaN.
- Toggle uppercase on/off and confirm output casing matches.
- Toggle include dashes off and confirm UUIDs are 32 characters (no hyphens); re-enable to restore dashes.
- Copy all: copies newline-delimited list; toast text changes to “Copied”.
- Download: creates `uuids.txt` with current output.
- Clear: empties output and status updates.
- Sample: loads sample UUIDs and updates status to “Sample loaded”.

## Accessibility
- Screen reader announces status/error via `aria-live`.
- Output region labelled by “UUIDs”.
- Buttons have clear labels; check keyboard-only flow (tab through inputs, toggles, and actions).

## Edge cases
- Count empty/non-numeric → error message, no crash; default generation uses last valid count.
- Count >50 or <1 → warning message; generation clamps between 1 and 50.
- Generate with no output then try copy/download → buttons disabled.

## Sample values
- Sample output (with dashes, lower-case):
  - `2c2e5bfe-7a6f-4d3e-9cb7-8f9c6c4a53c1`
  - `1b4d9c72-3e9a-4c1d-8f93-7c2a4f1d5b6e`
  - `f7a8c2d1-5e3b-4c8d-9f2a-6b1c3e4d7a8b`
  - `9d3f6b7c-2a1e-4c5d-8f9a-7b6c4d3e2f1a`
  - `6c4b7a9d-3e2f-4c1a-8b5d-7f9a2c3d6e1b`
