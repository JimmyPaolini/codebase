import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
      },
      // This package is the contracts leaf: every file in it declares types
      // and nothing in it executes, so there is no behavior a test could
      // assert. A test here could only restate a declaration the compiler
      // already checks, so the suite is empty by nature rather than by
      // omission — and the day a service appears here, it is the layering
      // that is wrong, not the coverage.
      passWithNoTests: true,
    },
  }),
);
