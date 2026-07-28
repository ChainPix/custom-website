import { describe, expect, it } from "vitest";
import * as markedModule from "marked";
import {
  markdownToHtml,
  slugifyHeading,
  stripInlineStyles,
  type MarkdownOptions,
} from "@/app/(tools)/markdown-html/convert";

const opts = (over: Partial<MarkdownOptions> = {}): MarkdownOptions => ({
  gfmTables: true,
  lineBreaks: false,
  headingIds: false,
  openLinksInNewTab: false,
  highlightCode: false,
  ...over,
});

describe("markdownToHtml", () => {
  it("renders basic markdown", () => {
    const html = markdownToHtml("# Title\n\nSome **bold** text.", opts(), markedModule);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("adds GitHub-style heading ids when headingIds is on", () => {
    // Regression: the old code passed marked's removed `headerIds` option,
    // so the Heading IDs toggle silently did nothing on marked v5+.
    const html = markdownToHtml("## Hello World!", opts({ headingIds: true }), markedModule);
    expect(html).toContain('<h2 id="hello-world">');

    const off = markdownToHtml("## Hello World!", opts(), markedModule);
    expect(off).not.toContain("id=");
  });

  it("dedupes repeated heading ids within one document", () => {
    const html = markdownToHtml("## Same\n\n## Same", opts({ headingIds: true }), markedModule);
    expect(html).toContain('id="same"');
    expect(html).toContain('id="same-1"');
  });

  it("opens links in a new tab and keeps inline formatting inside links", () => {
    const html = markdownToHtml("[**docs**](https://example.com)", opts({ openLinksInNewTab: true }), markedModule);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("<strong>docs</strong>");
  });

  it("highlights fenced code blocks when enabled", () => {
    const html = markdownToHtml('```js\nconst a = 1;\n```', opts({ highlightCode: true }), markedModule);
    expect(html).toContain('class="language-js"');
    expect(html).toContain("hljs-");
  });

  it("renders GFM tables", () => {
    const html = markdownToHtml("| a | b |\n| - | - |\n| 1 | 2 |", opts(), markedModule);
    expect(html).toContain("<table>");
  });
});

describe("slugifyHeading", () => {
  it("lowercases, strips punctuation and hyphenates", () => {
    const seen = new Map<string, number>();
    expect(slugifyHeading("Hello, World!", seen)).toBe("hello-world");
  });

  it("falls back to 'heading' for empty text and counts duplicates", () => {
    const seen = new Map<string, number>();
    expect(slugifyHeading("!!!", seen)).toBe("heading");
    expect(slugifyHeading("!!!", seen)).toBe("heading-1");
  });
});

describe("stripInlineStyles", () => {
  it("removes double- and single-quoted style attributes", () => {
    expect(stripInlineStyles('<p style="color:red">x</p>')).toBe("<p>x</p>");
    expect(stripInlineStyles("<p style='color:red'>x</p>")).toBe("<p>x</p>");
  });

  it("leaves other attributes intact", () => {
    expect(stripInlineStyles('<a href="x" style="a:b" title="t">y</a>')).toBe('<a href="x" title="t">y</a>');
  });
});
