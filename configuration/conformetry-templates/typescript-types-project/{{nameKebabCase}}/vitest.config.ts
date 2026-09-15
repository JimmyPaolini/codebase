import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "{{workspaceRelativePrefix}}configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
      },
      // A contracts package declares types, which are erased before anything
      // runs, so it usually carries no test at all. Vitest treats an empty run
      // as a failure by default, which would make this project red for being
      // exactly what it is meant to be. The coverage thresholds still apply to
      // whatever it does execute.
      passWithNoTests: true,
    },
  }),
);
