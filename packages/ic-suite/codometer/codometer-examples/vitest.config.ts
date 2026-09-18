import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        // This package ships a sample corpus and the configurations that
        // measure it. Every line of TypeScript here is either a configuration
        // the tool reads or a test that runs it, so there is no source to
        // instrument and the coverage report is empty by nature rather than
        // by omission.
        include: [],
      },
      // Both test files spawn the codometer command line for nearly every
      // assertion, and each spawn bootstraps Nest and reaches an interpreter
      // for the Python samples. Running the files in parallel doubles that
      // concurrency without making anything faster — the work is process-bound
      // rather than waiting on an idle core — and on a loaded machine it is
      // what turns a slow run into a failing one.
      fileParallelism: false,
      // The `beforeAll` hooks measure an example the same way a test does, by
      // spawning that same command line, so they need the same budget. Left at
      // the 10s default they were the one part of this file still sized for
      // work it does not do, and a loaded runner is where that showed.
      hookTimeout: 180_000,
      testTimeout: 180_000,
    },
  }),
);
