# WS-D — New Tools (30 tools × 6-item pack = 180)

Each new tool ships via the NT pack. When a tool is started, expand its line into
six sub-items in place:

- NT1 registry entry (lib/tools.ts) + route + page metadata
- NT2 core pure-logic module + unit spec (logic before UI)
- NT3 client UI built on ToolShell + shared components only
- NT4 worker offload if parsing/transform is heavy
- NT5 SEO block set (JSON-LD × 5 with unique ids, FAQ, README)
- NT6 e2e spec + smoke-test registration

All tools must be fully client-side (privacy story intact). No new dependency
without a note in the commit message; prefer WASM/pure-JS libs already vetted.

## Candidates (ordered by expected search demand + fit)
- [ ] D1 JSON → TypeScript interfaces generator
- [ ] D2 HTML ⇄ JSX converter
- [ ] D3 Meta tag / Open Graph generator with live SERP + social preview
- [ ] D4 Color contrast checker (WCAG AA/AAA matrix, suggestions)
- [ ] D5 Color palette generator (harmonies, export as CSS/Tailwind)
- [ ] D6 SVG optimizer (svgo in browser) with before/after diff
- [ ] D7 Image resizer/cropper (canvas, batch, no upload)
- [ ] D8 EXIF viewer + stripper (privacy angle)
- [ ] D9 Favicon generator (PNG set + ICO from one image)
- [ ] D10 JWT verifier (paste public key / JWKS, verify signature locally)
- [ ] D11 ULID / KSUID generator with timestamp decode
- [ ] D12 Base32 / Base58 encoder-decoder
- [ ] D13 File checksum verifier (SHA-256/512 of local files, compare field)
- [ ] D14 TLS certificate decoder (PEM → subject/SAN/expiry)
- [ ] D15 DNS lookup via DNS-over-HTTPS (A/AAAA/MX/TXT/NS)
- [ ] D16 User-agent string parser
- [ ] D17 cURL command builder (form UI → copyable command)
- [ ] D18 HAR file analyzer (waterfall, sizes, slowest requests)
- [ ] D19 Semver range calculator/tester
- [ ] D20 .gitignore generator (stack presets, combinable)
- [ ] D21 Markdown table-of-contents generator
- [ ] D22 Slug / anchor generator (unicode-aware, style options)
- [ ] D23 String escape suite (JS/JSON/HTML/SQL/shell/regex in one tool)
- [ ] D24 Hex viewer / binary inspector for local files
- [ ] D25 GraphQL query formatter/minifier
- [ ] D26 Timezone meeting planner (compare hours across zones)
- [ ] D27 Unit converter (length/mass/temp/data sizes)
- [ ] D28 Data transfer time calculator (size × bandwidth)
- [ ] D29 QR code scanner (camera/image → decoded payload)
- [ ] D30 CSV editor grid (edit cells, add rows, re-export)
