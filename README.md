# FastFormat Tools

Minimal, SEO-focused toolbox built with Next.js App Router and Tailwind CSS. It now ships dozens of browser-based utilities (formatters, converters, generators, validators) with a scalable structure for adding more quickly.

## Why This Exists
- Fast, frictionless browser tools with no sign-up
- Modern Minimalist + Soft Skeuomorphism styling for clarity and trust
- SEO-first: per-tool metadata, canonical URLs, sitemap/robots, clean headings
- Client-side processing where possible for speed and privacy

## Current Stack
- Next.js 16 (App Router) + React 19
- Tailwind CSS v4 (via @tailwindcss/postcss)
- Local Inter variable font (@fontsource-variable/inter)
- pdfjs-dist for in-browser PDF text extraction

## Live Structure
- Home dashboard: `app/page.tsx`
- Tools (isolated layouts + metadata):
  - `/json-formatter`
  - `/json-yaml`
  - `/resume-analyzer`
  - `/pdf-to-text`
  - `/url-encoder`
  - `/base64-encoder`
  - `/uuid-generator`
  - `/hash-generator`
  - `/password-generator`
  - `/csv-json`
  - `/text-case`
  - `/markdown-html`
  - `/qr-generator`
  - `/jwt-decoder`
  - `/color-converter`
  - `/regex-tester`
  - `/diff-viewer`
  - `/text-search`
  - `/code-minifier`
  - `/number-formatter`
  - `/json-validator`
  - `/cron-parser`
  - `/timestamp-converter`
  - `/jwt-generator`
  - `/html-entities`
  - `/image-base64`
  - `/nanoid-generator`
  - `/lorem-ipsum`
  - `/json-diff`
  - `/regex-extractor`
  - `/json-table`
  - `/toml-ini-converter`
  - `/markdown-preview`
  - `/url-parser`
  - `/ip-asn-lookup`
  - `/cron-generator`
  - `/sql-formatter`
  - `/data-uri`
  - `/text-deduper`
  - `/uuid-advanced`
  - `/ip-asn-lookup`
  - `/cron-generator`
  - `/sql-formatter`
  - `/data-uri`
  - `/text-deduper`
  - `/uuid-advanced`
- SEO helpers: `app/sitemap.ts`, `app/robots.ts`
- Contact: `/contact` - Web3Forms-backed contact form for feedback/requests
- Shared config: `lib/siteConfig.ts`

## UI/UX Guidelines
- Palette: whites/grays with blue accent, soft shadows, rounded cards
- Typography: Inter variable; anti-aliased, optimized legibility
- Layout: card-based, high contrast, minimal distractions, mobile friendly
- Ads: keep to side/bottom when added to avoid UX/SEO penalties

## SEO Blueprint (implemented)
- Per-page `Metadata` with titles, descriptions, keywords, canonical URLs
- Open Graph & Twitter tags per tool
- `sitemap.xml` and `robots.txt` generated from `siteUrl`
- Clean, shallow routes for each tool

## Commands
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- CI install: `npm run ci:install` (`npm ci`). Keep devDependencies (TypeScript, ESLint) for Next.js builds.

## Adding a New Tool (quick start)
1) Create folder in `app/(tools)/your-tool` with `layout.tsx` and `page.tsx`.
2) Put interactive logic in a client component (e.g., `client.tsx`) to keep metadata on the server file.
3) Add SEO metadata in the page file; update `app/sitemap.ts` routes.
4) Follow existing styling classes for consistency (soft shadows, rounded cards, high contrast).

## Deployment
- Optimized for Vercel; uses static prerendering for current routes.
- Set install command to `npm run ci:install` to keep deploy footprint small.
- Ensure `siteUrl` in `lib/siteConfig.ts` matches your production domain for correct canonical/sitemap URLs.

## Roadmap Ideas
- Schema.org markup per high-traffic tools.
- Accessibility/perf pass (Lighthouse/CWV) across all tools.
- Analytics/AdSense tuning once traffic stabilizes.
- Keep Search Console verified; resubmit sitemap after route changes.
- Potential future tools: AI-assisted helpers, SQL formatter, code beautifiers.

## Analytics (Google Analytics example)
- Set env var `NEXT_PUBLIC_GA_ID` (e.g., `G-XXXXXXX`).
- Layout loads GA script only if the ID is present, and `components/Analytics` sends pageviews on route changes.
- For privacy-friendly options (Plausible/Umami), swap the script snippet in `app/layout.tsx`.

## TODO / Monitoring
- Improve validation and error handling across tools (file size/type checks, numeric bounds, clearer messages).
- Sanitize/escape rendered HTML in Markdown/HTML tools; add error boundaries for heavy parsers (PDF, SQL).
- Add smoke tests (Playwright) for key flows and keep lint/build in CI.
- Centralize tool metadata to avoid drift between homepage, sitemap, and folder structure.
- Submit sitemap after each new tool and monitor indexing/crawl in Search Console.
- Verify GA events and page titles/descriptions match reports.
- Periodically prune unused dependencies and keep bundle weight low.
- Useful links:
  - [Google Analytics](https://analytics.google.com/analytics/web/#/a189352758p261744725/reports/dashboard?params=_u..nav%3Dmaui&ruid=firebase-overview,app,firebase&collectionId=app&r=firebase-overview)
  - [Search Console](https://search.google.com/search-console/index?resource_id=https%3A%2F%2Ftoolstack-nu.vercel.app%2F)
  - [Vercel project](https://vercel.com/damika-anupamas-projects/toolstack)