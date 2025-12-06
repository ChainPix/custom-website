# JSON ⇄ YAML Converter – Test Cases

Use these manual checks in the browser. Sample files are in `app/(tools)/json-yaml/test-data/`.

## 1) Happy path
- JSON → YAML: paste `sample.json`, Convert, expect valid YAML with chosen indent (2/4/8). Copy/Download works.
- YAML → JSON: paste `sample.yaml`, Convert, expect pretty JSON with chosen indent. Copy/Download works.
- Sort keys: toggle on/off and confirm key order changes.
- Indent: switch 2/4/8 and verify output spacing updates.
- Auto-convert: enable, paste JSON, see auto output after ~250ms; toggle off stops auto updates.

## 2) Error handling
- Invalid JSON: paste `{"bad":}` → error with line/column; output clears.
- Invalid YAML: paste `invalid.yaml` → error with line/column; output clears.
- Empty input with auto-convert on: clears output, no errors.
- Oversize: try a >10MB file (or simulate by updating the limit) → size error.
- Wrong file type: upload `.png` → “Unsupported file type” error.

## 3) File upload
- Upload `sample.json` → input populates; Convert succeeds.
- Upload `sample.yaml` → input populates; Convert succeeds.
- Re-upload same file twice (input reset) → allowed.

## 4) Accessibility/UI
- Check `aria-live` status on output; verify error message uses `role="alert"`.
- Focus order through controls; ensure buttons/inputs are keyboard reachable.
- Ensure auto-convert status text updates when toggling.

## 5) Performance sanity
- Paste ~1–2 MB JSON/YAML to trigger “Large input” warning; tool remains responsive.

## 6) Smoke outline for automation (Playwright)
- Load `/json-yaml`, convert JSON→YAML, assert output contains `name:`.
- Switch to YAML→JSON, convert sample YAML, assert output contains `"name": "FastFormat"`.
- Toggle sort keys and check order changes.
- Upload `sample.json` and verify output updates.
