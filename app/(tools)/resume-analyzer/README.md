# Resume Analyzer

- **Category:** Career Tools
- **Status:** ✅ Stable

---

## Overview

Privacy-first resume analysis tool that evaluates ATS keyword coverage, bullet quality, formatting risks, and section completeness. Compare a resume against a job description, get targeted fixes, and export reports. Everything runs locally in the browser.

### Primary Use Cases
- Measure ATS-style keyword match against a job description.
- Identify missing skills and where to add them.
- Improve bullet strength and measurability.
- Verify section coverage (Summary, Experience, Projects, Skills, Education, Certifications).
- Export a one-page report for review.

---

## Key Features

### ATS Matching
- Weighted matching with exact/alias and section weighting.
- Role presets: Software Engineer, Data/ML, DevOps, Intern.
- Role-specific skill graph (Core, Nice-to-have, Missing).
- Job keyword clusters with suggested bullet templates.

### Resume Quality Signals
- Action verb detection and passive bullet suggestions.
- Measurability detection (%/$/time saved).
- Bullet quality score (verb + scope + outcome + length).
- Readability scoring and repetition warnings.

### Formatting & Structure
- ATS formatting checker (tables/columns, repeating headers/footers).
- Expanded section checklist with line detection.

### Privacy & Export
- Privacy mode: redact emails/phones/links before analysis.
- Export insights (JSON/CSV).
- One-page PDF report (print to PDF).
- Copy tailored bullets with offline templates.

---

## Quick Start

1. Paste your resume or upload a PDF/DOCX/TXT file.
2. Paste a job description to compare.
3. Review match score, missing terms, and quality signals.
4. Apply suggested fixes and export the report if needed.

---

## Validation & Limits

- File types: PDF, DOCX, TXT.
- File size limit: 10MB.
- Scanned PDFs: warns when extracted text is too short.
- Matching uses in-document weighting, not global corpora.

---

## Privacy & Data Handling

- All processing runs client-side in your browser.
- No uploads, tracking, or server storage.
- Privacy mode redacts sensitive data before analysis.

---

## Browser Compatibility

Requires modern browsers with:
- Clipboard API (copy actions)
- FileReader/Blob APIs (uploads/exports)
- Web Workers (PDF parsing)

Works on current Chrome, Firefox, Safari, and Edge.

---

## File Structure

```
app/(tools)/resume-analyzer/
- analysis.ts                # Pure analysis utilities
- client.tsx                 # UI and orchestration
- error.tsx                  # Route error boundary
- parsers/
  - pdf.ts                   # PDF text extraction
  - docx.ts                  # DOCX parsing
- resume-analyzer.worker.ts  # PDF parsing + analysis worker
- scoring/
  - match.ts                 # ATS matching logic
- page.tsx                   # Metadata + JSON-LD schemas
- layout.tsx                 # Layout wrapper
- README.md                  # This documentation
```

---

## Dependencies

- `pdfjs-dist` for PDF text extraction
- `mammoth` for DOCX parsing
- `lucide-react` for icons

---

## SEO & Structured Data

Follows site SEO patterns:
- Expanded metadata (title, description, keywords, canonical, robots)
- JSON-LD schemas: BreadcrumbList, SoftwareApplication, HowTo, FAQPage, WebPage
- Privacy-first language in metadata and FAQs

---

## Testing

- Unit tests: `tests/resume-analyzer.unit.spec.ts`
- E2E tests: `tests/resume-analyzer.spec.ts`
- Run: `npx playwright test tests/resume-analyzer.unit.spec.ts`

---

## Limitations

- Scanned PDFs are not OCR-processed; upload DOCX/TXT or paste text.
- Multi-column layouts can be misread by ATS; checker flags likely issues.
- Keyword matching is heuristic and may miss rare or highly specialized terms.

---

## Troubleshooting

**PDF shows “scanned” warning**
- The PDF likely contains images instead of text. Upload DOCX/TXT or paste text.

**Copy buttons fail**
- Clipboard access requires HTTPS and a user gesture.

**Large files feel slow**
- Split the resume or use text paste for faster analysis.
