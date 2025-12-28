# Text Deduper Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Browser-based text deduplication tool that removes duplicate lines with configurable matching modes, keep rules, and export formats. Includes frequency analytics, removed-line tracking, file support, and an optional worker mode for huge inputs. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Clean lists of emails, URLs, or names
- Deduplicate logs or CSV columns pasted as text
- Normalize copy/pasted data before import
- Review duplicate frequency and removed lines

---

## Key Features

### Matching Modes
- Exact (default)
- Trim + collapse whitespace
- Unicode normalization (NFKC)
- Ignore punctuation
- Ignore diacritics (résumé vs resume)
- URL normalization (lowercase host, trim trailing slash, ignore scheme)
- Email normalization (lowercase domain or full address)

### Keep Rules
- Keep first (default)
- Keep last (most recent)
- Keep shortest or longest
- Prefer non-empty when duplicates exist

### Output & Analytics
- Output formats: plain, comma-separated, JSON array, quoted list, numbered lines
- Frequency table with filters (duplicates / uniques / all)
- Copy/download removed lines
- Counts for total, non-blank, unique, duplicates removed, blank removed

### Performance & Scale
- Debounced processing for large pastes
- Optional worker mode for huge inputs
- Drag & drop `.txt`/`.csv` file support
- Streaming/chunk processing in worker mode

### UX & Quality-of-Life
- Swap input/output panels
- Copy input/output with feedback
- Full-width toggle (optional)
- Preferences stored in localStorage

---

## Quick Start

1. Paste text (one item per line) or upload a `.txt`/`.csv` file.
2. Choose a matching mode and keep rule.
3. Review stats and the frequency table.
4. Copy or download the deduped output and (optionally) removed lines.

---

## Validation and Limits

- Default input guard at 50,000 characters (unless worker mode is enabled).
- Oversize inputs show a clear error and skip processing.
- Worker mode is recommended for very large files.

---

## Privacy & Data Handling

- All processing runs client-side in your browser.
- No uploads, tracking, or server storage.
- Preferences are stored in localStorage only.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- Blob API (downloads)
- Web Workers (optional worker mode)
- File/Stream APIs for drag-and-drop uploads

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/text-deduper/
- client.tsx          # UI and orchestration
- dedupe.ts           # Pure dedupe helper
- dedupe-worker.ts    # Worker for huge inputs / streaming
- page.tsx            # Metadata + JSON-LD schemas
- layout.tsx          # Layout wrapper
- README.md           # This documentation
- TESTING.md          # Manual test checklist
```

---

## Dependencies

- `lucide-react` for icons

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit tests: `tests/text-deduper.unit.spec.ts`
- Run: `npx playwright test tests/text-deduper.unit.spec.ts`

---

## Troubleshooting

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

**Worker mode doesn’t run**
- Web Workers may be blocked by strict browser policies or extensions.

**Huge inputs are slow**
- Enable worker mode and upload a file to use streaming processing.
