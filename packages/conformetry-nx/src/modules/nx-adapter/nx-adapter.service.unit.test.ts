import { beforeEach, describe, expect, it, vi } from "vitest";

import { NxAdapterService } from "./nx-adapter.service";
import { NxGeneratorFactoryService } from "./nx-generator-factory.service";

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

describe(NxAdapterService, () => {
  const nxGeneratorFactoryService = new NxGeneratorFactoryService();
  const createConformetryGeneratorFactorySpy = vi.spyOn(
    nxGeneratorFactoryService,
    "createConformetryGeneratorFactory",
  );
  const normalizeGeneratorInputsSpy = vi.spyOn(
    nxGeneratorFactoryService,
    "normalizeGeneratorInputs",
  );
  const resolveConformetryTargetDirectoryPathSpy = vi.spyOn(
    nxGeneratorFactoryService,
    "resolveConformetryTargetDirectoryPath",
  );

  beforeEach(() => {
    createConformetryGeneratorFactorySpy.mockReset();
    normalizeGeneratorInputsSpy.mockReset();
    resolveConformetryTargetDirectoryPathSpy.mockReset();
  });

  it("delegates generator factory creation", async () => {
    const callback = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    createConformetryGeneratorFactorySpy.mockReturnValue(async () => {
      await Promise.resolve();
      return callback;
    });

    const service = new NxAdapterService(nxGeneratorFactoryService);
    const factory = service.createConformetryGeneratorFactory({
      definition: {
        name: "react-component",
        templateDirectoryPath: "templates",
      },
    });

    const generatorCallback = await factory(createStubTree(), { name: "demo" });

    await expect(generatorCallback()).resolves.toBeUndefined();
    expect(createConformetryGeneratorFactorySpy).toHaveBeenCalledTimes(1);
  });

  it("delegates input normalization", () => {
    normalizeGeneratorInputsSpy.mockReturnValue({
      name: "demo",
    });

    const service = new NxAdapterService(nxGeneratorFactoryService);

    expect(
      service.normalizeGeneratorInputs({
        name: "demo",
      }),
    ).toStrictEqual({
      name: "demo",
    });
    expect(normalizeGeneratorInputsSpy).toHaveBeenCalledTimes(1);
  });

  it("delegates target directory resolution", async () => {
    resolveConformetryTargetDirectoryPathSpy.mockResolvedValue(
      "generated/react-component",
    );
    const service = new NxAdapterService(nxGeneratorFactoryService);

    await expect(
      service.resolveConformetryTargetDirectoryPath({
        definition: {
          name: "react-component",
          templateDirectoryPath: "templates",
        },
        options: {},
        tree: createStubTree(),
      }),
    ).resolves.toBe("generated/react-component");
    expect(resolveConformetryTargetDirectoryPathSpy).toHaveBeenCalledTimes(1);
  });
});
