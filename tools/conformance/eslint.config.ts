import baseConfig from "../../configuration/eslint.config.ts";

export default [
  // 🙈 Ignored Files (must be first)
  {
    ignores: [
      "src/modules/*/templates/**",
      "tools/conformance/src/modules/*/templates/**",
    ],
  },

  // 🛠️ Base Config
  ...baseConfig,

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
    },
  },
];
