# SQL Formatter Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-01-15

---

## Overview

Browser-based SQL formatter with dialect-aware presets, explain mode, diff view, and export tools. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Prettify SQL for reviews, docs, or sharing
- Minify SQL for production payloads or storage
- Compare input vs formatted output diffs
- Normalize SQL style across teams
- Batch-format multiple statements in one pass

---

## Key Features

### Formatting Core
- Dialect support: SQL, MySQL, PostgreSQL, SQLite, MariaDB
- Presets: Readable, Compact, Team Style, and Custom
- Keyword casing: Preserve, UPPER, lower
- Indent style: tabs or spaces
- Comma style: leading or trailing
- Lines between statements
- Prettify vs Minify tabs

### Multi-Statement Workflow
- Toggle to format multiple statements
- Statement splitter preview for quick validation

### Review & Explain
- Explain mode highlights clauses with tooltips
- Diff view: input vs output (side-by-side)
- Line numbers + syntax highlighting in output

### Exports & Sharing
- Copy Output or Copy as Markdown code block
- Download as `.sql` or `.txt`
- Shareable link (settings + SQL, optional compression)

### Productivity
- Auto-format (debounced) and format-on-paste
- Keyboard shortcuts: Cmd/Ctrl+Enter (format), Cmd/Ctrl+Shift+C (copy output)
- Drag-and-drop `.sql` import

---

## Quick Start

1. Paste SQL or import a `.sql` file.
2. Pick a dialect and a preset (or customize options).
3. Choose Prettify or Minify and click **Format**.
4. Review output or diff, then copy or export.

---

## Export Formats

- **SQL**: `.sql`
- **Text**: `.txt`
- **Markdown**: fenced ` ```sql ` block (copy only)

---

## Validation & Limits

- Input limit: 50,000 characters (guarded)
- Lint hints for unbalanced quotes/parentheses
- Optional semicolon warning
- Share links may exceed URL limits for large inputs
- Splitter is heuristic (SQL comments/strings handled, but not a full parser)

---

## Privacy & Data Handling

- All formatting runs client-side
- No uploads or server processing
- Share links encode state in the URL
- Local persistence via `localStorage`

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- Clipboard API
- Blob API
- File API (drag-and-drop import)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/sql-formatter/
- client.tsx
- page.tsx
- layout.tsx
- formatter-utils.ts
- use-sql-formatter.ts
- sql-formatter.worker.ts
- README.md
```

---

## Dependencies

- `sql-formatter`
- `lz-string`
- `lucide-react`

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit tests: `tests/sql-formatter.unit.spec.ts`
- E2E tests: `tests/sql-formatter.spec.ts`
- Run: `npx playwright test tests/sql-formatter.unit.spec.ts tests/sql-formatter.spec.ts`

---

## Troubleshooting

**Formatting fails**
- Try the suggested dialect or simplify the query.
- Open Details to see the underlying formatter error.

**Copy actions fail**
- Clipboard access requires HTTPS and a user gesture.

**Share link too long**
- Enable compression or shorten the SQL input.

---

## Notes

- Explain mode uses lightweight keyword matching (not a full SQL parser).
- Diff view is line-based for speed on large inputs.
