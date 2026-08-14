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
          // @golevelup/ts-vitest: required by the conformance template but only used in
          // test files, which are excluded from the build dependency check scope.
          // vitest: referenced via tsconfig "types" array; it's a devDependency and
          // the @nx/dependency-checks rule misidentifies it as a production dependency.
          // The language packages are named as strings in a registry and
          // imported on demand, so no static import proves they are used.
          ignoredDependencies: [
            "@golevelup/ts-vitest",
            "@jimmypaolini/conformetry-json",
            "@jimmypaolini/conformetry-jupyter",
            "@jimmypaolini/conformetry-markdown",
            "@jimmypaolini/conformetry-python",
            "@jimmypaolini/conformetry-text",
            "@jimmypaolini/conformetry-typescript",
            "vitest",
          ],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
