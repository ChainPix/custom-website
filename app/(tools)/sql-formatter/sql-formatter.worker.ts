/// <reference lib="webworker" />

import { format, type KeywordCase } from "sql-formatter";

const dialects = ["sql", "mysql", "postgresql", "sqlite", "mariadb"] as const;
type Dialect = (typeof dialects)[number];
type CommaStyle = "leading" | "trailing";
type IndentMode = "spaces" | "tabs";

type FormatPayload = {
  input: string;
  dialect: Dialect;
  indent: number;
  indentMode: IndentMode;
  keywordCase: KeywordCase;
  linesBetweenStatements: number;
  commaStyle: CommaStyle;
  minify: boolean;
};

type FormatRequest = {
  type: "format";
  requestId: number;
  payload: FormatPayload;
};

const minifySql = (sql: string) => sql.replace(/\s+/g, " ").trim();
const applyCommaStyle = (sql: string, style: CommaStyle) => {
  if (style === "trailing") return sql;
  return sql.replace(/,\s*\n(\s*)/g, "\n$1, ");
};

const formatSql = (payload: FormatPayload) => {
  const formatted = format(payload.input.trim(), {
    language: payload.dialect,
    tabWidth: payload.indent,
    useTabs: payload.indentMode === "tabs",
    keywordCase: payload.keywordCase,
    linesBetweenQueries: payload.linesBetweenStatements,
  });
  const commaAdjusted = applyCommaStyle(formatted, payload.commaStyle);
  return payload.minify ? minifySql(commaAdjusted) : commaAdjusted;
};

self.onmessage = (event: MessageEvent<FormatRequest>) => {
  const message = event.data;
  if (!message || message.type !== "format") return;
  const { requestId, payload } = message;
  const start = performance.now();
  try {
    const output = formatSql(payload);
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    self.postMessage({
      type: "result",
      requestId,
      output,
      durationMs,
      inputChars: payload.input.length,
    });
  } catch (err) {
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    self.postMessage({
      type: "result",
      requestId,
      output: "",
      durationMs,
      inputChars: payload.input.length,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};
