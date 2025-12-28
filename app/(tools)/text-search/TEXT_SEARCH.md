# Text Search – Assessment & Plan

## Current State (observed)
- Functionality: Plain or regex search; case-sensitive and whole-word toggles; shows match count and snippets with index.
- UX: Basic single textarea and query input; no copy/download, no sample input, no highlight of matches in the main text, no replace, no auto-scroll to matches, no debounce/auto-run toggle (runs on change), no large-input warning.
- Validation: Minimal regex error handling; no size guard; no empty-query guidance; no performance guard for catastrophic regex.
- Accessibility: No `aria-live` status; inputs/buttons lack explicit aria labels; snippets region not labeled; no focus-visible mention; no keyboard hints.
- SEO/Content: Metadata present; no on-page how-to/FAQ/privacy note; no structured data.
- Testing: No manual checklist or sample strings; no automation.
- Regex compilation is memoized per query/options change.
- Match scanning runs only on explicit runs (manual button or auto-run debounce).

## Immediate Improvement Plan
- Validation & feedback: Add `aria-live` status; warn on empty query; show large-input warning; handle invalid regex gracefully; optional auto-run toggle with manual run button; optional debounce.
- UX: Add sample input and sample queries; highlight matches in the main text area or a preview; copy/download matches; show total matches + counts; optional replace (find & replace) toggle; scroll-to-next/previous match controls.
- Accessibility: Label inputs and output region; add aria-labels for buttons; announce copy/download; keep focus-visible styles.
- SEO/Content: Add short how-to, FAQ, privacy note (client-side only), and inject FAQPage JSON-LD in page metadata.
- Testing: Add `TESTING.md` with manual steps (plain search, regex search, invalid regex, large input warning, copy/download, replace if added).

## Future Ideas
- Add fuzzy search (Fuse.js) with threshold slider.
- Add highlighting with virtualized rendering for very large texts.
- Add upload (txt) with size/type validation and drag/drop; download annotated results.
- Add saved searches/history (localStorage) with opt-in.
- Add catastrophic-regex guard (execution timeout) and worker offload for huge inputs.

## Notes
- Preview highlights are scoped to the active match window to avoid full-text span rendering and overlapping match pitfalls.
- Removed placeholder replace state/handler until the UI is ready to support it.
- Regex mode now exposes flags and surfaces the native regex error message; case/whole-word toggles are disabled for regex input.
- Snippet navigation now auto-scrolls to the active item and highlights the match within each context line.
- Added keyboard shortcuts (Alt+ArrowUp/Down, Ctrl+Enter) and screen-reader-friendly preview text to reduce span noise.
- Regex compilation is memoized once per query/options and reused for matches and errors.
- Auto-run now uses deferred input values instead of a run counter; manual runs update the snapshot only on click.
- Results now include line/column, context size is adjustable, and exports support CSV/TXT alongside JSON.
