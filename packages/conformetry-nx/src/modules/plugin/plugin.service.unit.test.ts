import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { PluginModule } from "./plugin.module";
import { PluginService } from "./plugin.service";

import type { ProjectScope } from "../candidates/candidates.types";
import type { Tree } from "@nx/devkit";

const WIDGETS: ProjectScope = {
  name: "widgets",
  root: "packages/widgets",
  tags: ["type:package"],
};

const EMPTY: ProjectScope = {
  name: "empty",
  root: "packages/empty",
  tags: ["type:package"],
};

/**
 * Writes a workspace holding one conforming module, one drifted module, and a
 * project with nothing to validate.
 */
async function createWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-plugin-"),
  );
  const templatePath = path.join(workspaceRoot, "templates/widget");

  // A module template contains the folder it produces, so its tree is laid
  // over `src/modules` rather than over the module directory itself.
  await mkdir(path.join(templatePath, "{{nameKebabCase}}"), {
    recursive: true,
  });
  await writeFile(
    path.join(
      templatePath,
      "{{nameKebabCase}}",
      "{{nameKebabCase}}.config.json",
    ),
    '{\n  "kind": "widget",\n  "name": "{{nameKebabCase}}"\n}\n',
    "utf8",
  );

  const modulePath = path.join(
    workspaceRoot,
    "packages/widgets/src/modules/gears",
  );

  await mkdir(modulePath, { recursive: true });
  await writeFile(
    path.join(modulePath, "gears.config.json"),
    '{\n  "name": "gears"\n}\n',
    "utf8",
  );
  await mkdir(path.join(workspaceRoot, "packages/empty"), { recursive: true });

  for (const project of [WIDGETS, EMPTY]) {
    await writeFile(
      path.join(workspaceRoot, project.root, "project.json"),
      JSON.stringify({ name: project.name, tags: project.tags }),
      "utf8",
    );
  }

  await writeFile(
    path.join(workspaceRoot, "conformetry.config.json"),
    JSON.stringify([
      {
        instances: [{ patterns: ["packages/*/src/modules/*"] }],
        name: "widget",
        templatePath: "templates/widget",
      },
    ]),
    "utf8",
  );

  return workspaceRoot;
}

describe(PluginService, () => {
  let options: { configurationPath: string };
  let service: PluginService;
  let workspaceRoot: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PluginModule],
      providers: [PluginService],
    }).compile();

    service = await module.resolve(PluginService);
    workspaceRoot = await createWorkspace();
    options = {
      configurationPath: path.join(workspaceRoot, "conformetry.config.json"),
    };
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("inferTargets", () => {
    it("infers a validation target onto a project holding instances", async () => {
      const targets = await service.inferTargets({
        options,
        projectConfigurationFiles: ["packages/widgets/project.json"],
        workspaceRoot,
      });

      expect(targets.get("packages/widgets")).toStrictEqual({
        "conformetry-validate": {
          cache: true,
          executor: "@jimmypaolini/conformetry-nx:validate",
          options: {},
        },
      });
    });

    it("infers nothing onto a project with no instances", async () => {
      const targets = await service.inferTargets({
        options,
        projectConfigurationFiles: ["packages/empty/project.json"],
        workspaceRoot,
      });

      expect(targets.has("packages/empty")).toBe(false);
    });

    it("honours a configured target name", async () => {
      const targets = await service.inferTargets({
        options: { ...options, validateTargetName: "conform" },
        projectConfigurationFiles: ["packages/widgets/project.json"],
        workspaceRoot,
      });

      expect(Object.keys(targets.get("packages/widgets") ?? {})).toStrictEqual([
        "conform",
      ]);
    });
  });

  describe("runValidation", () => {
    it("reports the difference between an instance and its template", async () => {
      const result = await service.runValidation({
        options,
        project: WIDGETS,
        workspaceRoot,
      });

      expect(result.ok).toBe(false);
      expect(result.report).toContain("gears.config.json");
    });

    it("passes a project with nothing to validate", async () => {
      const result = await service.runValidation({
        options,
        project: EMPTY,
        workspaceRoot,
      });

      expect(result.ok).toBe(true);
    });
  });

  describe("runGenerator", () => {
    it("rejects a generator the configuration does not declare", async () => {
      await expect(
        service.runGenerator({
          generatorName: "nope",
          options,
          tree: createMock<Tree>({ root: workspaceRoot }),
          workspaceRoot,
        }),
      ).rejects.toThrow("Unknown conformetry generator: nope");
    });
  });
});
