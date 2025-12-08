import ToolGrid from "@/components/tool-grid";
import Image from "next/image";

export type ToolCategory = {
  name: string;
  description: string;
  tools: Array<{
    slug: string;
    title: string;
    description: string;
  }>;
};

const toolCategories: ToolCategory[] = [
  {
    name: "Data Format Converters",
    description: "Convert between JSON, YAML, CSV, XML, and other data formats",
    tools: [
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
        slug: "/toml-yaml",
        title: "TOML ⇄ YAML",
        description: "Convert TOML to YAML or YAML to TOML with validation and sorting.",
      },
      {
        slug: "/csv-json",
        title: "CSV ⇄ JSON",
        description: "Convert CSV to JSON or JSON to CSV with validation.",
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
        slug: "/markdown-html",
        title: "Markdown ⇄ HTML",
        description: "Convert Markdown to HTML or HTML to Markdown instantly.",
      },
      {
        slug: "/data-uri",
        title: "Data URI",
        description: "Convert text or files to data URIs with chosen MIME type.",
      },
      {
        slug: "/query-to-json",
        title: "Query → JSON",
        description: "Parse query strings into structured JSON with decode and array options.",
      },
      {
        slug: "/xml-formatter",
        title: "XML Formatter",
        description: "Beautify and validate XML with indentation options.",
      },
      {
        slug: "/curl-to-fetch",
        title: "cURL → fetch",
        description: "Convert cURL commands into JavaScript fetch snippets instantly.",
      },
      {
        slug: "/email-css-inliner",
        title: "Email CSS Inliner",
        description: "Inline CSS into HTML for better email client compatibility.",
      },
    ],
  },
  {
    name: "Encoding & Hashing",
    description: "Encode, decode, hash, and generate unique identifiers",
    tools: [
      {
        slug: "/base64-encoder",
        title: "Base64 Encoder/Decoder",
        description: "Convert text to or from Base64 with copy-ready output.",
      },
      {
        slug: "/url-encoder",
        title: "URL Encoder/Decoder",
        description: "Encode or decode URLs instantly for query params and redirects.",
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
        slug: "/hash-generator",
        title: "Hash Generator",
        description: "Compute SHA-256 or SHA-1 hashes in your browser.",
      },
      {
        slug: "/uuid-generator",
        title: "UUID Generator",
        description: "Generate v4 UUIDs (single or bulk) and copy instantly.",
      },
      {
        slug: "/uuid-advanced",
        title: "UUID v1/v5",
        description: "Generate UUID v1, v4, or v5 with namespace/name support.",
      },
      {
        slug: "/nanoid-generator",
        title: "NanoID Generator",
        description: "Generate short, URL-safe IDs with custom alphabets.",
      },
    ],
  },
  {
    name: "Validation & Analysis",
    description: "Validate data, test patterns, and analyze content",
    tools: [
      {
        slug: "/json-validator",
        title: "JSON Validator",
        description: "Validate and lint JSON with helpful errors and pretty output.",
      },
      {
        slug: "/json-diff",
        title: "JSON Diff",
        description: "Compare two JSON objects and highlight changes.",
      },
      {
        slug: "/regex-tester",
        title: "Regex Tester",
        description: "Test regex patterns with flags and see matches instantly.",
      },
      {
        slug: "/regex-extractor",
        title: "Regex Extractor",
        description: "Extract regex matches and capture groups as a table.",
      },
      {
        slug: "/resume-analyzer",
        title: "Resume Analyzer",
        description: "Check keywords, word counts, and readability for ATS-friendly resumes.",
      },
      {
        slug: "/cron-parser",
        title: "Cron Parser",
        description: "Validate cron expressions and view next run times.",
      },
      {
        slug: "/cron-tester",
        title: "Cron Expression Tester",
        description: "Validate cron strings and see upcoming run times.",
      },
    ],
  },
  {
    name: "Code & Configuration",
    description: "Format, minify, and work with code and configuration files",
    tools: [
      {
        slug: "/code-minifier",
        title: "Code Minifier",
        description: "Minify or pretty-print HTML, CSS, or JS quickly.",
      },
      {
        slug: "/sql-formatter",
        title: "SQL Formatter",
        description: "Format SQL with dialect options and copy-ready output.",
      },
      {
        slug: "/jwt-decoder",
        title: "JWT Decoder",
        description: "Decode JWT header and payload locally to inspect claims.",
      },
      {
        slug: "/jwt-generator",
        title: "JWT Generator",
        description: "Sign and decode HS256 JWTs locally in your browser.",
      },
      {
        slug: "/css-units",
        title: "CSS Units Converter",
        description: "Translate px, rem, em, vw, vh with custom base and viewport settings.",
      },
      {
        slug: "/chmod-calculator",
        title: "Permission Calculator",
        description: "Convert chmod octal to symbolic with setuid/setgid/sticky bits.",
      },
      {
        slug: "/cron-generator",
        title: "Cron Generator",
        description: "Build cron expressions with a simple UI and summary.",
      },
    ],
  },
  {
    name: "Text & Content Processing",
    description: "Transform, search, and manipulate text content",
    tools: [
      {
        slug: "/text-case",
        title: "Text Case Converter",
        description: "Convert between camel, snake, kebab, title, upper, and lower.",
      },
      {
        slug: "/text-search",
        title: "Text Search",
        description: "Search text with regex/whole-word options and view snippets.",
      },
      {
        slug: "/text-deduper",
        title: "Text Deduper",
        description: "Remove duplicate lines with case-insensitive options.",
      },
      {
        slug: "/markdown-preview",
        title: "Markdown Preview",
        description: "Live Markdown rendering with copy-ready HTML.",
      },
      {
        slug: "/lorem-ipsum",
        title: "Lorem Ipsum",
        description: "Generate placeholder paragraphs or sentences.",
      },
      {
        slug: "/number-formatter",
        title: "Number Formatter",
        description: "Format numbers and currencies with locale and decimals.",
      },
      {
        slug: "/timestamp-converter",
        title: "Timestamp Converter",
        description: "Convert Unix timestamps to human dates and back.",
      },
      {
        slug: "/color-converter",
        title: "Color Converter",
        description: "Convert HEX, RGB, and HSL with live preview.",
      },
      {
        slug: "/diff-viewer",
        title: "Diff Viewer",
        description: "Compare two texts and highlight additions/removals.",
      },
    ],
  },
  {
    name: "Generation & Utilities",
    description: "Generate data, QR codes, passwords, and perform lookups",
    tools: [
      {
        slug: "/qr-generator",
        title: "QR Code Generator",
        description: "Create QR codes from text or URLs and download PNGs.",
      },
      {
        slug: "/password-generator",
        title: "Password Generator",
        description: "Create strong, random passwords with custom rules.",
      },
      {
        slug: "/mock-data",
        title: "Mock Data Generator",
        description: "Generate fake user/transaction data in JSON, CSV, or SQL.",
      },
      {
        slug: "/ip-asn-lookup",
        title: "IP / ASN Lookup",
        description: "Validate IPs, detect private ranges, and fetch ASN when configured.",
      },
      {
        slug: "/url-parser",
        title: "URL Parser",
        description: "Break URLs into protocol, host, path, params, and hash.",
      },
      {
        slug: "/webp-converter",
        title: "WebP Converter",
        description: "Convert JPG/PNG/GIF to WebP locally with quality control.",
      },
      {
        slug: "/pdf-to-text",
        title: "PDF → Text",
        description: "Extract clean text from PDFs directly in your browser for free.",
      },
    ],
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16 text-slate-900">
      <header className="flex flex-col gap-3">
        <div className="mb-2 flex justify-center">
          <Image
            src="/logo.png"
            alt="ToolStack"
            width={200}
            height={60}
            priority
            className="h-auto w-auto"
          />
        </div>
        <h1 className="text-center text-3xl font-semibold">Minimal, fast, and focused online tools</h1>
        <p className="mx-auto max-w-3xl text-center text-lg text-slate-700">
          Choose a tool to get started. All tools are free to use and work directly in your browser. No sign-up required.
        </p>
        <div className="text-center text-sm text-slate-600">
          Need something else?{" "}
          <a
            className="font-semibold text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-4 transition hover:decoration-slate-500"
            href="/contact"
          >
            Contact the developers
          </a>{" "}
          with your request.
        </div>
      </header>

      <ToolGrid categories={toolCategories} />
    </main>
  );
}
