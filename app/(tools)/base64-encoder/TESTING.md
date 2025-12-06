# Base64 Encoder/Decoder – Manual Test Checklist

## Core flows
- Encode: paste text, click Encode → encoded output appears; copy/download work.
- Decode: paste encoded string, click Decode → decoded output appears; copy/download work.
- Sample button fills example; auto-encode/decode updates outputs as you type.

## Validation
- Oversize input (>512KB) shows “Input too large” error and blocks processing.
- Malformed Base64 shows clearer decode error (padding/characters).
- Clear resets input/outputs/auto mode/error.

## Accessibility
- `aria-live` status/error updates; inputs and outputs have labels/regions.
- Buttons focusable; copy/download disabled when empty.

## Sample inputs
- Encode sample: `https://example.com/api?token=abc123==`
- Decode sample: `aHR0cHM6Ly9leGFtcGxlLmNvbS9hcGk/dG9rZW49YWJjMTIzPT0=`
