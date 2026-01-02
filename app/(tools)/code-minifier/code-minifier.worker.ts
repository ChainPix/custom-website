type Language = "html" | "css" | "js";
type Mode = "minify" | "pretty";
type IndentStyle = "spaces-2" | "spaces-4" | "tabs";

type Options = {
  stripComments: boolean;
  normalizeWhitespace: boolean;
  indentStyle: IndentStyle;
};

type WorkerRequest = {
  id: number;
  code: string;
  lang: Language;
  mode: Mode;
  options: Options;
  safeMode: boolean;
};

type WorkerResponse = {
  id: number;
  output?: string;
  duration?: number;
  error?: string;
};

const getIndent = (style: IndentStyle) => {
  if (style === "tabs") return "\t";
  if (style === "spaces-4") return "    ";
  return "  ";
};

const minifyCode = async (code: string, lang: Language, opts: Options, safeMode: boolean) => {
  if (lang === "html") {
    if (safeMode) {
      return code.replace(/>\s+</g, "><").trim();
    }
    const { minify } = await import("html-minifier-terser");
    return minify(code, {
      collapseWhitespace: opts.normalizeWhitespace,
      removeComments: opts.stripComments,
      removeAttributeQuotes: false,
      removeOptionalTags: false,
      removeRedundantAttributes: false,
      keepClosingSlash: true,
    });
  }
  if (lang === "css") {
    const { minify } = await import("csso");
    const comments = opts.stripComments ? false : "all";
    return minify(code, { restructure: !safeMode, comments }).css;
  }
  const terser = await import("terser");
  const result = await terser.minify(code, {
    compress: safeMode ? false : opts.normalizeWhitespace,
    mangle: safeMode ? false : true,
    format: {
      comments: safeMode ? "all" : opts.stripComments ? false : "all",
      beautify: safeMode ? true : !opts.normalizeWhitespace,
    },
  });
  if (result.error) throw result.error;
  return result.code ?? "";
};

const pretty = async (code: string, lang: Language, opts: Options) => {
  const indentUnit = getIndent(opts.indentStyle);
  const prettier = await import("prettier/standalone");
  const babel = await import("prettier/plugins/babel");
  const html = await import("prettier/plugins/html");
  const postcss = await import("prettier/plugins/postcss");
  const parser = lang === "js" ? "babel" : lang === "css" ? "css" : "html";
  const result = await prettier.format(code, {
    parser,
    plugins: [babel, html, postcss],
    tabWidth: indentUnit === "\t" ? 2 : indentUnit.length,
    useTabs: indentUnit === "\t",
    printWidth: 100,
  });
  return result.trim();
};

const sendMessage = (payload: WorkerResponse) => {
  self.postMessage(payload);
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, code, lang, mode, options, safeMode } = event.data;
  const startedAt = performance.now();
  try {
    const output = mode === "minify" ? await minifyCode(code, lang, options, safeMode) : await pretty(code, lang, options);
    const duration = Math.round(performance.now() - startedAt);
    sendMessage({ id, output, duration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendMessage({ id, error: message });
  }
};
