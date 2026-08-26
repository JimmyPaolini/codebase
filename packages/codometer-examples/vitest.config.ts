import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        // This package ships a sample corpus and the configurations that
        // measure it. Its only executable TypeScript is the test that runs
        // codometer over the corpus, so there is no source to instrument and
        // the coverage report is empty by nature rather than by omission.
        include: [],
      },
      // Every test here spawns the codometer CLI over the corpus, which
      // bootstraps Nest and reaches an interpreter for the Python samples.
      testTimeout: 180_000,
    },
  }),
);
