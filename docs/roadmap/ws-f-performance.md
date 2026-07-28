# WS-F — Performance

Budgets first, then the big levers, then per-route tuning.

## Budgets & measurement
- [ ] F1 Bundle-size report in CI (next build output parsed, per-route table artifact)
- [ ] F2 Size budgets: fail CI if any tool route First Load JS grows >10% vs baseline
- [ ] F3 Lighthouse CI on 6 representative routes (one per category) with budgets
- [ ] F4 Web-vitals field measurement decision (needs analytics — blocked on A61)
- [ ] F5 Route-by-route baseline table recorded here after F1 lands

## Big levers
- [ ] F6 Monaco: single shared lazy loader (dynamic import, no double-bundling)
- [ ] F7 Monaco: replace with lightweight editor/textarea on tools that barely use it
- [ ] F8 Dynamic-import heavy libs at interaction time: ajv, sql-formatter, marked, qrcode
- [ ] F9 Audit lz-string/toml/ini/yaml duplication — one copy each in shared chunks
- [ ] F10 Font loading: self-host subset, font-display swap, preload
- [ ] F11 Worker pool reuse via lib/worker-client.ts (don't spawn per keystroke)
- [ ] F12 Homepage: inline critical CSS, defer grid icons, target LCP < 1.5s
- [ ] F13 next/image for all raster assets; audit any <img>
- [ ] F14 Remove --webpack build flag: evaluate Turbopack build (faster CI)

## Per-tool tuning (worst offenders first — measure via F1, keep list updated)
- [ ] F15 pdf-to-text: lazy-load pdf.js + OCR chain only on file select
- [ ] F16 resume-analyzer: defer analysis dictionaries until first input
- [ ] F17 webp-converter: process via createImageBitmap + OffscreenCanvas where available
- [ ] F18 mock-data: move generation fully into worker, stream rows to grid
- [ ] F19 diff-viewer: virtualize long diff lists
- [ ] F20 json-table: virtualize table rows past 500 rows
- [ ] F21 markdown-preview: debounce render + sanitize in worker for large docs
- [ ] F22 Input stats (chars/lines/bytes) computed without new Blob() per keystroke
- [ ] F23 Re-render sweep: React DevTools profile top-10 tools, fix avoidable renders
- [ ] F24 Memo/useCallback correctness sweep paired with exhaustive-deps cleanup
- [ ] F25 Debounce policy: standardize input debounce (250ms) via shared hook
- [ ] F26 localStorage writes throttled (history features) — no write per keystroke
- [ ] F27 INP audit: interaction latency on low-end device (4x throttle) top-10 tools
- [ ] F28 Preload worker on tool-page mount (warm start before first input)
- [ ] F29 SW runtime caching strategy for static assets (pairs with A30)
- [ ] F30 CI build time: cache next/.turbo artifacts between runs
