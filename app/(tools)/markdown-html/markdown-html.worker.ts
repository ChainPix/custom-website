/// <reference lib="webworker" />

import { marked } from "marked";
import TurndownService from "turndown";
import { gfm as turndownGfm } from "turndown-plugin-gfm";
import hljs from "highlight.js/lib/common";
import { defaultFormatOptions, formatCode } from "../../../lib/formatters/code-minifier";

type Mode = "md-to-html" | "html-to-md";

type WorkerRequest = {
  id: number;
  input: string;
  mode: Mode;
  formatHtml: boolean;
  formatMarkdown: boolean;
  minifyOutput: boolean;
  markdownOptions: MarkdownOptions;
  htmlOptions: HtmlOptions;
};

type WorkerResponse = {
  id: number;
  output?: string;
  error?: string;
};

type MarkdownOptions = {
  gfmTables: boolean;
  lineBreaks: boolean;
  headingIds: boolean;
  openLinksInNewTab: boolean;
  highlightCode: boolean;
};

type HtmlOptions = {
  preserveLinks: boolean;
  preserveImages: boolean;
  keepInlineStyles: boolean;
  brHandling: "single" | "double";
  gfmTables: boolean;
};

const formatMarkdownOutput = async (value: string) => {
  const prettier = await import("prettier/standalone");
  const markdown = await import("prettier/plugins/markdown");
  const formatted = await prettier.format(value, {
    parser: "markdown",
    plugins: [markdown],
    printWidth: 100,
  });
  return formatted.trim();
};

const buildMarkedRenderer = (options: MarkdownOptions) => {
  const renderer = new marked.Renderer();
  if (options.openLinksInNewTab) {
    renderer.link = (token) => {
      const href = typeof token.href === "string" ? token.href : "";
      const title = token.title ? ` title="${token.title}"` : "";
      const text = token.text ?? "";
      return `<a href="${href}"${title} target="_blank" rel="noopener noreferrer">${text}</a>`;
    };
  }
  if (options.highlightCode) {
    renderer.code = (token) => {
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

const stripInlineStyles = (value: string) => value.replace(/\sstyle=(\"[^\"]*\"|'[^']*')/gi, "");

const buildTurndownService = (options: HtmlOptions) => {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  if (options.gfmTables) {
    service.use(turndownGfm);
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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, input, mode, formatHtml, formatMarkdown, minifyOutput, markdownOptions, htmlOptions } = event.data;
  try {
    const rawOutput =
      mode === "md-to-html"
        ? (marked.parse(input, {
            gfm: true,
            breaks: markdownOptions.lineBreaks,
            headerIds: markdownOptions.headingIds,
            tables: markdownOptions.gfmTables,
            renderer: buildMarkedRenderer(markdownOptions),
          }) as string)
        : buildTurndownService(htmlOptions).turndown(htmlOptions.keepInlineStyles ? input : stripInlineStyles(input));
    let output = rawOutput;
    if (mode === "md-to-html") {
      if (minifyOutput) {
        const result = await formatCode({
          code: rawOutput,
          lang: "html",
          mode: "minify",
          options: defaultFormatOptions,
          safeMode: false,
        });
        output = result.output;
      } else if (formatHtml) {
        const result = await formatCode({
          code: rawOutput,
          lang: "html",
          mode: "pretty",
          options: defaultFormatOptions,
          safeMode: false,
        });
        output = result.output;
      }
    } else if (formatMarkdown) {
      output = await formatMarkdownOutput(rawOutput);
    }
    self.postMessage({ id, output } satisfies WorkerResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    self.postMessage({ id, error: message } satisfies WorkerResponse);
  }
};
