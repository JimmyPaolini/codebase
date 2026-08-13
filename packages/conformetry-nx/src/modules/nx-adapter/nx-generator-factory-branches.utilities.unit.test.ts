import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nx/devkit", async (importOriginal) => {
  const originalModule: Record<string, unknown> = await importOriginal();

  return {
    ...originalModule,
    getProjects: mockGetProjects,
  };
});

import {
  createConformetryGeneratorFactory,
  resolveConformetryTargetDirectoryPath,
} from "./nx-generator-factory.utilities";

import type { Tree } from "@nx/devkit";

type MockGetProjects = () => Map<
  string,
  { root?: string; sourceRoot?: string }
>;

const { mockGetProjects } = vi.hoisted(() => {
  return {
    mockGetProjects: vi.fn<MockGetProjects>(),
  };
});

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

describe("nx-generator-factory branches", () => {
  beforeEach(() => {
    mockGetProjects.mockReset();
  });

  it("returns an async callback and resolves project root from projectName", async () => {
    mockGetProjects.mockReturnValue(
      new Map([
        [
          "demo-project",
          {
            root: "apps/demo-project",
          },
        ],
      ]),
    );

    const factory = createConformetryGeneratorFactory({
      definition: {
        name: "demo-generator",
        templateDirectoryPath: "templates",
      },
    });

    const callback = await factory(createStubTree(), {
      enabled: true,
      name: "demo",
      nested: { alpha: "one" },
      projectName: "demo-project",
      retries: 3,
      skipped: undefined,
    });

    await expect(callback()).resolves.toBeUndefined();
  });

  it("uses sourceRoot when root is unavailable", async () => {
    mockGetProjects.mockReturnValue(
      new Map([
        [
          "demo-project",
          {
            sourceRoot: "packages/demo-project/src",
          },
        ],
      ]),
    );

    const resolvedPath = await resolveConformetryTargetDirectoryPath({
      definition: {
        name: "demo-generator",
        templateDirectoryPath: "templates",
      },
      options: {
        project: "demo-project",
      },
      tree: createStubTree(),
    });

    expect(resolvedPath).toBe("packages/demo-project/src");
  });

  it("prioritizes explicit output path options over project inference", async () => {
    mockGetProjects.mockReturnValue(new Map());

    await expect(
      resolveConformetryTargetDirectoryPath({
        definition: {
          name: "demo-generator",
          templateDirectoryPath: "templates",
        },
        options: {
          targetDirectoryPath: "target-directory",
        },
        tree: createStubTree(),
      }),
    ).resolves.toBe("target-directory");

    await expect(
      resolveConformetryTargetDirectoryPath({
        definition: {
          name: "demo-generator",
          templateDirectoryPath: "templates",
        },
        options: {
          outputDirectoryPath: "output-directory",
        },
        tree: createStubTree(),
      }),
    ).resolves.toBe("output-directory");

    await expect(
      resolveConformetryTargetDirectoryPath({
        definition: {
          name: "demo-generator",
          templateDirectoryPath: "templates",
        },
        options: {
          outputPath: "output-path",
        },
        tree: createStubTree(),
      }),
    ).resolves.toBe("output-path");
  });

  it("falls back to generated/<name> when no explicit path or project root exists", async () => {
    mockGetProjects.mockReturnValue(new Map());

    const resolvedPath = await resolveConformetryTargetDirectoryPath({
      definition: {
        name: "demo-generator",
        templateDirectoryPath: "templates",
      },
      options: {
        projectName: "missing-project",
      },
      tree: createStubTree(),
    });

    expect(resolvedPath).toBe("generated/demo-generator");
  });

  it("falls back to generated/<name> when project option is not a string", async () => {
    mockGetProjects.mockReturnValue(new Map());

    const resolvedPath = await resolveConformetryTargetDirectoryPath({
      definition: {
        name: "demo-generator",
        templateDirectoryPath: "templates",
      },
      options: {
        projectName: 123,
      },
      tree: createStubTree(),
    });

    expect(resolvedPath).toBe("generated/demo-generator");
  });

  it("uses custom target directory resolver when provided", async () => {
    const resolveTargetDirectoryPath = vi
      .fn<
        ({
          options,
          tree,
        }: {
          options: Record<string, unknown>;
          tree: Tree;
        }) => Promise<string>
      >()
      .mockResolvedValue("custom-target");

    const factory = createConformetryGeneratorFactory({
      definition: {
        name: "demo-generator",
        templateDirectoryPath: "templates",
      },
      resolveTargetDirectoryPath,
    });

    const callback = await factory(createStubTree(), { name: "demo" });

    expect(resolveTargetDirectoryPath).toHaveBeenCalledTimes(1);
    await expect(callback()).resolves.toBeUndefined();
  });
});
