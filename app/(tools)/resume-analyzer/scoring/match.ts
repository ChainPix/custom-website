import { DEFAULT_SECTION_WEIGHTS, type MatchResult, type SectionWeights, type TermData, type TermEntry } from "../analysis";

const TECH_DICTIONARY = new Set([
  "aws",
  "azure",
  "bash",
  "c",
  "c#",
  "c++",
  "ci/cd",
  "css",
  "docker",
  "gcp",
  "git",
  "github",
  "gitlab",
  "go",
  "graphql",
  "html",
  "java",
  "javascript",
  "jenkins",
  "jest",
  "kotlin",
  "kubernetes",
  "linux",
  "mongodb",
  "mysql",
  "next.js",
  "node.js",
  "php",
  "playwright",
  "postgresql",
  "python",
  "react",
  "redis",
  "rest",
  "ruby",
  "rust",
  "sass",
  "sql",
  "svelte",
  "swift",
  "tailwind",
  "terraform",
  "typescript",
  "vitest",
  "vue",
]);

export function compareTerms(
  resumeData: TermData,
  jdData: TermData,
  sectionWeights: SectionWeights = DEFAULT_SECTION_WEIGHTS,
): MatchResult {
  const resumeTopMap = new Map<string, TermEntry>();
  resumeData.topTerms.forEach((entry) => {
    resumeTopMap.set(entry.term, entry);
  });
  const jdTopMap = new Map<string, TermEntry>();
  jdData.topTerms.forEach((entry) => {
    jdTopMap.set(entry.term, entry);
  });

  const maxSectionWeight = Math.max(...Object.values(sectionWeights));
  const totalPossible = jdData.topTerms.reduce((sum, entry) => sum + entry.score * maxSectionWeight, 0);
  let earned = 0;
  let exactMatches = 0;
  let aliasMatches = 0;
  const missing: MatchResult["missing"] = [];

  jdData.topTerms.forEach((entry) => {
    const resumeEntry = resumeTopMap.get(entry.term);
    if (!resumeEntry) {
      const appearsNowhere = !(entry.term in resumeData.counts);
      const suggestedSection: "Skills" | "Experience" = TECH_DICTIONARY.has(entry.term) ? "Skills" : "Experience";
      const template =
        suggestedSection === "Skills"
          ? `- ${entry.term} (add to Skills; pair with [tool/version])`
          : `- Used ${entry.term} to [action], resulting in [metric].`;
      missing.push({
        term: entry.term,
        appearsNowhere,
        suggestedSection,
        template,
      });
      return;
    }

    const jdForms = jdData.forms[entry.term] ?? new Set<string>();
    const resumeForms = resumeData.forms[entry.term] ?? new Set<string>();
    const hasExactForm = Array.from(jdForms).some((form) => resumeForms.has(form));
    const matchQuality = hasExactForm ? 1 : 0.9;
    if (hasExactForm) {
      exactMatches += 1;
    } else {
      aliasMatches += 1;
    }
    earned += entry.score * matchQuality * resumeEntry.bestSectionWeight;
  });

  const extras = resumeData.topTerms
    .filter((entry) => !jdTopMap.has(entry.term))
    .map((entry) => entry.term);

  const matchScore = totalPossible ? Math.round((earned / totalPossible) * 100) : 0;

  return {
    matchScore,
    missing,
    extras,
    exactMatches,
    aliasMatches,
    totalTerms: jdData.topTerms.length,
  };
}
