# Chmod Calculator Tool Documentation

- **Version:** 1.1.0
- **Category:** Developer Tools
- **Last Updated:** 2025-12-27
- **Status:** Stable

---

## Overview

Browser-based chmod calculator that converts between octal and symbolic permissions with special bits, explain mode, and security hints. Everything runs locally in the browser with no uploads.

### Primary Use Cases
- Translate chmod values like 755 or 644 into rwx notation
- Confirm setuid/setgid/sticky behavior before applying
- Spot risky permissions (world-writable, setuid + write)
- Share or compare permission changes during debugging

---

## Key Features

### Core Conversion
- **Octal to symbolic** and symbolic to octal conversion
- **Special bits** support: setuid, setgid, sticky
- **Copy chmod command** with toast feedback
- **Explain mode** hover breakdown for each digit

### Safety & Guidance
- **Security hints** for risky selections (world-writable, 777 files, setuid + write)
- **Safe defaults** guidance (644 files, 755 executables, 700 private)
- **Path-aware helper** for common scenarios (script, secrets, web assets)

### Productivity
- **History / compare** panel for last 10 changes
- **Shareable state** via `?octal=` query parameter
- **Sample buttons** (644, 755, 700, 4755) for quick start

---

## Quick Start

1. Paste an octal value (e.g., 755) or toggle permissions.
2. Review symbolic output and special bit markers (s/S, t/T).
3. Check security hints and copy the chmod command.

---

## Explain Mode

Hover any octal digit to see the breakdown:
- `7 = 4(r) + 2(w) + 1(x)`
- `5 = 4(r) + 1(x)`
- Special digit: `4=setuid, 2=setgid, 1=sticky`

---

## Limits and Validation

- Accepts 3- or 4-digit octal values (`000` to `7777`)
- Invalid or incomplete input shows friendly guidance
- All processing is client-side

---

## Privacy & Data Handling

- No uploads or server storage
- No tracking or analytics
- History and sharing are local to the browser session

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy button)
- History API (shareable state)
- Standard form and DOM APIs

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/chmod-calculator/
- chmod.ts          # Pure conversion helpers
- client.tsx        # UI and logic
- page.tsx          # Metadata + JSON-LD schemas
- layout.tsx        # Layout wrapper
- README.md         # This documentation
- TESTING.md        # Manual test checklist
```

---

## Dependencies

- **lucide-react** for icons

---

## SEO and Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Clear trust language (local, no uploads, no tracking)

---

## Testing

- Manual checklist: `app/(tools)/chmod-calculator/TESTING.md`
- Playwright smoke tests: `tests/chmod-calculator.spec.ts`
- Unit tests: `tests/chmod-calculator.unit.spec.ts`

---

## Troubleshooting

**Octal input is rejected**
- Use 3 or 4 digits from 0-7 (e.g., 755 or 4755).

**Copy button fails**
- Clipboard access requires HTTPS and user gesture.

**Shareable link does not update**
- The URL updates on valid octal changes; invalid input is not written.

---

## Roadmap

- Preset shortcuts (e.g., 640, 600)
- Export history as text or JSON
- Optional symbolic input field
- Additional educational hints for directory vs file use cases
