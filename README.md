# ToolStack

Minimal, SEO-focused toolbox built with Next.js App Router and Tailwind CSS. Ships **50 browser-based utilities** organized into 6 logical categories with smart navigation features for an enhanced user experience.

## Why This Exists
- Fast, frictionless browser tools with no sign-up
- Modern Minimalist + Soft Skeuomorphism styling for clarity and trust
- SEO-first: per-tool metadata, canonical URLs, sitemap/robots, clean headings
- Client-side processing for speed and privacy

## Home Page Features ✨
- **Category Organization**: 50 tools grouped into 6 logical categories for easy discovery
- **Smart Scroll Memory**: Auto-restores scroll position using sessionStorage when returning from tools
- **Recently Used**: Tracks last 6 accessed tools displayed at the top with localStorage
- **View Modes**: Toggle between categorized view and flat "All Tools" grid
- **Enhanced Search**: Real-time filtering across all categories with empty state handling

## Current Stack
- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** (via @tailwindcss/postcss)
- **TypeScript 5** (strict mode enabled)
- **Inter Variable Font** (@fontsource-variable/inter) - preloaded, optimized
- **Key Libraries**:
  - `pdfjs-dist` - In-browser PDF text extraction
  - `json5` - JSON5 format support (relaxed syntax)
  - `ajv` - JSON Schema validation
  - `mammoth` - DOCX parsing for resume analysis
  - `js-yaml` - YAML parsing and serialization
  - `marked` - Markdown to HTML conversion
  - `sql-formatter` - SQL beautification
  - `qrcode` - QR code generation
  - `uuid` - UUID generation
  - `lucide-react` - Icon library (tree-shaken)

## Tools (50 total)

### Data Format Converters (12 tools)
- **JSON Formatter** (`/json-formatter`) - Format/minify JSON with **advanced features**: JSON5 support, tree view, escape/unescape tools, JSON Schema validation, path viewer, format-on-paste
- **JSON ⇄ YAML** (`/json-yaml`) - Convert JSON to YAML or YAML to JSON with validation
- **TOML ⇄ YAML** (`/toml-yaml`) - Convert TOML to YAML or YAML to TOML with validation and sorting
- **CSV ⇄ JSON** (`/csv-json`) - Bidirectional CSV/JSON conversion with array detection
- **JSON Table** (`/json-table`) - Render JSON arrays into searchable tables
- **TOML/INI → JSON** (`/toml-ini-converter`) - Convert TOML or INI configs into JSON with validation
- **Markdown ⇄ HTML** (`/markdown-html`) - Convert Markdown to HTML or HTML to Markdown instantly
- **Data URI** (`/data-uri`) - Convert text or files to data URIs with chosen MIME type
- **Query → JSON** (`/query-to-json`) - Parse URL query parameters into structured JSON with decode/array options
- **XML Formatter** (`/xml-formatter`) - Beautify and validate XML with indentation controls
- **cURL → fetch** (`/curl-to-fetch`) - Convert cURL commands into JavaScript fetch snippets instantly
- **Email CSS Inliner** (`/email-css-inliner`) - Inline CSS into HTML for better email client compatibility with presets

### Encoding & Hashing (8 tools)
- **Base64 Encoder/Decoder** (`/base64-encoder`) - Convert text to or from Base64 with copy-ready output
- **URL Encoder/Decoder** (`/url-encoder`) - Encode or decode URLs instantly for query params and redirects
- **HTML Entities** (`/html-entities`) - Encode or decode HTML entities safely
- **Image → Base64** (`/image-base64`) - Convert images to Base64 strings with preview
- **Hash Generator** (`/hash-generator`) - Compute SHA-256, SHA-1, SHA-512, MD5 hashes with HMAC support
- **UUID Generator** (`/uuid-generator`) - Generate v4 UUIDs (single or bulk) and copy instantly
- **UUID v1/v5** (`/uuid-advanced`) - Generate UUID v1, v4, or v5 with namespace/name support
- **NanoID Generator** (`/nanoid-generator`) - Generate short, URL-safe IDs with custom alphabets

### Validation & Analysis (7 tools)
- **JSON Validator** (`/json-validator`) - Validate and lint JSON with helpful errors and pretty output
- **JSON Diff** (`/json-diff`) - Compare two JSON objects and highlight changes
- **Regex Tester** (`/regex-tester`) - Test regex patterns with flags and see matches instantly
- **Regex Extractor** (`/regex-extractor`) - Extract regex matches and capture groups as a table
- **Resume Analyzer** (`/resume-analyzer`) - Check keywords, word counts, readability, and ATS-friendliness
- **Cron Parser** (`/cron-parser`) - Validate cron expressions and view next run times
- **Cron Expression Tester** (`/cron-tester`) - Validate cron strings with UTC/seconds toggles and run counts

### Code & Configuration (7 tools)
- **Code Minifier** (`/code-minifier`) - Minify or pretty-print HTML, CSS, or JS quickly
- **SQL Formatter** (`/sql-formatter`) - Format SQL with dialect options and copy-ready output
- **JWT Decoder** (`/jwt-decoder`) - Decode JWT header and payload locally to inspect claims
- **JWT Generator** (`/jwt-generator`) - Sign and decode HS256 JWTs locally in your browser
- **CSS Units Converter** (`/css-units`) - Convert px, rem, em, vw, vh with custom base and viewport presets
- **Cron Generator** (`/cron-generator`) - Build cron expressions with a simple UI and summary
- **Permission/Chmod Calculator** (`/chmod-calculator`) - Convert octal and symbolic permissions with special bits

### Text & Content Processing (9 tools)
- **Text Case Converter** (`/text-case`) - Convert between camel, snake, kebab, title, upper, and lower case
- **Text Search** (`/text-search`) - Search text with regex/whole-word options and view snippets
- **Text Deduper** (`/text-deduper`) - Remove duplicate lines with case-insensitive options
- **Markdown Preview** (`/markdown-preview`) - Live Markdown rendering with copy-ready HTML
- **Lorem Ipsum** (`/lorem-ipsum`) - Generate placeholder paragraphs or sentences
- **Number Formatter** (`/number-formatter`) - Format numbers and currencies with locale and decimals
- **Timestamp Converter** (`/timestamp-converter`) - Convert Unix timestamps to human dates and back
- **Color Converter** (`/color-converter`) - Convert HEX, RGB, and HSL with live preview
- **Diff Viewer** (`/diff-viewer`) - Compare two texts and highlight additions/removals

### Generation & Utilities (6 tools)
- **QR Code Generator** (`/qr-generator`) - Create QR codes from text or URLs with color/size/error-correction controls
- **Password Generator** (`/password-generator`) - Create strong, random passwords with custom rules
- **Mock Data Generator** (`/mock-data`) - Generate fake user/transaction data in JSON, CSV, or SQL
- **IP / ASN Lookup** (`/ip-asn-lookup`) - Validate IPs, detect private ranges, and fetch ASN when configured
- **URL Parser** (`/url-parser`) - Break URLs into protocol, host, path, params, hash with decoded/raw toggle
- **WebP Converter** (`/webp-converter`) - Convert JPG/PNG/GIF images to WebP locally with quality control
- **PDF → Text** (`/pdf-to-text`) - Extract clean text from PDFs directly in your browser for free

### Other Pages
- **Contact** (`/contact`) - Web3Forms-backed contact form for feedback/requests
- **SEO Helpers**: `app/sitemap.ts` (dynamic sitemap), `app/robots.ts` (robots.txt)

## Shared Utilities & Components
- **`lib/json-utils.ts`** - JSON/JSON5 parsing, validation, tree building, schema validation, escape/unescape utilities
- **`lib/siteConfig.ts`** - Centralized site metadata (name, URL)
- **`components/tool-grid.tsx`** - Main tool grid with categories, search, view modes, scroll memory, recently used tracking
- **`components/Analytics.tsx`** - Google Analytics tracking with route change detection

## Performance & Limits
- **Client-side processing** for privacy - no data sent to servers
- **10MB file size limit** on most tools for performance
- **Performance optimizations**:
  - `useMemo` for expensive calculations
  - Lazy imports for heavy libraries (PDF.js, image processors)
  - File type validation before processing
  - Loading states for async operations
- **Accessibility**:
  - ARIA labels on all inputs
  - Keyboard navigation support
  - Focus-visible styling
  - Screen reader announcements

## Testing
- **Playwright** configured for E2E tests (`playwright.config.ts`)
- **Per-tool documentation**:
  - `TOOL_NAME.md` - Feature documentation
  - `TESTING.md` - Manual test checklist
- **Linting**: ESLint v9 with Next.js config
- **Formatting**: Prettier v3.7.4 with Tailwind plugin

## UI/UX Guidelines
- **Palette**: whites/grays with blue accent (#2563eb), soft shadows, rounded cards
- **Typography**: Inter Variable font, anti-aliased, optimized for legibility
- **Layout**: card-based, high contrast, minimal distractions, mobile-friendly
- **Design System**: Minimal + Soft Skeuomorphism
  - Rounded cards (`rounded-2xl`)
  - Soft shadows (`--shadow-soft`)
  - White/gray palette with blue accent
  - Consistent spacing scale

## SEO Blueprint (Implemented)
- Per-page `Metadata` with titles, descriptions, keywords, canonical URLs
- Open Graph & Twitter tags per tool
- Dynamic `sitemap.xml` with all 50 tools + home + contact
- `robots.txt` configuration for crawlers
- Clean, shallow routes for each tool
- JSON-LD schema (FAQPage) for select tools
- Google Search Console verified

## Commands
- **Dev**: `npm run dev` - Start development server
- **Lint**: `npm run lint` - Run ESLint
- **Build**: `npm run build` - Production build (Turbopack)
- **CI install**: `npm run ci:install` - `npm ci` for CI/CD
- **Local clean/install** (macOS/Linux):
  ```bash
  # Stop dev server
  pkill -f "next dev" || true

  # Reset dependencies
  rm -rf node_modules && git checkout -- package-lock.json

  # Clean cache (if needed)
  npm cache clean --force

  # Fresh install
  npm ci

  # Run dev/build/start
  npm run dev
  npm run build
  npm start
  ```

## Adding a New Tool (Quick Start)

### 1. Choose Category
Determine which of the 6 categories your tool belongs to:
- Data Format Converters
- Encoding & Hashing
- Validation & Analysis
- Code & Configuration
- Text & Content Processing
- Generation & Utilities

### 2. Create Tool Directory
Create folder in `app/(tools)/your-tool-name/` with the standard 3-file pattern:

**`layout.tsx`** (wrapper):
```typescript
export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14 text-slate-900">
      {children}
    </div>
  );
}
```

**`page.tsx`** (server component with SEO metadata):
```typescript
import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/siteConfig";
import YourToolClient from "./client";

export const metadata: Metadata = {
  title: "Tool Name | ToolStack",
  description: "Tool description for SEO...",
  keywords: ["keyword1", "keyword2", ...],
  alternates: {
    canonical: `${siteUrl.replace(/\/$/, "")}/your-tool-name`,
  },
  openGraph: { ... },
  twitter: { ... },
};

export default function YourToolPage() {
  return <YourToolClient />;
}
```

**`client.tsx`** (interactive logic):
```typescript
"use client";

import { useState } from "react";
import Link from "next/link";

export default function YourToolClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  // Tool logic here...

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <Link href="/" className="text-sm text-slate-600 underline">
          ← Back to tools
        </Link>
        <h1 className="text-3xl font-semibold">Tool Name</h1>
        <p className="text-base text-slate-700">Tool description...</p>
      </header>
      {/* Tool UI here */}
    </main>
  );
}
```

### 3. Add to Category in `app/page.tsx`
Add your tool to the appropriate category array:
```typescript
{
  name: "Category Name",
  description: "Category description",
  tools: [
    // ... existing tools
    {
      slug: "/your-tool-name",
      title: "Tool Name",
      description: "Brief description",
    },
  ],
},
```

### 4. Update Sitemap
Add route to `app/sitemap.ts` if not automatically included.

### 5. Create Documentation
- **`TOOL_NAME.md`** - Feature documentation, use cases, examples
- **`TESTING.md`** - Manual test checklist for QA

### 6. Follow Styling Patterns
- Use existing Tailwind classes for consistency
- Soft shadows: `shadow-[var(--shadow-soft)]`
- Rounded cards: `rounded-2xl`
- Ring borders: `ring-1 ring-slate-200`
- Button styles: Match existing tools

## Deployment
- **Optimized for Vercel** - Static prerendering for all routes
- **Install command**: `npm run ci:install` to keep deploy footprint small
- **Environment variables**:
  - `NEXT_PUBLIC_GA_ID` - Google Analytics tracking ID (optional)
- **Ensure** `siteUrl` in `lib/siteConfig.ts` matches production domain for correct canonical/sitemap URLs
- **Build output**: 56 static routes (homepage + 50 tools + contact + sitemap + robots + 404)

## Version Roadmap

### **v1.3 - "Polish & Perfection"** (Current Release - In Progress)
**Focus:** Comprehensive upgrade of all 50 existing tools
**Duration:** 2-3 weeks
**Status:** 🟡 In Progress

**Goals:**
- ✅ Competitive analysis for each tool
- ✅ Responsive testing (mobile, tablet, desktop)
- ✅ Feature completeness audit
- ✅ Input validation and error handling
- ✅ Lighthouse optimization (95+ performance)
- ✅ Playwright test coverage (80%+ critical paths)
- ✅ Comprehensive documentation per tool
- ✅ Test data files for each tool

**Key Improvements:**
- Standardized file size limits across all tools
- Error boundaries for heavy parsers
- Keyboard shortcuts with visual indicators
- Progress bars for long operations
- Consistent copy-to-clipboard feedback
- Input sanitization (XSS prevention)
- Accessibility improvements (ARIA, focus management)

**Deliverables:**
- 50 production-ready, feature-complete frontend tools
- Test data files (1KB, 1MB, 10MB samples per tool)
- Full Playwright test suite
- Updated documentation with examples
- Lighthouse scores: 95+ across all tools

---

### **v1.4 - "Frontend Expansion"** (Next Release)
**Focus:** Add 8-10 high-priority frontend-only tools
**Duration:** 2-3 weeks
**Target Tool Count:** 58-60 tools

**Planned Tools:**
- Text Character Counter (characters, words, lines, reading time)
- Slugify String (URL-friendly slug generator)
- User-Agent Parser (browser/OS/device detection)
- Markdown Table Generator (visual editor with CSV import)
- MAC Address Generator (random/custom, bulk generation)
- Git Ignore Generator (templates for frameworks/languages)
- Environment Variable Converter (.env ⇄ JSON/YAML)
- HTTP Status Code Reference (searchable with descriptions)

**Criteria:** Quick wins, high user demand, <5 hours effort each

---

### **v1.5 - "Enhanced Tools"** (Future Release)
**Focus:** Medium-priority additions and tool enhancements
**Duration:** 1-2 weeks
**Target Tool Count:** 64-66 tools

**Planned Tools:**
- JSON Schema Generator (generate from sample JSON)
- YAML ⇄ TOML Converter (config file conversion)
- JSON Path Finder (click to get JSONPath expressions)
- Regex Visualizer (railroad diagrams, explain patterns)
- CSV to Markdown Table (with alignment controls)
- Gradient Generator (CSS/Tailwind output with preview)

---

### **v2.0 - "AI & Backend Integration"** (Major Release - 2-3 months)
**Focus:** ML-powered tools + server infrastructure
**Target Tool Count:** 76+ tools

**Phase 2.1 - ML Tools (1-2 months):**
- OCR (Tesseract.js client-side, Google Vision API fallback)
- Text Summarizer (OpenAI GPT-3.5, extractive/abstractive)
- Image Background Remover (remove.bg API, SAM model)
- Sentiment Analysis (Hugging Face BERT, emotion detection)
- Grammar Checker (LanguageTool API integration)
- Paraphraser (OpenAI API, style options)

**Phase 2.2 - Server Tools (1 month):**
- URL Shortener (with analytics, custom aliases, QR codes)
- PDF Utilities (merge, split, compress with pdf-lib)
- Image Compressor (Sharp, lossy/lossless, batch processing)
- File Converter (FFmpeg for video/audio formats)

**Phase 2.3 - API Integrations (2 weeks):**
- Currency Converter (real-time exchange rates, historical data)
- IP Geolocation Enhanced (city/region, ISP, threat intel)
- QR Code Scanner (webcam scanning, image upload)

**Infrastructure Requirements:**
- Backend API (Node.js/Express or Next.js API routes)
- Database (PostgreSQL for URL shortener, user data)
- File storage (S3 or Vercel Blob for uploads)
- ML model hosting (Hugging Face Inference API)
- API rate limiting and authentication

---

### **v2.5+ - "Advanced Features"** (Ongoing)
**Focus:** User accounts, collaboration, enterprise features

**Features:**
- User authentication and profiles
- Save tool history and favorites
- Resume/CV Builder (templates, PDF export)
- Snippet Manager (save code snippets, organize by tags)
- Batch processing API for developers
- Webhooks and third-party integrations
- Real-time collaboration on documents
- Cloud storage sync (Google Drive, Dropbox)
- White-label options for businesses

---

## Potential New Tool Ideas

📋 **See [POTENTIAL_TOOLS.md](./POTENTIAL_TOOLS.md) for the complete list of planned tools**

The potential tools document includes:
- **30+ Frontend-only tools** ready for v1.4-v1.5 (no backend needed)
- **15+ Backend-required tools** planned for v2.0+ (ML models, APIs, databases)
- Prioritization matrix with effort estimates
- Implementation roadmap by version
- Technical requirements and dependencies

**Quick Preview:**
- Frontend-only: Text Character Counter, Slugify String, User-Agent Parser, Markdown Table Generator
- Backend-required: OCR, Text Summarizer, URL Shortener, Image Compressor, PDF Utilities

## Analytics (Google Analytics)
- Set env var `NEXT_PUBLIC_GA_ID` (e.g., `G-XXXXXXX`)
- Layout loads GA script only if ID is present
- `components/Analytics` sends pageviews on route changes
- For privacy-friendly options (Plausible/Umami), swap script in `app/layout.tsx`

## Monitoring & Maintenance
- **Validation**: File size/type checks, numeric bounds, clearer error messages
- **Security**: Sanitize/escape rendered HTML in Markdown/HTML tools
- **Error boundaries**: For heavy parsers (PDF, SQL, Mammoth)
- **Testing**: Playwright smoke tests for key flows
- **CI/CD**: Keep lint/build in CI pipeline
- **Metadata**: Centralize tool metadata to avoid drift
- **Sitemap**: Submit after each new tool
- **Analytics**: Verify GA events and page titles/descriptions
- **Dependencies**: Prune unused deps, keep bundle weight low

## Useful Links
- [Google Analytics](https://analytics.google.com/analytics/web/#/a189352758p261744725/reports/dashboard?params=_u..nav%3Dmaui&ruid=firebase-overview,app,firebase&collectionId=app&r=firebase-overview)
- [Search Console](https://search.google.com/search-console/index?resource_id=https%3A%2F%2Ftoolstack-nu.vercel.app%2F)
- [Vercel Project](https://vercel.com/damika-anupamas-projects/toolstack)

## Tools for Development and Optimization

### Testing & Quality Assurance
- **Playwright** (`@playwright/test`) - E2E testing suite (already configured)
  - Run: `npx playwright test`
  - UI Mode: `npx playwright test --ui`
  - Generate tests: `npx playwright codegen localhost:3000`
- **Lighthouse CI** - Automated performance/SEO/accessibility audits
  - Install: `npm install -D @lhci/cli`
  - Run: `npx lhci autorun --collect.url=http://localhost:3000`
- **Axe DevTools** - Browser extension for accessibility testing
- **WebPageTest** - In-depth performance analysis with real devices
- **BrowserStack** or **LambdaTest** - Cross-browser testing (Chrome, Safari, Firefox, Edge)

### Performance Monitoring
- **Vercel Analytics** - Real User Monitoring (RUM) with Core Web Vitals
  - Install: `npm install @vercel/analytics`
- **Sentry** - Error tracking and performance monitoring
  - Install: `npm install @sentry/nextjs`
  - Track errors: Client-side exceptions, API errors, unhandled rejections
- **SpeedCurve** or **Calibre** - Continuous performance monitoring with alerts
- **Bundle Analyzer** - Identify large dependencies
  - Install: `npm install -D @next/bundle-analyzer`
  - Run: `ANALYZE=true npm run build`

### Uptime & Reliability
- **Vercel Monitoring** - Built-in uptime monitoring (free with deployment)
- **UptimeRobot** - Free uptime monitoring (50 monitors, 5-min checks)
- **BetterStack** (formerly Better Uptime) - Advanced uptime + incident management
- **Pingdom** - Uptime monitoring with multi-location checks

### User Feedback & Analytics
- **Google Analytics 4** - Already integrated (`NEXT_PUBLIC_GA_ID`)
  - Track: Pageviews, tool usage, bounce rates, conversion funnels
- **Hotjar** - Heatmaps, session recordings, user surveys
  - Install: Add script to `app/layout.tsx`
  - Use cases: See where users click, identify UX friction
- **Tally.so** or **Typeform** - Embed feedback forms for tool requests
- **PostHog** - Open-source product analytics + feature flags
  - Self-hosted or cloud
  - Track: User flows, tool popularity, A/B tests
- **Discord** or **GitHub Discussions** - Community feedback channels

### SEO & Content Optimization
- **Google Search Console** - Already integrated (track rankings, CTR, impressions)
  - Submit sitemap: `https://toolstack-nu.vercel.app/sitemap.xml`
- **Ahrefs Webmaster Tools** - Free alternative to paid Ahrefs (keyword tracking, backlinks)
- **SEMrush** - Keyword research, competitor analysis (paid)
- **Screaming Frog SEO Spider** - Crawl site for SEO issues (broken links, metadata)
- **Schema Markup Validator** - Test JSON-LD structured data
- **Yoast Duplicate Content Checker** - Ensure unique tool descriptions

### A/B Testing & Experimentation
- **Vercel Edge Config** + **Feature Flags** - Test new features with subset of users
- **PostHog** - Built-in A/B testing with analytics
- **Split.io** - Feature flags and experimentation platform
- **Google Optimize** (deprecated, but alternatives: Optimizely, VWO)

### Accessibility & Compliance
- **axe DevTools** - Browser extension for WCAG compliance checks
- **WAVE** - Web accessibility evaluation tool (browser extension)
- **Pa11y** - Automated accessibility testing CLI
  - Install: `npm install -D pa11y`
  - Run: `npx pa11y http://localhost:3000`
- **Cookiebot** or **Termly** - GDPR/CCPA cookie consent management
- **iubenda** - Privacy policy generator and consent management

### Code Quality & CI/CD
- **ESLint** + **Prettier** - Already configured (linting and formatting)
- **Husky** + **lint-staged** - Pre-commit hooks for code quality
  - Install: `npx husky-init && npm install`
  - Add pre-commit hook: `npx husky add .husky/pre-commit "npx lint-staged"`
- **Commitlint** - Enforce conventional commit messages
- **Dependabot** - Automated dependency updates (GitHub native)
- **Snyk** or **Socket.dev** - Vulnerability scanning for dependencies
- **GitHub Actions** - CI/CD pipeline for testing/deployment
  ```yaml
  # .github/workflows/ci.yml
  - Run lint: npm run lint
  - Run build: npm run build
  - Run Playwright tests: npx playwright test
  - Run Lighthouse CI: npx lhci autorun
  ```

### Development Tools
- **Turbopack** - Already using (Next.js 16 default bundler)
- **React DevTools** - Browser extension for component debugging
- **Next.js DevTools** - Built-in performance profiling
- **Storybook** - Component documentation and visual testing (optional)
  - Install: `npx storybook@latest init`
- **Chromatic** - Visual regression testing for components

### Documentation & Collaboration
- **Notion** or **Confluence** - Tool documentation, roadmap planning
- **Linear** or **GitHub Projects** - Task tracking for v1.3 release
- **Figma** - UI mockups for new tools
- **Loom** - Screen recordings for bug reports and feature demos

### Recommended Immediate Additions for v1.3:
1. **Lighthouse CI** - Automate performance checks before each deploy
2. **Vercel Analytics** - Track real user performance metrics
3. **Sentry** - Catch production errors you're missing
4. **Husky + lint-staged** - Ensure code quality with pre-commit hooks
5. **Pa11y** - Automate accessibility testing for all 50 tools
6. **Bundle Analyzer** - Identify opportunities to reduce bundle size

---

**Current Version**: 2.0.0 (Enhanced Homepage + 50 Tools)
**Last Updated**: 2025-12-04
**Production URL**: https://toolstack-nu.vercel.app
