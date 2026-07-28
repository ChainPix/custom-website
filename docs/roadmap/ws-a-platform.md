# WS-A — Platform & App Shell

Site-wide capabilities that make ToolStack feel like a product, not a page pile.
Item IDs are stable; mark `[x]` with a one-line summary when shipped, `[na]` with a
reason if genuinely not applicable.

## Discovery & navigation
- [ ] A1 Command palette (Ctrl/⌘-K): fuzzy-search all 50 tools, jump on Enter
- [ ] A2 Global tool search box in the header with keyboard focus shortcut (/)
- [ ] A3 Fuzzy matching in search (typo-tolerant, e.g. "jsno" → JSON tools)
- [ ] A4 Search matches tool descriptions and aliases, not just titles
- [ ] A5 Alias table per tool (e.g. "b64" → base64-encoder) in lib/tools.ts metadata
- [ ] A6 /tools index page: all tools grouped by category with descriptions
- [ ] A7 Category filter chips on the homepage grid
- [ ] A8 "Related tools" cross-link block on every tool page (from registry categories)
- [ ] A9 Breadcrumb navigation on tool pages (Home → Category → Tool)
- [ ] A10 404 page that suggests the closest tools by slug similarity
- [ ] A11 Footer with category sitemap + privacy/about links
- [ ] A12 Next/previous tool navigation within a category
- [ ] A13 Homepage hero: value proposition + live search + featured tools
- [ ] A14 Keyboard navigation for homepage grid (arrow keys + Enter)

## Personalization (all localStorage, no accounts)
- [ ] A15 Favorites: star tools; favorites section at top of homepage
- [ ] A16 Recently-used tools section (already partially exists — finish + cap + clear)
- [ ] A17 Per-tool settings persistence framework (lib/use-tool-settings.ts)
- [ ] A18 Settings page: theme, default indent, clear all stored data
- [ ] A19 "Clear all site data" button with confirmation (privacy story)
- [ ] A20 Pin default options per tool (e.g. always 2-space indent in json-formatter)
- [ ] A21 Homepage layout preference: grid vs compact list
- [ ] A22 Export/import settings as a JSON file

## Theme & appearance
- [ ] A23 Dark mode: CSS variables token layer for all colors
- [ ] A24 Dark mode: toggle with system-preference default, no-flash inline script
- [ ] A25 Dark mode: audit all 50 tool clients for hardcoded slate-* classes
- [ ] A26 Monaco editor theme follows site theme
- [ ] A27 High-contrast mode toggle (prefers-contrast aware)
- [ ] A28 Reduced-motion compliance sweep (prefers-reduced-motion)

## PWA & offline
- [ ] A29 Web app manifest (name, icons, theme color, standalone display)
- [ ] A30 Service worker: precache app shell + tool routes for offline use
- [ ] A31 Offline indicator banner when navigator.onLine is false
- [ ] A32 SW update flow: "New version available — refresh" toast
- [ ] A33 Install prompt UI (beforeinstallprompt) with dismiss memory
- [ ] A34 Offline fallback page for uncached routes
- [ ] A35 Verify every tool works fully offline (no CDN fonts/scripts at runtime)

## Global UX framework
- [ ] A36 Toast/notification system (single aria-live region, queued)
- [ ] A37 Error boundary per tool route with "report issue" mailto + reset button
- [ ] A38 Global keyboard shortcut map + "?" overlay listing shortcuts
- [ ] A39 Shared worker-client wrapper adoption (lib/worker-client.ts) in all worker tools
- [ ] A40 Shared file-drop component (drag-drop + picker + size guard + aria)
- [ ] A41 Shared download helper (lib/download.ts: blob, filename, MIME)
- [ ] A42 Share-URL framework: lz-string hash state helper (lib/share-url.ts)
- [ ] A43 "Copy link to this state" button component using A42
- [ ] A44 Skeleton loading states for Monaco-heavy tools
- [ ] A45 Route prefetch on grid hover for top tools
- [ ] A46 Print stylesheet: hide chrome, print output pane only
- [ ] A47 Focus-visible styling audit (consistent ring, no outline:none)
- [ ] A48 Scroll restoration between tool navigations

## Pages & meta
- [ ] A49 About page: what/why/how, privacy-first pitch
- [ ] A50 Privacy page: explicit "everything runs in your browser" + storage inventory
- [ ] A51 Changelog page fed from CHANGELOG.md
- [ ] A52 CHANGELOG.md discipline: every user-visible change gets a line
- [ ] A53 Keyboard shortcuts help page
- [ ] A54 RSS feed for changelog
- [ ] A55 humans.txt / colophon (stack, hosting)

## Security & headers
- [ ] A56 Content-Security-Policy headers (script-src self + JSON-LD strategy)
- [ ] A57 Security headers: X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [ ] A58 Subresource integrity for any external assets (target: zero external)
- [ ] A59 next.config headers() audit + HSTS via Vercel config
- [ ] A60 Dependency: replace `toml` pkg (unmaintained) with @iarna/toml parse everywhere

## Decisions needed from user (do not start unasked)
- [ ] A61 Privacy-first analytics? (Plausible/self-host vs none) — NEEDS USER INPUT
- [ ] A62 Custom domain + brand name final? — NEEDS USER INPUT
- [ ] A63 i18n (multi-language tool pages)? Big scope — NEEDS USER INPUT
