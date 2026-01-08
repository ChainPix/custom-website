/// <reference lib="webworker" />

import { marked } from "marked";
import TurndownService from "turndown";
import { defaultFormatOptions, formatCode } from "../../../lib/formatters/code-minifier";

type Mode = "md-to-html" | "html-to-md";

type WorkerRequest = {
  id: number;
  input: string;
  mode: Mode;
  formatHtml: boolean;
  formatMarkdown: boolean;
  minifyOutput: boolean;
};

type WorkerResponse = {
  id: number;
  output?: string;
  error?: string;
};

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

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
  const { id, input, mode, formatHtml, formatMarkdown, minifyOutput } = event.data;
  try {
    const rawOutput = mode === "md-to-html" ? (marked.parse(input) as string) : turndown.turndown(input);
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
