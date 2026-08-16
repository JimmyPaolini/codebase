/**
 * Commitlint configuration — enforces Conventional Commits with Gitmoji support.
 *
 * Commit format: `<type>(<scope>): <gitmoji> <subject>`
 *
 * - Header max: 128 characters (aim for &lt;72 for readability)
 * - Body: forbidden unless every line is a `Co-authored-by:` trailer
 * - Footer: forbidden unless every line is a `Co-authored-by:` trailer
 * - Subject: lowercase, imperative mood, no trailing period
 * - Gitmoji required at start of subject
 *
 * Types and scopes are defined in conventional.config.cjs.
 * See: .agents/skills/commit-code/SKILL.md for full documentation.
 */
import { scopes, types } from "./conventional.config.cjs";

import type { Plugin, Rule, RuleOutcome, UserConfig } from "@commitlint/types";

/** Every non-empty body line must be a `Co-authored-by:` trailer. */
const bodyCoAuthoredOnly: Rule = (parsed): RuleOutcome => {
  const body: null | string = parsed.body;
  if (!body) return [true];
  const lines = body.split("\n").filter((line: string) => line.trim() !== "");
  const allCoAuthored = lines.every((line: string) =>
    /^Co-authored-by: \S+/.test(line),
  );
  return [
    allCoAuthored,
    "Body must be empty or contain only Co-authored-by trailers",
  ];
};

/** Every non-empty footer line must be a `Co-authored-by:` trailer. */
const footerCoAuthoredOnly: Rule = (parsed): RuleOutcome => {
  const footer: null | string = parsed.footer;
  if (!footer) return [true];
  const lines = footer.split("\n").filter((line: string) => line.trim() !== "");
  const allCoAuthored = lines.every((line: string) =>
    /^Co-authored-by: \S+/.test(line),
  );
  return [
    allCoAuthored,
    "Footer must be empty or contain only Co-authored-by trailers",
  ];
};

const coAuthoredPlugin: Plugin = {
  rules: {
    "body-co-authored-only": bodyCoAuthoredOnly,
    "footer-co-authored-only": footerCoAuthoredOnly,
  },
};

const configuration: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    "commitlint-plugin-gitmoji",
    "commitlint-plugin-tense",
    coAuthoredPlugin,
  ],
  rules: {
    // ❗ Breaking change
    "subject-exclamation-mark": [0],

    // 😀 Enforce gitmoji at start of commit message
    "start-with-gitmoji": [2, "always"],

    // 💬 Enforce grammatical tense
    "tense/subject-tense": [
      2,
      "always",
      { allowedTenses: ["present-imperative"] },
    ],

    // 🏷️ Enforce enums
    "scope-enum": [2, "always", scopes.map((scope) => scope.name)],
    "type-enum": [2, "always", types.map((type) => type.name)],

    // 📏 Limit lengths
    "header-max-length": [2, "always", 128],

    // 🚫 Forbid arbitrary body/footer content; allow only Co-authored-by trailers
    "body-co-authored-only": [2, "always"],
    "footer-co-authored-only": [2, "always"],

    // 🔡 Enforce case
    "scope-case": [2, "always", "lower-case"],
    "subject-case": [2, "always", "lower-case"],
    "type-case": [2, "always", "lower-case"],

    // 🎨 Format rules
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
  },
};

export default configuration;
