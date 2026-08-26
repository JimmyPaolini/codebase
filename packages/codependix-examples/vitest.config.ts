import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          // Fixtures are input to be graphed, not code this package executes.
          // They are loaded by a real container boot, so v8 sees them, and
          // measuring them would report on how thoroughly the examples happen
          // to exercise a deliberately-inert module.
          "fixtures/**",
          "src/**/*.constants.ts",
          "src/**/*.module.ts",
          "src/**/*.test.ts",
          "src/**/*.types.ts",
          "src/main.module.ts",
          "src/main.ts",
        ],
        include: ["src/**/*.ts"],
      },
    },
  }),
);
