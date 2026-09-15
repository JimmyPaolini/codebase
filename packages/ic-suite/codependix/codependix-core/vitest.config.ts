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
      // 🧪 A contracts-only package has nothing to run
      //
      // `codependix-core` is the spine's leaf: type declarations and nothing
      // executable, so it emits no statement a test could cover and vitest
      // would otherwise exit 1 on finding no test file at all. This is not a
      // lowered threshold — coverage still reports 100% of the zero
      // statements the package compiles to — it is the absence of anything to
      // measure, and the day a service appears here the layer contract has
      // already been broken.
      passWithNoTests: true,
    },
  }),
);
