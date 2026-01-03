"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  receipt: {
    html: `<html>
  <body style="margin:0;padding:0;background:#f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td class="header">Receipt</td></tr>
      <tr>
        <td class="content">
          <p>Thanks for your purchase, Ava.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="summary">
            <tr><td>Order</td><td>#4821</td></tr>
            <tr><td>Total</td><td>$86.00</td></tr>
          </table>
          <a class="cta" href="#">View order</a>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    css: `.header { background:#0f172a; color:#fff; padding:18px 22px; font-size:18px; font-weight:700; }
.content { padding:18px 22px; color:#0f172a; font-size:14px; line-height:1.6; }
.summary { margin:12px 0 16px; border-collapse:collapse; }
.summary td { padding:6px 0; border-bottom:1px solid #e2e8f0; }
.cta { display:inline-block; padding:10px 16px; background:#2563eb; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; }`,
  },
  otp: {
    html: `<html>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td class="header">Your verification code</td></tr>
      <tr><td class="content"><p>Use this code to continue:</p><div class="code">482 771</div></td></tr>
    </table>
  </body>
</html>`,
    css: `.header { background:#0f172a; color:#fff; padding:16px 22px; font-size:18px; font-weight:700; }
.content { padding:18px 22px; color:#0f172a; font-size:14px; line-height:1.6; text-align:center; }
.code { margin-top:12px; display:inline-block; background:#f8fafc; padding:12px 18px; border-radius:10px; font-weight:700; letter-spacing:4px; font-size:20px; }`,
  },
  passwordReset: {
    html: `<html>
  <body style="margin:0;padding:0;background:#f8fafc;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr><td class="header">Reset your password</td></tr>
      <tr>
        <td class="content">
          <p>We received a request to reset your password.</p>
          <a class="cta" href="#">Reset password</a>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    css: `.header { background:#0f172a; color:#fff; padding:18px 22px; font-size:18px; font-weight:700; }
.content { padding:18px 22px; color:#0f172a; font-size:14px; line-height:1.6; }
.cta { display:inline-block; padding:10px 16px; background:#ef4444; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; }`,
  },
  promo: {
    html: `<html>
  <body style="margin:0;padding:0;background:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden;">
      <tr><td class="header">Weekend promo</td></tr>
      <tr>
        <td class="content">
          <p>Save 25% on annual plans this weekend only.</p>
          <a class="cta" href="#">Claim offer</a>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    css: `.header { background:#0f172a; color:#fff; padding:20px 24px; font-size:20px; font-weight:700; text-align:center; }
.content { padding:20px 24px; color:#e2e8f0; font-size:15px; line-height:1.6; text-align:center; }
.cta { display:inline-block; padding:12px 18px; background:#f59e0b; color:#0f172a; text-decoration:none; border-radius:999px; font-weight:700; }`,
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
type InlineOptions = {
  keepStyle: boolean;
  cssInput: string;
  flattenMedia: boolean;
  outlookMode: boolean;
  attributeFallbacks: boolean;
};
type InlineResult = {
  html: string;
  totalSelectors: number;
  appliedSelectors: number;
  preservedMedia: string[];
  selectorWarnings: string[];
  outlookTransforms: number;
  vmlCount: number;
  attributeFallbackCount: number;
  coverageReport: SelectorCoverageEntry[];
};
type ComputedEntry = { value: string; important: boolean; specificity: number[]; order: number };
type EmailWarning = { message: string; suggestion?: string };
type SelectorCoverageEntry = {
  selector: string;
  matchedCount: number;
  nodeSummary: { label: string; count: number }[];
  errors: string[];
  overrides: { property: string; reason: "specificity" | "order"; count: number }[];
  skipped: boolean;
};
type LintIssue = { id: string; message: string; severity: "warning" | "info"; fixable?: boolean };
type SavedTemplate = { id: string; name: string; html: string; css: string };

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

function parseInlineStyle(styleText: string) {
  const map = new Map<string, { value: string; important: boolean }>();
  if (!styleText.trim()) return map;
  try {
    const ast = csstree.parse(styleText, { context: "declarationList" });
    ast.children.forEach((child: any) => {
      if (child.type !== "Declaration" || !child.property || !child.value) return;
      const property = child.property.trim().toLowerCase();
      const value = csstree.generate(child.value).trim();
      if (!property || !value) return;
      map.set(property, { value, important: Boolean(child.important) });
    });
  } catch {
    styleText
      .split(";")
      .map((decl) => decl.trim())
      .filter(Boolean)
      .forEach((decl) => {
        const [rawProp, ...rest] = decl.split(":");
        const property = rawProp?.trim().toLowerCase();
        if (!property) return;
        const value = rest.join(":").trim();
        if (!value) return;
        const important = /!important$/i.test(value);
        map.set(property, { value: value.replace(/!important$/i, "").trim(), important });
      });
  }
  return map;
}

function serializeStyleMap(map: Map<string, { value: string; important: boolean }>) {
  const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  return entries
    .map(([key, entry]) => `${key}: ${entry.value}${entry.important ? " !important" : ""}`)
    .join("; ");
}

function isSimpleSelector(selector: string) {
  if (/^[#][\w-]+$/.test(selector)) return true;
  if (/^[.][\w-]+$/.test(selector)) return true;
  if (/^[a-zA-Z][\w-]*$/.test(selector)) return true;
  return false;
}

function selectNodes(doc: Document, selector: string) {
  if (isSimpleSelector(selector)) {
    if (selector.startsWith("#")) {
      const node = doc.getElementById(selector.slice(1));
      return node ? [node] : [];
    }
    if (selector.startsWith(".")) {
      return Array.from(doc.getElementsByClassName(selector.slice(1)));
    }
    return Array.from(doc.getElementsByTagName(selector));
  }
  return Array.from(doc.querySelectorAll(selector));
}

function minifyMarkup(markup: string) {
  return markup.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}

function countVmlElements(doc: Document) {
  const all = Array.from(doc.getElementsByTagName("*"));
  return all.filter((el) => el.tagName.toLowerCase().startsWith("v:") || el.tagName.toLowerCase().startsWith("o:")).length;
}

function applyOutlookTransforms(doc: Document) {
  const flexContainers = Array.from(doc.querySelectorAll("[style]")).filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    const display = node.style.display;
    return display === "flex" || display === "inline-flex";
  });

  let transforms = 0;
  const flexStyleProps = new Set([
    "display",
    "gap",
    "row-gap",
    "column-gap",
    "justify-content",
    "align-items",
    "align-content",
    "flex-direction",
    "flex-wrap",
  ]);

  flexContainers.forEach((container) => {
    const element = container as HTMLElement;
    const children = Array.from(element.childNodes);
    if (!children.length) return;

    const table = doc.createElement("table");
    table.setAttribute("role", "presentation");
    table.setAttribute("cellspacing", "0");
    table.setAttribute("cellpadding", "0");
    table.setAttribute("border", "0");
    table.className = element.className;
    if (element.id) table.id = element.id;

    const cleanedStyle = (element.getAttribute("style") || "")
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .filter((entry) => {
        const [prop] = entry.split(":").map((part) => part.trim().toLowerCase());
        return prop && !flexStyleProps.has(prop);
      })
      .join("; ");

    if (cleanedStyle) {
      table.setAttribute("style", cleanedStyle);
    }

    const row = doc.createElement("tr");
    children.forEach((child) => {
      const cell = doc.createElement("td");
      cell.appendChild(child);
      row.appendChild(cell);
    });
    table.appendChild(row);
    element.replaceWith(table);
    transforms += 1;
  });

  return { transforms, vmlCount: countVmlElements(doc) };
}

function applyAttributeFallbacks(doc: Document) {
  const targets = {
    bgcolor: new Set(["TABLE", "TD", "TH", "BODY"]),
    align: new Set(["TABLE", "TD", "TH", "TR", "IMG", "DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6"]),
    valign: new Set(["TD", "TH", "TR"]),
    width: new Set(["TABLE", "TD", "TH", "IMG"]),
    height: new Set(["TABLE", "TD", "TH", "IMG"]),
  };

  let applied = 0;

  Array.from(doc.querySelectorAll("*")).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    const style = node.style;
    if (!style || !style.length) return;

    const setAttributeIfEmpty = (attr: string, value: string, allowed: Set<string>) => {
      if (!allowed.has(tag)) return;
      if (node.getAttribute(attr)) return;
      node.setAttribute(attr, value);
      applied += 1;
    };

    const bgcolor = style.getPropertyValue("background-color").trim();
    if (bgcolor) setAttributeIfEmpty("bgcolor", bgcolor, targets.bgcolor);

    const align = style.getPropertyValue("text-align").trim();
    if (align) setAttributeIfEmpty("align", align, targets.align);

    const valign = style.getPropertyValue("vertical-align").trim();
    if (valign) setAttributeIfEmpty("valign", valign, targets.valign);

    const width = style.getPropertyValue("width").trim();
    if (width) {
      const value = width.endsWith("px") ? width.replace("px", "") : width;
      setAttributeIfEmpty("width", value, targets.width);
    }

    const height = style.getPropertyValue("height").trim();
    if (height) {
      const value = height.endsWith("px") ? height.replace("px", "") : height;
      setAttributeIfEmpty("height", value, targets.height);
    }
  });

  return applied;
}

function buildEmailWarnings(
  rules: InlineRule[],
  options: {
    keepStyle: boolean;
    flattenMedia: boolean;
    cssInput: string;
    hasStyleBlocks: boolean;
    outlookMode: boolean;
    vmlCount: number;
    outlookTransforms: number;
    attributeFallbacks: boolean;
    preservedMedia: string[];
  },
): EmailWarning[] {
  const warnings: EmailWarning[] = [];
  const seen = new Set<string>();

  const add = (message: string, suggestion?: string) => {
    if (seen.has(message)) return;
    warnings.push({ message, suggestion });
    seen.add(message);
  };

  if (options.keepStyle && (options.hasStyleBlocks || options.cssInput.trim())) {
    add("Gmail can strip <style> blocks in some contexts.", "Inline critical styles or keep a simplified head block.");
  }

  if (!options.flattenMedia && options.preservedMedia.length > 0) {
    add("Some email clients ignore media queries.", "Flatten mobile-first rules or keep layouts responsive with tables.");
  }

  if (options.outlookMode && options.outlookTransforms > 0) {
    add("Flex layouts were converted to tables for Outlook.", "Review the output table structure in the diff.");
  }

  if (options.vmlCount > 0) {
    add("VML blocks detected (Outlook background shapes).", "Keep conditional comments around VML for Outlook rendering.");
  }

  if (options.attributeFallbacks) {
    add("Legacy attributes were generated for better compatibility.", "Verify attributes such as bgcolor/align in the output.");
  }

  rules.forEach((rule) => {
    if (/[>+~]/.test(rule.selector) || /\[[^\]]+\]/.test(rule.selector)) {
      add("Advanced selectors may be ignored by some email clients.", "Stick to tag, class, and ID selectors.");
    }
    if (/:(hover|active|focus|visited|nth-child|nth-of-type|first-child|last-child|not|is|has)\b/i.test(rule.selector)) {
      add("Pseudo-classes are poorly supported in email clients.", "Avoid hover/focus states or duplicate inline styles.");
    }

    rule.declarations.forEach((decl) => {
      if (decl.property === "display" && /(flex|grid)/i.test(decl.value)) {
        add("Flexbox/grid is not supported in Outlook desktop.", "Use table-based layouts for columns.");
      }
      if (decl.property === "position" && !/static/i.test(decl.value)) {
        add("CSS positioning is inconsistent in email clients.", "Use tables and padding for layout.");
      }
      if (decl.property.startsWith("margin")) {
        add("Outlook doesn’t support margin on some elements.", "Use padding on table cells instead.");
      }
      if (decl.property === "background-image" || /url\(/i.test(decl.value)) {
        add("Background images have inconsistent email support.", "Provide a solid background-color fallback.");
      }
    });
  });

  return warnings;
}

function lintEmailTemplate(html: string, rules: InlineRule[]) {
  const issues: LintIssue[] = [];
  const seenIds = new Set<string>();
  const addIssue = (issue: LintIssue) => {
    if (seenIds.has(issue.id)) return;
    issues.push(issue);
    seenIds.add(issue.id);
  };

  const selectorCounts = new Map<string, number>();
  const duplicateDecls = new Set<string>();
  const riskyProps = new Set(["position", "float", "background-image", "min-width", "max-width"]);

  rules.forEach((rule) => {
    selectorCounts.set(rule.selector, (selectorCounts.get(rule.selector) || 0) + 1);
    const seenProps = new Map<string, number>();
    rule.declarations.forEach((decl) => {
      const propKey = `${rule.selector}|${decl.property}`;
      if (seenProps.has(decl.property)) {
        duplicateDecls.add(propKey);
      }
      seenProps.set(decl.property, (seenProps.get(decl.property) || 0) + 1);
      if (riskyProps.has(decl.property) || (decl.property === "display" && /(flex|grid)/i.test(decl.value))) {
        addIssue({
          id: `risky-${propKey}`,
          message: `Risky property "${decl.property}" used in "${rule.selector}".`,
          severity: "warning",
        });
      }
    });
  });

  selectorCounts.forEach((count, selector) => {
    if (count > 1) {
      addIssue({
        id: `dup-selector-${selector}`,
        message: `Duplicate selector "${selector}" appears ${count} times.`,
        severity: "info",
      });
    }
  });

  duplicateDecls.forEach((key) => {
    const [selector, property] = key.split("|");
    addIssue({
      id: `dup-decl-${key}`,
      message: `Duplicate "${property}" declarations found for "${selector}".`,
      severity: "info",
      fixable: true,
    });
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((img, index) => {
    const alt = img.getAttribute("alt");
    if (alt === null || alt.trim() === "") {
      addIssue({
        id: `img-alt-${index}`,
        message: "Image missing alt text.",
        severity: "warning",
        fixable: true,
      });
    }
  });
  doc.querySelectorAll("table").forEach((table, index) => {
    const role = table.getAttribute("role");
    if (!role) {
      addIssue({
        id: `table-role-${index}`,
        message: "Table missing role=\"presentation\".",
        severity: "warning",
        fixable: true,
      });
    }
  });

  return issues;
}

function autoFixCommonIssues(html: string, css: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  let htmlFixes = 0;
  let cssFixes = 0;

  doc.querySelectorAll("img").forEach((img) => {
    const alt = img.getAttribute("alt");
    if (alt === null || alt.trim() === "") {
      img.setAttribute("alt", "");
      htmlFixes += 1;
    }
  });

  doc.querySelectorAll("table").forEach((table) => {
    if (!table.getAttribute("role")) {
      table.setAttribute("role", "presentation");
      htmlFixes += 1;
    }
  });

  let nextCss = css;
  if (css.trim()) {
    try {
      const ast = csstree.parse(css, { context: "stylesheet" });
      ast.children.forEach((child: any) => {
        if (child.type !== "Rule" || !child.block) return;
        const decls: any[] = [];
        child.block.children.forEach((item: any) => decls.push(item));
        const lastIndex = new Map<string, number>();
        decls.forEach((decl, index) => {
          if (decl.type === "Declaration") {
            lastIndex.set(decl.property, index);
          }
        });
        const filtered = decls.filter((decl, index) => {
          if (decl.type !== "Declaration") return true;
          return lastIndex.get(decl.property) === index;
        });
        if (filtered.length !== decls.length) {
          cssFixes += decls.length - filtered.length;
          const list = new csstree.List();
          filtered.forEach((decl) => list.append(decl));
          child.block.children = list;
        }
      });
      nextCss = csstree.generate(ast);
    } catch {
      nextCss = css;
    }
  }

  const htmlOut = doc.documentElement?.outerHTML || html;
  return { html: htmlOut, css: nextCss, htmlFixes, cssFixes };
}

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

function inlineDocumentWithRules(doc: Document, rules: InlineRule[], options: InlineOptions): InlineResult {
  const elementDeclarations = new WeakMap<Element, Map<string, ComputedEntry>>();
  const touchedElements = new Set<Element>();
  const preservedMedia = new Set<string>();
  const selectorWarnings: string[] = [];
  const coverageMap = new Map<string, SelectorCoverageEntry>();
  const nodeSummaryMap = new Map<string, Map<string, number>>();
  let vmlCount = countVmlElements(doc);
  let totalSelectors = 0;
  let appliedSelectors = 0;

  const ensureCoverageEntry = (selector: string) => {
    if (!coverageMap.has(selector)) {
      coverageMap.set(selector, {
        selector,
        matchedCount: 0,
        nodeSummary: [],
        errors: [],
        overrides: [],
        skipped: false,
      });
    }
    return coverageMap.get(selector)!;
  };

  const addNodeSummary = (selector: string, element: Element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const className = element.getAttribute("class");
    const classLabel = className ? `.${className.trim().split(/\s+/).join(".")}` : "";
    const label = `${tag}${id}${classLabel}`;
    if (!nodeSummaryMap.has(selector)) {
      nodeSummaryMap.set(selector, new Map());
    }
    const summary = nodeSummaryMap.get(selector)!;
    summary.set(label, (summary.get(label) || 0) + 1);
  };

  const addOverride = (entry: SelectorCoverageEntry, property: string, reason: "specificity" | "order") => {
    const existing = entry.overrides.find((item) => item.property === property && item.reason === reason);
    if (existing) {
      existing.count += 1;
    } else {
      entry.overrides.push({ property, reason, count: 1 });
    }
  };

  const shouldOverride = (existing: ComputedEntry | undefined, candidate: ComputedEntry) => {
    if (!existing) return { apply: true, reason: null as null | "specificity" | "order" | "important" };
    if (candidate.important !== existing.important) {
      if (candidate.important) return { apply: true, reason: null };
      return { apply: false, reason: "important" };
    }
    const result = compareSpecificity(candidate.specificity, existing.specificity);
    if (result !== 0) return { apply: result > 0, reason: result > 0 ? null : "specificity" };
    if (candidate.order >= existing.order) return { apply: true, reason: null };
    return { apply: false, reason: "order" };
  };

  const getElementMap = (element: Element) => {
    let map = elementDeclarations.get(element);
    if (!map) {
      const styleText = (element as HTMLElement).getAttribute("style") || "";
      map = new Map();
      const parsed = parseInlineStyle(styleText);
      parsed.forEach((entry, property) => {
        map!.set(property, {
          value: entry.value,
          important: entry.important,
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
    coverageEntry: SelectorCoverageEntry,
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
      const decision = shouldOverride(existing, candidate);
      if (decision.apply) {
        map.set(decl.property, candidate);
      } else if (decision.reason === "specificity" || decision.reason === "order") {
        addOverride(coverageEntry, decl.property, decision.reason);
      }
    });
  };

  rules.forEach((rule) => {
    const coverageEntry = ensureCoverageEntry(rule.selector);
    if (rule.media && !shouldFlattenMediaQueries(rule.media, options.flattenMedia)) {
      if (rule.media) preservedMedia.add(rule.media);
      coverageEntry.skipped = true;
      return;
    }
    totalSelectors += 1;
    let nodes: Element[] = [];
    try {
      nodes = selectNodes(doc, rule.selector);
    } catch (_error) {
      selectorWarnings.push(`Selector "${rule.selector}" from ${rule.sourceLabel} is not supported.`);
      coverageEntry.errors.push("Selector could not be parsed by the browser.");
      return;
    }
    if (!nodes.length) return;
    appliedSelectors += 1;
    nodes.forEach((node) => {
      coverageEntry.matchedCount += 1;
      addNodeSummary(rule.selector, node);
      applyDeclarations(node, rule.declarations, rule.specificity, rule.order, coverageEntry);
    });
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
    const serialized = serializeStyleMap(map);
    if (serialized) {
      (element as HTMLElement).setAttribute("style", serialized);
    } else {
      element.removeAttribute("style");
    }
  });

  let outlookTransforms = 0;
  if (options.outlookMode) {
    const outlook = applyOutlookTransforms(doc);
    outlookTransforms = outlook.transforms;
    vmlCount = outlook.vmlCount;
  }

  const attributeFallbackCount = options.attributeFallbacks ? applyAttributeFallbacks(doc) : 0;

  const rootElement = doc.documentElement ?? doc.body;
  const finalHtml = rootElement?.outerHTML ?? "";
  const mediaList = Array.from(preservedMedia).filter(Boolean);
  const coverageReport = Array.from(coverageMap.values()).map((entry) => {
    const summary = nodeSummaryMap.get(entry.selector);
    const nodeSummary = summary
      ? Array.from(summary.entries())
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
      : [];
    return { ...entry, nodeSummary };
  });
  return {
    html: finalHtml,
    totalSelectors,
    appliedSelectors,
    preservedMedia: mediaList,
    selectorWarnings,
    outlookTransforms,
    vmlCount,
    attributeFallbackCount,
    coverageReport,
  };
}

export default function EmailCssInlinerClient() {
  const [html, setHtml] = useState(defaultHtml);
  const [css, setCss] = useState(defaultCss);
  const [output, setOutput] = useState("");
  const [beautifyOutput, setBeautifyOutput] = useState(false);
  const [minifyOutput, setMinifyOutput] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [keepStyle, setKeepStyle] = useState(true);
  const [flattenMedia, setFlattenMedia] = useState(false);
  const [attributeFallbacks, setAttributeFallbacks] = useState(false);
  const [outlookMode, setOutlookMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [emailWarnings, setEmailWarnings] = useState<EmailWarning[]>([]);
  const [coverage, setCoverage] = useState({ applied: 0, total: 0 });
  const [coverageReport, setCoverageReport] = useState<SelectorCoverageEntry[]>([]);
  const [sizeWarning, setSizeWarning] = useState("");
  const [preservedMedia, setPreservedMedia] = useState<string[]>([]);
  const [diffSegments, setDiffSegments] = useState<Change[]>([]);
  const [outlookStats, setOutlookStats] = useState({ transforms: 0, vmlCount: 0, attributeFallbacks: 0 });
  const [lintIssues, setLintIssues] = useState<LintIssue[]>([]);
  const [fixNotice, setFixNotice] = useState("");
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");

  const status = useMemo(() => {
    if (error) return error;
    if (output) return "Inlined successfully";
    return "Awaiting input";
  }, [error, output]);

  const coverageSummary = useMemo(() => {
    const unmatched = coverageReport.filter((entry) => entry.matchedCount === 0 && entry.errors.length === 0 && !entry.skipped);
    const errored = coverageReport.filter((entry) => entry.errors.length > 0);
    const matched = coverageReport.filter((entry) => entry.matchedCount > 0);
    return { unmatched, errored, matched };
  }, [coverageReport]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("email-css-inliner-templates");
      if (stored) {
        const parsed = JSON.parse(stored) as SavedTemplate[];
        if (Array.isArray(parsed)) {
          setSavedTemplates(parsed);
        }
      }
    } catch {
      setSavedTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("email-css-inliner-templates", JSON.stringify(savedTemplates));
    } catch {
      // ignore localStorage write errors
    }
  }, [savedTemplates]);

  const resetResultState = () => {
    setOutput("");
    setDiffSegments([]);
    setCoverage({ applied: 0, total: 0 });
    setCoverageReport([]);
    setPreservedMedia([]);
    setSkipped([]);
    setEmailWarnings([]);
    setOutlookStats({ transforms: 0, vmlCount: 0, attributeFallbacks: 0 });
    setLintIssues([]);
    setFixNotice("");
    setSizeWarning("");
  };

  const handleSaveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    const entry: SavedTemplate = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      html,
      css,
    };
    setSavedTemplates((prev) => [entry, ...prev].slice(0, 20));
    setTemplateName("");
  };

  const handleLoadTemplate = (template: SavedTemplate) => {
    setHtml(template.html);
    setCss(template.css);
    resetResultState();
    setError("");
    setCopied(false);
  };

  const handleDeleteTemplate = (id: string) => {
    setSavedTemplates((prev) => prev.filter((item) => item.id !== id));
  };

  const handleInline = () => {
    setError("");
    setCopied(false);
    try {
      if (!html.trim()) throw new Error("Enter HTML to inline.");
      if (html.length > MAX_HTML_LENGTH) throw new Error("HTML is too large. Please reduce size.");
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const hasStyleBlocks = doc.querySelectorAll("style").length > 0;
      const styleSources = buildStyleSources(doc, css);
      const parseWarnings: string[] = [];
      const rules = buildInlineRules(styleSources, parseWarnings);
      const result = inlineDocumentWithRules(doc, rules, {
        keepStyle,
        cssInput: css,
        flattenMedia,
        outlookMode,
        attributeFallbacks,
      });
      const formatted = beautifyOutput ? prettyFormat(result.html) : result.html;
      const finalMarkup = minifyOutput ? minifyMarkup(formatted) : formatted;
      const diff = finalMarkup ? diffLines(html, finalMarkup) : [];
      const warnings = buildEmailWarnings(rules, {
        keepStyle,
        flattenMedia,
        cssInput: css,
        hasStyleBlocks,
        outlookMode,
        vmlCount: result.vmlCount,
        outlookTransforms: result.outlookTransforms,
        attributeFallbacks,
        preservedMedia: result.preservedMedia,
      });
      setOutput(finalMarkup);
      setDiffSegments(diff);
      setCoverage({ applied: result.appliedSelectors, total: result.totalSelectors });
      setCoverageReport(result.coverageReport);
      setPreservedMedia(result.preservedMedia);
      const combinedSkips = [...parseWarnings, ...result.selectorWarnings].filter(Boolean);
      setSkipped(combinedSkips);
      setEmailWarnings(warnings);
      setOutlookStats({
        transforms: result.outlookTransforms,
        vmlCount: result.vmlCount,
        attributeFallbacks: result.attributeFallbackCount,
      });
      const kb = finalMarkup.length / 1024;
      setSizeWarning(kb > 200 ? `Output is large (~${kb.toFixed(0)} KB). Preview/copy may feel slower.` : "");
    } catch (err: any) {
      setError(err?.message || "Unable to inline CSS. Check HTML/CSS and try again.");
      resetResultState();
    }
  };

  const handleLint = () => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const styleSources = buildStyleSources(doc, css);
      const lintWarnings: string[] = [];
      const rules = buildInlineRules(styleSources, lintWarnings);
      const issues = lintEmailTemplate(html, rules);
      setLintIssues(issues);
      setFixNotice(lintWarnings.length ? lintWarnings.join(" ") : "");
    } catch (err: any) {
      setLintIssues([{ id: "lint-error", message: err?.message || "Unable to lint email HTML/CSS.", severity: "warning" }]);
    }
  };

  const handleAutoFix = () => {
    const result = autoFixCommonIssues(html, css);
    setHtml(result.html);
    setCss(result.css);
    setFixNotice(
      result.htmlFixes || result.cssFixes
        ? `Applied ${result.htmlFixes} HTML fixes and ${result.cssFixes} CSS fixes.`
        : "No common issues found to fix.",
    );
    setLintIssues([]);
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

  const buildBodyFromOutput = () => {
    if (!output) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(output, "text/html");
    const body = doc.body?.innerHTML?.trim();
    return body || output;
  };

  const handleDownloadEml = () => {
    if (!output) return;
    const body = buildBodyFromOutput();
    const eml = [
      "Subject: Email preview",
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      body,
    ].join("\n");
    const blob = new Blob([eml], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inlined.eml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyGmail = async () => {
    if (!output) return;
    const body = buildBodyFromOutput();
    const gmailMarkup = `<div dir="ltr">${body}</div>`;
    try {
      await navigator.clipboard.writeText(gmailMarkup);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleCopyMailchimp = async () => {
    if (!output) return;
    const hasHtmlTag = /<html/i.test(output);
    const body = buildBodyFromOutput();
    const mailchimpMarkup = hasHtmlTag
      ? output
      : `<!doctype html><html><head><meta charset="UTF-8" /></head><body>${body}</body></html>`;
    try {
      await navigator.clipboard.writeText(mailchimpMarkup);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleReset = () => {
    setHtml(defaultHtml);
    setCss(defaultCss);
    setBeautifyOutput(false);
    setMinifyOutput(false);
    setFlattenMedia(false);
    setAttributeFallbacks(false);
    setOutlookMode(false);
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                checked={attributeFallbacks}
                onChange={(e) => setAttributeFallbacks(e.target.checked)}
                aria-label="Generate legacy HTML attributes"
              />
              Legacy attributes
            </label>
            <button
              onClick={() => setOutlookMode((prev) => !prev)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)] ring-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
                outlookMode
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-200 hover:-translate-y-0.5"
              }`}
              aria-pressed={outlookMode}
              aria-label="Toggle Outlook-safe output"
            >
              Outlook-safe output
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Samples:</span>
              {[
                { key: "default", label: "Simple" },
                { key: "marketing", label: "Marketing" },
                { key: "newsletter", label: "Newsletter" },
                { key: "receipt", label: "Receipt" },
                { key: "otp", label: "OTP" },
                { key: "passwordReset", label: "Password reset" },
                { key: "promo", label: "Promo" },
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
                    setMinifyOutput(false);
                    setFlattenMedia(false);
                    setAttributeFallbacks(false);
                    setOutlookMode(false);
                  }}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  aria-label={`Load ${sample.label} sample`}
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Save:</span>
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-inner focus:border-slate-400 focus:outline-none"
                placeholder="Template name"
                aria-label="Template name"
              />
              <button
                onClick={handleSaveTemplate}
                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                aria-label="Save template"
              >
                Save template
              </button>
            </div>
            {savedTemplates.length ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="text-xs font-semibold text-slate-500">Saved:</span>
                {savedTemplates.map((template) => (
                  <div key={template.id} className="flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    <button
                      onClick={() => handleLoadTemplate(template)}
                      className="text-xs font-medium text-slate-700"
                      aria-label={`Load ${template.name}`}
                    >
                      {template.name}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                      aria-label={`Delete ${template.name}`}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
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
                checked={minifyOutput}
                onChange={(e) => setMinifyOutput(e.target.checked)}
                aria-label="Minify output"
              />
              Minify output
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
            <button
              onClick={resetResultState}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[var(--shadow-soft)] ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              aria-label="Reset output only"
            >
              Reset output
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
          {emailWarnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
              <p className="text-xs font-semibold text-amber-900">Email client warnings</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {emailWarnings.map((warning, index) => (
                  <li key={`${warning.message}-${index}`}>
                    <span className="font-semibold">{warning.message}</span>
                    {warning.suggestion ? <span className="text-amber-800"> {warning.suggestion}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {outlookMode && (outlookStats.transforms > 0 || outlookStats.vmlCount > 0 || outlookStats.attributeFallbacks > 0) ? (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-xs text-slate-600">
              <p className="text-xs font-semibold text-slate-700">Outlook-safe summary</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <span>Table rewrites: {outlookStats.transforms}</span>
                <span>VML blocks: {outlookStats.vmlCount}</span>
                <span>Legacy attrs: {outlookStats.attributeFallbacks}</span>
              </div>
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800">Email CSS lint</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleLint}
                  className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  aria-label="Run email lint"
                >
                  Run lint
                </button>
                <button
                  onClick={handleAutoFix}
                  className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                  aria-label="Fix common issues"
                >
                  Fix common issues
                </button>
              </div>
            </div>
            {fixNotice ? <p className="mt-2 text-[11px] text-slate-500">{fixNotice}</p> : null}
            {lintIssues.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-600">
                {lintIssues.map((issue) => (
                  <li key={issue.id} className={issue.severity === "warning" ? "text-amber-700" : "text-slate-600"}>
                    {issue.message}
                    {issue.fixable ? <span className="text-slate-400"> (fixable)</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">Run lint to see email-client recommendations.</p>
            )}
          </div>
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
                onClick={handleCopyGmail}
                className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy for Gmail"
              >
                Copy Gmail
              </button>
              <button
                onClick={handleCopyMailchimp}
                className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Copy for Mailchimp"
              >
                Copy Mailchimp
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download inlined HTML"
              >
                <Download className="h-4 w-4" /> Download
              </button>
              <button
                onClick={handleDownloadEml}
                className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/20 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
                disabled={!output}
                aria-label="Download EML"
              >
                Download .eml
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
          <div className="border-t border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">Coverage report</p>
            {coverageReport.length ? (
              <div className="mt-2 space-y-3 text-[11px] text-slate-200">
                <div className="flex flex-wrap gap-3 text-slate-300">
                  <span>Matched: {coverageSummary.matched.length}</span>
                  <span>Unmatched: {coverageSummary.unmatched.length}</span>
                  <span>Errored: {coverageSummary.errored.length}</span>
                </div>
                {coverageSummary.errored.length ? (
                  <div>
                    <p className="text-xs font-semibold text-amber-200">Errored selectors</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {coverageSummary.errored.map((entry) => (
                        <li key={`err-${entry.selector}`}>
                          {entry.selector} ({entry.errors.join("; ")})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {coverageSummary.unmatched.length ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Unmatched selectors</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {coverageSummary.unmatched.map((entry) => (
                        <li key={`unmatched-${entry.selector}`}>{entry.selector}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {coverageSummary.matched.length ? (
                  <div>
                    <p className="text-xs font-semibold text-emerald-200">Matched selectors</p>
                    <div className="mt-2 space-y-2">
                      {coverageSummary.matched.map((entry) => (
                        <div key={`matched-${entry.selector}`} className="rounded-lg bg-white/5 p-2">
                          <div className="flex flex-wrap items-center gap-2 text-slate-100">
                            <span className="font-semibold">{entry.selector}</span>
                            <span className="text-[10px] text-slate-300">matches: {entry.matchedCount}</span>
                          </div>
                          {entry.nodeSummary.length ? (
                            <div className="mt-1 text-[10px] text-slate-300">
                              Nodes: {entry.nodeSummary.slice(0, 3).map((node) => `${node.label} (${node.count})`).join(", ")}
                            </div>
                          ) : null}
                          {entry.overrides.length ? (
                            <div className="mt-1 text-[10px] text-amber-200">
                              Overrides:{" "}
                              {entry.overrides
                                .map((override) => `${override.property} (${override.reason} x${override.count})`)
                                .join(", ")}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Run inlining to generate a selector coverage report.</p>
            )}
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
            Paste your HTML and CSS. Toggle “Keep style tag” to preserve the head, “Flatten max-width media” for mobile-first inlining,
            and “Legacy attributes” for fallback HTML attributes.
          </li>
          <li>
            Click Inline CSS, review the diff, coverage report, and client warnings, then copy or download the result once the preview looks right.
          </li>
          <li>Enable “Outlook-safe output” if you need table rewrites for flex layouts or to keep VML blocks intact.</li>
          <li>Run “Email CSS lint” to catch risky properties, missing alts, and table roles; use Fix common issues for quick cleanup.</li>
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
