import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Pre-existing debt surfaced when CI lint was first enabled (2026-07):
    // the React compiler-era hooks rules and a few style rules flag ~70 legacy
    // tool clients. Downgraded to warnings so CI can gate on new errors while
    // the cleanup happens incrementally (tracked in BACKLOG.md). Do not add
    // NEW code that triggers these.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/inline-script-id": "warn",
      "@next/next/no-assign-module-variable": "warn",
    },
  },
  {
    // Global ambient declarations require `declare var`.
    files: ["**/*.d.ts"],
    rules: {
      "no-var": "off",
    },
  },
  {
    // Plain Node CLI scripts use require().
    files: ["scripts/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
