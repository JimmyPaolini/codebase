import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { FsTree } from "nx/src/generators/tree";
import { beforeAll, describe, expect, it } from "vitest";

import { PathsModule } from "./paths.module";
import { PathsService } from "./paths.service";

import type { Tree } from "@nx/devkit";

/**
 * Builds a workspace whose modules sit under `src/modules`, plus one stray
 * directory elsewhere, so the "most common parent" rule has something to beat.
 */
async function createWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-paths-"),
  );

  for (const moduleName of ["errors", "logger"]) {
    const modulePath = path.join(
      workspaceRoot,
      "packages/widgets/src/modules",
      moduleName,
    );

    await mkdir(modulePath, { recursive: true });
    await writeFile(
      path.join(modulePath, `${moduleName}.service.ts`),
      "",
      "utf8",
    );
  }

  const strayPath = path.join(workspaceRoot, "packages/widgets/src/legacy/odd");

  await mkdir(strayPath, { recursive: true });
  await writeFile(path.join(strayPath, "odd.service.ts"), "", "utf8");
  await mkdir(path.join(workspaceRoot, "packages/empty"), { recursive: true });

  for (const project of [
    { name: "widgets", root: "packages/widgets" },
    { name: "empty", root: "packages/empty" },
  ]) {
    await writeFile(
      path.join(workspaceRoot, project.root, "project.json"),
      JSON.stringify({ name: project.name, root: project.root }),
      "utf8",
    );
  }

  await writeFile(
    path.join(workspaceRoot, "conformetry.config.json"),
    JSON.stringify([
      {
        instances: [{ patterns: ["packages/*/src/*/*"] }],
        name: "widget",
        templatePath: "templates/widget",
      },
    ]),
    "utf8",
  );

  return workspaceRoot;
}

describe(PathsService, () => {
  let configurationPath: string;
  let service: PathsService;
  let tree: Tree;
  let workspaceRoot: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PathsModule],
    }).compile();

    service = await module.resolve(PathsService);
    workspaceRoot = await createWorkspace();
    configurationPath = path.join(workspaceRoot, "conformetry.config.json");
    // A real tree over the temporary workspace: `readProjectConfiguration`
    // walks the tree for `project.json` files rather than reading one path,
    // so a hand-rolled fake cannot stand in for it.
    tree = new FsTree(workspaceRoot, false);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveGenerationPath", () => {
    it("honours an explicit directory", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { directory: "somewhere/else", name: "my-widget" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "somewhere/else"));
    });

    it("returns the directory the project's existing modules sit in", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/widgets/src/modules"));
    });

    it("writes into an existing module when one is named", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { module: "errors", name: "my-widget", project: "widgets" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(
        path.join(workspaceRoot, "packages/widgets/src/modules/errors"),
      );
    });

    it("falls back to the project root when it has no modules yet", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget", project: "empty" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages/empty"));
    });

    it("returns the directory its type's projects already sit in", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-package", type: "packages" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(path.join(workspaceRoot, "packages"));
    });

    it("falls back to the workspace root when nothing locates the output", async () => {
      await expect(
        service.resolveGenerationPath({
          configurationPath,
          inputs: { name: "my-widget" },
          tree,
          workspaceRoot,
        }),
      ).resolves.toBe(workspaceRoot);
    });
  });
});
