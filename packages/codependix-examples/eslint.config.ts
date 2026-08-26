import baseConfig from "../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🧪 Fixtures
  // Input to be graphed, not code this repository authors. A fixture declares a
  // self-referential `tsconfig` path alias, a `require` call, and an unused
  // re-export on purpose — each is a behavior the examples exist to pin down,
  // so linting them would report findings about the demonstrations themselves.
  // Scoped as a directory rather than silenced per rule: `output/` deliberately
  // stays in scope, so the committed `codependix-*graph.json` exports inherit
  // the `jsonc/sort-array-values` carve-out the workspace config declares.
  {
    ignores: ["fixtures/**"],
  },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          // @golevelup/ts-vitest: a devDependency used only in test files, which
          // are outside the build dependency check's scope.
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          ignoredDependencies: ["@golevelup/ts-vitest", "vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
