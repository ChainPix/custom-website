# ToolStack Tool-by-Tool Audit

Checklist of all 50 tools in `lib/tools.ts` registry order. One tool per audit
iteration: read → lint → improve highest-value items → verify green → ship.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[defer]` monolith deferred to a later pass.

## Data Format Converters
- [x] /json-formatter — fixed backspace-escape bug (`/\b/` word-boundary → `/[\b]/`) in lib/json-utils.ts; derived-state effect → useMemo; cleared unused-var lint; added json-utils unit spec (10 tests)
- [defer] /json-yaml — monolith client (1584 lines), lint + CopyButton only pass
- [x] /toml-yaml — cleared lint (unused `convert` import in worker; moved `Date.now()` out of render into a mount effect to fix react-hooks/purity); SEO/h1/JSON-LD already complete; CopyButton adoption noted in BACKLOG
- [defer] /csv-json — monolith (>1500 lines), lint + CopyButton only pass
- [x] /json-table — extracted worker parse pipeline to parse.ts (worker now imports it); added json-table.spec.ts (11 tests) for a previously untested tool; client/worker dedup + exhaustive-deps noted in BACKLOG
- [x] /toml-ini-converter — extracted worker conversion logic to parse.ts; added toml-ini-converter.spec.ts (15 tests: TOML/INI/JSON round-trips, INI coercion + dotted sections, error locations, ajv schema validation); client lint debt → BACKLOG
- [x] /markdown-html — fixed real bug: Heading-IDs toggle used marked's removed `headerIds` option (no-op since marked v5) — now generates GitHub-style slugs in a shared renderer; also fixed inline formatting lost inside links with open-in-new-tab; deduped client/worker logic into convert.ts; added spec (10 tests)
- [x] /data-uri — fixed mime parsing bug (`data:;base64,…` reported mime "base64" instead of RFC 2397 text/plain default); extracted 180 lines of pure codec/diff helpers to encoding.ts; added spec (11 tests); justified img-element disable for data-URI preview
- [x] /query-to-json — added unique ids to 5 JSON-LD Script tags (inline-script-id ×5); typed the error.meta channel in lib/queryToJson.ts + client catch (no-explicit-any ×2); unit spec already existed; remaining 4 effect warnings → BACKLOG
- [x] /xml-formatter — highlightedOutput derived-state effect → useMemo; typed the worker-error catch (no-explicit-any); cleared unused catch binding + the last tests/ `any`; formatter-utils already extracted+tested; 9→6 warnings (rest BACKLOG-pattern)
- [x] /curl-to-fetch — added unique ids to 5 JSON-LD Script tags; typed catch narrow (no-explicit-any); parser.ts already covered by spec; remaining 2 warnings are the standard debounce/hash-hydration patterns
- [defer] /email-css-inliner — monolith client (1713 lines), lint + CopyButton only pass

## Encoding & Hashing
- [x] /base64-encoder — extracted chunked Base64 codecs from worker to codec.ts; added spec (7 tests: unicode round-trip, >32KB chunk boundary, progress monotonicity, strict/fallback UTF-8); lint was already clean
- [x] /url-encoder — audited, no changes needed (spec + extracted use-url-codec hook + JSON-LD ids + h1 all present; 2 remaining warnings are the standard hydration/keyboard-deps patterns)
- [defer] /html-entities — monolith client (1590 lines), lint + CopyButton only pass
- [x] /image-base64 — added helpers spec (8 tests: data-URL parsing, prefix strip, byte/blob decode, extension mapping); 3 react-compiler warnings (purity/manual-memo) → BACKLOG
- [x] /hash-generator — extracted WebCrypto hash/HMAC + encoding helpers to hashing.ts; added spec (6 tests with NIST/HMAC vectors); 1 standard debounce-deps warning remains
- [x] /uuid-generator — added unique ids to 5 JSON-LD Script tags; spec/h1 already present; remaining warnings are handler-in-render compiler patterns
- [x] /uuid-advanced — cleared unused catch binding; JSON-LD ids + h1 already present; v1/v5 logic delegates to the uuid package (no untested pure logic to extract)
- [x] /nanoid-generator — audited, no changes needed (spec via lib/nanoid-generator, JSON-LD ids, h1 all present; warnings are the standard debounce/hydration patterns)

## Validation & Analysis
- [x] /json-validator — removed ~60 lines of dead worker code (transforms defined but never wired: removeNullsDeep/dedupeArraysDeep/convertKeysDeep/sortKeysDeep — live copies are in the client); cleared unused Download import; module-shim + effect warnings remain (BACKLOG-known)
- [defer] /json-diff — monolith client (1599 lines), lint + CopyButton only pass (lib/json-diff.ts already has a spec)
- [x] /regex-tester — patternError derived-state effect → plain const (state+effect removed); cleared unused catch in lib/regex-tester.ts; spec + h1 (added earlier) + JSON-LD present; perf-timing purity warnings are intentional measurement code
- [x] /regex-extractor — FIXED the known "breaks next dev" bug: Turbopack had no fs/path fallback (webpack-only), so re2-wasm's Node path poisoned the dev server; added turbopack.resolveAlias → lib/empty-module.ts stub; verified live in dev (route 200, no poisoning); client effect/refs warnings remain (standard patterns)
- [x] /resume-analyzer — typed the pdfjs getDocument params (removed `as any`), cleared 3 unused catch bindings; spec + analysis.ts extraction already in place; 2 entangled set-state effects remain
- [x] /cron-parser — audited, no changes needed (spec, JSON-LD ids, h1 all present; the ~12 effect warnings are one entangled expr ↔ field-editor bidirectional sync — refactor filed in BACKLOG)
- [x] /cron-tester — cleared unused catch binding in timezone formatter; spec (10 tests incl. snapshots), JSON-LD ids, h1 all present; 4 builder-sync effect warnings remain (same family as cron-parser)

## Code & Configuration
- [x] /code-minifier — added unique ids to 5 JSON-LD Script tags; lib/formatters already tested; remaining 16 warnings are refs-in-render + useCallback-wrapping prescriptions in the 1330-line client (BACKLOG family)
- [x] /sql-formatter — added unique ids to 5 JSON-LD Script tags; removed unused `minify` destructure; spec/h1/extracted hook+utils already present; 7 standard-family warnings remain
- [x] /jwt-decoder — extracted base64url/PEM/segment decode helpers to decode.ts (cleared unused catch en route); added spec (7 tests incl. the jwt.io example token); JSON-LD ids present; remaining warnings are the formatJson-memo family
- [defer] /jwt-generator — monolith (>1500 lines), lint + CopyButton only pass
- [x] /css-units — audited, no changes needed (spec, JSON-LD ids, h1, share-URL support all present; 5 warnings are URL/localStorage hydration + sync effects)
- [x] /chmod-calculator — audited, no changes needed (chmod.ts extracted + spec, JSON-LD ids, h1 present; 2 warnings are URL hydration/sync effects)
- [defer] /cron-generator — monolith (>1500 lines), lint + CopyButton only pass

## Text & Content Processing
- [x] /text-case — extracted the 230-line case-conversion engine to convert.ts; added spec (11 tests: all case types, acronym/smart-number/punctuation/per-line options); noted camelCase-boundary splitting gap in BACKLOG; JSON-LD uses native script tags (valid)
- [defer] /text-search — monolith client (1784 lines), lint + CopyButton only pass (has 3 quick `_removed` unused-var fixes for that pass)
- [x] /text-deduper — removed dead emptyStats from worker; added stable emptyResult to memo deps (clears exhaustive-deps); dedupe.ts + spec already present; 4 hydration-family warnings remain
- [defer] /markdown-preview — monolith client (1785 lines), lint + CopyButton only pass (utils.ts already has a spec; has 1 unescaped-entity quick fix for that pass)
- [defer] /lorem-ipsum — monolith client (1757 lines), lint + CopyButton only pass (check the "variable before declaration" compiler warning at ~296 during that pass)
- [defer] /number-formatter — monolith client (1636 lines), lint + CopyButton only pass
- [x] /timestamp-converter — extracted 160 lines of pure parse/format logic to convert.ts; added spec (11 tests: unit auto-detection by length+magnitude, ms conversion, mismatch warnings, local datetime parsing); 3 standard warnings remain
- [x] /color-converter — fixed real bug: "Trim input" checkbox never called its setter, so it could not be unchecked; extracted 175 lines of color math (hex/RGB/HSL, WCAG contrast, nearest-color) to color.ts; added spec (10 tests)
- [defer] /diff-viewer — monolith (>1500 lines), lint + CopyButton only pass

## Generation & Utilities
- [ ] /qr-generator
- [ ] /password-generator
- [defer] /mock-data — monolith (>1500 lines), lint + CopyButton only pass
- [ ] /ip-asn-lookup
- [ ] /url-parser
- [ ] /webp-converter
- [ ] /pdf-to-text
