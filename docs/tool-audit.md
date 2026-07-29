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
- [ ] /json-validator
- [ ] /json-diff
- [ ] /regex-tester
- [ ] /regex-extractor
- [ ] /resume-analyzer
- [ ] /cron-parser
- [ ] /cron-tester

## Code & Configuration
- [ ] /code-minifier
- [ ] /sql-formatter
- [ ] /jwt-decoder
- [defer] /jwt-generator — monolith (>1500 lines), lint + CopyButton only pass
- [ ] /css-units
- [ ] /chmod-calculator
- [defer] /cron-generator — monolith (>1500 lines), lint + CopyButton only pass

## Text & Content Processing
- [ ] /text-case
- [ ] /text-search
- [ ] /text-deduper
- [ ] /markdown-preview
- [ ] /lorem-ipsum
- [ ] /number-formatter
- [ ] /timestamp-converter
- [ ] /color-converter
- [defer] /diff-viewer — monolith (>1500 lines), lint + CopyButton only pass

## Generation & Utilities
- [ ] /qr-generator
- [ ] /password-generator
- [defer] /mock-data — monolith (>1500 lines), lint + CopyButton only pass
- [ ] /ip-asn-lookup
- [ ] /url-parser
- [ ] /webp-converter
- [ ] /pdf-to-text
