# Markdown Previewer – Assessment & Plan

## Current state
- Features: Markdown textarea with live HTML preview; sample buttons (basic, code, tables); reset; sanitize toggle (default ON) with strict allowlist and unsafe-mode warning; computed warning text without memo side-effects; preview/HTML/markdown source panels with copy and rich text; drag-and-drop .md import; export HTML, Markdown, and print-ready PDF; shareable compressed URL links; local draft persistence with multi-document tabs; editor toolbar, find/replace, line numbers, tab indentation, layout toggle, word/character stats; theme switch (light/dark/GitHub), resizable split panes, scroll sync; GFM + autolinks + footnotes + heading anchors; syntax highlighting (highlight.js); Mermaid diagrams via opt-in toggle.
- Validation: Empty-input warning; large-input warning (size guard); status text for copy/download/reset and sanitize state.
- Accessibility: Preview labeled as a region, aria-live status updates, buttons/inputs have explicit labels, focus-visible styling preserved.
- Content/SEO: On-page How-to + FAQ with privacy note; FAQPage JSON-LD injected; metadata set.

## Gaps / Risks
- Heavy markdown (very large tables) could still be slow; consider truncation notice if expanded further.
- Preview theming not toggled (light-only); could add theme toggle later.
- Sanitizer uses default settings; could expose more granular controls if needed.

## Immediate improvement plan
1) **Performance**: Consider truncation notice for extremely large inputs and optional debounce on preview render.
2) **Theming**: Optional light/dark toggle for the preview panel.
3) **Sanitizer controls**: Expose a “strict/loose” sanitizer mode if needed.

## Testing
See `app/(tools)/markdown-preview/TESTING.md` for manual checks:
- Default/sample renders; copy HTML/markdown works; download HTML works.
- Large input shows warning; sanitize toggle updates output.
- Accessibility: aria-live announces status; preview region labeled.
