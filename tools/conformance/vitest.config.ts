import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config.js";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts", "src/modules/*/templates/**"],
        include: ["src/**/*.ts"],
      },
      exclude: ["templates/**", "src/modules/*/templates/**"],
    },
  }),
);
