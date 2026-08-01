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
});
