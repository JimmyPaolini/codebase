import { describe, expect, it, vi } from "vitest";

import { ValidationService } from "./validation.service";

describe(ValidationService, () => {
  it("returns success when all supplied plugins pass", async () => {
    const validationService = new ValidationService(
      {
        loadConformetryConfiguration: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".ts"], name: "typescript" },
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".py"], name: "python" },
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".md"], name: "markdown" },
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".json"], name: "json" },
      } as never,
      { pluginDescriptor: { fileExtensions: [".txt"], name: "text" } } as never,
    );
    const result = await validationService.validate({
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
    const validationService = new ValidationService(
      {
        loadConformetryConfiguration: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".ts"], name: "typescript" },
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".py"], name: "python" },
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".md"], name: "markdown" },
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".json"], name: "json" },
      } as never,
      { pluginDescriptor: { fileExtensions: [".txt"], name: "text" } } as never,
    );
    const result = await validationService.validate({
      configurationPath: "configuration/conformetry.config.ts",
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
              violations: ["demo.ts: failed"],
            };
          },
        },
      ],
      projectPaths: ["packages/demo"],
      templateRuleNames: ["nestjs-service-module"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.pluginResults[0]?.checkedPaths).toStrictEqual([
      "packages/demo",
    ]);
    expect(result.pluginResults[1]?.checkedPaths).toStrictEqual([
      "packages/demo",
    ]);
    expect(result.pluginResults[1]?.violations).toStrictEqual([
      "demo.ts: failed",
    ]);
  });

  it("loads configuration and routes rules/projects before running plugin validation", async () => {
    const loadConformetryConfiguration = vi.fn().mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
        "react-component": {},
      },
    });
    const jsonValidate = vi.fn(
      async ({ filePaths }: { filePaths: string[] }) => {
        await Promise.resolve();
        return {
          checkedPaths: filePaths,
          ok: true,
          pluginName: "json",
          violations: [],
        };
      },
    );
    const validationService = new ValidationService(
      {
        loadConformetryConfiguration,
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".ts"], name: "typescript" },
        validate: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".py"], name: "python" },
        validate: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".md"], name: "markdown" },
        validate: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".json"], name: "json" },
        validate: jsonValidate,
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".txt"], name: "text" },
        validate: vi.fn(),
      } as never,
    );

    const result = await validationService.validateConfiguredSelection({
      configurationPath: "configuration/custom.config.ts",
      requestedProjectPaths: ["packages/conformetry"],
      requestedRuleNames: ["json", "react-component", "non-existent-rule"],
      workingDirectory: process.cwd(),
    });

    expect(loadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/custom.config.ts",
    );
    expect(jsonValidate).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.pluginResults[0]?.checkedPaths).toStrictEqual([
      "packages/conformetry",
    ]);
  });
});
