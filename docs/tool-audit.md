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
- [ ] /xml-formatter
- [ ] /curl-to-fetch
- [ ] /email-css-inliner

## Encoding & Hashing
- [ ] /base64-encoder
- [ ] /url-encoder
- [ ] /html-entities
- [ ] /image-base64
- [ ] /hash-generator
- [ ] /uuid-generator
- [ ] /uuid-advanced
- [ ] /nanoid-generator

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
