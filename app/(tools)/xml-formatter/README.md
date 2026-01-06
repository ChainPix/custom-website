# XML Formatter & Validator Tool Documentation

- **Category:** Developer Tools
- **Status:** ✅ Stable
- **Last Updated:** 2025-12-28

---

## Overview

Browser-based XML formatter and validator with tree-based pretty printing, minify mode, diff view, and developer utilities (XPath + XSLT). All processing runs locally in your browser with no uploads.

### Primary Use Cases
- Pretty print XML for reviews, docs, and debugging
- Minify XML for compact payloads
- Compare input vs formatted output
- Inspect namespaces and root metadata
- Test XPath selectors and XSLT transforms

---

## Key Features

### Formatting Core
- Tree-based formatting (no token regex)
- Indent: 2/4/custom spaces or tabs
- Mixed-content safe inline formatting
- Attribute sorting (optional)
- Remove empty text nodes (optional)
- Whitespace preserve/trim modes
- Keep small elements on one line (length threshold)
- XML declaration preserved when present

### Validation & Insights
- Well-formedness check with line/column extraction
- Root element name
- Namespace summary
- Element and attribute counts
- Original vs formatted size comparison

### Power Features
- Format-on-paste toggle
- Auto-format (debounced) toggle
- Minify mode (reverse of prettify)
- Diff view (original vs formatted)
- Upload + drag-and-drop: `.xml`, `.xsd`, `.wsdl`
- Copy input/output with clipboard fallback
- Output syntax highlighting
- Keyboard shortcuts:
  - Cmd/Ctrl+Enter → Format
  - Cmd/Ctrl+Shift+C → Copy output

### Developer Tools
- XPath tester (show matched nodes)
- XSLT transformer (paste XSLT, get transformed output)

---

## Quick Start

1. Paste XML or upload a file.
2. Choose formatting options and run **Format** (or **Minify**).
3. Copy, download, or compare output in diff view.
4. Use XPath or XSLT tools when needed.

---

## Export Formats

- **XML**: Download as `formatted.xml`
- **Clipboard**: Copy input/output and XSLT output

---

## Validation & Limits

- Max input size: **5MB**
- Large input warning: > **1MB**
- Parse errors show line/column when available
- Auto-format skips very large inputs to avoid UI stalls
- Diff view is line-based for speed on large files

---

## Privacy & Data Handling

- All parsing/formatting happens client-side
- No network uploads or server processing
- Clipboard actions require HTTPS + user gesture

---

## Browser Compatibility

Requires modern browsers with:
- Web Workers
- DOMParser / XMLSerializer
- Clipboard + File APIs

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/xml-formatter/
- client.tsx
- page.tsx
- layout.tsx
- formatter-utils.ts
- xml-formatter.worker.ts
- README.md
- TESTING.md
```

---

## Dependencies

- Native DOM APIs: `DOMParser`, `XMLSerializer`, `XPathEvaluator`, `XSLTProcessor`
- Web Worker for formatting
- `lucide-react` for icons

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit tests: `tests/xml-formatter.unit.spec.ts`
- Run: `npx playwright test tests/xml-formatter.unit.spec.ts`

---

## Troubleshooting

**Formatting fails**
- Confirm the XML is well-formed.
- Use Jump to Error to highlight the failing location.

**XPath returns no matches**
- Ensure namespaces are referenced correctly in your XPath.

**XSLT errors**
- Some browsers limit XSLT support; Safari may behave differently.

---

## Notes & Limitations

- XSD validation is not available in-browser yet.
- XPath/XSLT support depends on browser implementations.
- Syntax highlighting is lightweight and not a full XML parser.
