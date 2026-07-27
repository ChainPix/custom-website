# Backlog

Tech-debt and improvement items tracked outside per-tool folders. See also
`POTENTIAL_TOOLS.md` (future tools) and `OPTIMIZATION_TOOLS.md` (tooling/observability).

## Known upstream security advisories (not actionable here)

- `npm audit` reports 3 high advisories from **postcss** and **sharp** versions pinned
  *inside* the `next` package itself. They cannot be fixed downstream; re-check after
  each Next.js upgrade. (Last checked: 2026-07-24, next 16.2.11.)

## Lint debt (downgraded to warnings in eslint.config.mjs, 2026-07)

When CI lint was first enabled, ~443 pre-existing issues surfaced across ~70 tool
clients. They are downgraded to warnings so CI can gate on new errors; burn these
down incrementally (a batch per session), then restore each rule to "error":

- `react-hooks/set-state-in-effect` (151) and related compiler-era rules
  (`set-state-in-render`, `refs`, `purity`, `immutability`,
  `preserve-manual-memoization`) — legacy effect patterns in tool clients.
- `@typescript-eslint/no-explicit-any` (52) — mostly worker message payloads.
- `@next/next/inline-script-id` (25) — JSON-LD `<Script>` tags need unique `id`
  props (mechanical fix, good first batch).
- `react/no-unescaped-entities` (20) — unescaped quotes/apostrophes in JSX copy.
- `@next/next/no-assign-module-variable` — `module` shims in json-validator /
  regex-extractor sandbox loaders; rename to `moduleShim` like tests/unit/curl-to-fetch.spec.ts.

## base64-encoder (migrated from `app/(tools)/base64-encoder/todo`)

- Show exact normalization details for Base64 input (whitespace removed, padding added,
  Base64URL converted to standard internally).
- Add a compact "detected input type" badge for the right textarea: `Base64`,
  `Base64URL`, `Data URI`, `Invalid`.
- Improve drag-and-drop feedback with target-specific helper text while hovering.
- Add a "swap panes" action to flip working direction quickly.
- Add paste handling for files copied to clipboard (not just drag-and-drop).
- Add a "copy output automatically" option for repetitive conversions.
- Let users download decoded bytes as a file again, matching the simplified UI.
- Add MIME detection/display for decoded data URIs when relevant.
- Expand preview support for more decoded content types.
- Improve history entries: short type label, source textarea, truncated output preview,
  relative time. Add a "clear history" action.
- Add keyboard shortcuts (clear, swap, focus next textarea, copy current pane) and show
  them in FAQ/helper text.
- Add tests around current behavior: text↔base64 sync, Base64URL decoding, dropped
  TXT/JSON/XML/CSV/DOCX/PDF extraction, malformed Base64 handling.
- Tighten page SEO copy/structured data to match the simplified tool exactly.
- Reduce duplicated logic in `syncFromText`/`syncFromBase64` via shared helpers.
- Split file extraction into a dedicated utility module (see `lib/file-utils.ts`).

Manual drag-and-drop fixtures for this tool live in
`docs/manual-fixtures/base64-encoder/` (binary .docx/.pdf samples were removed from the
repo; regenerate locally if needed).
