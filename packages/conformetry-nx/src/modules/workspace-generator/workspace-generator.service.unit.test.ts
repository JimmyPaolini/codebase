import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadNxJson } = vi.hoisted(() => {
  return {
    mockReadNxJson: vi.fn<() => Record<string, unknown> | undefined>(),
  };
});

vi.mock("@nx/devkit", async (importOriginal) => {
  const originalModule: Record<string, unknown> = await importOriginal();

  return {
    ...originalModule,
    readNxJson: mockReadNxJson,
  };
});

import { InputOptionsService } from "@jimmypaolini/conformetry-configuration";

import { CommandExecutionService } from "../command-execution/command-execution.service";
import { GenerationService } from "../generation/generation.service";
import { PluginOptionsService } from "../plugin-options/plugin-options.service";

import { WorkspaceGeneratorService } from "./workspace-generator.service";

import type { GeneratorCallback, Tree } from "@nx/devkit";

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

describe(WorkspaceGeneratorService, () => {
  const generationService = new GenerationService(
    new CommandExecutionService(),
    new InputOptionsService(),
    new PluginOptionsService(),
  );
  const pluginOptionsService = new PluginOptionsService();

  const runConformetryGeneratorSpy = vi.spyOn(
    generationService,
    "runConformetryGenerator",
  );
  const resolveConformetryNxPluginOptionsFromNxJsonSpy = vi.spyOn(
    pluginOptionsService,
    "resolveConformetryNxPluginOptionsFromNxJson",
  );

  beforeEach(() => {
    mockReadNxJson.mockReset();
    runConformetryGeneratorSpy.mockReset();
    resolveConformetryNxPluginOptionsFromNxJsonSpy.mockReset();
  });

  it("passes resolved plugin options and explicit generator options to generation", async () => {
    const tree = createStubTree();
    const callback = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    runConformetryGeneratorSpy.mockResolvedValueOnce(callback);
    mockReadNxJson.mockReturnValue({
      plugins: [],
    });
    resolveConformetryNxPluginOptionsFromNxJsonSpy.mockReturnValue({
      validationTargetName: "validate-custom",
    });

    const service = new WorkspaceGeneratorService(
      generationService,
      pluginOptionsService,
    );

    const returnedCallback = await service.runWorkspaceGenerator({
      generatorName: "react-component",
      options: {
        name: "demo",
      },
      tree,
    });

    expect(resolveConformetryNxPluginOptionsFromNxJsonSpy).toHaveBeenCalledWith(
      {
        nxJsonConfiguration: {
          plugins: [],
        },
      },
    );
    expect(runConformetryGeneratorSpy).toHaveBeenCalledWith({
      generatorName: "react-component",
      options: {
        name: "demo",
      },
      pluginOptions: {
        validationTargetName: "validate-custom",
      },
      tree,
    });
    await expect(returnedCallback()).resolves.toBeUndefined();
  });

  it("falls back to empty options and empty nx configuration when not provided", async () => {
    const tree = createStubTree();
    const callback: GeneratorCallback = async () => {
      await Promise.resolve();
    };
    runConformetryGeneratorSpy.mockResolvedValueOnce(callback);
    mockReadNxJson.mockReturnValue(undefined);
    resolveConformetryNxPluginOptionsFromNxJsonSpy.mockReturnValue({
      validationTargetName: "validate-custom",
    });

    const service = new WorkspaceGeneratorService(
      generationService,
      pluginOptionsService,
    );

    await service.runWorkspaceGenerator({
      generatorName: "react-component",
      options: undefined,
      tree,
    });

    expect(resolveConformetryNxPluginOptionsFromNxJsonSpy).toHaveBeenCalledWith(
      {
        nxJsonConfiguration: {},
      },
    );
    expect(runConformetryGeneratorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {},
      }),
    );
  });
});
