import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        /**
         * Nothing under `src/` is instrumented, and that is the point.
         *
         * This package's source is fixture code: it exists to be *read* by the
         * type checker, not executed by a test. Every callable in it is shaped
         * to make one resolution rule, one finding, or one annotation visible,
         * and executing them would prove nothing about any of that — an
         * orphan-root fixture is defined by having no caller, so a test calling
         * it would destroy the example it is.
         *
         * What is verified instead is what callidescope *makes* of the
         * fixtures: `testing/findings.integration.test.ts` traces the package
         * and asserts every finding the guides document. That is the behavior
         * worth covering, and it is covered exactly.
         */
        include: [],
      },
    },
  }),
);
