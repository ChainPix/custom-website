import { expect, test } from "vitest";
import { analyze, buildTermData, countBullets } from "../../app/(tools)/resume-analyzer/analysis";

test("tokenization keeps punctuation-aware terms", () => {
  const text = "C++ and Node.js with CI/CD pipelines.";
  const termData = buildTermData(text, true);
  expect(termData.counts["c++"]).toBe(1);
  expect(termData.counts["node.js"]).toBe(1);
  expect(termData.counts["ci/cd"]).toBe(1);
});

test("bullet counting ignores non-bullet dashes", () => {
  const text = `Summary - with dash
- Bullet one
• Bullet two
* Bullet three
Not a bullet - just dash`;
  expect(countBullets(text)).toBe(3);
});

test("section detection finds common headings", () => {
  const text = `Summary
Experience
- Built tooling
Projects
Education
Skills`;
  const termData = buildTermData(text, true);
  const insights = analyze(text, termData);
  const sections = Object.fromEntries(insights.sections.map((section) => [section.key, section.found]));
  expect(sections.summary).toBe(true);
  expect(sections.experience).toBe(true);
  expect(sections.projects).toBe(true);
  expect(sections.education).toBe(true);
  expect(sections.skills).toBe(true);
  expect(sections.certifications).toBe(false);
});
