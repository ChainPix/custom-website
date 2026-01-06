# Base64 Encoder & Decoder

- **Version:** 1.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-01-10
- **Status:** ✅ Stable

---

## Overview

Privacy-first Base64 tool with UTF-8 correctness, Base64URL support, data URI helpers, file mode, and strict validation. Everything runs locally in your browser; no uploads or server processing.

### Primary Use Cases
- Encode text or files to Base64/Base64URL for APIs and tokens
- Decode Base64 (including data URIs) back to text or files
- Convert between Base64 and Base64URL for JWT workflows
- Validate and sanitize input with strict or lenient modes

---

## Features

### Core
- UTF-8 safe encoding/decoding (TextEncoder/TextDecoder)
- Base64 and Base64URL output toggle + conversion helper
- Strict vs lenient decode (whitespace/padding handling)
- Auto-detect encode vs decode (Detect button)
- Output wrapping at 76 chars for email/PEM compatibility

### File Mode
- Drag/drop file to encode to Base64
- Optional data URI output with MIME detection
- Decode Base64 to file download
- Inline preview for image/audio/pdf data URIs

### UX & Productivity
- Copy with toast feedback + failure messaging
- "Swap to input" actions for encoded/decoded panels
- Input normalization (trim + remove blank lines)
- History (last 10 conversions) stored locally
- Shareable links via URL hash payload
- Keyboard shortcuts: Cmd/Ctrl+Enter (convert), Cmd/Ctrl+K (clear)

### Performance
- Web Worker conversion for large inputs
- Progress indicator for worker-based jobs
- Size guard for input and encoded output expansion

---

## Quick Start

1. Paste text or Base64 into the input.
2. Choose Encode, Decode, or Detect.
3. Copy or download the output.
4. Optional: toggle Base64URL, strict decode, or wrap output.

---

## Options & Modes

- **Decode mode**
  - **Lenient**: ignores whitespace/newlines and auto-fixes padding
  - **Strict**: rejects invalid characters and padding issues
- **Output format**
  - **Base64**: `+/` with `=`
  - **Base64URL**: `-_` without padding
- **Wrap output**: inserts line breaks every 76 characters (Base64 only)
- **Normalize input**: trims and removes empty lines before converting

---

## Privacy & Data Handling

- All processing is client-side.
- No network requests or uploads.
- History is stored locally in `localStorage`.
- Share links live in the URL hash (`#...`) and never hit the server.

---

## Limits & Guardrails

- Input size limit: **512KB**
- Encoded output size guard: prevents Base64 expansion beyond **512KB**
- Data URI preview: only shown when decoded input is a data URI with supported MIME

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- TextEncoder/TextDecoder

Works on current Chrome, Firefox, Safari, and Edge.

---

## Testing

Manual checklist: `app/(tools)/base64-encoder/TESTING.md`

---

## File Structure

```
app/(tools)/base64-encoder/
├── README.md
├── TESTING.md
├── client.tsx
├── worker.ts
├── page.tsx
└── layout.tsx
```

---

## Limitations

- Base64 output wrapping is display/copy/download only; raw value remains unwrapped.
- Data URI preview is not available for arbitrary Base64 without a MIME type.
- Share links are best for small payloads; large hashes may exceed URL limits.

---

## Troubleshooting

**Decode fails with invalid Base64**
- Switch to lenient mode to auto-fix padding/whitespace.
- Ensure you are not pasting non-Base64 characters.

**Clipboard copy fails**
- Allow clipboard permissions in your browser settings.

**Data URI not previewing**
- Confirm the input starts with `data:<mime>;base64,`.
