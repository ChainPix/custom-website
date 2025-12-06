# PDF → Text – Manual Test Checklist

Use these steps in the browser.

## Core flows
- Upload `sample.pdf` → filename shows, parsing spinner appears, extracted text populates.
- Toggle “Normalize whitespace” on/off → verify line breaks are consolidated when on.
- Download button saves `.txt` with extracted content; Copy works and shows “Copied”.
- Clear button resets filename/output/status.

## Validation
- Upload non-PDF (e.g., `.txt`) → shows “Unsupported file type” error.
- Upload >10MB (simulate by editing limit or using a large file) → size error shown.
- Upload an image-only PDF → warning “No extractable text found…” appears.

## Drag-and-drop
- Drag `sample.pdf` over dropzone → overlay appears; drop parses successfully.
- Keyboard: focus dropzone, press Enter/Space → file picker opens.

## Accessibility
- `aria-live` status announces parsing/errors; output buttons are focusable; labels are clear.
