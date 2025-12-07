# Markdown Preview – Manual Test Checklist

Run these checks in the browser (desktop + mobile widths) to confirm the previewer works and remains accessible.

## Core flows
- Load page: default markdown renders in preview without errors.
- Sample buttons: each sample replaces input and preview updates accordingly; Reset returns to starter text.
- Copy HTML / Copy Markdown: clipboard actions succeed and status message updates.
- Download HTML: download triggers with sanitized HTML content when sanitize is ON.

## Validation & feedback
- Empty input: pressing copy/download shows inline warning and does not produce output.
- Large input: paste very long markdown; size warning appears and actions still respond without crashes.
- Sanitize toggle: turning OFF allows raw HTML rendering; turning ON strips unsafe tags.

## Accessibility
- Preview area is labeled and announced as a region; `aria-live` status announces copy/download/validation messages.
- All buttons/inputs have accessible labels and show focus-visible outlines.

## Edge cases
- Mixed markdown (headings, code blocks, tables) renders correctly.
- Copy/download after toggling sanitize still reflects current state.
