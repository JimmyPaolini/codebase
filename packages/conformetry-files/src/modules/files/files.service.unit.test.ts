import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { DiscoveryModule } from "@jimmypaolini/conformetry-configuration";
import { ErrorsModule } from "@jimmypaolini/conformetry-core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { FilesService } from "./files.service";

/** Tests run from the package directory; templates resolve from the root. */
const WORKSPACE_ROOT = path.resolve(process.cwd(), "..", "..");

describe(FilesService, () => {
  let service: FilesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DiscoveryModule, ErrorsModule],
      providers: [FilesService],
    }).compile();

    service = await module.resolve(FilesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reports nothing for a project that has every template file", async () => {
    await expect(
      service.checkProjectFiles({
        configurationPath: "configuration/conformetry.config.ts",
        projectPaths: ["packages/conformetry-core"],
        workingDirectory: WORKSPACE_ROOT,
      }),
    ).resolves.toStrictEqual([]);
  });

  it("reports nothing for a directory that matches no template", async () => {
    const emptyProjectPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-files-empty-"),
    );

    await expect(
      service.checkProjectFiles({
        configurationPath: "configuration/conformetry.config.ts",
        projectPaths: [emptyProjectPath],
        workingDirectory: WORKSPACE_ROOT,
      }),
    ).resolves.toStrictEqual([]);
  });

  it("reports a missing file against a matched template", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "conformetry-files-"));
    const projectPath = path.join(workspace, "packages", "conformetry-core");

    await mkdir(projectPath, { recursive: true });
    // Enough of the template to match, but missing .gitignore and the rest.
    await writeFile(path.join(projectPath, "README.md"), "# x\n", "utf8");
    await writeFile(path.join(projectPath, "package.json"), "{}\n", "utf8");

    const results = await service.checkProjectFiles({
      configurationPath: path.join(
        WORKSPACE_ROOT,
        "configuration/conformetry.config.ts",
      ),
      projectPaths: [projectPath],
      workingDirectory: WORKSPACE_ROOT,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.filename === ".gitignore")).toBe(
      true,
    );
    expect(results[0]?.errors[0]?.fix).toContain("Create the");
  });
});
