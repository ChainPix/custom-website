# Password Generator – Assessment & Plan

## Current State (observed)
- Functionality: Generates a single password with configurable length (6-64) and toggles for lowercase/uppercase/numbers/symbols. Copy and shuffle/reset provided; generation is local.
- Security update: Uses Web Crypto API randomness and offers an optional strict mode to enforce at least one character from each selected set.
- Strength update: Adds zxcvbn-style scoring with crack time estimates, warnings, and a visual strength meter.
- Power-user update: Adds session-only history, bulk generation with export, and passphrase mode controls.
- UX update: Adds keyboard shortcuts, tooltip guidance, and micro-interactions for copy/regenerate/strength changes.
- UX: No strength meter, no preview variations, no history/regen button with new output on demand (shuffle reuses settings). No visibility toggle to reveal/hide password. No presets (e.g., “max security”, “memorable”). No bulk generation or export.
- Validation: Length is clamped; no guard when all character sets are disabled (returns empty string silently). No feedback/status for errors or copy success aside from button text change.
- Accessibility: No `aria-live` for status; output not labeled as a region; checkboxes lack grouped legend; slider has no described help.
- SEO/Content: Basic metadata only; no on-page guidance/FAQ or structured data; no privacy note.
- Testing: No manual checklist or sample scenarios; no automation.

## Immediate Plan
- ✅ Add validation: prevent empty character pool with an inline alert; add status via `aria-live`. Show feedback when copied.
- ✅ Add strength indicator and quick presets (e.g., Strong, Maximum, Memorable/symbol-light). Add visibility toggle and “regen” button that actually regenerates new password (not just reset length).
- ✅ Accessibility: Label output region, group checkboxes with legend, add `aria-live` for status/copy, and ensure slider has aria labels.
- ✅ SEO/Content: Add brief guidance + FAQ; consider FAQPage JSON-LD; include privacy note (client-side only).
- ✅ Testing: Add `TESTING.md` with manual steps (edge cases: all toggles off, min/max length, copy, presets, strength meter).

## Future Ideas
- Bulk generation with export/download.
- Password entropy calculation and zxcvbn-style strength scoring.
- Optional passphrase mode (wordlist-based) with separator/number toggles.
- Keyboard shortcuts for shuffle/copy, and per-device presets persisted in localStorage.
