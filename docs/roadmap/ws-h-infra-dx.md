# WS-H — Infrastructure & Developer Experience

Keep the ship-every-10-minutes loop safe and fast.

## CI/CD
- [ ] H1 CI: cancel in-progress runs on new push (concurrency group)
- [ ] H2 CI: cache Playwright browsers between runs
- [ ] H3 CI: split jobs (lint+typecheck | unit | build | e2e) for faster feedback
- [ ] H4 CI: bundle-size check job (pairs with F1/F2)
- [ ] H5 CI: nightly full-matrix run (all e2e + axe + visual) separate from push CI
- [ ] H6 Vercel: verify preview deployments per commit; link in CI summary
- [ ] H7 Rollback runbook: how to revert a bad deploy (documented in README)
- [ ] H8 Branch protection on main: require CI green — NEEDS USER INPUT (repo settings)
- [ ] H9 Dependabot config: weekly, grouped minor/patch, security immediate
- [ ] H10 Resolve the 4 open Dependabot alerts (3 high, 1 moderate) on default branch
- [ ] H11 npm audit gate: fail CI on new high/critical in production deps

## Repo & docs
- [ ] H12 README overhaul: architecture map, how to add a tool, test strategy
- [ ] H13 CONTRIBUTING.md: the iteration protocol (from ROADMAP) as contributor guide
- [ ] H14 Tool scaffold generator: `npm run new-tool <slug>` stamps NT-pack skeleton
- [ ] H15 scripts/ cleanup: document mockgen + snapshot scripts, remove dead ones
- [ ] H16 .editorconfig + consistent LF line endings (kill the CRLF warning noise)
- [ ] H17 Prettier (or eslint-stylistic) decision + one-shot format — NEEDS USER INPUT
- [ ] H18 PR template with verify-gate checklist
- [ ] H19 Issue templates: bug (which tool, input sample) + tool request
- [ ] H20 CODEOWNERS (even solo: documents ownership intent)
- [ ] H21 LICENSE decision — NEEDS USER INPUT
- [ ] H22 Pin node version (.nvmrc + engines) matching CI's node 22
- [ ] H23 Remove test-results/ and playwright-report/ from repo via .gitignore audit
- [ ] H24 BACKLOG.md hygiene: split per-tool sections into docs/backlog/<slug>.md when large
- [ ] H25 docs/ index page listing audit, roadmap, testing docs
