import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetProjects } = vi.hoisted(() => {
  return {
    mockGetProjects: vi.fn<() => Map<string, unknown>>(),
  };
});

vi.mock("@nx/devkit", async (importOriginal) => {
  const originalModule: Record<string, unknown> = await importOriginal();

  return {
    ...originalModule,
    getProjects: mockGetProjects,
  };
});

import { InputOptionsService } from "@jimmypaolini/conformetry-configuration";

import { CommandExecutionService } from "../command-execution/command-execution.service";
import { PluginOptionsService } from "../plugin-options/plugin-options.service";

import { GenerationService } from "./generation.service";

import type { Tree } from "@nx/devkit";

function createStubTree(): Tree {
  const read: Tree["read"] = (_pathName: string, encoding?: BufferEncoding) => {
    return encoding === undefined ? null : null;
  };

  return {
    changePermissions: (_pathName: string, _mode: number) => {},
    children: (_pathName: string) => {
      return [];
    },
    delete: (_pathName: string) => {},
    exists: (_pathName: string) => {
      return false;
    },
    isFile: (_pathName: string) => {
      return false;
    },
    listChanges: () => {
      return [];
    },
    read,
    rename: (_fromPathName: string, _toPathName: string) => {},
    root: ".",
    write: (_pathName: string, _content: Buffer | string) => {},
  };
}

describe(GenerationService, () => {
  const commandExecutionService = new CommandExecutionService();
  const inputOptionsService = new InputOptionsService();
  const mockNormalizeRuntimeOptions = vi.spyOn(
    inputOptionsService,
    "normalizeRuntimeOptions",
  );
  const mockResolveTargetDirectoryPath = vi.spyOn(
    inputOptionsService,
    "resolveTargetDirectoryPath",
  );
  const pluginOptionsService = new PluginOptionsService();

  const runGenerateCommandSpy = vi.spyOn(
    commandExecutionService,
    "runGenerateCommand",
  );
  const resolveConformetryNxPluginOptionsSpy = vi.spyOn(
    pluginOptionsService,
    "resolveConformetryNxPluginOptions",
  );
  const resolveConformetryConfigurationPathSpy = vi.spyOn(
    pluginOptionsService,
    "resolveConformetryConfigurationPath",
  );

  beforeEach(() => {
    mockGetProjects.mockReset();
    mockNormalizeRuntimeOptions.mockReset();
    mockResolveTargetDirectoryPath.mockReset();
    runGenerateCommandSpy.mockReset();
    resolveConformetryNxPluginOptionsSpy.mockReset();
    resolveConformetryConfigurationPathSpy.mockReset();
  });

  it("builds generate parameters and filters internal option names", () => {
    const service = new GenerationService(
      commandExecutionService,
      inputOptionsService,
      pluginOptionsService,
    );

    expect(
      service.buildGeneratePassedParameters({
        generatorInputs: {
          config: "configuration/conformetry.config.ts",
          featureFlag: "enabled",
          name: "custom-name",
          targetDirectoryPath: "generated/demo",
          undefinedValue: undefined,
        },
        name: "react-component",
        targetDirectoryPath: "generated/demo",
      }),
    ).toStrictEqual([
      "generate",
      "--name",
      "react-component",
      "--directory",
      "generated/demo",
      "--feature-flag",
      "enabled",
    ]);
  });

  it("runs conformetry generation and returns an async callback", async () => {
    const tree = createStubTree();

    resolveConformetryNxPluginOptionsSpy.mockReturnValue({
      validationTargetName: "validate-custom",
    });
    resolveConformetryConfigurationPathSpy.mockResolvedValue(
      "configuration/custom.config.ts",
    );
    mockNormalizeRuntimeOptions.mockReturnValue({
      componentName: "demo",
      outputPath: "generated/react-component",
    });
    mockGetProjects.mockReturnValue(
      new Map([
        [
          "demo-project",
          {
            sourceRoot: "applications/demo-project/src",
          },
        ],
      ]),
    );
    mockResolveTargetDirectoryPath.mockImplementation(
      ({
        resolveProjectRootPath,
      }: {
        resolveProjectRootPath?: (projectName: string) => string | undefined;
      }) => {
        return (
          resolveProjectRootPath?.("demo-project") ??
          "generated/react-component"
        );
      },
    );
    runGenerateCommandSpy.mockResolvedValue(undefined);

    const service = new GenerationService(
      commandExecutionService,
      inputOptionsService,
      pluginOptionsService,
    );

    const callback = await service.runConformetryGenerator({
      generatorName: "react-component",
      options: {
        componentName: "demo",
      },
      pluginOptions: {
        validationTargetName: "validate-custom",
      },
      tree,
    });

    expect(resolveConformetryNxPluginOptionsSpy).toHaveBeenCalledWith({
      validationTargetName: "validate-custom",
    });
    expect(resolveConformetryConfigurationPathSpy).toHaveBeenCalledWith({
      options: {
        componentName: "demo",
      },
      pluginOptions: {
        validationTargetName: "validate-custom",
      },
    });
    expect(runGenerateCommandSpy).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      generatorName: "react-component",
      passedParameters: [
        "generate",
        "--name",
        "react-component",
        "--directory",
        "applications/demo-project/src",
        "--component-name",
        "demo",
        "--output-path",
        "generated/react-component",
      ],
      targetDirectoryPath: "applications/demo-project/src",
    });
    await expect(callback()).resolves.toBeUndefined();
  });
});
