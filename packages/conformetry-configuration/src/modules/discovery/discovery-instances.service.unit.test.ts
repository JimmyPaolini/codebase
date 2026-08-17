import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryInstancesService } from "./discovery-instances.service";

/**
 * Builds a workspace holding two module directories, so directory globs and
 * file globs can be exercised against the same tree.
 */
async function createWorkspace(): Promise<string> {
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "conformetry-workspace-"),
  );

  for (const stem of ["errors", "logger"]) {
    const instancePath = path.join(
      workingDirectory,
      "packages/widgets/src/modules",
      stem,
    );

    await mkdir(instancePath, { recursive: true });

    for (const suffix of [
      ".module.ts",
      ".service.ts",
      ".service.unit.test.ts",
    ]) {
      await writeFile(path.join(instancePath, `${stem}${suffix}`), "", "utf8");
    }
  }

  return workingDirectory;
}

describe(DiscoveryInstancesService, () => {
  let service: DiscoveryInstancesService;
  let workingDirectory: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoveryInstancesService],
    }).compile();

    service = await module.resolve(DiscoveryInstancesService);
    workingDirectory = await createWorkspace();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findInstances", () => {
    it("names a directory instance by its basename and leaves the scope open", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*"],
        workingDirectory,
      });

      expect(instances.map((instance) => instance.nameStem)).toStrictEqual([
        "errors",
        "logger",
      ]);
      expect(instances[0]?.fileScope).toBeUndefined();
    });

    it("derives the type an instance's own location answers", () => {
      // The template's `project.json` renders `{{type}}/{{nameKebabCase}}`
      // into its paths, and where the instance sits already says which.
      expect(
        service.findInstances({
          patterns: ["packages/*"],
          workingDirectory,
        })[0]?.substitutions,
      ).toStrictEqual({ type: "packages" });
    });

    it("derives no type for an instance outside the working directory", () => {
      expect(
        service.findInstances({
          patterns: ["../*"],
          workingDirectory: path.join(workingDirectory, "packages"),
        })[0]?.substitutions,
      ).toStrictEqual({});
    });

    it("lets a configured substitution win over the derived one", () => {
      // What a workspace nesting its projects deeper needs.
      expect(
        service.findInstances({
          patterns: ["packages/*"],
          substitutions: { type: "libraries" },
          workingDirectory,
        })[0]?.substitutions,
      ).toStrictEqual({ type: "libraries" });
    });

    it("collapses file matches sharing a name into one scoped instance", () => {
      const instances = service.findInstances({
        patterns: [
          "packages/*/src/modules/*/*.service.ts",
          "packages/*/src/modules/*/*.service.unit.test.ts",
        ],
        workingDirectory,
      });

      expect(instances).toHaveLength(2);
      expect(instances[0]?.nameStem).toBe("errors");
      expect(
        instances[0]?.fileScope?.map((filePath) => path.basename(filePath)),
      ).toStrictEqual(["errors.service.ts", "errors.service.unit.test.ts"]);
    });

    it("keeps a directory instance separate from a file instance", () => {
      const instances = service.findInstances({
        patterns: [
          "packages/*/src/modules/errors",
          "packages/*/src/modules/errors/*.service.ts",
        ],
        workingDirectory,
      });

      expect(instances).toHaveLength(2);
      expect(
        instances.filter((instance) => instance.fileScope === undefined),
      ).toHaveLength(1);
    });

    it("falls back to the filename extension when a pattern names a file exactly", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*/errors.module.ts"],
        workingDirectory,
      });

      expect(instances[0]?.nameStem).toBe("errors.module");
    });

    it("applies caller substitutions to every instance", () => {
      const instances = service.findInstances({
        patterns: ["packages/*/src/modules/*"],
        substitutions: { type: "packages" },
        workingDirectory,
      });

      expect(
        instances.every((instance) => {
          return instance.substitutions?.["type"] === "packages";
        }),
      ).toBe(true);
    });

    it("returns nothing when a pattern matches nothing", () => {
      expect(
        service.findInstances({
          patterns: ["nowhere/*"],
          workingDirectory,
        }),
      ).toStrictEqual([]);
    });
  });
});
