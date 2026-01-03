/// <reference lib="webworker" />

type XmlParseLocation = {
  line: number;
  column: number;
};

type FormatPayload = {
  input: string;
  indentSize: number;
  indentStyle: "spaces" | "tabs";
  inlineMixedContent: boolean;
  formatMode: "prettify" | "minify";
  sortAttributes: boolean;
  removeEmptyTextNodes: boolean;
  whitespaceMode: "preserve" | "trim";
  keepSingleLineLimit: number;
};

type FormatRequest = {
  type: "format";
  requestId: number;
  payload: FormatPayload;
};

type FormatResult = {
  type: "result";
  requestId: number;
  output: string;
  error?: string;
  location?: XmlParseLocation | null;
  durationMs?: number;
  summary?: ValidationSummary;
};

type ValidationSummary = {
  wellFormed: boolean;
  rootName: string;
  namespaces: Array<{ prefix: string; uri: string }>;
  elementCount: number;
  attributeCount: number;
};

const extractErrorLocation = (message: string): XmlParseLocation | null => {
  const patterns = [
    /line\s+number\s+(\d+)\s*,\s*column\s+(\d+)/i,
    /line\s+(\d+)\s+column\s+(\d+)/i,
    /lineNumber\s*:\s*(\d+)\s*columnNumber\s*:\s*(\d+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const line = Number(match[1]);
      const column = Number(match[2]);
      if (Number.isFinite(line) && Number.isFinite(column)) return { line, column };
    }
  }
  return null;
};

const parseXml = (xml: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const message = parserError.textContent || "Invalid XML.";
    const location = extractErrorLocation(message);
    throw Object.assign(new Error(message), { location });
  }
  return doc;
};

const buildSummary = (doc: Document): ValidationSummary => {
  const rootName = doc.documentElement?.tagName ?? "";
  const elements = Array.from(doc.getElementsByTagName("*"));
  const namespaces = new Map<string, { prefix: string; uri: string }>();
  let attributeCount = 0;
  elements.forEach((element) => {
    if (element.namespaceURI) {
      const prefix = element.prefix ?? "";
      const key = `${prefix}|${element.namespaceURI}`;
      if (!namespaces.has(key)) {
        namespaces.set(key, { prefix, uri: element.namespaceURI });
      }
    }
    Array.from(element.attributes).forEach((attr) => {
      if (attr.namespaceURI === "http://www.w3.org/2000/xmlns/") return;
      attributeCount += 1;
      if (attr.namespaceURI) {
        const prefix = attr.prefix ?? "";
        const key = `${prefix}|${attr.namespaceURI}`;
        if (!namespaces.has(key)) {
          namespaces.set(key, { prefix, uri: attr.namespaceURI });
        }
      }
    });
  });
  return {
    wellFormed: true,
    rootName,
    namespaces: Array.from(namespaces.values()).map((entry) => ({
      prefix: entry.prefix || "(default)",
      uri: entry.uri,
    })),
    elementCount: elements.length,
    attributeCount,
  };
};

type PrettyOptions = {
  indentSize: number;
  indentStyle: "spaces" | "tabs";
  inlineMixedContent: boolean;
  sortAttributes: boolean;
  removeEmptyTextNodes: boolean;
  whitespaceMode: "preserve" | "trim";
  keepSingleLineLimit: number;
};

const escapeText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getTextValue = (node: Text, options: PrettyOptions) => {
  const raw = node.nodeValue ?? "";
  const value = options.whitespaceMode === "trim" ? raw.trim() : raw;
  if (options.removeEmptyTextNodes && value.trim() === "") return "";
  return value;
};

const shouldDropTextNode = (node: ChildNode, options: PrettyOptions) => {
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const value = getTextValue(node as Text, options);
  return options.removeEmptyTextNodes && value.trim() === "";
};

const serializePretty = (doc: Document, options: PrettyOptions) => {
  const serializer = new XMLSerializer();
  const indentUnit =
    options.indentStyle === "tabs"
      ? "\t"
      : " ".repeat(Math.max(1, Math.min(8, options.indentSize)));

  const serializeAttributes = (element: Element) => {
    if (!element.attributes.length) return "";
    const attrs = Array.from(element.attributes);
    if (options.sortAttributes) {
      attrs.sort((a, b) => a.name.localeCompare(b.name));
    }
    const parts = attrs.map((attr) => {
      const escaped = attr.value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
      return `${attr.name}="${escaped}"`;
    });
    return ` ${parts.join(" ")}`;
  };

  const serializeDoctype = (doctype: DocumentType) => {
    if (!doctype) return "";
    let id = "";
    if (doctype.publicId) {
      id = ` PUBLIC "${doctype.publicId}"`;
      if (doctype.systemId) id += ` "${doctype.systemId}"`;
    } else if (doctype.systemId) {
      id = ` SYSTEM "${doctype.systemId}"`;
    }
    return `<!DOCTYPE ${doctype.name}${id}>`;
  };

  const serializeText = (node: Text) => {
    const value = getTextValue(node, options);
    if (!value) return "";
    return options.whitespaceMode === "trim" ? escapeText(value) : serializer.serializeToString(node);
  };

  const serializeInline = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return serializeText(node as Text);
    }
    return serializer.serializeToString(node);
  };

  const serializeNode = (node: ChildNode, depth: number): string => {
    const pad = indentUnit.repeat(depth);
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const element = node as Element;
        const attrs = serializeAttributes(element);
        const openTag = `<${element.tagName}${attrs}>`;
        const closeTag = `</${element.tagName}>`;
        const children = Array.from(element.childNodes).filter(
          (child) => !shouldDropTextNode(child, options)
        );
        if (!children.length) {
          return `${pad}<${element.tagName}${attrs}/>`;
        }
        const hasElementChild = children.some((child) => child.nodeType === Node.ELEMENT_NODE);
        const hasTextChild = children.some((child) => {
          if (child.nodeType !== Node.TEXT_NODE) return false;
          const value = getTextValue(child as Text, options);
          return value.trim().length > 0;
        });
        const hasMixedContent = hasElementChild && hasTextChild;
        const onlyInlineText = children.every(
          (child) =>
            child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE
        );
        const inline = children.map(serializeInline).filter(Boolean).join("");
        if (hasMixedContent && options.inlineMixedContent) {
          return `${pad}${openTag}${inline}${closeTag}`;
        }
        if (onlyInlineText) {
          const inlineLine = `${openTag}${inline}${closeTag}`;
          if (options.keepSingleLineLimit > 0 && inlineLine.length <= options.keepSingleLineLimit) {
            return `${pad}${inlineLine}`;
          }
          const contentLine = inline.length ? `${pad}${indentUnit}${inline}` : "";
          return contentLine
            ? `${pad}${openTag}\n${contentLine}\n${pad}${closeTag}`
            : `${pad}<${element.tagName}${attrs}/>`;
        }
        if (inline && hasMixedContent) {
          return `${pad}${openTag}${inline}${closeTag}`;
        }
        const lines = children
          .map((child) => serializeNode(child, depth + 1))
          .filter(Boolean)
          .join("\n");
        return `${pad}${openTag}\n${lines}\n${pad}${closeTag}`;
      }
      case Node.TEXT_NODE:
        return `${pad}${serializeText(node as Text)}`;
      case Node.CDATA_SECTION_NODE:
      case Node.COMMENT_NODE:
      case Node.PROCESSING_INSTRUCTION_NODE: {
        const inlineValue = serializeInline(node);
        return inlineValue ? `${pad}${inlineValue}` : "";
      }
      case Node.DOCUMENT_TYPE_NODE:
        return `${pad}${serializeDoctype(node as DocumentType)}`;
      default:
        return "";
    }
  };

  const nodes = Array.from(doc.childNodes).filter((child) => !shouldDropTextNode(child, options));
  return nodes.map((node) => serializeNode(node, 0)).filter(Boolean).join("\n");
};

const serializeMinified = (doc: Document, options: PrettyOptions) => {
  const serializer = new XMLSerializer();

  const serializeAttributes = (element: Element) => {
    if (!element.attributes.length) return "";
    const attrs = Array.from(element.attributes);
    if (options.sortAttributes) {
      attrs.sort((a, b) => a.name.localeCompare(b.name));
    }
    const parts = attrs.map((attr) => {
      const escaped = attr.value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
      return `${attr.name}="${escaped}"`;
    });
    return ` ${parts.join(" ")}`;
  };

  const serializeDoctype = (doctype: DocumentType) => {
    if (!doctype) return "";
    let id = "";
    if (doctype.publicId) {
      id = ` PUBLIC "${doctype.publicId}"`;
      if (doctype.systemId) id += ` "${doctype.systemId}"`;
    } else if (doctype.systemId) {
      id = ` SYSTEM "${doctype.systemId}"`;
    }
    return `<!DOCTYPE ${doctype.name}${id}>`;
  };

  const serializeText = (node: Text) => {
    const value = getTextValue(node, options);
    if (!value) return "";
    return options.whitespaceMode === "trim" ? escapeText(value) : serializer.serializeToString(node);
  };

  const serializeInline = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return serializeText(node as Text);
    }
    return serializer.serializeToString(node);
  };

  const serializeNode = (node: ChildNode): string => {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const element = node as Element;
        const attrs = serializeAttributes(element);
        const children = Array.from(element.childNodes).filter(
          (child) => !shouldDropTextNode(child, options)
        );
        if (!children.length) {
          return `<${element.tagName}${attrs}/>`;
        }
        const inner = children.map((child) => serializeNode(child)).filter(Boolean).join("");
        return `<${element.tagName}${attrs}>${inner}</${element.tagName}>`;
      }
      case Node.TEXT_NODE:
        return serializeText(node as Text);
      case Node.CDATA_SECTION_NODE:
      case Node.COMMENT_NODE:
      case Node.PROCESSING_INSTRUCTION_NODE:
        return serializeInline(node);
      case Node.DOCUMENT_TYPE_NODE:
        return serializeDoctype(node as DocumentType);
      default:
        return "";
    }
  };

  const nodes = Array.from(doc.childNodes).filter((child) => !shouldDropTextNode(child, options));
  return nodes.map((node) => serializeNode(node)).filter(Boolean).join("");
};

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  const message = event.data;
  if (!message || message.type !== "format") return;
  const { requestId, payload } = message;
  const start = performance.now();
  try {
    const doc = parseXml(payload.input);
    const prettyOptions: PrettyOptions = {
      indentSize: payload.indentSize,
      indentStyle: payload.indentStyle,
      inlineMixedContent: payload.inlineMixedContent,
      sortAttributes: payload.sortAttributes,
      removeEmptyTextNodes: payload.removeEmptyTextNodes,
      whitespaceMode: payload.whitespaceMode,
      keepSingleLineLimit: payload.keepSingleLineLimit,
    };
    const summary = buildSummary(doc);
    const output =
      payload.formatMode === "minify"
        ? serializeMinified(doc, prettyOptions)
        : serializePretty(doc, prettyOptions);
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    const response: FormatResult = {
      type: "result",
      requestId,
      output,
      durationMs,
      summary,
    };
    self.postMessage(response);
  } catch (err) {
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    const response: FormatResult = {
      type: "result",
      requestId,
      output: "",
      durationMs,
      error: err instanceof Error ? err.message : "Unable to format XML.",
      location: (err as { location?: XmlParseLocation | null }).location ?? null,
    };
    self.postMessage(response);
  }
};
