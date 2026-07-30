import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config.js";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
        thresholds: {
          branches: 40,
          functions: 45,
          lines: 54,
          statements: 54,
        },
      },
    },
  }),
);
