# FastFormat Tools

Minimal, SEO-focused toolbox built with Next.js App Router and Tailwind CSS. Ships three launch tools—JSON Formatter, Resume Analyzer, and PDF → Text—with a scalable structure for adding more utilities quickly.

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
  - `/resume-analyzer`
  - `/pdf-to-text`
- SEO helpers: `app/sitemap.ts`, `app/robots.ts`
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
- CI install (lean): `npm run ci:install` (`npm ci && npm prune --omit=dev`)

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
- More tools: URL encoder/decoder, hash generators, regex tester, AI helpers.
- Schema.org markup for key tools.
- Analytics + AdSense once traffic stabilizes.

## Analytics (Google Analytics example)
- Set env var `NEXT_PUBLIC_GA_ID` (e.g., `G-XXXXXXX`).
- Layout loads GA script only if the ID is present, and `components/Analytics` sends pageviews on route changes.
- For privacy-friendly options (Plausible/Umami), swap the script snippet in `app/layout.tsx`.
