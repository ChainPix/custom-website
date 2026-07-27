import { expect, test } from "vitest";
import { formatSql } from "../../app/(tools)/sql-formatter/formatter-utils";

test("formatSql applies keyword casing", () => {
  const result = formatSql({
    input: "select id from users;",
    dialect: "sql",
    indent: 2,
    indentMode: "spaces",
    keywordCase: "upper",
    linesBetweenStatements: 1,
    commaStyle: "trailing",
    minify: false,
  });
  expect(result).toContain("SELECT");
});

test("formatSql minifies when requested", () => {
  const result = formatSql({
    input: "select id,\n  name\nfrom users;",
    dialect: "sql",
    indent: 2,
    indentMode: "spaces",
    keywordCase: "preserve",
    linesBetweenStatements: 1,
    commaStyle: "trailing",
    minify: true,
  });
  expect(result.includes("\n")).toBe(false);
});

test("formatSql supports leading comma style", () => {
  const result = formatSql({
    input: "select a, b, c from t;",
    dialect: "sql",
    indent: 2,
    indentMode: "spaces",
    keywordCase: "upper",
    linesBetweenStatements: 1,
    commaStyle: "leading",
    minify: false,
  });
  expect(result).toMatch(/\n\s*, b/);
  expect(result).toMatch(/\n\s*, c/);
});

test("formatSql uses tabs when configured", () => {
  const result = formatSql({
    input: "select a from t;",
    dialect: "sql",
    indent: 2,
    indentMode: "tabs",
    keywordCase: "upper",
    linesBetweenStatements: 1,
    commaStyle: "trailing",
    minify: false,
  });
  expect(result).toContain("\t");
});
