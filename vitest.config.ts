import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "./configuration/vitest.config";

/**
 * Vitest configuration for the root `codebase` project.
 *
 * The root project owns the repository's own tooling — the files under
 * `configuration/` that every other project is checked with. Module boundaries
 * stop any package from importing them, so this is the only side of the
 * boundary their behavior can be covered from.
 *
 * Coverage is measured over the files that actually have tests rather than all
 * of `configuration/`, so the shared thresholds stay meaningful instead of
 * failing on the config files nobody has covered yet.
 */
export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: ["testing/**"],
        include: ["configuration/lint-staged.config.ts"],
      },
    },
  }),
);
