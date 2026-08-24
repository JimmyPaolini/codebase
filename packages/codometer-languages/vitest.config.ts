import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
        // Every `@Injectable()` service's compiled decorator metadata emits
        // one branch no test can reach, and several analyzers additionally
        // carry `noUncheckedIndexedAccess`-mandated fallbacks that are
        // provably always-defined given their own logic (a regex whose
        // capturing group always matches, a counter map pre-seeded before
        // it is ever read). Both are structural, not a coverage shortfall.
        thresholds: { branches: 94 },
      },
    },
  }),
);
