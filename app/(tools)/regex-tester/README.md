# Regex Tester

- **Version:** 2.5.0
- **Category:** Developer Tools
- **Status:** ✅ Production Ready
- **Last Updated:** 2025-02-14

---

## Overview

Regex Tester is a browser-first tool for validating patterns, flags, captures, and replacements. It supports match previews, replacement output, split results, and explain-mode tokens while keeping all data client-side for privacy.

## Key Features

### Matching & Flags
- Flags: `i`, `g`, `m`, `s`, `y`, `u`
- Non-global mode returns a single match
- Zero-length matches are highlighted with a `|` marker
- Named and numbered groups are listed separately
- Regex literal display: `/pattern/flags`

### Replace & Split
- Replacement preview with JS syntax (`$1`, `$<name>`)
- Split results array with time budget enforcement

### Productivity
- Quick recipes (email, URL, UUID, IPv4/6, date, Sri Lankan NIC)
- Test cases panel with expected matches and replacement output
- Copy matches as text, JSON, or CSV
- Download matches as JSON
- Prev/Next match navigation and click-to-jump highlights
- Shareable URL state (`?pattern=...&flags=...&text=...`)
- Recent pattern history (last 10) stored in localStorage

### Safety & Performance
- Debounced auto-run (200ms)
- Time budget guardrail with “Pattern too expensive”
- Safe mode blocks suspicious patterns and very large inputs

## Quick Start

1. Enter a pattern and choose flags.
2. Paste test text (or choose a quick recipe).
3. Inspect highlights, match list, and group captures.
4. Use Replace/Split panels to validate transformations.
5. Copy or share results as needed.

## Keyboard Shortcuts

- Cmd/Ctrl+Enter: Run
- Cmd/Ctrl+L: Focus pattern input
- Esc: Clear match selection

## Inputs & Outputs

### Inputs
- **Pattern** (optionally literal)
- **Flags** (i/g/m/s/y/u)
- **Text** (multi-line)
- **Replacement** (optional)

### Outputs
- Matches list with indices
- Capture and named groups
- Highlighted text with line numbers
- Replacement preview and split array
- JSON/CSV exports

## Limitations

- Safe mode is heuristic; it may block complex patterns.
- Time budget can stop long-running matches or replacements.
- Browser regex engines differ slightly; results may vary across browsers.
- Large inputs may be truncated by safe mode to protect performance.

## Privacy

All matching runs in the browser. No text or patterns are sent to a server.

## Testing

- Manual checklist: `app/(tools)/regex-tester/TESTING.md`
- Unit tests: `tests/regex-tester.unit.spec.ts`

## File Structure

```
app/(tools)/regex-tester/
├── README.md
├── client.tsx
├── layout.tsx
├── page.tsx
└── TESTING.md

lib/
└── regex-tester.ts
```
