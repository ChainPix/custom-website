"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Clipboard, Download, RefreshCcw } from "lucide-react";
import csstree from "css-tree";
import { diffLines, type Change } from "diff";
import { calculate } from "specificity";

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

const INLINE_SPECIFICITY = [9999, 0, 0];
const MEDIA_FLATTENABLE_REGEX = /max-width/i;
const MAX_HTML_LENGTH = 200000;

type StyleSource = { css: string; label: string };
type ParsedDeclaration = { property: string; value: string; important: boolean };
type InlineRule = {
  selector: string;
  declarations: ParsedDeclaration[];
  specificity: number[];
  order: number;
  media: string | null;
  sourceLabel: string;
};
type InlineOptions = { keepStyle: boolean; cssInput: string; flattenMedia: boolean };
type InlineResult = {
  html: string;
  totalSelectors: number;
  appliedSelectors: number;
  preservedMedia: string[];
  selectorWarnings: string[];
};
type ComputedEntry = { value: string; important: boolean; specificity: number[]; order: number };

function compareSpecificity(a: number[], b: number[]) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left !== right) return left - right;
  }
  return 0;
}

function computeSelectorSpecificity(selector: string) {
  try {
    const result = calculate(selector);
    return [result.A, result.B, result.C];
  } catch {
    return [0, 0, 0];
  }
}

function buildStyleSources(doc: Document, cssInput: string): StyleSource[] {
  const sources: StyleSource[] = [];
  doc.querySelectorAll("style").forEach((style, index) => {
    const media = style.getAttribute("media")?.trim();
    const labelParts = [`style block #${index + 1}`];
    if (style.id) labelParts.push(`#${style.id}`);
    if (media) labelParts.push(`media: ${media}`);
    sources.push({ css: style.textContent ?? "", label: labelParts.join(" | ") });
  });
  if (cssInput.trim()) {
    sources.push({ css: cssInput, label: "Custom CSS input" });
  }
  return sources;
}

function collectDeclarations(rule: any): ParsedDeclaration[] {
  const declarations: ParsedDeclaration[] = [];
  rule.block?.children.forEach((child: any) => {
    if (child.type !== "Declaration" || !child.property || !child.value) return;
    const property = child.property.trim().toLowerCase();
    if (!property) return;
    const value = csstree.generate(child.value).trim();
    if (!value) return;
    declarations.push({ property, value, important: Boolean(child.important) });
  });
  return declarations;
}

function buildInlineRules(sources: StyleSource[], skipped: string[]): InlineRule[] {
  const rules: InlineRule[] = [];
  let order = 0;

  const addRule = (ruleNode: any, media: string | null, sourceLabel: string) => {
    const declarations = collectDeclarations(ruleNode);
    if (!declarations.length) return;
    const selectorList = ruleNode.prelude;
    selectorList?.children.forEach((selectorNode: any) => {
      const selector = csstree.generate(selectorNode).trim();
      if (!selector) return;
      rules.push({
        selector,
        declarations,
        specificity: computeSelectorSpecificity(selector),
        order: order++,
        media,
        sourceLabel,
      });
    });
  };

  sources.forEach((source) => {
    const trimmed = source.css.trim();
    if (!trimmed) return;
    try {
      const ast = csstree.parse(trimmed, { context: "stylesheet" });
      ast.children.forEach((child: any) => {
        if (child.type === "Rule") {
          addRule(child, null, source.label);
        } else if (child.type === "Atrule" && child.name === "media") {
          const mediaQuery = child.prelude ? csstree.generate(child.prelude).trim() : null;
          child.block?.children.forEach((nested: any) => {
            if (nested.type === "Rule") {
              addRule(nested, mediaQuery, source.label);
            }
          });
        } else if (child.type === "Atrule") {
          skipped.push(`Unsupported @${child.name} rule in ${source.label}.`);
        }
      });
    } catch (error) {
      skipped.push(`Failed to parse CSS from ${source.label}: ${(error as Error).message}`);
    }
  });

  return rules;
}

function shouldFlattenMediaQueries(media: string | null, flattenMedia: boolean) {
  if (!media) return false;
  if (!flattenMedia) return false;
  return MEDIA_FLATTENABLE_REGEX.test(media);
}

function inlineDocumentWithRules(doc: Document, rules: InlineRule[], options: InlineOptions): InlineResult {
  const elementDeclarations = new WeakMap<Element, Map<string, ComputedEntry>>();
  const touchedElements = new Set<Element>();
  const preservedMedia = new Set<string>();
  const selectorWarnings: string[] = [];
  let totalSelectors = 0;
  let appliedSelectors = 0;

  const shouldOverride = (existing: ComputedEntry | undefined, candidate: ComputedEntry) => {
    if (!existing) return true;
    if (candidate.important !== existing.important) return candidate.important;
    const result = compareSpecificity(candidate.specificity, existing.specificity);
    if (result !== 0) return result > 0;
    return candidate.order >= existing.order;
  };

  const getElementMap = (element: Element) => {
    let map = elementDeclarations.get(element);
    if (!map) {
      map = new Map();
      const htmlElement = element as HTMLElement;
      const styleDecl = htmlElement.style;
      const properties: string[] = [];
      for (let i = 0; i < styleDecl.length; i += 1) {
        properties.push(styleDecl[i]);
      }
      properties.forEach((property) => {
        const value = styleDecl.getPropertyValue(property).trim();
        if (!value) return;
        const important = styleDecl.getPropertyPriority(property) === "important";
        map!.set(property.toLowerCase(), {
          value,
          important,
          specificity: INLINE_SPECIFICITY,
          order: -1,
        });
      });
      elementDeclarations.set(element, map);
    }
    touchedElements.add(element);
    return map as Map<string, ComputedEntry>;
  };

  const applyDeclarations = (
    element: Element,
    declarations: ParsedDeclaration[],
    specificity: number[],
    order: number,
  ) => {
    const map = getElementMap(element);
    declarations.forEach((decl) => {
      const candidate: ComputedEntry = {
        value: decl.value,
        important: decl.important,
        specificity,
        order,
      };
      const existing = map.get(decl.property);
      if (shouldOverride(existing, candidate)) {
        map.set(decl.property, candidate);
      }
    });
  };

  rules.forEach((rule) => {
    if (rule.media && !shouldFlattenMediaQueries(rule.media, options.flattenMedia)) {
      if (rule.media) preservedMedia.add(rule.media);
      return;
    }
    totalSelectors += 1;
    let nodes: Element[] = [];
    try {
      nodes = Array.from(doc.querySelectorAll(rule.selector));
    } catch (_error) {
      selectorWarnings.push(`Selector "${rule.selector}" from ${rule.sourceLabel} is not supported.`);
      return;
    }
    if (!nodes.length) return;
    appliedSelectors += 1;
    nodes.forEach((node) => applyDeclarations(node, rule.declarations, rule.specificity, rule.order));
  });

  if (!options.keepStyle) {
    doc.querySelectorAll("style").forEach((style) => style.remove());
  } else if (options.cssInput.trim()) {
    const styleTag = doc.createElement("style");
    styleTag.setAttribute("data-email-css-input", "true");
    styleTag.textContent = options.cssInput;
    if (doc.head) {
      doc.head.appendChild(styleTag);
    } else if (doc.documentElement) {
      doc.documentElement.prepend(styleTag);
    }
  }

  touchedElements.forEach((element) => {
    const map = elementDeclarations.get(element);
    if (!map) return;
    const serialized = Array.from(map.entries())
      .map(([key, entry]) => `${key}: ${entry.value}${entry.important ? " !important" : ""}`)
      .join("; ");
    if (serialized) {
      (element as HTMLElement).setAttribute("style", serialized);
    } else {
      element.removeAttribute("style");
    }
  });

  const rootElement = doc.documentElement ?? doc.body;
  const finalHtml = rootElement?.outerHTML ?? "";
  const mediaList = Array.from(preservedMedia).filter(Boolean);
  return {
    html: finalHtml,
    totalSelectors,
    appliedSelectors,
    preservedMedia: mediaList,
    selectorWarnings,
  };
}

export default function EmailCssInlinerClient() {
  const [html, setHtml] = useState(defaultHtml);
  const [css, setCss] = useState(defaultCss);
  const [output, setOutput] = useState("");
  const [beautifyOutput, setBeautifyOutput] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [keepStyle, setKeepStyle] = useState(true);
  const [flattenMedia, setFlattenMedia] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [coverage, setCoverage] = useState({ applied: 0, total: 0 });
  const [sizeWarning, setSizeWarning] = useState("");
  const [preservedMedia, setPreservedMedia] = useState<string[]>([]);
  const [diffSegments, setDiffSegments] = useState<Change[]>([]);

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Inlined successfully";
    return "Awaiting input";
  }, [error, output]);

  const resetResultState = () => {
    setOutput("");
    setDiffSegments([]);
    setCoverage({ applied: 0, total: 0 });
    setPreservedMedia([]);
    setSkipped([]);
    setSizeWarning("");
  };

  const handleInline = () => {
    setError("");
    setCopied(false);
    try {
      if (!html.trim()) throw new Error("Enter HTML to inline.");
      if (html.length > MAX_HTML_LENGTH) throw new Error("HTML is too large. Please reduce size.");
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const styleSources = buildStyleSources(doc, css);
      const parseWarnings: string[] = [];
      const rules = buildInlineRules(styleSources, parseWarnings);
      const result = inlineDocumentWithRules(doc, rules, {
        keepStyle,
        cssInput: css,
        flattenMedia,
      });
      const finalMarkup = beautifyOutput ? prettyFormat(result.html) : result.html;
      const diff = finalMarkup ? diffLines(html, finalMarkup) : [];
      setOutput(finalMarkup);
      setDiffSegments(diff);
      setCoverage({ applied: result.appliedSelectors, total: result.totalSelectors });
      setPreservedMedia(result.preservedMedia);
      const combinedSkips = [...parseWarnings, ...result.selectorWarnings].filter(Boolean);
      setSkipped(combinedSkips);
      const kb = finalMarkup.length / 1024;
      setSizeWarning(kb > 200 ? `Output is large (~${kb.toFixed(0)} KB). Preview/copy may feel slower.` : "");
    } catch (err: any) {
      setError(err?.message || "Unable to inline CSS. Check HTML/CSS and try again.");
      resetResultState();
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

  const handleReset = () => {
    setHtml(defaultHtml);
    setCss(defaultCss);
    setBeautifyOutput(false);
    setFlattenMedia(false);
    setError("");
    setCopied(false);
    resetResultState();
  };

  return (
    <main className="space-y-8">
      <div className="sr-only" aria-live="polite">
        {status} {copied ? "Copied output" : ""}
      </div>
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
            <span itemProp="name" className="font-medium text-slate-900">Email CSS Inliner</span>
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={flattenMedia}
                onChange={(e) => setFlattenMedia(e.target.checked)}
                aria-label="Flatten mobile media queries"
              />
              Flatten max-width media
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
                    resetResultState();
                    setError("");
                    setCopied(false);
                    setBeautifyOutput(false);
                    setFlattenMedia(false);
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
              onClick={handleReset}
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
                  Skipped {skipped.length} selector/media block{skipped.length > 1 ? "s" : ""} (see diff for details).
                </p>
              ) : null}
              {preservedMedia.length > 0 ? (
                <p className="text-xs font-medium text-slate-500">
                  Preserved {preservedMedia.length} media query block{preservedMedia.length > 1 ? "s" : ""}; enable "Flatten max-width media" to inline mobile-first rules.
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
          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">Diff</p>
            <div className="mt-2 text-[11px] leading-relaxed text-slate-200">
              {diffSegments.length ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap">
                  {diffSegments.map((segment, index) => {
                    const classes = segment.added
                      ? "bg-emerald-500/10 text-emerald-200"
                      : segment.removed
                        ? "bg-amber-500/10 text-amber-200"
                        : "text-slate-200";
                    return (
                      <span key={index} className={`${classes}`}> 
                        {segment.value}
                      </span>
                    );
                  })}
                </pre>
              ) : (
                <p className="text-xs text-slate-500">Diff will appear once you inline the CSS.</p>
              )}
            </div>
          </div>
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
          <li>
            Paste your HTML and CSS. Toggle “Keep style tag” to preserve the head and “Flatten max-width media” to inline mobile-first
            queries.
          </li>
          <li>
            Click Inline CSS, review the diff, then copy or download the result once the preview looks right.
          </li>
          <li>For best email support, stick to simple selectors (tags, classes, IDs) and essential properties.</li>
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
