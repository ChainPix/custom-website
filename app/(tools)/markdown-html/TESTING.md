# Markdown ⇄ HTML Converter – Manual Test Checklist

## Functional
- Markdown → HTML: convert sample markdown; verify headings, bold/italic, links, lists, and code fences render in output/preview.
- HTML → Markdown: convert sample HTML; verify markdown output preserves structure (headings, lists, code).
- Auto-convert toggle: when on, edits re-run conversion; when off, conversion waits for button.
- Sample buttons load expected content and update outputs.
- Download saves `converted.html` or `converted.md` based on direction.
- Copy copies the current output; disabled when output is empty.

## Validation & Feedback
- Empty input → error “Please paste Markdown or HTML before converting,” output cleared.
- Large input warning appears above 50,000 characters.
- Status updates for convert/copy/download/clear.

## Accessibility
- `aria-live` announces status/warnings/errors.
- Output region labeled and focusable; direction select/input have aria labels.
- Keyboard-only: tab through controls, toggles, copy/download, preview toggle.

## Sample Inputs
- Markdown sample from the UI buttons (heading, emphasis, list, code fence).
- HTML sample from the UI buttons (headings, list, link, code block).
- Malformed HTML/Markdown: ensure error handling shows friendly message without crash.
