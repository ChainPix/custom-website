/// <reference lib="webworker" />

import * as markedModule from "marked";
import TurndownService from "turndown";
import { gfm as turndownGfm } from "turndown-plugin-gfm";
import { defaultFormatOptions, formatCode } from "../../../lib/formatters/code-minifier";
import {
  htmlToMarkdown,
  markdownToHtml,
  type HtmlOptions,
  type MarkdownOptions,
  type Mode,
} from "./convert";

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

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, input, mode, formatHtml, formatMarkdown, minifyOutput, markdownOptions, htmlOptions } = event.data;
  try {
    const rawOutput =
      mode === "md-to-html"
        ? markdownToHtml(input, markdownOptions, markedModule)
        : htmlToMarkdown(input, htmlOptions, TurndownService, turndownGfm);
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
