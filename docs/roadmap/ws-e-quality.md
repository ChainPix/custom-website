# WS-E — Quality & Testing

Raise the safety net so the other 900 items can ship fast without regressions.

## Coverage & unit depth
- [ ] E1 Vitest coverage reporting wired into CI (text + lcov artifact)
- [ ] E2 Coverage ratchet: fail CI if lib/ line coverage drops below current
- [ ] E3 Ratchet raise milestone: lib/ ≥ 50%
- [ ] E4 Ratchet raise milestone: lib/ ≥ 70%
- [ ] E5 Property-based tests for codecs (base64, url, entities) — round-trip laws (needs fast-check dep, flag in commit)
- [ ] E6 Fuzz corpus for parsers (json/toml/ini/xml/csv): malformed inputs never throw uncaught
- [ ] E7 Shared test fixtures directory with realistic per-tool samples (feeds C-T4)
- [ ] E8 Unit tests for lib/use-copy.ts (clipboard success/fallback/error paths)
- [ ] E9 Unit tests for lib/worker-client.ts (request id matching, cancel, error)
- [ ] E10 Unit tests for share-url helper once A42 lands
- [ ] E11 Snapshot tests for JSON-LD output of top-10 tool pages
- [ ] E12 tools-registry spec: enforce description length + unique titles (SEO guard)

## E2E & integration
- [ ] E13 Playwright: shared page-object helpers (fill input, read output, copy)
- [ ] E14 E2E wave: Data Format Converters category (12 tools happy path)
- [ ] E15 E2E wave: Encoding & Hashing category (8 tools)
- [ ] E16 E2E wave: Validation & Analysis category (7 tools)
- [ ] E17 E2E wave: Code & Configuration category (7 tools)
- [ ] E18 E2E wave: Text & Content category (9 tools)
- [ ] E19 E2E wave: Generation & Utilities category (7 tools)
- [ ] E20 E2E: clipboard interactions with granted permissions context
- [ ] E21 E2E: file upload paths using fixture files (image-base64, webp, pdf-to-text)
- [ ] E22 E2E: worker-heavy inputs (100KB+) complete without timeout
- [ ] E23 E2E: localStorage persistence flows (history, favorites, settings)
- [ ] E24 Flaky-test policy: retry config + quarantine tag + tracking section here

## Accessibility & visual
- [ ] E25 axe-core automated a11y scan in Playwright for all 50 tool pages
- [ ] E26 Fix wave from E25: critical violations to zero
- [ ] E27 Fix wave from E25: serious violations to zero
- [ ] E28 Keyboard-only E2E: complete top-10 tools without a mouse
- [ ] E29 Screen-reader smoke pass (NVDA) on 5 representative tools — findings filed
- [ ] E30 Visual regression: Playwright screenshots of all tool pages, diff on PR
- [ ] E31 Visual regression: dark-mode screenshot set (after A23)
- [ ] E32 Reduced-motion + high-contrast render checks

## Process
- [ ] E33 Lint debt burn-down: BACKLOG "Lint debt" section to zero warnings repo-wide
- [ ] E34 Enable @typescript-eslint strict-type-checked on lib/ (fix fallout)
- [ ] E35 Pre-push hook: tsc + affected unit tests (fast path)
- [ ] E36 Mutation-testing spike on lib/json-utils.ts (Stryker) — report, decide rollout
- [ ] E37 Error telemetry decision: client error counter (privacy-safe) — NEEDS USER INPUT
- [ ] E38 Monthly dependency update ritual documented (see H items)
