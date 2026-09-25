import { defineConfig } from "vitest/config";

const vitestConfig = defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov", "html"],
      reportOnFailure: true,
      thresholds: {
        branches: 96,
        functions: 96,
        lines: 96,
        statements: 96,
      },
    },
    globals: false,
    include: [
      "src/**/*.test.js",
      "src/**/*.test.jsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "testing/**/*.test.js",
      "testing/**/*.test.jsx",
      "testing/**/*.test.ts",
      "testing/**/*.test.tsx",
    ],
    setupFiles: ["./testing/setup.ts"],
  },
});

export default vitestConfig;
