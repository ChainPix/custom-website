export const MAX_PREVIEW_LENGTH = 20000;

export const SAMPLE_MARKDOWN = {
  basic: "# Welcome\n\n- Item 1\n- Item 2\n\n**Bold** and _italic_.",
  code: "## Code Sample\n\n```js\nfunction greet(name) {\n  return `Hello ${name}`;\n}\n```\n\n`inline code` too.",
  table: "# Table Example\n\n| Name | Role |\n| --- | --- |\n| Alice | Engineer |\n| Bob | Designer |\n\n> Blockquote",
} as const;

export const BLOCKED_URI_SCHEMES = /^(?:\s*)(?:javascript|data|vbscript):/i;

export const ALLOWED_TAGS = [
  "a",
  "p",
  "br",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "del",
  "span",
  "sup",
  "section",
  "input",
  "img",
];

export const ALLOWED_ATTR = [
  "href",
  "title",
  "target",
  "rel",
  "src",
  "alt",
  "colspan",
  "rowspan",
  "class",
  "id",
  "aria-label",
  "aria-hidden",
  "type",
  "checked",
  "disabled",
];

export type DomPurifyLike = {
  addHook: (hook: string, handler: (node: unknown, data: { attrName: string; attrValue: string; keepAttr: boolean }) => void) => void;
  sanitize: (raw: string, config: { ALLOWED_TAGS?: string[]; ALLOWED_ATTR?: string[]; ALLOW_DATA_ATTR?: boolean }) => string;
};

const hookAttached = new WeakSet<object>();

export const sanitizeHtml = (raw: string, domPurify: DomPurifyLike, strictAllowlist: boolean) => {
  if (!hookAttached.has(domPurify as object)) {
    domPurify.addHook("uponSanitizeAttribute", (_node, data) => {
      if (data.attrName === "href" || data.attrName === "src" || data.attrName === "xlink:href") {
        const value = (data.attrValue || "").trim();
        if (BLOCKED_URI_SCHEMES.test(value)) {
          data.keepAttr = false;
        }
      }
    });
    hookAttached.add(domPurify as object);
  }
  const config = strictAllowlist
    ? {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
      }
    : {
        ALLOW_DATA_ATTR: false,
      };
  return domPurify.sanitize(raw, config);
};

export const getWarningMessage = (input: string, maxLen: number, isEditing: boolean) => {
  const trimmed = input.trim();
  if (!trimmed) {
    return isEditing ? "" : "Enter Markdown to preview and copy.";
  }
  if (input.length > maxLen) {
    return "Large input; preview truncated for performance.";
  }
  return "";
};

export const truncateInput = (input: string, maxLen: number) => input.slice(0, maxLen);
