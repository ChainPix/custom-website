# Cron Generator Tool Documentation

- **Version:** 2.0.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-30
- **Status:** ✅ Stable

---

## Overview

Dialect-aware cron expression generator with validation, previews, exports, and testing utilities. Build Unix, Quartz, AWS EventBridge, or Kubernetes CronJob schedules, preview upcoming runs with timezone support, and export snippets for production systems. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Generate cron expressions for common schedulers
- Validate field ranges, special tokens, and dialect rules
- Preview next runs with calendar and timeline views
- Share and save cron configurations locally
- Convert between cron and human-readable descriptions

---

## Key Features

### Dialects & Semantics
- Unix 5-field cron (DOM/DOW OR semantics)
- Quartz 6/7-field cron with `?`, `L`, `W`, `#`
- AWS EventBridge (Quartz-style with required year)
- Kubernetes CronJob (Unix-style)

### Validation & Guidance
- Field-level range checks with actionable errors
- Dialect-specific DOM/DOW rules enforced
- Highlighted inputs for invalid fields

### Previews & Simulation
- Next-run timeline list + mini calendar preview
- Configurable preview count (20–50 runs)
- Window-based search with “no run found” messaging

### Timezones
- Local, UTC, and IANA timezone support
- DST-aware previews using time zone formatting

### Conversion
- Cron → human summary (natural-language)
- Human → cron for common phrases (weekday/time, intervals, monthly)

### Sharing & History
- Shareable links via query params
- Recent expressions + favorites stored in localStorage

### Exports
- Kubernetes CronJob YAML
- GitHub Actions schedule snippet
- AWS EventBridge rule payload
- Linux crontab line with command placeholder

### Test Harness
- Validate a timestamp against expected match/no-match
- “Why didn’t it match?” explanation per field

---

## Quick Start

1. Choose a dialect (Unix, Quartz, AWS, Kubernetes).
2. Enter field values or choose a preset.
3. Review cron output, human summary, and previews.
4. Copy/export the cron or share a link.

---

## Validation & Limits

- Range checks enforce min/max for each field.
- Quartz/AWS require exactly one of DOM/DOW to be `?`.
- Special tokens are accepted only in Quartz/AWS dialects.
- Shareable URLs can get long for large configurations.

---

## Privacy & Data Handling

- All processing is client-side; no uploads.
- Local history and favorites are stored in `localStorage`.
- Shareable links encode configuration in the query string.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- Blob API (downloads)
- `Intl.DateTimeFormat` (timezone previews)
- `URLSearchParams` (share links)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/cron-generator/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
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

Manual checklist: `app/(tools)/cron-generator/TESTING.md`

---

## Troubleshooting

**No runs appear in preview**
- Increase the search window or preview count; monthly schedules can be sparse.

**Quartz special tokens rejected**
- Make sure the dialect is set to Quartz or AWS EventBridge.

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

---

## Roadmap

- More human-language parsing patterns
- Additional exports (Terraform, CloudFormation, Helm)
- Optional incremental search optimization
