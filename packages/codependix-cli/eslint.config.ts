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
          // vitest: referenced via tsconfig "types" array; it's a devDependency
          // and the @nx/dependency-checks rule misidentifies it as a production
          // dependency.
          ignoredDependencies: ["vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },

  // 🚧 Nx Containment
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              // Only `@codependix/nx` owns Nx. Everything another package
              // wants is already on `NxProject`, and a whole graph travels as
              // the opaque `NxProjectGraph` — reaching for `@nx/devkit` here
              // is how tag reading leaked into four packages before.
              message:
                "Import NxProject or NxProjectGraph from @codependix/nx instead — only @codependix/nx may depend on Nx.",
              name: "@nx/devkit",
            },
          ],
        },
      ],
    },
  },
];
