import { expect, test } from "@playwright/test";
import { JSDOM } from "jsdom";
import { formatXml } from "../app/(tools)/xml-formatter/formatter-utils";

const dom = new JSDOM("<root />", { contentType: "text/xml" });
const globals = globalThis as any;
globals.DOMParser = dom.window.DOMParser;
globals.XMLSerializer = dom.window.XMLSerializer;
globals.Node = dom.window.Node;
globals.DocumentType = dom.window.DocumentType;

const baseOptions = {
  indentSize: 2,
  indentStyle: "spaces" as const,
  inlineMixedContent: true,
  formatMode: "prettify" as const,
  sortAttributes: false,
  removeEmptyTextNodes: true,
  whitespaceMode: "preserve" as const,
  keepSingleLineLimit: 120,
};

test("formatXml output is stable on reformat", () => {
  const input = `<?xml version="1.0"?>
<!DOCTYPE note>
<note>
  <!-- comment -->
  <to><![CDATA[Hi]]></to>
  <p>Hello <b>world</b>!</p>
</note>`;
  const first = formatXml({ input, ...baseOptions }).output;
  const second = formatXml({ input: first, ...baseOptions }).output;
  expect(second).toBe(first);
});

test("formatXml keeps mixed content inline when enabled", () => {
  const input = `<p>Hello <b>world</b>!</p>`;
  const output = formatXml({ input, ...baseOptions }).output;
  expect(output).toContain("<p>Hello <b>world</b>!</p>");
});

test("formatXml preserves comments and CDATA", () => {
  const input = `<root><!-- note --><![CDATA[<tag>]]></root>`;
  const output = formatXml({ input, ...baseOptions }).output;
  expect(output).toContain("<!-- note -->");
  expect(output).toContain("<![CDATA[<tag>]]>");
});

test("formatXml throws a clean error for invalid XML", () => {
  const input = `<root><unclosed></root>`;
  expect(() => formatXml({ input, ...baseOptions })).toThrow(/.+/);
});
