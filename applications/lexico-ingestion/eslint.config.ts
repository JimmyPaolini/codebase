import baseConfig from "../../configuration/eslint.config";

export default [
  // 🛠️ Base Config
  ...baseConfig,

  // 🚫 Project Ignores
  // Exclude large ingested data files
  {
    ignores: ["data/**"],
  },

  // 📦 Dependency Checks
  {
    files: ["**/*.json"],
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          ignoredDependencies: ["pg", "vitest"],
          ignoredFiles: ["{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}"],
        },
      ],
      "no-irregular-whitespace": "off",
    },
  },
];
