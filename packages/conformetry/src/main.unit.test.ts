import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCommandFactoryRun = vi.fn<() => Promise<void>>(async () => {});

vi.mock("nest-commander", () => {
  return {
    CommandFactory: {
      run: mockCommandFactoryRun,
    },
  };
});

vi.mock("./main.module.js", () => {
  function MockMainModule(): void {}

  return {
    MainModule: MockMainModule,
  };
});

async function importMainModule(): Promise<void> {
  await import("./main");
}

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCommandFactoryRun.mockClear();
    process.argv = ["node", "conformetry"];
  });

  it("bootstraps the command factory without rewriting argv", async () => {
    process.argv = [
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
      "--project",
      "lexico-components",
    ];

    await importMainModule();

    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
    expect(process.argv).toStrictEqual([
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
      "--project",
      "lexico-components",
    ]);
    expect(process.env["CONFORMETRY_GENERATOR_OPTIONS"]).toBeUndefined();
  });

  describe("wrapper target wiring", () => {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDirectoryPath = path.dirname(currentFilePath);
    const workspaceRootPath = path.resolve(currentDirectoryPath, "../../../");

    it("disables cache for wrapper targets to avoid stale success results", async () => {
      expect.hasAssertions();

      const codebaseProjectConfiguration = JSON.parse(
        await readFile(path.join(workspaceRootPath, "project.json"), "utf8"),
      ) as {
        targets: {
          "conformetry-generate": {
            cache?: boolean;
          };
          "conformetry-validate": {
            cache?: boolean;
          };
        };
      };
      const conformetryProjectConfiguration = JSON.parse(
        await readFile(
          path.join(workspaceRootPath, "packages/conformetry/project.json"),
          "utf8",
        ),
      ) as {
        targets: {
          start: {
            cache?: boolean;
          };
        };
      };

      expect(
        codebaseProjectConfiguration.targets["conformetry-generate"].cache,
      ).toBe(false);
      expect(
        codebaseProjectConfiguration.targets["conformetry-validate"].cache,
      ).toBe(false);
      expect(conformetryProjectConfiguration.targets.start.cache).toBe(false);
    });

    it("keeps wrapper commands strict without masking failures", async () => {
      expect.hasAssertions();

      const codebaseProjectConfiguration = JSON.parse(
        await readFile(path.join(workspaceRootPath, "project.json"), "utf8"),
      ) as {
        targets: {
          "conformetry-generate": {
            options: {
              command: string;
            };
          };
          "conformetry-validate": {
            options: {
              command: string;
            };
          };
        };
      };

      expect(
        codebaseProjectConfiguration.targets["conformetry-generate"].options
          .command,
      ).not.toContain("|| true");
      expect(
        codebaseProjectConfiguration.targets["conformetry-validate"].options
          .command,
      ).not.toContain("|| true");
    });
  });
});
