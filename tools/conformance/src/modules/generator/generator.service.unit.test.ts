import path from "node:path";

import { Test } from "@nestjs/testing";
import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const {
  execSyncMock,
  fileSystemReadDirectorySyncMock,
  fileSystemReadFileSyncMock,
} = vi.hoisted(() => {
  return {
    execSyncMock:
      vi.fn<
        (
          command: string,
          options?: { cwd?: string; stdio?: "inherit" | "pipe" },
        ) => void
      >(),
    fileSystemReadDirectorySyncMock:
      vi.fn<
        (
          directoryPath: string,
          options?: { withFileTypes?: boolean },
        ) => { isDirectory: () => boolean; name: string }[]
      >(),
    fileSystemReadFileSyncMock:
      vi.fn<(filePath: string, encoding?: BufferEncoding) => string>(),
  };
});

vi.mock("node:child_process", () => ({
  execSync: execSyncMock,
}));

vi.mock("node:fs", () => ({
  default: {
    readdirSync: fileSystemReadDirectorySyncMock,
    readFileSync: fileSystemReadFileSyncMock,
  },
}));

vi.mock("@nx/devkit", async (importOriginal) => {
  const importedModule = await importOriginal();
  const actual =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...actual,
    workspaceRoot: "/workspace",
  };
});

vi.mock("nx/src/generators/tree", () => ({
  flushChanges: vi.fn<(root: string, changes: unknown[]) => void>(),
}));

import { GeneratorService } from "./generator.service";

interface FakeDirectoryEntry {
  isDirectory: () => boolean;
  name: string;
}

function createDirectoryEntry(name: string): FakeDirectoryEntry {
  return {
    isDirectory: (): boolean => {
      return true;
    },
    name,
  };
}

function createFileEntry(name: string): FakeDirectoryEntry {
  return {
    isDirectory: (): boolean => {
      return false;
    },
    name,
  };
}

describe(GeneratorService, () => {
  let service: GeneratorService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GeneratorService],
    }).compile();

    service = await module.resolve(GeneratorService);
  });

  beforeEach(() => {
    execSyncMock.mockClear();
    fileSystemReadDirectorySyncMock.mockClear();
    fileSystemReadFileSyncMock.mockClear();

    service = new GeneratorService();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("builds expected name substitutions", () => {
    expect(service.buildNameSubstitutions("alpha-module")).toStrictEqual({
      nameCamelCase: "alphaModule",
      nameKebabCase: "alpha-module",
      namePascalCase: "AlphaModule",
      nameSnakeCase: "alpha_module",
    });
  });

  it("builds structured generator log messages", () => {
    expect(
      service.buildLogMessage({
        data: {
          input: { name: "alpha-module" },
          resolved: { name: "alpha-module" },
        },
        emoji: "⚛️",
        label: "React component options",
      }),
    ).toBe(
      '⚛️ React component options: {"input":{"name":"alpha-module"},"resolved":{"name":"alpha-module"}}',
    );
  });

  it("returns generated file paths for the target directory", () => {
    const tree = createTreeWithEmptyWorkspace();

    tree.write("applications/demo/README.md", "# Demo");
    tree.write("applications/demo/src/index.ts", "export {};");
    tree.write("applications/other/skip.ts", "export {};");

    expect(
      service.getGeneratedFilePaths({
        instanceDirectoryPath: "applications/demo",
        tree,
      }),
    ).toStrictEqual([
      "applications/demo/README.md",
      "applications/demo/src/index.ts",
    ]);
  });

  it("renders templates recursively and preserves unknown placeholders", async () => {
    fileSystemReadDirectorySyncMock.mockImplementation(
      (directoryPath: string) => {
        if (directoryPath === "/templates") {
          return [
            createDirectoryEntry("__nameKebabCase__"),
            createFileEntry("README.__nameKebabCase__.md"),
          ];
        }

        if (directoryPath === "/templates/__nameKebabCase__") {
          return [
            createFileEntry("index.ts"),
            createFileEntry("__missingField__.txt"),
          ];
        }

        return [];
      },
    );

    fileSystemReadFileSyncMock.mockImplementation((filePath: string) => {
      if (filePath === "/templates/README.__nameKebabCase__.md") {
        return "# {{namePascalCase}}";
      }

      if (filePath === "/templates/__nameKebabCase__/index.ts") {
        return "export const value = '{{nameKebabCase}}'";
      }

      return "{{namePascalCase}}";
    });

    const tree = createTreeWithEmptyWorkspace();
    const writeMock = vi.spyOn(tree, "write");

    await service.generateFiles<{
      nameKebabCase: string;
      namePascalCase: string;
    }>({
      instanceDirectoryPath: "applications/demo",
      substitutions: {
        nameKebabCase: "alpha-module",
        namePascalCase: "AlphaModule",
      },
      templateDirectoryPath: "/templates",
      tree,
    });

    expect(writeMock).toHaveBeenNthCalledWith(
      1,
      path.join("applications/demo", "alpha-module", "index.ts"),
      "export const value = 'alpha-module'",
    );
    expect(writeMock).toHaveBeenNthCalledWith(
      2,
      path.join("applications/demo", "alpha-module", "__missingField__.txt"),
      "AlphaModule",
    );
    expect(writeMock).toHaveBeenNthCalledWith(
      3,
      path.join("applications/demo", "README.alpha-module.md"),
      "# AlphaModule",
    );
  });
});
