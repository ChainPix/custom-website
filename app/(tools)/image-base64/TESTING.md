# Image → Base64 – Manual Test Checklist

## Quick steps
- Open `/image-base64` and confirm status updates announce via `aria-live`.
- Ensure preview/output regions are labeled and focusable controls have visible focus.

## Scenarios
1) **Small PNG upload**
   - Upload a small PNG/JPG.
   - Preview renders; Base64 output appears.
   - Copy Base64 → status “Copied”; paste to verify.
   - Save Base64 (txt) and Save image → files download and open.

2) **Non-image file**
   - Upload a `.txt` or `.pdf`.
   - See error “Please select an image file.”; no preview/output.

3) **Oversized image**
   - Use a file >10 MB → blocked with friendly size error.
   - 5–10 MB file → warning shows; processing completes and status updates.

4) **Drag-and-drop + keyboard**
   - Drag an image onto the dropzone → processes successfully.
   - Focus dropzone, press Enter/Space → file picker opens.

5) **Status + accessibility**
   - Status text announces load/copy/download/clear/errors via screen reader (`aria-live`).
   - Output region labeled with heading; preview region labeled.

6) **Strip prefix toggle**
   - Enable “Strip data URI prefix” → output omits `data:...` prefix; copy/download uses stripped content.

7) **Sample image**
   - Click Sample PNG → preview/output show the demo image; status “Loaded sample”.
