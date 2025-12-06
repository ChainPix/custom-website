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
- ☐ Debounce analysis (currently updates on every keystroke; only status is delayed).
- ☐ Add a small manual test checklist in this folder.
