/**
 * Shared Markdown ⇄ HTML conversion configuration used by both the client
 * (lazy-loaded modules) and the worker (static imports). The marked/turndown
 * modules are injected so the client keeps its dynamic-import code splitting.
 *
 * Covered by tests/unit/markdown-html.spec.ts.
 */

import hljs from "highlight.js/lib/common";
import type { Renderer, Tokens } from "marked";
import type TurndownService from "turndown";

export type Mode = "md-to-html" | "html-to-md";

export type MarkdownOptions = {
  gfmTables: boolean;
  lineBreaks: boolean;
  headingIds: boolean;
  openLinksInNewTab: boolean;
  highlightCode: boolean;
};

export type HtmlOptions = {
  preserveLinks: boolean;
  preserveImages: boolean;
  keepInlineStyles: boolean;
  brHandling: "single" | "double";
  gfmTables: boolean;
};

type MarkedModule = typeof import("marked");
type TurndownCtor = typeof TurndownService;
type TurndownPlugin = Parameters<TurndownService["use"]>[0];

/**
 * GitHub-style heading slug: lowercase, strip markup/punctuation, hyphenate,
 * dedupe with -1/-2… suffixes. `seen` scopes dedup to a single document.
 */
export const slugifyHeading = (raw: string, seen: Map<string, number>): string => {
  const base =
    raw
      .toLowerCase()
      .trim()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-") || "heading";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
};

export const buildMarkedRenderer = (options: MarkdownOptions, markedModule: MarkedModule): Renderer => {
  const renderer = new markedModule.Renderer();
  if (options.headingIds) {
    // marked v5 removed the old `headerIds` option, so ids are generated here.
    const seen = new Map<string, number>();
    renderer.heading = function (token: Tokens.Heading) {
      const inline = this.parser.parseInline(token.tokens);
      const id = slugifyHeading(token.text, seen);
      return `<h${token.depth} id="${id}">${inline}</h${token.depth}>\n`;
    };
  }
  if (options.openLinksInNewTab) {
    renderer.link = function (token: Tokens.Link) {
      const href = typeof token.href === "string" ? token.href : "";
      const title = token.title ? ` title="${token.title}"` : "";
      const text = this.parser.parseInline(token.tokens);
      return `<a href="${href}"${title} target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
  }
  if (options.highlightCode) {
    renderer.code = (token: Tokens.Code) => {
      const lang = token.lang ?? "";
      const code = token.text ?? "";
      const highlighted =
        lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : hljs.highlightAuto(code).value;
      const className = lang ? ` class="language-${lang}"` : "";
      return `<pre><code${className}>${highlighted}</code></pre>`;
    };
  }
  return renderer;
};

export const markdownToHtml = (input: string, options: MarkdownOptions, markedModule: MarkedModule): string =>
  markedModule.marked.parse(input, {
    gfm: true,
    breaks: options.lineBreaks,
    renderer: buildMarkedRenderer(options, markedModule),
  }) as string;

export const stripInlineStyles = (value: string) => value.replace(/\sstyle=(\"[^\"]*\"|'[^']*')/gi, "");

export const buildTurndownService = (
  options: HtmlOptions,
  TurndownCtorArg: TurndownCtor,
  gfmPlugin?: TurndownPlugin
) => {
  const service = new TurndownCtorArg({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  if (options.gfmTables && gfmPlugin) {
    service.use(gfmPlugin);
  }
  if (!options.preserveLinks) {
    service.addRule("stripLinks", {
      filter: "a",
      replacement: (content) => content,
    });
  }
  if (!options.preserveImages) {
    service.addRule("stripImages", {
      filter: "img",
      replacement: () => "",
    });
  }
  service.addRule("brHandling", {
    filter: "br",
    replacement: () => (options.brHandling === "double" ? "\n\n" : "\n"),
  });
  return service;
};

export const htmlToMarkdown = (
  input: string,
  options: HtmlOptions,
  TurndownCtorArg: TurndownCtor,
  gfmPlugin?: TurndownPlugin
): string =>
  buildTurndownService(options, TurndownCtorArg, gfmPlugin).turndown(
    options.keepInlineStyles ? input : stripInlineStyles(input)
  );
