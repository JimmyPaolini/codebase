import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/**/*.constants.ts",
          "src/**/*.module.ts",
          "src/**/*.test.ts",
          "src/**/*.types.ts",
          "src/main.module.ts",
          "src/main.ts",
        ],
        include: ["src/**/*.ts"],
      },
      // Every end-to-end test here spawns a real Node process that registers
      // the TypeScript loader, boots the NestJS container, and builds a
      // `ts.Program`. That takes 3-6 seconds on a CI runner, so vitest's
      // 5000ms default is a coin flip rather than a budget, and `main` has
      // failed on whichever spawn was unlucky. `spawnSync` blocks the thread,
      // so vitest cannot interrupt a slow run either — it only reports the
      // overrun once the child has already returned.
      testTimeout: 30_000,
    },
  }),
);
