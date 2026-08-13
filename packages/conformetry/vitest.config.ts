import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "../../configuration/vitest.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      coverage: {
        // The integration test compiles the whole application graph, which
        // pulls every workspace dependency into the module graph. Each of
        // those packages owns its own coverage; measuring them again here
        // would make this package answerable for code it does not contain.
        // A relative `../**` is not honoured here, so the dependencies are
        // named directly.
        exclude: ["src/**/*.test.ts", "**/conformetry-*/src/**"],
        include: ["src/**/*.ts"],
      },
    },
  }),
);
