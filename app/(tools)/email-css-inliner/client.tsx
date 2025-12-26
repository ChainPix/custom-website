"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";

const defaultHtml = `<html>
  <body>
    <h1 class="title">Welcome</h1>
    <p id="intro">Thanks for trying our email tool.</p>
    <a class="btn" href="#">Call to action</a>
  </body>
</html>`;

const defaultCss = `.title { color: #0f172a; font-size: 24px; }
#intro { color: #475569; font-size: 16px; line-height: 1.5; }
.btn { display: inline-block; padding: 10px 16px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; }`;

const samples = {
  default: { html: defaultHtml, css: defaultCss },
  marketing: {
    html: `<html>
  <body style="margin:0;padding:0;background:#f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:24px;text-align:center;">
          <img src="https://dummyimage.com/120x40/0f172a/ffffff&text=Brand" alt="Brand" width="120" height="40" />
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px 24px;">
          <h1 class="hero">Meet the new dashboard</h1>
          <p class="body">Faster analytics, cleaner UI, and stronger security. Jump back in to see what's new.</p>
          <a class="cta" href="#">View updates</a>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    css: `.hero { font-size: 24px; color: #0f172a; margin: 0 0 12px; }
.body { font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px; }
.cta { display: inline-block; padding: 12px 18px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; }`,
  },
  newsletter: {
    html: `<html>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td class="header">Weekly Dev Notes</td></tr>
      <tr><td class="article"><h2>Tip of the week</h2><p>Inline CSS for emails improves deliverability across Outlook, Gmail, and iOS clients.</p></td></tr>
      <tr><td class="article"><h2>Changelog</h2><ul><li>New shortcuts</li><li>Accessibility fixes</li><li>Improved export</li></ul></td></tr>
      <tr><td class="footer">You are receiving this because you subscribed to updates.</td></tr>
    </table>
  </body>
</html>`,
    css: `.header { background:#0f172a; color:#fff; padding:18px 22px; font-size:18px; font-weight:700; }
.article { padding:18px 22px; color:#0f172a; font-size:15px; line-height:1.6; border-bottom:1px solid #e2e8f0; }
.article h2 { margin:0 0 8px; font-size:17px; }
.article ul { margin:0; padding-left:18px; }
.footer { padding:16px 22px; background:#f8fafc; color:#475569; font-size:13px; }`,
  },
};

type Rule = { selectors: string[]; declarations: string };

function parseCss(css: string) {
  const rules: Rule[] = [];
  const skipped: string[] = [];
  const opened = (css.match(/{/g) || []).length;
  const closed = (css.match(/}/g) || []).length;
  if (opened !== closed) {
    skipped.push("CSS brace mismatch detected; parsing may be incomplete.");
  }
  // Strip simple @media blocks by noting them and skipping inside content
  const withoutMedia = css.replace(/@media[^{]+{[^}]+}/g, (match) => {
    skipped.push(match.trim());
    return "";
  });
  withoutMedia
    .split("}")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .forEach((block) => {
      const [selectorPart, declPart] = block.split("{");
      if (!selectorPart || !declPart) return;
      const selectors = selectorPart
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const declarations = declPart.trim().replace(/\s+/g, " ");
      if (!selectors.length || !declarations) return;
      rules.push({ selectors, declarations });
    });
  return { rules, skipped };
}

function inlineHtml(html: string, rules: Rule[], keepStyle: boolean) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  let totalSelectors = 0;
  let appliedSelectors = 0;

  rules.forEach((rule) => {
    rule.selectors.forEach((sel) => {
      totalSelectors += 1;
      try {
        const nodes = doc.querySelectorAll(sel);
        if (nodes.length > 0) {
          appliedSelectors += 1;
        }
        nodes.forEach((node) => {
          const existing = (node as HTMLElement).getAttribute("style") || "";
          const merged = `${existing ? existing.trim().replace(/;?$/, "; ") : ""}${rule.declarations}`;
          // Deduplicate declarations by last occurrence wins
          const deduped = merged
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .reduceRight((acc, decl) => {
              const [prop] = decl.split(":").map((s) => s.trim());
              if (!prop || acc.map.has(prop)) return acc;
              acc.list.unshift(decl);
              acc.map.add(prop);
              return acc;
            }, { list: [] as string[], map: new Set<string>() }).list.join("; ");
          (node as HTMLElement).setAttribute("style", deduped);
        });
      } catch (err) {
        console.warn("Selector skipped", sel, err);
      }
    });
  });
  if (!keepStyle) {
    doc.querySelectorAll("style").forEach((el) => el.remove());
  }
  const htmlOut = doc.body.innerHTML.trim() || doc.documentElement.innerHTML.trim();
  return { html: htmlOut, appliedSelectors, totalSelectors };
}

export default function EmailCssInlinerClient() {
  const [html, setHtml] = useState(defaultHtml);
  const [css, setCss] = useState(defaultCss);
  const [output, setOutput] = useState("");
  const [beautifyOutput, setBeautifyOutput] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [keepStyle, setKeepStyle] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [coverage, setCoverage] = useState({ applied: 0, total: 0 });
  const [sizeWarning, setSizeWarning] = useState("");

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Inlined successfully";
    return "Awaiting input";
  }, [error, output]);

  const prettyFormat = (markup: string) => {
    const compact = markup.replace(/>\s+</g, "><").trim();
    const parts = compact.split(/(?=<)/g);
    let depth = 0;
    return parts
      .map((part) => {
        const trimmed = part.trim();
        if (!trimmed) return "";
        if (/^<\//.test(trimmed)) depth = Math.max(depth - 1, 0);
        const line = `${"  ".repeat(depth)}${trimmed}`;
        if (/^<[^!/?][^>]*[^/]>\s*$/.test(trimmed)) depth += 1;
        return line;
      })
      .filter(Boolean)
      .join("\n");
  };

  const handleInline = () => {
    setError("");
    setCopied(false);
    try {
      if (!html.trim()) throw new Error("Enter HTML to inline.");
      if (html.length > 200000) throw new Error("HTML is too large. Please reduce size.");
      const { rules, skipped } = parseCss(css);
      const { html: inlined, appliedSelectors, totalSelectors } = inlineHtml(html, rules, keepStyle);
      const finalMarkup = beautifyOutput ? prettyFormat(inlined) : inlined;
      setSkipped(skipped);
      setOutput(finalMarkup);
      setCoverage({ applied: appliedSelectors, total: totalSelectors });
      const kb = finalMarkup.length / 1024;
      setSizeWarning(kb > 200 ? `Output is large (~${kb.toFixed(0)} KB). Preview/copy may feel slower.` : "");
    } catch (err: any) {
      setError(err?.message || "Unable to inline CSS. Check HTML/CSS and try again.");
      setOutput("");
      setSkipped([]);
      setCoverage({ applied: 0, total: 0 });
      setSizeWarning("");
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inlined.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
      </div>
            {/* Breadcrumb Navigation */}
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
              Email CSS Inliner
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Email CSS Inliner</h1>
        <p className="max-w-3xl text-base text-slate-700">
          Inline CSS styles into your HTML email for better mail-client support. Runs locally in your browser.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={keepStyle}
                onChange={(e) => setKeepStyle(e.target.checked)}
                aria-label="Keep original style tag"
              />
              Keep style tag
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Samples:</span>
              {[
                { key: "default", label: "Simple" },
                { key: "marketing", label: "Marketing" },
                { key: "newsletter", label: "Newsletter" },
              ].map((sample) => (
                <button
                  key={sample.key}
                  onClick={() => {
                    const preset = samples[sample.key as keyof typeof samples];
                    setHtml(preset.html);
                    setCss(preset.css);
                    setOutput("");
                    setError("");
                    setCopied(false);
                  }}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  aria-label={`Load ${sample.label} sample`}
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={beautifyOutput}
                onChange={(e) => setBeautifyOutput(e.target.checked)}
                aria-label="Beautify output"
              />
              Beautify output
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                aria-label="Toggle live preview"
              />
              Show preview
            </label>
            <button
              onClick={() => {
                setHtml(defaultHtml);
                setCss(defaultCss);
                setOutput("");
                setError("");
                setCopied(false);
                setBeautifyOutput(false);
              }}
              className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset inputs"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              HTML
              <textarea
                className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={html}
                onChange={(event) => setHtml(event.target.value)}
                spellCheck={false}
                aria-label="HTML input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              CSS
              <textarea
                className="h-[200px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 shadow-inner shadow-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                value={css}
                onChange={(event) => setCss(event.target.value)}
                spellCheck={false}
                aria-label="CSS input"
              />
            </label>
          </div>
          <button
            onClick={handleInline}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            aria-label="Inline CSS"
          >
            Inline CSS
          </button>
          {error ? (
            <p className="text-sm font-medium text-amber-600">{error}</p>
          ) : (
            <div className="space-y-1 text-sm text-slate-600">
              <p>{status}</p>
              {coverage.total > 0 ? (
                <p className="text-xs font-medium text-slate-700">
                  Applied {coverage.applied}/{coverage.total} selectors matched on the page.
                </p>
              ) : null}
              {skipped.length > 0 ? (
                <p className="text-xs font-medium text-amber-700">
                  Skipped {skipped.length} selector/media block{skipped.length > 1 ? "s" : ""} (e.g., @media rules are not applied).
                </p>
              ) : null}
              {sizeWarning ? <p className="text-xs font-medium text-amber-700">{sizeWarning}</p> : null}
            </div>
          )}
        </div>

        <div className="flex h-full flex-col rounded-2xl bg-slate-900 text-white shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold" id="inlined-heading">
              Inlined HTML
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {skipped.length > 0 ? (
                <a
                  href="#skipped-selectors"
                  className="rounded-full bg-amber-100/10 px-3 py-1 text-[11px] font-semibold text-amber-100 ring-1 ring-amber-200/40 transition hover:bg-amber-100/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                  aria-label={`View ${skipped.length} skipped selectors`}
                >
                  Skipped: {skipped.length}
                </a>
              ) : null}
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy inlined HTML"
              >
                {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download inlined HTML"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <pre
            className="flex-1 overflow-auto p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap"
            role="region"
            aria-labelledby="inlined-heading"
          >
            {output || "Inlined HTML will appear here."}
          </pre>
          {showPreview && (
          <div className="border-t border-slate-800 px-4 py-3">
            <p className="mb-2 text-sm font-semibold text-white" id="preview-heading">
              Preview
            </p>
            <p className="mb-2 text-xs text-slate-200">
              Note: Images or external assets may be blocked by your browser/CSP during preview.
            </p>
            <div
              className="rounded-xl border border-slate-800 bg-white/5 p-3 text-slate-900"
              role="region"
              aria-labelledby="preview-heading"
            >
                {output ? (
                  <div
                    className="prose prose-sm prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: output }}
                  />
                ) : (
                  <p className="text-sm text-slate-200">Preview will appear after you inline the CSS.</p>
                )}
              </div>
            </div>
          )}
          {skipped.length ? (
            <div className="border-t border-slate-800 px-4 py-3 text-xs text-amber-200" id="skipped-selectors">
              <p className="font-semibold text-amber-100">Skipped selectors/media</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {skipped.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl bg-white/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">How to use</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Paste your HTML and CSS. Toggle “Keep style tag” if you want to retain the original style block.</li>
          <li>Click Inline CSS to apply styles inline. Copy or download the resulting HTML.</li>
          <li>For best email support, use simple selectors (tag, class, id) and basic properties.</li>
        </ol>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">FAQ & privacy</p>
          <p><strong>Does this run locally?</strong> Yes. Processing happens in your browser.</p>
          <p><strong>Selectors?</strong> Tag, class, and ID selectors are supported. Complex selectors may be skipped.</p>
          <p><strong>Why inline?</strong> Many email clients strip head styles. Inlining improves compatibility.</p>
        </div>
      </div>
    </main>
  );
}
