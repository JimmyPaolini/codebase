import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetProjects, mockRunGenerator } = vi.hoisted(() => {
  return {
    mockGetProjects: vi.fn(),
    mockRunGenerator: vi.fn(),
  };
});

vi.mock("@nx/devkit", async (importOriginal) => {
  const originalModule: Record<string, unknown> = await importOriginal();

  return {
    ...originalModule,
    getProjects: mockGetProjects,
  };
});

vi.mock("./nx-generation-runtime", async (importOriginal) => {
  const originalModule: Record<string, unknown> = await importOriginal();

  class MockGenerationRuntimeService {
    public async runGenerator(
      args: Parameters<GenerationRuntimeService["runGenerator"]>[0],
    ): Promise<RunGeneratorResult> {
      mockRunGenerator(args);
      await Promise.resolve();

      return {
        generatedFilePaths: [],
        outputDirectoryPath: args.targetDirectoryPath,
      };
    }
  }

  return {
    ...originalModule,
    GenerationRuntimeService: MockGenerationRuntimeService,
  };
});

import {
  createConformetryGeneratorFactory,
  resolveConformetryTargetDirectoryPath,
} from "./nx-generator-factory.js";

import type {
  GenerationRuntimeService,
  RunGeneratorResult,
} from "./nx-generation-runtime.js";
import type { Tree } from "@nx/devkit";

describe("nx-generator-factory branches", () => {
  beforeEach(() => {
    mockGetProjects.mockReset();
    mockRunGenerator.mockReset();
  });

  it("normalizes option value types and resolves project root from projectName", async () => {
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
        schemaPath: "schema.json",
        templateDirectoryPath: "templates",
      },
    });

    await factory({} as Tree, {
      enabled: true,
      name: "demo",
      nested: { alpha: "one" },
      projectName: "demo-project",
      retries: 3,
      skipped: undefined,
    });

    expect(mockRunGenerator).toHaveBeenCalledTimes(1);

    const runArguments = mockRunGenerator.mock.calls[0]?.[0] as {
      inputs: Record<string, string | undefined>;
      targetDirectoryPath: string;
    };

    expect(runArguments.targetDirectoryPath).toBe("apps/demo-project");
    expect(runArguments.inputs).toStrictEqual({
      enabled: "true",
      name: "demo",
      nested: '{"alpha":"one"}',
      projectName: "demo-project",
      retries: "3",
      skipped: undefined,
    });
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
        schemaPath: "schema.json",
        templateDirectoryPath: "templates",
      },
      options: {
        project: "demo-project",
      },
      tree: {} as Tree,
    });

    expect(resolvedPath).toBe("packages/demo-project/src");
  });

  it("prioritizes explicit output path options over project inference", async () => {
    mockGetProjects.mockReturnValue(new Map());

    await expect(
      resolveConformetryTargetDirectoryPath({
        definition: {
          name: "demo-generator",
          schemaPath: "schema.json",
          templateDirectoryPath: "templates",
        },
        options: {
          targetDirectoryPath: "target-directory",
        },
        tree: {} as Tree,
      }),
    ).resolves.toBe("target-directory");

    await expect(
      resolveConformetryTargetDirectoryPath({
        definition: {
          name: "demo-generator",
          schemaPath: "schema.json",
          templateDirectoryPath: "templates",
        },
        options: {
          outputDirectoryPath: "output-directory",
        },
        tree: {} as Tree,
      }),
    ).resolves.toBe("output-directory");

    await expect(
      resolveConformetryTargetDirectoryPath({
        definition: {
          name: "demo-generator",
          schemaPath: "schema.json",
          templateDirectoryPath: "templates",
        },
        options: {
          outputPath: "output-path",
        },
        tree: {} as Tree,
      }),
    ).resolves.toBe("output-path");
  });

  it("falls back to generated/<name> when no explicit path or project root exists", async () => {
    mockGetProjects.mockReturnValue(new Map());

    const resolvedPath = await resolveConformetryTargetDirectoryPath({
      definition: {
        name: "demo-generator",
        schemaPath: "schema.json",
        templateDirectoryPath: "templates",
      },
      options: {
        projectName: "missing-project",
      },
      tree: {} as Tree,
    });

    expect(resolvedPath).toBe("generated/demo-generator");
  });

  it("falls back to generated/<name> when project option is not a string", async () => {
    mockGetProjects.mockReturnValue(new Map());

    const resolvedPath = await resolveConformetryTargetDirectoryPath({
      definition: {
        name: "demo-generator",
        schemaPath: "schema.json",
        templateDirectoryPath: "templates",
      },
      options: {
        projectName: 123,
      },
      tree: {} as Tree,
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
        schemaPath: "schema.json",
        templateDirectoryPath: "templates",
      },
      resolveTargetDirectoryPath,
    });

    const callback = await factory({} as Tree, { name: "demo" });

    expect(resolveTargetDirectoryPath).toHaveBeenCalledTimes(1);
    expect(mockRunGenerator).toHaveBeenCalledTimes(1);

    const firstRunCall = mockRunGenerator.mock.calls[0];

    expect(firstRunCall).toBeDefined();

    const runArguments = firstRunCall[0] as {
      targetDirectoryPath: string;
    };

    expect(runArguments.targetDirectoryPath).toBe("custom-target");
    await expect(callback()).resolves.toBeUndefined();
  });
});
