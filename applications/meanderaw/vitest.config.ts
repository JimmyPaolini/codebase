import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
      },
      /**
       * A minute per test, where the shared default is five seconds.
       *
       * This project's suite is not a set of fast unit tests around mocked
       * seams. `mosaic`'s unit space is enumerated exhaustively rather than
       * sampled — a walk over every subset of a tile's edges — and several
       * assertions here render every tile that walk produces, parse each one
       * back, and measure the result. That is tens of thousands of real
       * documents, and it is the whole claim the family makes: a space you
       * can look through, gated over its entirety rather than over a sample.
       *
       * So a test here running for seconds is the work happening, not a hang.
       * Five seconds is enough on a developer's machine and is not on a CI
       * runner, which makes the default a source of flakes rather than a
       * useful signal — the same reason
       * `meander-topology.service.integration.test.ts` declared a minute of
       * its own long before this did.
       */
      testTimeout: 60_000,
    },
  }),
);
