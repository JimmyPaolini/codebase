import baseConfig from "../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🧪 Example subjects
  // Input to be graphed, not code this repository authors. One declares a
  // self-referential `tsconfig` path alias, a `require` call, and an unused
  // re-export on purpose — each is a behavior the examples exist to pin down,
  // so linting them would report findings about the demonstrations themselves.
  // Scoped as a directory rather than silenced per rule: `output/` deliberately
  // stays in scope, so the committed `codependix-*graph.json` exports inherit
  // the `jsonc/sort-array-values` carve-out the workspace config declares.
  {
    ignores: ["examples/**"],
  },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: ["vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
