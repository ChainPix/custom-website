import Link from "next/link";

const tools = [
  {
    slug: "/json-formatter",
    title: "JSON Formatter",
    description: "Format or minify JSON instantly. Free, fast, and shareable.",
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
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16 text-slate-900">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">FastFormat Tools</p>
        <h1 className="text-3xl font-semibold">Minimal, fast, and focused online tools</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Choose a tool to get started. Pages are optimized for speed, SEO, and clean usability with
          soft-skeuo styling and smooth font rendering.
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
