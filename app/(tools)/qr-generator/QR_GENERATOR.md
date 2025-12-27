# QR Code Generator – Assessment & Plan

## Current State (observed)
- Functionality: Generates QR codes from text/URLs using `qrcode` toDataURL; shows preview, copy input text, clear, and download PNG link.
- UX: No sample inputs; no error/status aria-live; no size guard for very long strings; no controls for size/error correction margin or foreground/background colors; copy/download buttons rely on link anchor for download without disabled state. No auto-trim or validation for URLs.
- Validation: Minimal—only catches generation errors; no empty input messaging; no feedback when copy succeeds/fails; no status for download; no QR config options.
- Accessibility: Output region not labeled as a region; no `aria-live` status; download anchor lacks disabled semantics; copy/clear buttons have no status feedback; preview alt is generic.
- SEO/Content: On-page copy minimal; no how-to/FAQ or structured data; no privacy note about client-side generation.
- Testing: No manual checklist or sample inputs; no automation.

## Immediate Plan
- ✅ Validation & feedback: Add `aria-live` status, empty-input guidance, length advisory, copy/download status, and optional URL validation. Add configurable size/error correction.
- ✅ UX: Add sample inputs (URL, text, Wi-Fi string), auto-trim toggle, and color/size controls. Replace download anchor with button to handle disabled state cleanly.
- ✅ Accessibility: Label preview/output as a region; ensure buttons/inputs have labels; keep focus states; add `aria-disabled` handling for download.
- ✅ SEO/Content: Add how-to + FAQ, privacy note (client-side only), and FAQPage JSON-LD.
- ✅ Testing: Add `TESTING.md` with manual cases (URL/text, long input warning, copy/download, color/size options, empty input).

## Future Ideas
- Support QR for Wi-Fi configs, vCards, calendar invites; add error correction level picker and quiet-zone control.
- Add SVG export and logo overlay option with size guard.
- Playwright smoke test for key flows.

## Notes
- Generation now supports a debounced live mode, a manual mode toggle, and runs in a Web Worker to keep the UI smooth.
- Preview sizing now mirrors the selected size, and a scan difficulty meter reflects payload length + error correction.
- Export now includes SVG output, clipboard image copy, transparent background toggle, and smart filename suggestions.
- Structured payload builders are available for Wi-Fi, vCard, email/SMS, geo, calendar events, and UTM/deep links.
- Scannability controls include quiet-zone sizing, mask pattern overrides, rounded module styling, and logo overlays with enforced high error correction.
- Scan test mode adds an in-browser camera verifier with a guided generate → scan → confirm checklist.
- Premium polish adds presets, recents history, shareable URL hashes, and keyboard shortcuts for power users.
