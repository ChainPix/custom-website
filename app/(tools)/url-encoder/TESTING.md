# URL Encoder/Decoder – Manual Test Checklist

## Core flows
- Encode: paste a URL and click Encode → encoded output appears; copy/download works.
- Decode: paste an encoded string and click Decode → decoded output appears; copy/download works.
- Sample button fills example input; auto-encode/decode modes update outputs as you type.

## Validation
- Oversize input (>512KB) shows “Input too large” error and blocks encode/decode.
- Malformed encoded string shows the clearer decode error (ensure % encodings).
- Clear resets input/outputs/auto mode/error.

## Accessibility
- `aria-live` status/error updates; inputs and outputs have labels/regions.
- Buttons focusable; copy/download disabled when empty.

## Sample inputs
- Encode sample: `https://example.com/search?q=hello world&redirect=/home`
- Decode sample: `https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26redirect%3D%2Fhome`
