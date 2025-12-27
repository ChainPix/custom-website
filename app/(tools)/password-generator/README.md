# Password Generator Tool Documentation

- **Version:** 1.4.0
- **Category:** Security Tools
- **Last Updated:** 2025-12-27
- **Status:** Stable

---

## Overview

Client-side password and passphrase generator focused on security, auditability, and usability. Uses Web Crypto API randomness, zxcvbn strength analysis, strict set enforcement, and bulk export. Everything runs locally in the browser with no storage or logging.

### Primary Use Cases
- Generate strong passwords for everyday and admin accounts
- Create memorable passphrases for shared or personal use
- Bulk-generate credentials for QA and admin workflows
- Evaluate strength with crack-time estimates and warnings

---

## Key Features

### Core Generation
- **Password mode** with length 6-64 and selectable character sets
- **Passphrase mode** with word count, separator, capitalization, and number suffix
- **Cryptographically secure randomness** via Web Crypto API
- **Strict mode** to guarantee at least one character from each selected set

### Strength Analysis
- **zxcvbn scoring** with crack-time estimates
- **Warnings and suggestions** for weak patterns
- **Visual strength meter** with animated transitions

### Power-User Workflow
- **Session-only history** (last 10) with click-to-copy
- **Bulk generation** for 10 / 50 / 100 items
- **Export formats**: TXT, CSV, JSON

### UX and Accessibility
- **Keyboard shortcuts**: R regenerate, C copy, H hide/show
- **Copy feedback** and subtle animation
- **Shuffle animation** on regeneration
- **ARIA live status** and labeled regions

---

## Privacy and Threat Model

### What this tool does NOT do
- No network calls
- No analytics on password content
- No storage
- No logging

### Open Auditability
- Source file: `app/(tools)/password-generator/client.tsx`
- Generation functions: `generateOutput()`, `generatePassword()`, `generatePassphrase()`
- Auditable in under 2 minutes

If `NEXT_PUBLIC_REPO_URL` is set, the UI links directly to the source file.

---

## How to Use

1. Choose **Password** or **Passphrase** mode.
2. Configure length or word count, and any rules or separators.
3. Review strength score and crack-time estimate.
4. Copy, regenerate, or export in bulk.

### Bulk Export
- Generate 10 / 50 / 100 items
- Export as `.txt`, `.csv`, or `.json`
- Files are downloaded locally; nothing leaves the browser

---

## Mini-Guides (SEO Content)

### How long should a password be in 2025?
- Everyday accounts: 14-16 characters
- High-value accounts: 20+ characters
- Length is more effective than adding extra symbols

### Password vs passphrase
- Passwords are compact for strict length limits
- Passphrases are easier to remember and can be longer

### Why entropy matters
- Entropy estimates the search space for attackers
- More unique characters and length increase entropy

---

## Limitations

- Password length is limited to 6-64 characters in UI
- Passphrase word list is intentionally compact for clarity
- Strength estimates are probabilistic and depend on assumptions
- Clipboard access may be blocked by some browsers or permissions

---

## Dependencies

- **@zxcvbn-ts/core** and **@zxcvbn-ts/language-en** for strength analysis
- **Web Crypto API** for secure randomness

---

## File Structure

```
app/(tools)/password-generator/
- client.tsx
- page.tsx
- layout.tsx
- README.md
- TESTING.md
```

---

## Testing

See `app/(tools)/password-generator/TESTING.md` for manual test coverage and edge cases.

---

## SEO and Structured Data

This tool follows the site SEO patterns:
- Expanded metadata (title, description, keywords)
- JSON-LD schemas: Breadcrumb, SoftwareApplication, HowTo, FAQ, WebPage
- On-page mini-guides, FAQ, and related tools

---

## Notes

- All generation runs client-side.
- No secrets are stored or transmitted.
- Refreshing the page clears session history.
