import baseConfig from "../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

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
          // The language packages are named as strings in a registry and
          // imported on demand, so no static import proves they are used.
          ignoredDependencies: [
            "@golevelup/ts-vitest",
            "@conformetry/json",
            "@conformetry/jupyter",
            "@conformetry/markdown",
            "@conformetry/python",
            "@conformetry/text",
            "@conformetry/typescript",
            "vitest",
          ],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
