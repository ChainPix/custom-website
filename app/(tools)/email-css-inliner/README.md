# Email CSS Inliner Tool Documentation

- **Status:** Stable
- **Last Updated:** 2026-01-03

---

## Overview

Browser-based CSS inliner built for real-world HTML email templates. Paste HTML/CSS or include `<style>` blocks, inline the cascade with specificity and `!important` handling, and review coverage, diffs, and client warnings before exporting. Everything runs locally in your browser with no uploads.

### Primary Use Cases
- Inline CSS for Gmail, Outlook, and transactional email templates
- Merge embedded styles into inline attributes while preserving the cascade
- Identify unsupported selectors and client compatibility risks
- Export HTML/EML for testing in email clients

---

## Key Features

### Inlining Engine
- AST-based CSS parsing with cascade-aware merging
- Specificity, source order, and `!important` handling
- Inline style merge that preserves existing declarations
- Handles multiple stylesheets and `<style>` blocks inside HTML
- Optional media query preservation or mobile-first flattening

### Coverage & Trust
- Coverage report with matched/unmatched/error selectors
- Per-selector match counts and overridden property notes
- HTML diff panel for original vs inlined output
- Sanitized preview with clear browser-only disclaimer

### Email-Client Support
- Client warnings (e.g., Gmail/Outlook limitations) with tips
- Outlook-safe output toggle (table rewrites + VML awareness)
- Optional legacy attribute fallbacks (`bgcolor`, `align`, `valign`, width/height)

### Export & Workflow
- Copy to clipboard with feedback
- Download `.html` and `.eml`
- Copy presets for Gmail or Mailchimp
- Output minify toggle and output-only reset

---

## Supported Inputs

- HTML email templates (tables, legacy attributes, VML blocks)
- CSS pasted separately or embedded in `<style>` tags
- Multiple `<style>` blocks and external stylesheet text

---

## How to Use

1. Paste your HTML (including `<style>` blocks if desired).
2. Paste additional CSS (optional).
3. Choose options: keep style tags, flatten media, Outlook-safe output, or attribute fallbacks.
4. Click **Inline CSS** and review the diff, coverage, and warnings.
5. Copy or download the final HTML/EML.

---

## Export Formats

- **HTML**: Inlined output ready for ESPs
- **EML**: Open directly in desktop email clients
- **Copy for Gmail/Mailchimp**: Adds client-friendly wrappers

---

## Privacy & Security

- All processing runs locally in your browser
- No uploads, no server-side storage
- Preview is sanitized to reduce script injection risk

---

## Performance & Limits

- Fast-path matching for simple selectors (tag/class/id)
- Falls back to `querySelectorAll` for complex selectors
- Large output warning for heavy templates
- Minify toggle reduces payload size for strict ESP limits

---

## Known Limitations

- Complex selectors may be skipped for performance
- Email client rendering varies; always test in target clients
- Media queries are either preserved or flattened, not simulated
- Preview is browser-based, not a true email client preview

---

## File Structure

```
app/(tools)/email-css-inliner/
├── README.md        # This documentation
├── client.tsx       # UI + inlining engine
├── page.tsx         # SEO metadata + JSON-LD schemas
├── layout.tsx       # Layout wrapper
└── TESTING.md       # Manual test checklist
```

---

## Dependencies

- `css-tree` for AST parsing
- `specificity` for cascade resolution
- `diff` for HTML change highlighting
- `dompurify` for preview sanitization
- `lucide-react` for icons

---

## SEO and Structured Data

This tool follows the project SEO pattern:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

See `app/(tools)/email-css-inliner/TESTING.md` for manual scenarios and edge cases.
