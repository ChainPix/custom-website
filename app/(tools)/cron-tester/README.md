# Cron Tester Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-03-01

---

## Overview

Browser-based cron tester and next-run calculator with dialect selection, timezone-aware previews, human-readable summaries, and export tools. All processing runs locally in your browser with no uploads.

### Primary Use Cases
- Validate cron expressions across common schedulers
- Preview upcoming run times with timezone awareness
- Generate shareable links for debugging schedules
- Export upcoming runs as .ics, ISO, or Unix timestamps
- Explain cron schedules in plain language

---

## Key Features

### Core Validation
- Dialects: Vixie/Linux, Quartz, GitHub Actions, AWS EventBridge
- 5-field and 6-field cron support (dialect-aware)
- Token-level diagnostics with allowed ranges and suggestions
- Next-run calculations via `cron-parser` for reliable scheduling

### Previews & Exports
- Next run time list (1–20 runs)
- Mini calendar preview with highlighted run days
- Copy ISO timestamps or Unix timestamps
- Download as `.ics` for calendar tools

### UX & Productivity
- Field builder for minutes/hours/weekdays with two-way sync
- Human-readable schedule summary
- Shareable links with query params
- Validate-on-type toggle with debounce
- Copy feedback states for share/run lists

---

## Quick Start

1. Choose a dialect and timezone.
2. Paste a cron string or use the field builder.
3. Click **Validate** to preview next runs and the calendar.
4. Copy share links or export timestamps as needed.

---

## Supported Dialects

- **Vixie/Linux (5-field)**: `m h dom mon dow`
- **Quartz (6-field)**: `s m h dom mon dow`
- **GitHub Actions**: Standard 5-field
- **AWS EventBridge**: Quartz-style 6-field

Note: Quartz/AWS previews accept numeric fields; special tokens like `L`, `W`, and `#` are not supported yet.

---

## Shareable Links

State is encoded in query params:

```
?expr=*/5+*+*+*+*&dialect=vixie&tz=UTC&sec=0&count=10
```

Parameters include:
- `expr` - cron expression
- `dialect` - vixie | quartz | github | aws
- `tz` / `utc` - timezone selection
- `sec` - seconds field toggle
- `count` - preview count

---

## Validation & Limits

- Preview count is capped at 20 runs.
- Invalid tokens show the specific field and allowed ranges.
- Shareable links can become long for complex expressions.

---

## Privacy & Data Handling

- All validation and previews run locally in your browser.
- No cron expressions are uploaded or stored on a server.
- Share links encode state in the URL only.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- URLSearchParams (share links)
- Intl.DateTimeFormat (timezone previews)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/cron-tester/
- client.tsx
- page.tsx
- layout.tsx
- README.md

lib/
- cron.ts

tests/
- cron-tester.unit.spec.ts
```

---

## Dependencies

- `cron-parser`
- `lucide-react`

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit tests: `tests/cron-tester.unit.spec.ts`
- Run: `npx playwright test tests/cron-tester.unit.spec.ts`

---

## Troubleshooting

**Validation fails**
- Ensure field counts match the selected dialect.
- Replace custom tokens with numeric ranges or steps.

**Timezone looks wrong**
- Confirm the timezone selection and re-validate.

**Copy actions fail**
- Clipboard access requires HTTPS and a user gesture.

---

## Limitations

- Quartz/AWS special tokens (`L`, `W`, `#`, `?`) are not supported yet.
- Calendar preview highlights the current month only.
- Share links can exceed URL length limits for very long expressions.

---

## Roadmap

- Quartz special token support
- Named month/day parsing (JAN/MON)
- Additional calendar navigation
