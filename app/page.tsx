import Link from "next/link";

const tools = [
  {
    slug: "/json-formatter",
    title: "JSON Formatter",
    description: "Format or minify JSON instantly. Free, fast, and shareable.",
  },
  {
    slug: "/json-yaml",
    title: "JSON ⇄ YAML",
    description: "Convert JSON to YAML or YAML to JSON with validation.",
  },
  {
    slug: "/resume-analyzer",
    title: "Resume Analyzer",
    description: "Check keywords, word counts, and readability for ATS-friendly resumes.",
  },
  {
    slug: "/pdf-to-text",
    title: "PDF → Text",
    description: "Extract clean text from PDFs directly in your browser for free.",
  },
  {
    slug: "/url-encoder",
    title: "URL Encoder/Decoder",
    description: "Encode or decode URLs instantly for query params and redirects.",
  },
  {
    slug: "/base64-encoder",
    title: "Base64 Encoder/Decoder",
    description: "Convert text to or from Base64 with copy-ready output.",
  },
  {
    slug: "/uuid-generator",
    title: "UUID Generator",
    description: "Generate v4 UUIDs (single or bulk) and copy instantly.",
  },
  {
    slug: "/hash-generator",
    title: "Hash Generator",
    description: "Compute SHA-256 or SHA-1 hashes in your browser.",
  },
  {
    slug: "/password-generator",
    title: "Password Generator",
    description: "Create strong, random passwords with custom rules.",
  },
  {
    slug: "/csv-json",
    title: "CSV ⇄ JSON",
    description: "Convert CSV to JSON or JSON to CSV with validation.",
  },
  {
    slug: "/text-case",
    title: "Text Case Converter",
    description: "Convert between camel, snake, kebab, title, upper, and lower.",
  },
  {
    slug: "/markdown-html",
    title: "Markdown ⇄ HTML",
    description: "Convert Markdown to HTML or HTML to Markdown instantly.",
  },
  {
    slug: "/qr-generator",
    title: "QR Code Generator",
    description: "Create QR codes from text or URLs and download PNGs.",
  },
  {
    slug: "/jwt-decoder",
    title: "JWT Decoder",
    description: "Decode JWT header and payload locally to inspect claims.",
  },
  {
    slug: "/color-converter",
    title: "Color Converter",
    description: "Convert HEX, RGB, and HSL with live preview.",
  },
  {
    slug: "/regex-tester",
    title: "Regex Tester",
    description: "Test regex patterns with flags and see matches instantly.",
  },
  {
    slug: "/diff-viewer",
    title: "Diff Viewer",
    description: "Compare two texts and highlight additions/removals.",
  },
  {
    slug: "/text-search",
    title: "Text Search",
    description: "Search text with regex/whole-word options and view snippets.",
  },
  {
    slug: "/code-minifier",
    title: "Code Minifier",
    description: "Minify or pretty-print HTML, CSS, or JS quickly.",
  },
  {
    slug: "/number-formatter",
    title: "Number Formatter",
    description: "Format numbers and currencies with locale and decimals.",
  },
  {
    slug: "/json-validator",
    title: "JSON Validator",
    description: "Validate and lint JSON with helpful errors and pretty output.",
  },
  {
    slug: "/cron-parser",
    title: "Cron Parser",
    description: "Validate cron expressions and view next run times.",
  },
  {
    slug: "/timestamp-converter",
    title: "Timestamp Converter",
    description: "Convert Unix timestamps to human dates and back.",
  },
  {
    slug: "/jwt-generator",
    title: "JWT Generator",
    description: "Sign and decode HS256 JWTs locally in your browser.",
  },
  {
    slug: "/html-entities",
    title: "HTML Entities",
    description: "Encode or decode HTML entities safely.",
  },
  {
    slug: "/image-base64",
    title: "Image → Base64",
    description: "Convert images to Base64 strings with preview.",
  },
  {
    slug: "/nanoid-generator",
    title: "NanoID Generator",
    description: "Generate short, URL-safe IDs with custom alphabets.",
  },
  {
    slug: "/lorem-ipsum",
    title: "Lorem Ipsum",
    description: "Generate placeholder paragraphs or sentences.",
  },
  {
    slug: "/json-diff",
    title: "JSON Diff",
    description: "Compare two JSON objects and highlight changes.",
  },
  {
    slug: "/regex-extractor",
    title: "Regex Extractor",
    description: "Extract regex matches and capture groups as a table.",
  },
  {
    slug: "/json-table",
    title: "JSON Table",
    description: "Render JSON arrays into a quick table view.",
  },
  {
    slug: "/toml-ini-converter",
    title: "TOML/INI → JSON",
    description: "Convert TOML or INI configs into JSON with validation.",
  },
  {
    slug: "/markdown-preview",
    title: "Markdown Preview",
    description: "Live Markdown rendering with copy-ready HTML.",
  },
  {
    slug: "/url-parser",
    title: "URL Parser",
    description: "Break URLs into protocol, host, path, params, and hash.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16 text-slate-900">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">FastFormat Tools</p>
        <h1 className="text-3xl font-semibold">Minimal, fast, and focused online tools</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Choose a tool to get started. All tools are free to use and work directly in your browser. No sign-up required.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={tool.slug}
            className="flex flex-col gap-3 rounded-2xl bg-white/90 p-6 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{tool.title}</h2>
              <span className="text-sm text-slate-500">Open</span>
            </div>
            <p className="text-sm text-slate-700">{tool.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
