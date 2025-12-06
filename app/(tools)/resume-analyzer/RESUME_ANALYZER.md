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
- ✅ Upload + export: PDF/DOCX/TXT upload with client-side parse; export insights as JSON/CSV.
- Note: DOCX parsing requires the `mammoth` dependency installed; currently falls back to a warning if unavailable.
- Add debounced analysis with size guard and `aria-live` status updates.
- Add Clear + Sample Resume buttons; copy insights button.
- Add explicit labels/aria, mark decorative icons, and live region for metrics/errors.
- Add simple size warning (e.g., >50KB) and skip analysis when empty.
- Add tailored metadata (if needed) and clarify “client-side only” note in UI.
- Add a small manual test checklist in this folder (future).

## Future Enhancements (backlog)
- Smarter NLP: stemming/lemmatization, unique words, bigrams/trigrams, and stopword tuning.
- Section detection: auto-detect Experience/Education/Skills and surface section-specific tips.
- Automation/SEO: add structured data for the tool and Playwright smoke tests for core flows.
