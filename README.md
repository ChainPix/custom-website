# ToolStack

- Fast, frictionless browser tools with no sign-up
- Modern Minimalist + Soft Skeuomorphism styling for clarity and trust
- SEO-first: per-tool metadata, canonical URLs, sitemap/robots, clean headings
- Client-side processing for speed and privacy

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
- Dynamic `sitemap.xml` with all tools + home + contact
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
One from above or introduce new one.

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
Add your tool to the appropriate category array.

### 4. Update Sitemap
Add route to `app/sitemap.ts` if not automatically included.

### 5. Create Documentation
- **`README.md`** - Feature documentation, use cases, examples
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
---

**Production URL**: https://toolstack-nu.vercel.app