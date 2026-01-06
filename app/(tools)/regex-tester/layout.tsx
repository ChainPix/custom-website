import Link from "next/link";

export default function RegexTesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14 text-slate-900">
      <div className="mb-8 space-y-4">
        <nav aria-label="Breadcrumb" className="text-sm">
          <ol className="flex items-center gap-2 text-slate-600" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/" itemProp="item" className="underline underline-offset-4 transition hover:text-slate-900">
                <span itemProp="name">Home</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true">/</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="font-medium text-slate-900">
                Regex Tester
              </span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">Regex Tester</h1>
            <p className="max-w-3xl text-base text-slate-700">
              Test regular expressions with flags and see matches instantly. Runs in your browser.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-[var(--shadow-soft)]">
            <p className="font-semibold text-slate-800">Shortcuts</p>
            <p>Cmd/Ctrl+Enter: Run</p>
            <p>Cmd/Ctrl+L: Focus pattern</p>
            <p>Esc: Clear selection</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
