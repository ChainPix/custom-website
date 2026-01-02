# Cron Parser Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-01-15

---

## Overview

Cron parser and next-run calculator with timezone comparison, dialect validation, and Quartz mode support. Parse expressions, preview upcoming runs, and export snippets for common schedulers. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Validate cron expressions before deploying schedules
- Preview upcoming runs across timezones and compare outputs
- Share schedules with teammates using URLs
- Export crontab, Kubernetes CronJob, or GitHub Actions snippets

---

## Key Features

### Parsing & Validation
- Vixie-style numeric cron (5 fields, optional seconds)
- Lists, ranges, and step syntax (`*/5`, `1-10/2`, `*/15,7`)
- Shortcut tokens (`@hourly`, `@daily`, `@weekly`, `@monthly`)
- Quartz mode for 6/7 fields with `?`, `L`, `W`, and `#`
- Field-level validation with inline error messages
- Early detection for impossible schedules (e.g., Feb 31)

### Previews & Timezones
- Next-run list with local or IANA timezone formatting
- Side-by-side timezone comparison
- Human-readable schedule summary

### Productivity & Sharing
- Shareable URLs with expression, timezone, and mode settings
- Copy outputs: crontab line, Kubernetes CronJob, GitHub Actions schedule
- History and favorites stored in localStorage
- Field editor for simple numeric lists (advanced text mode for ranges/steps)

---

## Quick Start

1. Paste a cron expression (or use a shortcut like `@daily`).
2. Choose a timezone and optionally enable compare mode.
3. Review next runs and copy/export snippets if needed.

---

## Validation & Limits

- Vixie mode expects 5 fields (or 6 with seconds enabled).
- Quartz mode expects 6 or 7 fields (seconds required).
- Quartz special tokens are supported in day-of-month/day-of-week only.
- Shareable URLs can grow with long expressions and settings.
- Field editor supports numeric lists only; use advanced text mode for ranges/steps.

---

## Privacy & Data Handling

- All parsing and preview calculations run client-side.
- No uploads or server processing.
- History and favorites are stored locally in `localStorage`.

---

## Browser Compatibility

Requires modern browsers with:
- `Intl.DateTimeFormat` (timezone formatting)
- Clipboard API (copy actions)
- Blob API (downloads)
- URLSearchParams (shareable links)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/cron-parser/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Dependencies

- `cron-parser`
- `lucide-react`

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Manual checklist: `app/(tools)/cron-parser/TESTING.md`
- Unit tests: `tests/cron-parser.unit.spec.ts`
- Run: `npx playwright test tests/cron-parser.unit.spec.ts`

---

## Troubleshooting

**No runs appear**
- Try increasing the preview count or adjust sparse schedules.

**Quartz expression rejected**
- Enable Quartz mode and ensure 6/7 fields with valid tokens.

**Copy actions fail**
- Clipboard access requires HTTPS and a user gesture.

---

## Roadmap

- Expand field editor to support ranges/steps
- Optional calendar preview for long schedules
- Additional export formats (Terraform, CloudFormation)
