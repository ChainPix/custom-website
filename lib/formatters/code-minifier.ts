export type Language = "html" | "css" | "js";
export type Mode = "minify" | "pretty";
export type IndentStyle = "spaces-2" | "spaces-4" | "tabs";

export type LanguageOptions = {
  stripComments: boolean;
  normalizeWhitespace: boolean;
};

export type FormatOptions = {
  html: LanguageOptions;
  css: LanguageOptions;
  js: LanguageOptions;
  indentStyle: IndentStyle;
};

export type FormatRequest = {
  code: string;
  lang: Language;
  mode: Mode;
  options: FormatOptions;
  safeMode: boolean;
};

const getIndent = (style: IndentStyle) => {
  if (style === "tabs") return "\t";
  if (style === "spaces-4") return "    ";
  return "  ";
};

const getErrorMessage = (lang: Language, mode: Mode, safeMode: boolean) => {
  const label = lang.toUpperCase();
  const action = mode === "minify" ? "minify" : "format";
  const hint = safeMode ? "" : " Try Safe Mode if this keeps failing.";
  return `Couldn't ${action} this ${label}. Check syntax and try again.${hint}`;
};

const minifyHtml = async (code: string, options: LanguageOptions, safeMode: boolean) => {
  if (safeMode) {
    return code.replace(/>\\s+</g, "><").trim();
  }
  const { minify } = await import("html-minifier-terser");
  return minify(code, {
    collapseWhitespace: options.normalizeWhitespace,
    removeComments: options.stripComments,
    removeAttributeQuotes: false,
    removeOptionalTags: false,
    removeRedundantAttributes: false,
    keepClosingSlash: true,
  });
};

const minifyCss = async (code: string, options: LanguageOptions, safeMode: boolean) => {
  const { minify } = await import("csso");
  const comments = options.stripComments ? false : "all";
  return minify(code, { restructure: !safeMode, comments }).css;
};

const minifyJs = async (code: string, options: LanguageOptions, safeMode: boolean) => {
  const terser = await import("terser");
  const result = await terser.minify(code, {
    compress: safeMode ? false : options.normalizeWhitespace,
    mangle: safeMode ? false : true,
    format: {
      comments: safeMode ? "all" : options.stripComments ? false : "all",
      beautify: safeMode ? true : !options.normalizeWhitespace,
    },
  });
  if (result && typeof result === "object" && "error" in result && result.error) {
    throw result.error;
  }
  return result.code ?? "";
};

const prettyCode = async (code: string, lang: Language, indentStyle: IndentStyle) => {
  const indentUnit = getIndent(indentStyle);
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

export const defaultFormatOptions: FormatOptions = {
  html: { stripComments: true, normalizeWhitespace: true },
  css: { stripComments: true, normalizeWhitespace: true },
  js: { stripComments: true, normalizeWhitespace: true },
  indentStyle: "spaces-2",
};

export const formatCode = async ({ code, lang, mode, options, safeMode }: FormatRequest) => {
  try {
    if (mode === "pretty") {
      return { output: await prettyCode(code, lang, options.indentStyle) };
    }
    const langOptions = options[lang];
    if (lang === "html") {
      return { output: await minifyHtml(code, langOptions, safeMode) };
    }
    if (lang === "css") {
      return { output: await minifyCss(code, langOptions, safeMode) };
    }
    return { output: await minifyJs(code, langOptions, safeMode) };
  } catch (err) {
    throw new Error(getErrorMessage(lang, mode, safeMode));
  }
};
