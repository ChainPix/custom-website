import { format, type KeywordCase } from "sql-formatter";

export const dialects = ["sql", "mysql", "postgresql", "sqlite", "mariadb"] as const;
export type Dialect = (typeof dialects)[number];
export type CommaStyle = "leading" | "trailing";
export type IndentMode = "spaces" | "tabs";

export type FormatOptions = {
  input: string;
  dialect: Dialect;
  indent: number;
  indentMode: IndentMode;
  keywordCase: KeywordCase;
  linesBetweenStatements: number;
  commaStyle: CommaStyle;
  minify: boolean;
  formatMultiple?: boolean;
};

export type DialectSuggestion = {
  dialect: Dialect;
  reason: string;
};

export const minifySql = (sql: string) => sql.replace(/\s+/g, " ").trim();

export const applyCommaStyle = (sql: string, style: CommaStyle) => {
  if (style === "trailing") return sql;
  return sql.replace(/,\s*\n(\s*)/g, "\n$1, ");
};

export const formatSql = (options: FormatOptions) => {
  const trimmed = options.input.trim();
  const formatted = format(trimmed, {
    language: options.dialect,
    tabWidth: options.indent,
    useTabs: options.indentMode === "tabs",
    keywordCase: options.keywordCase,
    linesBetweenQueries: options.linesBetweenStatements,
  });
  const commaAdjusted = applyCommaStyle(formatted, options.commaStyle);
  return options.minify ? minifySql(commaAdjusted) : commaAdjusted;
};

export const splitStatements = (input: string) => {
  const statements: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick && char === "-" && next === "-") {
      inLineComment = true;
      current += char;
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick && char === "/" && next === "*") {
      inBlockComment = true;
      current += char;
      continue;
    }

    if (!inDouble && !inBacktick && char === "'") {
      if (inSingle && next === "'") {
        current += "''";
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      current += char;
      continue;
    }
    if (!inSingle && !inBacktick && char === '"') {
      if (inDouble && next === '"') {
        current += '""';
        i += 1;
        continue;
      }
      inDouble = !inDouble;
      current += char;
      continue;
    }
    if (!inSingle && !inDouble && char === "`") {
      inBacktick = !inBacktick;
      current += char;
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick && char === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed + ";");
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
};

export const detectDialectSuggestion = (sql: string): DialectSuggestion | null => {
  const normalized = sql.trim();
  if (!normalized) return null;
  const candidates: DialectSuggestion[] = [];
  const add = (dialect: Dialect, reason: string) => candidates.push({ dialect, reason });

  if (/`[^`]+`/.test(normalized) || /\bAUTO_INCREMENT\b/i.test(normalized) || /\bENGINE\s*=\s*\w+/i.test(normalized)) {
    add("mysql", "MySQL-style identifiers or AUTO_INCREMENT");
  }
  if (/\bRETURNING\b/i.test(normalized) || /\bILIKE\b/i.test(normalized) || /::\s*\w+/.test(normalized)) {
    add("postgresql", "PostgreSQL-specific syntax (RETURNING/ILIKE/::)");
  }
  if (/\bPRAGMA\b/i.test(normalized) || /\bAUTOINCREMENT\b/i.test(normalized)) {
    add("sqlite", "SQLite PRAGMA/AUTOINCREMENT");
  }
  if (/\bLIMIT\s+\d+\s*,\s*\d+/.test(normalized)) {
    add("mysql", "MySQL LIMIT offset, count");
  }

  return candidates[0] ?? null;
};

export const lintSql = (sql: string, checkSemicolon: boolean) => {
  const hints: string[] = [];
  const trimmed = sql.trim();
  if (!trimmed) return hints;

  let parenBalance = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    const next = trimmed[i + 1];
    if (!inDouble && char === "'") {
      if (inSingle && next === "'") {
        i += 1;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && char === '"') {
      if (inDouble && next === '"') {
        i += 1;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (char === "(") parenBalance += 1;
    if (char === ")") parenBalance -= 1;
  }

  if (parenBalance !== 0) {
    hints.push("Unbalanced parentheses detected.");
  }
  if (inSingle) {
    hints.push("Unclosed single quote string.");
  }
  if (inDouble) {
    hints.push("Unclosed double quote identifier.");
  }
  if (checkSemicolon && !trimmed.endsWith(";")) {
    hints.push("Missing trailing semicolon.");
  }
  return hints;
};
