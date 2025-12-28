# Timestamp Converter Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Developer-grade timestamp converter that handles seconds, milliseconds, microseconds, and nanoseconds with auto-detection, time zone outputs, batch mode, exports, and shareable links. Everything runs locally in the browser with no uploads.

### Primary Use Cases
- Convert epoch values from logs, APIs, and databases
- Validate unit precision (s/ms/us/ns) in pipelines
- Compare UTC vs local time for incident timelines
- Batch convert large sets for spreadsheets or tickets

---

## Key Features

### Core Conversion
- Auto-detects units by length and magnitude (s/ms/us/ns)
- Manual unit override with "Parsed as" feedback
- Negative timestamps supported (pre-1970 dates)
- Round-trip date to timestamp conversion

### Time Zones and Formats
- Local time, UTC time, and custom IANA time zone output
- ISO or locale formatting
- Inline conversion math for transparency

### Batch Mode
- Paste multiple timestamps (one per line)
- Table output: timestamp, unit, ISO (UTC), local, relative, error
- Export CSV

### Productivity
- Shareable URLs with query params (`ts`, `unit`, `tz`, `fmt`, `view`)
- Recent conversions stored locally (localStorage)
- Keyboard shortcuts: `/` focus input, Enter copy, Cmd/Ctrl+K palette
- Presets: Epoch, start of today (local/UTC), now +/- offsets

### Copy and Export
- Clipboard fallback messaging for restricted browsers
- Unified export menus for date and timestamp outputs

---

## Quick Start

1. Paste a Unix timestamp or switch to Batch mode for multiple lines.
2. Confirm auto-detected units or choose s/ms/us/ns.
3. Pick a time zone (Local, UTC, or Custom).
4. Copy or export outputs, or share the link.

---

## Validation and Limits

- JavaScript Date supports roughly +/- 8.64e15 ms (~100 million days).
- Non-numeric input and out-of-range values show clear errors.
- Custom time zones must be valid IANA identifiers (e.g., `America/New_York`).

---

## Privacy & Data Handling

- All conversions run client-side.
- Recent conversions are stored only in localStorage.
- No uploads, tracking, or server storage.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy buttons)
- Blob API (downloads)
- Intl.DateTimeFormat with timeZone support

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/timestamp-converter/
- client.tsx
- page.tsx
- layout.tsx
- README.md
```

---

## Testing

- Playwright: `tests/timestamp-converter.spec.ts`
- Run: `npm run test -- tests/timestamp-converter.spec.ts`

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- On-page how-to, use cases, and privacy notes

---

## Troubleshooting

**Copy button fails**
- Clipboard access requires HTTPS and user interaction.

**Custom time zone is rejected**
- Use a valid IANA zone like `Asia/Colombo` or `America/New_York`.

**Batch export is disabled**
- Paste at least one valid timestamp line.

---

## Roadmap

- Shareable links for batch input
- Per-row copy actions in batch table
- Expanded relative time granularity (hours/days)
