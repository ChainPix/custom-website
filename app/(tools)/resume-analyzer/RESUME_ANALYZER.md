# Resume Analyzer – Assessment & Plan

## Current State (observed)
- Plain text paste only; no doc/PDF upload or export/copy of insights.
- Keyword extraction is basic (stop-words only); no stemming/lemmatization; no ATS/job-description comparison; no unique word list.
- Metrics: word/char count, bullet count (`-`/`•`), reading time (200 wpm). Can miscount bullets in prose; no size guard.
- UI: single textarea, no sample resume filler, no clear/reset control; static tips not personalized.
- Accessibility: no `aria-live` for changing insights; textarea lacks explicit aria-label; icons not marked decorative.
- Performance: runs on every keystroke; no debounce; no max-length warning.
- SEO: no tool-specific structured data; relies on page metadata only; privacy note limited to placeholder.
- Testing: none (unit or E2E).

## Immediate Improvement Set
- ✅ Upload + export: PDF/DOCX/TXT upload with client-side parse; export insights as JSON/CSV. (Requires `mammoth` for DOCX.)
- ✅ Clear + Sample Resume buttons; copy insights button.
- ✅ Explicit labels/aria, live region for status/errors; size warning (>50KB).
- ✅ Tailored metadata/structured data and “client-side only” note in UI.
- ✅ ATS-style matching: tech dictionary + alias map, weighted top terms, section-weighted scores, and missing-term fix guidance.
- ✅ Resume-quality signals: action verbs, measurability, bullet quality scoring, readability, and repetition warnings.
- ✅ PDF parsing upgrades: worker-based extraction, per-page progress, and scanned-PDF fallback messaging.
- ✅ Product UI upgrades: highlighted keywords, missing-term insert hints, before/after compare, role presets, and privacy redaction mode.
- ✅ Export upgrades: one-page PDF report and tailored bullet templates with copy support.
- ✅ Engineering upgrades: modular parsers/scoring, unit tests, and a route error boundary with structured PDF errors.
- ✅ Advanced insights: skill graph, ATS formatting checks, expanded section detection, and clustered missing-term guidance.
- ✅ Tweaks: bullet counting only for `-`/`•`, 30 keyword display limit, and short-text scanned PDF warning.
- ✅ Cleanup: deduped stopwords + added resume-domain stopwords, fixed metadata title spacing.
- ✅ SEO upgrade: expanded metadata, keywords, robots, and full schema set (Breadcrumb, SoftwareApp, HowTo, FAQ, WebPage).
- ☐ Debounce analysis (currently updates on every keystroke; only status is delayed).
- ☐ Add a small manual test checklist in this folder.
