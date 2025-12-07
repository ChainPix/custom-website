# Data URI Generator – Manual Test Checklist

## Validation & inputs
- Empty text blocks generation; overlength text (>20k chars) shows a warning.
- File upload over 5 MB is blocked with clear error.
- Unknown MIME with file prompts error; providing MIME allows generation.

## Encoding options
- Base64 toggle on/off: URI reflects `;base64` vs plain encoding.
- Strip-prefix toggle shows payload-only in preview.

## Copy/Download
- Copy URI copies full data URI.
- Copy decoded copies decoded payload (works for base64/plain).
- Download URI saves `data-uri.txt` with the current URI.

## File/Text paths
- Text input generates URI with chosen MIME.
- File upload sets MIME from input (or file type) and generates URI.

## Accessibility
- `aria-live` announces status/errors and copy actions.
- Controls have aria-labels; focus-visible outlines present.
- Output region is readable via keyboard navigation.
