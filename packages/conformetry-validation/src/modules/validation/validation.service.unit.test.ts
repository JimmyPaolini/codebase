import { describe, expect, it } from "vitest";

import { ValidationService } from "./validation.service.js";

describe(ValidationService, () => {
  it("returns success when all supplied plugins pass", async () => {
    const validationService = new ValidationService();
    const result = await validationService.runValidation({
      plugins: [
        {
          descriptor: {
            fileExtensions: [".ts"],
            name: "test-plugin",
          },
          validate: async ({ filePaths }) => {
            await Promise.resolve();
            return {
              checkedPaths: filePaths,
              ok: true,
              pluginName: "test-plugin",
              violations: [],
            };
          },
        },
      ],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
  });

  it("uses explicit project paths and returns a failed result when any plugin fails", async () => {
    const validationService = new ValidationService();
    const result = await validationService.runValidation({
      plugins: [
        {
          descriptor: {
            fileExtensions: [".ts"],
            name: "pass-plugin",
          },
          validate: async ({ filePaths }) => {
            await Promise.resolve();
            return {
              checkedPaths: filePaths,
              ok: true,
              pluginName: "pass-plugin",
              violations: [],
            };
          },
        },
        {
          descriptor: {
            fileExtensions: [".ts"],
            name: "fail-plugin",
          },
          validate: async ({ filePaths }) => {
            await Promise.resolve();
            return {
              checkedPaths: filePaths,
              ok: false,
              pluginName: "fail-plugin",
              violations: [
                {
                  filePath: "demo.ts",
                  message: "failed",
                },
              ],
            };
          },
        },
      ],
      projectPaths: ["packages/demo"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.pluginResults[0]?.checkedPaths).toStrictEqual([
      "packages/demo",
    ]);
    expect(result.pluginResults[1]?.checkedPaths).toStrictEqual([
      "packages/demo",
    ]);
  });
});
