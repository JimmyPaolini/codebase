import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/**/*.test.ts"],
        include: ["src/**/*.ts"],
        // `@Injectable()`'s compiled decorator metadata emits one branch no
        // test can reach, and this package has too few branches overall for
        // that single line to dilute away under the shared 96% gate.
        thresholds: { branches: 75 },
      },
    },
  }),
);
