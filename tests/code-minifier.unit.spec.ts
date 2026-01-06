import { expect, test } from "@playwright/test";
import { defaultFormatOptions, formatCode } from "../lib/formatters/code-minifier";

test("js minify preserves URLs, regex literals, and comment-like strings", async () => {
  const input = `
    const url = "https://example.com/a//b";
    const regex = /https?:\\/\\//g;
    const template = \`path: \${url}\`;
    const str1 = "// not a comment";
    const str2 = "/* not a comment */";
    function greet(name) { return "hi " + name; }
  `;
  const result = await formatCode({
    code: input,
    lang: "js",
    mode: "minify",
    options: defaultFormatOptions,
    safeMode: false,
  });
  expect(result.output).toContain("https://example.com/a//b");
  expect(result.output).toContain("not a comment");
  expect(result.output).toContain("/https?:\\/\\//");
  expect(result.output).toContain("path:");
});

test("html minify keeps script/style blocks and void elements", async () => {
  const input = `
    <!doctype html>
    <html>
      <head>
        <style>body { color: red; }</style>
      </head>
      <body>
        <img src="x" />
        <br/>
        <script>const marker = "/* */";</script>
      </body>
    </html>
  `;
  const result = await formatCode({
    code: input,
    lang: "html",
    mode: "minify",
    options: defaultFormatOptions,
    safeMode: false,
  });
  expect(result.output).toContain("<script>");
  expect(result.output).toContain("</script>");
  expect(result.output).toContain("<style>");
  expect(result.output).toContain("</style>");
  expect(result.output).toContain("<img");
  expect(result.output).toContain("<br");
});

test("css minify preserves data urls, calc, and media queries", async () => {
  const input = `
    .hero {
      background: url(data:image/svg+xml;base64,PHN2Zy8+);
      width: calc(100% - 10px);
    }
    @media (min-width: 600px) {
      .hero { width: calc(100% - 20px); }
    }
  `;
  const result = await formatCode({
    code: input,
    lang: "css",
    mode: "minify",
    options: defaultFormatOptions,
    safeMode: false,
  });
  expect(result.output).toContain("data:image");
  expect(result.output).toContain("calc(");
  expect(result.output).toContain("@media");
});

test("pretty uses requested indent style", async () => {
  const input = "function greet(name){return name}";
  const result = await formatCode({
    code: input,
    lang: "js",
    mode: "pretty",
    options: { ...defaultFormatOptions, indentStyle: "tabs" },
    safeMode: true,
  });
  expect(result.output).toContain("\t");
});

test("invalid code returns deterministic error message", async () => {
  await expect(
    formatCode({
      code: "const =",
      lang: "js",
      mode: "minify",
      options: defaultFormatOptions,
      safeMode: false,
    })
  ).rejects.toThrow("Couldn't minify this JS");
});
