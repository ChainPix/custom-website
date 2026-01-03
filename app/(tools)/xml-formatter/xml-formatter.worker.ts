/// <reference lib="webworker" />

type XmlParseLocation = {
  line: number;
  column: number;
};

type FormatPayload = {
  input: string;
  indent: number;
  inlineMixedContent: boolean;
  formatMode: "prettify" | "minify";
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

const serializePretty = (doc: Document, indent: number, inlineMixedContent: boolean) => {
  const serializer = new XMLSerializer();
  const indentUnit = " ".repeat(indent);

  const isWhitespaceText = (node: ChildNode) =>
    node.nodeType === Node.TEXT_NODE && !node.nodeValue?.trim();

  const serializeAttributes = (element: Element) => {
    if (!element.attributes.length) return "";
    const parts = Array.from(element.attributes).map((attr) => {
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

  const serializeInline = (node: ChildNode) => serializer.serializeToString(node);

  const serializeNode = (node: ChildNode, depth: number): string => {
    const pad = indentUnit.repeat(depth);
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const element = node as Element;
        const attrs = serializeAttributes(element);
        const openTag = `<${element.tagName}${attrs}>`;
        const closeTag = `</${element.tagName}>`;
        const children = Array.from(element.childNodes).filter((child) => !isWhitespaceText(child));
        if (!children.length) {
          return `${pad}<${element.tagName}${attrs}/>`;
        }
        const hasElementChild = children.some((child) => child.nodeType === Node.ELEMENT_NODE);
        const hasTextChild = children.some((child) => child.nodeType === Node.TEXT_NODE);
        const hasMixedContent = hasElementChild && hasTextChild;
        const onlyInlineText = children.every(
          (child) =>
            child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE
        );
        if (onlyInlineText || (hasMixedContent && inlineMixedContent)) {
          const inline = children.map(serializeInline).join("");
          return `${pad}${openTag}${inline}${closeTag}`;
        }
        const lines = children
          .map((child) => serializeNode(child, depth + 1))
          .filter(Boolean)
          .join("\n");
        return `${pad}${openTag}\n${lines}\n${pad}${closeTag}`;
      }
      case Node.TEXT_NODE:
      case Node.CDATA_SECTION_NODE:
      case Node.COMMENT_NODE:
      case Node.PROCESSING_INSTRUCTION_NODE:
        return `${pad}${serializeInline(node)}`;
      case Node.DOCUMENT_TYPE_NODE:
        return `${pad}${serializeDoctype(node as DocumentType)}`;
      default:
        return "";
    }
  };

  const nodes = Array.from(doc.childNodes).filter((child) => !isWhitespaceText(child));
  return nodes.map((node) => serializeNode(node, 0)).filter(Boolean).join("\n");
};

const serializeMinified = (doc: Document) => {
  const serializer = new XMLSerializer();
  const isWhitespaceText = (node: ChildNode) =>
    node.nodeType === Node.TEXT_NODE && !node.nodeValue?.trim();

  const serializeAttributes = (element: Element) => {
    if (!element.attributes.length) return "";
    const parts = Array.from(element.attributes).map((attr) => {
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

  const serializeInline = (node: ChildNode) => serializer.serializeToString(node);

  const serializeNode = (node: ChildNode): string => {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        const element = node as Element;
        const attrs = serializeAttributes(element);
        const children = Array.from(element.childNodes).filter((child) => !isWhitespaceText(child));
        if (!children.length) {
          return `<${element.tagName}${attrs}/>`;
        }
        const inner = children.map((child) => serializeNode(child)).filter(Boolean).join("");
        return `<${element.tagName}${attrs}>${inner}</${element.tagName}>`;
      }
      case Node.TEXT_NODE:
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

  const nodes = Array.from(doc.childNodes).filter((child) => !isWhitespaceText(child));
  return nodes.map((node) => serializeNode(node)).filter(Boolean).join("");
};

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  const message = event.data;
  if (!message || message.type !== "format") return;
  const { requestId, payload } = message;
  const start = performance.now();
  try {
    const doc = parseXml(payload.input);
    const output =
      payload.formatMode === "minify"
        ? serializeMinified(doc)
        : serializePretty(doc, payload.indent, payload.inlineMixedContent);
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    const response: FormatResult = {
      type: "result",
      requestId,
      output,
      durationMs,
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
