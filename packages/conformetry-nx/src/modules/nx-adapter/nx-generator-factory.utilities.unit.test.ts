import { beforeEach, describe, expect, it, vi } from "vitest";

import { NxGeneratorFactoryService } from "./nx-generator-factory.service";
import {
  createConformetryGeneratorFactory,
  normalizeGeneratorInputs,
  resolveConformetryTargetDirectoryPath,
} from "./nx-generator-factory.utilities";

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

describe("nx-generator-factory utilities", () => {
  const createFactorySpy = vi.spyOn(
    NxGeneratorFactoryService.prototype,
    "createConformetryGeneratorFactory",
  );
  const normalizeInputsSpy = vi.spyOn(
    NxGeneratorFactoryService.prototype,
    "normalizeGeneratorInputs",
  );
  const resolveTargetDirectoryPathSpy = vi.spyOn(
    NxGeneratorFactoryService.prototype,
    "resolveConformetryTargetDirectoryPath",
  );

  beforeEach(() => {
    createFactorySpy.mockReset();
    normalizeInputsSpy.mockReset();
    resolveTargetDirectoryPathSpy.mockReset();
  });

  it("delegates factory creation to NxGeneratorFactoryService", async () => {
    const tree = createStubTree();
    const callback = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    createFactorySpy.mockReturnValue(async () => {
      await Promise.resolve();
      return callback;
    });

    const generatorFactory = createConformetryGeneratorFactory({
      definition: {
        name: "react-component",
        templateDirectoryPath: "templates",
      },
    });

    const generatedCallback = await generatorFactory(tree, { name: "demo" });

    await expect(generatedCallback()).resolves.toBeUndefined();

    expect(createFactorySpy).toHaveBeenCalledTimes(1);
  });

  it("delegates generator input normalization to NxGeneratorFactoryService", () => {
    normalizeInputsSpy.mockReturnValue({
      enabled: "true",
      name: "demo",
    });

    expect(
      normalizeGeneratorInputs({
        enabled: true,
        name: "demo",
      }),
    ).toStrictEqual({
      enabled: "true",
      name: "demo",
    });
    expect(normalizeInputsSpy).toHaveBeenCalledTimes(1);
  });

  it("delegates target directory resolution to NxGeneratorFactoryService", async () => {
    const tree = createStubTree();
    resolveTargetDirectoryPathSpy.mockResolvedValue(
      "generated/react-component",
    );

    await expect(
      resolveConformetryTargetDirectoryPath({
        definition: {
          name: "react-component",
          templateDirectoryPath: "templates",
        },
        options: {
          outputPath: "generated/react-component",
        },
        tree,
      }),
    ).resolves.toBe("generated/react-component");

    expect(resolveTargetDirectoryPathSpy).toHaveBeenCalledTimes(1);
  });
});
