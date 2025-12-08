# ToolStack

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
- These are the tools available on the this code repository (ToolStack)
    - JSON Formatter (`/json-formatter`): Format or minify JSON instantly. Free, fast, and shareable.
    - JSON ⇄ YAML (`/json-yaml`): Convert JSON to YAML or YAML to JSON with validation.
    - TOML ⇄ YAML (`/toml-yaml`): Convert TOML to YAML or YAML to TOML with validation and sorting.
    - Resume Analyzer (`/resume-analyzer`): Check keywords, word counts, and readability for ATS-friendly resumes.
    - PDF → Text (`/pdf-to-text`): Extract clean text from PDFs directly in your browser for free.
    - URL Encoder/Decoder (`/url-encoder`): Encode or decode URLs instantly for query params and redirects.
    - Base64 Encoder/Decoder (`/base64-encoder`): Convert text to or from Base64 with copy-ready output.
    - UUID Generator (`/uuid-generator`): Generate v4 UUIDs (single or bulk) and copy instantly.
    - Hash Generator (`/hash-generator`): Compute SHA-256 or SHA-1 hashes in your browser.
    - Password Generator (`/password-generator`): Create strong, random passwords with custom rules.
    - CSV ⇄ JSON (`/csv-json`): Convert CSV to JSON or JSON to CSV with validation.
    - Text Case Converter (`/text-case`): Convert between camel, snake, kebab, title, upper, and lower.
    - Markdown ⇄ HTML (`/markdown-html`): Convert Markdown to HTML or HTML to Markdown instantly.
    - QR Code Generator (`/qr-generator`): Create QR codes from text or URLs and download PNGs.
    - JWT Decoder (`/jwt-decoder`): Decode JWT header and payload locally to inspect claims.
    - Color Converter (`/color-converter`): Convert HEX, RGB, and HSL with live preview.
    - Regex Tester (`/regex-tester`): Test regex patterns with flags and see matches instantly.
    - Diff Viewer (`/diff-viewer`): Compare two texts and highlight additions/removals.
    - Text Search (`/text-search`): Search text with regex/whole-word options and view snippets.
    - Code Minifier (`/code-minifier`): Minify or pretty-print HTML, CSS, or JS quickly.
    - Number Formatter (`/number-formatter`): Format numbers and currencies with locale and decimals.
    - JSON Validator (`/json-validator`): Validate and lint JSON with helpful errors and pretty output.
    - Cron Parser (`/cron-parser`): Validate cron expressions and view next run times.
    - Timestamp Converter (`/timestamp-converter`): Convert Unix timestamps to human dates and back.
    - JWT Generator (`/jwt-generator`): Sign and decode HS256 JWTs locally in your browser.
    - HTML Entities (`/html-entities`): Encode or decode HTML entities safely.
    - Image → Base64 (`/image-base64`): Convert images to Base64 strings with preview.
    - NanoID Generator (`/nanoid-generator`): Generate short, URL-safe IDs with custom alphabets.
    - Lorem Ipsum (`/lorem-ipsum`): Generate placeholder paragraphs or sentences.
    - JSON Diff (`/json-diff`): Compare two JSON objects and highlight changes.
    - Regex Extractor (`/regex-extractor`): Extract regex matches and capture groups as a table.
    - JSON Table (`/json-table`): Render JSON arrays into a quick table view.
    - TOML/INI → JSON (`/toml-ini-converter`): Convert TOML or INI configs into JSON with validation.
    - Markdown Preview (`/markdown-preview`): Live Markdown rendering with copy-ready HTML.
    - URL Parser (`/url-parser`): Break URLs into protocol, host, path, params, and hash.
    - IP / ASN Lookup (`/ip-asn-lookup`): Validate IPs, detect private ranges, and fetch ASN when configured.
    - Cron Generator (`/cron-generator`): Build cron expressions with a simple UI and summary.
    - SQL Formatter (`/sql-formatter`): Format SQL with dialect options and copy-ready output.
    - Data URI (`/data-uri`): Convert text or files to data URIs with chosen MIME type.
    - Text Deduper (`/text-deduper`): Remove duplicate lines with case-insensitive options.
    - UUID v1/v5 (`/uuid-advanced`): Generate UUID v1, v4, or v5 with namespace/name support.
    - Query → JSON (`/query-to-json`): Parse URL query parameters into structured JSON.
    - CSS Units Converter (`/css-units`): Convert px, rem, em, vw, vh with custom base and viewport presets.
    - Email CSS Inliner (`/email-css-inliner`): Inline CSS into HTML for better email client compatibility.
    - cURL → Fetch Converter (`/curl-to-fetch`): Turn cURL commands into JavaScript fetch snippets.
    - WebP Converter (`/webp-converter`): Convert JPG/PNG/GIF images to WebP locally with quality control.
    - Mock Data Generator (`/mock-data`): Generate fake user/transaction data in JSON, CSV, or SQL.
    - Cron Expression Tester (`/cron-tester`): Validate cron strings and view next run times with UTC/seconds toggles.
- SEO helpers: `app/sitemap.ts`, `app/robots.ts`
- Contact: `/contact` - Web3Forms-backed contact form for feedback/requests
- Shared config: `lib/siteConfig.ts`

## Potential New Tools for ToolStack
**Developer & Data Utilities (Browser-Based, Privacy-Friendly)**
- XML Formatter & Validator – Beautify and validate XML documents with indentation options (similar to the existing JSON formatter) .
- Permission/Chmod Calculator – Compute UNIX file permissions and convert between octal and symbolic representations .
- User-Agent Parser – Decode browser/OS/device information from a User-Agent string for logging or analytics .
- MAC Address Generator – Generate random or custom MAC addresses for networking/testing purposes .
- Slugify String – Turn arbitrary text (e.g. a title) into a URL-friendly “slug” (lowercase, hyphenated text) .
- YAML ⇄ TOML Converter – Convert configuration files between YAML and TOML formats, preserving structure and content .
- SVG Placeholder Generator – Create simple SVG placeholder images with custom background/ text, useful for mockups or responsive design testing .
- Markdown ⇄ HTML Converter – Bidirectional conversion between Markdown and HTML (with live preview) .
- XML ⇄ JSON Converter – Convert XML data to JSON format and back, enabling easy interchange between these data formats .
- Text Character Counter – Count characters, words, lines, and byte-size in text for content analysis or limits .


**Other Useful Utilities (Various Domains)**
- PDF Merge/Split Tools – Online PDF utilities (e.g. I Love PDF, CombinePDF) for merging, splitting, or editing PDFs .
- Image Compressor – Tools like TinyPNG/TinyJPG that reduce image file sizes via smart compression algorithms .
- OCR (Optical Character Recognition) – Extract text from images or scanned PDFs (e.g. OCR.Space) .
- Text Summarizer – AI-powered summarization of long text (e.g. QuillBot’s free summarizer) to get key points of an article .
- Language Translator – Machine translation services (e.g. DeepL, Google Translate) for multi-language text conversion .
- Time Zone Converter – Convert dates/times across time zones (accounting for DST) using tools like TimeandDate.com .
- Unit Converter – Convert between a wide range of units (length, weight, volume, etc.), as on OnlineConversion.com .
- Currency Converter – Real-time currency conversion using up-to-date exchange rates (e.g. OANDA’s converter) .
- Writing Aids – Grammar and spell-check tools (like Grammarly or Ludwig) to improve writing clarity and correctness .
- Resume/CV Builder – Online resume generators (e.g. WonderCV) for creating professional CVs easily .
- Table Generator/Converter – Tools to build or convert tables between formats (Markdown, CSV, HTML, SQL, JSON, etc.) .
- Fun Image Effects – Creative photo effects/filter tools (e.g. PhotoFunia) for generating stylized images .


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
- Local clean/install (macOS/Linux):
  - Stop dev server: `pkill -f "next dev" || true`
  - Reset deps: `rm -rf node_modules && git checkout -- package-lock.json`
  - Clean cache (if needed): `npm cache clean --force`
  - Fresh install: `npm ci`
  - Run dev/build/start: `npm run dev`, `npm run build`, `npm start`

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


### Tools for Development and Optimization

1. **A/B Testing Tools:** Once you have some traffic, you might want to experiment with different layouts or features to see what engages users best. Tools like Google Optimize or Optimizely can help you run A/B tests and make data-driven decisions.

2. **Performance Monitoring:** For continuous performance optimization, consider using tools like Lighthouse CI for automated performance checks, or WebPageTest for more in-depth analysis. These can help you keep your site fast and user-friendly.

3. **Uptime Monitoring:** To make sure your site is always available and running smoothly, you might want to use an uptime monitoring service like UptimeRobot or Pingdom. These tools can alert you if your site goes down, so you can fix issues quickly.

### User Feedback and Engagement

4. **User Feedback Tools:** It can be helpful to get direct feedback from users. Tools like Hotjar or UserVoice let you collect feedback, run surveys, or even see heatmaps of how users are interacting with your tools. This can give you insights into what’s working and what can be improved.

5. **Community Engagement:** If you want to build a community around your tools, consider adding a simple forum or using a platform like Discord or Slack for user discussions. This can help you engage directly with your audience and create a loyal user base.

### SEO and Content Tools

6. **SEO Tools Beyond Search Console:** For more detailed SEO insights, you could use tools like Ahrefs or SEMrush. These can help you track keyword rankings, analyze competitors, and find new SEO opportunities.

7. **Content Management (if you add content):** If you decide to add a blog or guides in the future, a simple CMS like WordPress or even the built-in Next.js MDX support can help you manage that content easily.

### Legal and Privacy Considerations

8. **Privacy and Compliance Tools:** As you grow, you might need to ensure your site is compliant with regulations like GDPR if you have visitors from Europe. Tools like Cookiebot or Termly can help you manage cookie consent and privacy policies. It’s good to keep these in mind as you scale.
