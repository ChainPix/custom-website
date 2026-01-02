# UUID Generator Tool Documentation

## Overview
The UUID Generator creates v1, v4, v5, and v7 UUIDs entirely in your browser. It supports deterministic v5 namespaces, batch output formats (TXT/CSV/JSON/SQL), shareable links, and copy/download flows designed for developer productivity.

### Primary Use Cases
- Generate random UUIDs for APIs, tests, and database keys.
- Create deterministic v5 UUIDs for stable IDs from a namespace + name.
- Produce time-ordered v7 UUIDs to improve database index locality.
- Export UUIDs in CSV/JSON/SQL for scripts and migrations.

## Key Features
### Core Generation
- v1, v4, v5, and v7 UUID support.
- Auto-generate on load toggle for quick one-off usage.
- Uniqueness check to flag duplicate IDs in a batch.

### Deterministic v5 + Bulk Mode
- Namespace + name input for single deterministic UUIDs.
- Bulk import: paste up to 50 names to generate v5 UUIDs per line.

### Formatting & Output
- Format options: uppercase/lowercase with or without dashes.
- Output separators: newline, comma + space, JSON array, CSV column, SQL INSERT snippet.

### Copy, Download, Share
- Per-UUID click-to-copy and copy-all.
- Download output in TXT/CSV/JSON/SQL.
- Shareable query-param links to restore settings.
- API mode teaser for a future `/api/uuid` endpoint.

### Accessibility & Reliability
- Keyboard shortcuts for generate, copy, download, and clear.
- Focusable output preview with click-to-select.
- Clipboard fallbacks and manual selection guidance.
- `crypto.getRandomValues` fallback when `crypto.randomUUID()` is unavailable.

## Quick Start
1. Pick a UUID version (v4 is the default).
2. Set a count between 1 and 50.
3. Choose a format and output separator.
4. Generate, copy, or download the results.

## Output Formats
- Newline-separated UUIDs (default)
- Comma + space
- JSON array (pretty printed)
- CSV column with header row
- SQL INSERT snippet

## Validation and Limits
- Count is clamped between 1 and 50.
- v5 requires a valid namespace UUID.
- Bulk v5 mode accepts up to 50 names (one per line).
- Duplicate detection flags any collisions in the generated batch.

## Privacy & Data Handling
All generation happens client-side. UUIDs are produced in your browser and never uploaded to a server.

## Browser Compatibility
Requires modern browser crypto APIs. v4 generation falls back to `crypto.getRandomValues` if `crypto.randomUUID` is unavailable.

## File Structure
- `app/(tools)/uuid-generator/client.tsx` - UI + interactions
- `app/(tools)/uuid-generator/page.tsx` - metadata + structured data
- `app/(tools)/uuid-generator/layout.tsx` - page layout wrapper
- `lib/uuid-generator.ts` - pure helper functions
- `tests/uuid-generator.spec.ts` - Playwright E2E coverage
- `tests/uuid-generator.unit.spec.ts` - unit coverage
- `app/(tools)/uuid-generator/TESTING.md` - manual checklist

## Dependencies
- `uuid` for v1/v5/v7 generation
- `lucide-react` for icons
- Playwright for testing

## SEO and Structured Data
The page includes:
- Enhanced metadata (title, description, keywords, canonical, robots, OpenGraph, Twitter)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- On-page FAQ content and trust messaging

## Testing
- Unit tests cover formatting, count clamping, and v5 determinism.
- E2E tests cover generate → copy → download and invalid count handling.
- Manual checklist available in `app/(tools)/uuid-generator/TESTING.md`.

## Troubleshooting
### Copy doesn’t work
Ensure clipboard permissions are enabled. The output preview supports click-to-select with manual Ctrl/Cmd+C fallback.

### v5 generation fails
Check that the namespace is a valid UUID and that you are in v5 mode.

### Download doesn’t start
Some browsers block automatic downloads. Try again or use copy-all instead.

## Roadmap
- Public API endpoint (`/api/uuid`) for CI and scripting.
- Optional history export and bulk file import.
