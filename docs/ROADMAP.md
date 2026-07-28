# ToolStack Roadmap — 1000+ Features & Fixes to a Next-Level Site

**Vision.** ToolStack becomes the best free, privacy-first developer-tools site:
50+ polished in-browser tools (growing to 80), installable and fully offline,
dark-mode, keyboard-driven, accessible (axe-clean), fast (route budgets +
Lighthouse CI), and SEO-strong on every page — with every byte of user data
processed locally.

**Non-negotiable principles** (inherited from the audit, apply to every item):
1. Never change an existing tool's URL/slug; `lib/tools.ts` slugs are frozen.
2. All processing client-side. No user data leaves the browser.
3. No new dependency without justification in the commit message.
4. Every commit ships green (gates below) and is pushed to `origin main`;
   CI + Vercel deploy from there. Small commits, one concern each.
5. Too big for one iteration → split it or file it under BACKLOG/tracker notes,
   never half-ship.

## The item inventory (1013 items)

| Workstream | File | Items |
|---|---|---|
| WS-A Platform & App Shell | `docs/roadmap/ws-a-platform.md` | 63 |
| WS-B Design System & UX | `docs/roadmap/ws-b-design-system.md` | 45 |
| WS-C Per-Tool Feature Packs (50 × T1–T12) | `docs/roadmap/ws-c-tool-packs.md` | 600 |
| WS-D New Tools (30 × NT1–NT6) | `docs/roadmap/ws-d-new-tools.md` | 180 (30 lines, expand on start) |
| WS-E Quality & Testing | `docs/roadmap/ws-e-quality.md` | 38 |
| WS-F Performance | `docs/roadmap/ws-f-performance.md` | 30 |
| WS-G SEO, Content & Growth | `docs/roadmap/ws-g-seo-content.md` | 32 |
| WS-H Infra & DX | `docs/roadmap/ws-h-infra-dx.md` | 25 |
| **Total** | | **1013** |

Tracker conventions: `[ ]` todo · `[~]` in progress · `[x] — summary` done ·
`[na] — reason` not applicable (counts as done). Item IDs (A1, B2, C-slug-T3,
D4, …) are stable — reference them in commit messages.

## Phases (ordering that keeps every iteration cheap)

**Phase 0 — Finish the hygiene audit** (current `docs/tool-audit.md`, ~46 tools
left incl. 6 deferred monoliths). Rationale: bugs and lint debt found now make
every later phase safer. Runs to completion first.

**Phase 1 — Foundation sprint** (~60 items, unlocks the 600-item matrix):
- WS-B components B1–B24 (ToolShell v2, SplitPane, FileDrop, StatusBar, ErrorPanel,
  SampleButton, DownloadButton, ShareButton, Monaco wrapper…)
- WS-A framework items A36–A48 (toasts, error boundaries, share-url, download,
  worker-client adoption) and theme plumbing A23–A26 + B25–B28 (dark mode tokens)
- WS-H CI speedups H1–H5 and Dependabot H9–H11 (faster, safer loop)
- WS-E harness E1–E2, E7, E13 (coverage ratchet, fixtures, e2e helpers)
Order inside Phase 1: build a primitive → immediately adopt it in 2 pilot tools
(json-formatter + base64-encoder) → then it's ready for mass rollout.

**Phase 2 — The matrix** (600 items): WS-C packs rolled out category by category
(registry order). Per iteration, do ONE tool's next 2–4 pack items (T-items are
sized so 2–4 fit a 10-minute firing). Interleave: every 5th iteration takes a
WS-A discovery item (A1–A14) or WS-G site-level item so the platform grows
alongside.

**Phase 3 — Expansion** (WS-D): one new tool at a time, NT1→NT6 across 2–3
iterations each. Interleave with remaining WS-G content waves.

**Phase 4 — Hardening**: WS-E e2e/axe/visual waves, WS-F per-route tuning
against budgets, strict-lint burn-down (E33–E34).

**Continuous**: WS-H items whenever CI friction is felt; F1 budgets watch every
phase; CHANGELOG.md line per user-visible change (A52 discipline).

## The iteration protocol (each loop firing)

0. **Baseline safety.** `git status` — finish/push any uncommitted prior work
   first. If origin/main CI is red, fixing it is the whole iteration.
1. **Pick.** Current phase's tracker file → first `[ ]` item (respect phase
   interleaving rules above). Mark `[~]`. Timebox investigation ~2 min.
2. **Implement.** Smallest complete slice. Follow the principles. Anything
   discovered-but-out-of-scope → one line in the tracker or BACKLOG.md.
3. **Verify — all gates must pass before commit:**
   - `npx tsc --noEmit`
   - `npx eslint <touched dirs> tests/` — zero errors, no new warnings
   - `npm run test:unit`
   - `npm run build` when anything structural changed (layout, page, worker,
     config, shared component)
   - targeted `npx playwright test -g "<slug>"` when a tool's UI changed
4. **Ship.** Mark tracker `[x] <ID> — summary`. ONE commit:
   `feat|fix|perf|test|docs(<scope>): <what>` + Claude co-author line. Push.
5. **Checkpoints.** Every 10th commit: local `npm run build` + /simplify pass on
   recent changes. Every 25th: full e2e locally + review budget table (F5).
6. **Blocked on the user?** The item stays `[ ]`, gets ` — NEEDS USER INPUT`
   (many are pre-marked), and is skipped. Surface open questions in the loop's
   turn summary.

## Restarting the loop

Run: `/loop 10m Execute the ToolStack roadmap. Read docs/ROADMAP.md and follow
"The iteration protocol" exactly — one iteration per firing, starting with
Phase 0 (docs/tool-audit.md) until complete, then Phase 1 onward per the phase
plan. Ship one green commit per iteration to origin main.`

## Decisions currently waiting on the user

- A61 analytics (privacy-first) yes/no · A62 domain/brand · A63 i18n scope
- E37 client error telemetry · G5 AI-crawler policy · G9 Search Console accounts
- G12 hreflang · G27 embeds · G30 directory submissions
- H8 branch protection · H17 Prettier adoption · H21 LICENSE

## Progress log

- 2026-07-27 — Roadmap created (1013 items across 8 workstreams). Phase 0
  status: 4/50 tools audited (json-formatter, toml-yaml, json-table + registry/
  layout/CI scaffolding); 6 monoliths deferred to the pass-2 scoped sweep.
