import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ConfigurationModule,
  InstanceDiscoveryModule,
} from "@conformetry/configuration";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScopeModule } from "../scope/scope.module";

import { InstancesService } from "./instances.service";

import type { ProjectScope } from "./instances.types";

const PROJECT: ProjectScope = {
  name: "widgets",
  root: "packages/widgets",
  tags: ["type:package"],
};

/**
 * Writes a workspace with two projects and a config whose globs cover both, so
 * the per-project filter has something to exclude.
 */
async function createWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "conformetry-nx-workspace-"),
  );

  for (const projectName of ["widgets", "gadgets"]) {
    const modulePath = path.join(
      workspaceRoot,
      "packages",
      projectName,
      "src/modules/errors",
    );

    await mkdir(modulePath, { recursive: true });
    await writeFile(path.join(modulePath, "errors.service.ts"), "", "utf8");
  }

  await writeFile(
    path.join(workspaceRoot, "conformetry.config.json"),
    JSON.stringify([
      {
        instances: [
          // A tagged group's globs are read inside each selected project.
          { patterns: ["src/modules/*"], tags: ["type:package"] },
          { patterns: ["nowhere/*"], tags: ["type:application"] },
        ],
        name: "widget",
        templatePath: "templates/widget",
      },
    ]),
    "utf8",
  );

  return workspaceRoot;
}

describe(InstancesService, () => {
  let service: InstancesService;
  let workspaceRoot: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigurationModule, InstanceDiscoveryModule, ScopeModule],
      providers: [InstancesService],
    }).compile();

    service = await module.resolve(InstancesService);
    workspaceRoot = await createWorkspace();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findProjectInstances", () => {
    it("keeps only the instances inside the project", async () => {
      const instances = await service.findProjectInstances({
        configurationPath: path.join(workspaceRoot, "conformetry.config.json"),
        project: PROJECT,
        workspaceRoot,
      });

      expect(instances).toHaveLength(1);
      expect(instances[0]?.path).toContain("packages/widgets/src/modules");
      expect(instances[0]?.nameStem).toBe("errors");
    });

    it("resolves an untagged group as a workspace glob", async () => {
      // The form a host with no project graph writes: taken as authored, then
      // kept only where it lands inside the project being validated.
      await writeFile(
        path.join(workspaceRoot, "workspace.config.json"),
        JSON.stringify([
          {
            instances: [{ patterns: ["packages/*/src/modules/*"] }],
            name: "widget",
            templatePath: "templates/widget",
          },
        ]),
        "utf8",
      );

      const instances = await service.findProjectInstances({
        configurationPath: path.join(workspaceRoot, "workspace.config.json"),
        project: PROJECT,
        workspaceRoot,
      });

      expect(instances).toHaveLength(1);
      expect(instances[0]?.nameStem).toBe("errors");
    });

    it("carries an instance group's threshold onto the instances it locates", async () => {
      await writeFile(
        path.join(workspaceRoot, "threshold.config.json"),
        JSON.stringify([
          {
            instances: [
              {
                patterns: ["src/modules/*"],
                tags: ["type:package"],
                threshold: 0.75,
              },
            ],
            name: "widget",
            templatePath: "templates/widget",
          },
        ]),
        "utf8",
      );

      const instances = await service.findProjectInstances({
        configurationPath: path.join(workspaceRoot, "threshold.config.json"),
        project: PROJECT,
        workspaceRoot,
      });

      expect(instances[0]?.threshold).toBe(0.75);
    });

    it("leaves the threshold unset when the group declares none", async () => {
      // Unset rather than defaulted to 1, so a run-level flag still applies.
      const instances = await service.findProjectInstances({
        configurationPath: path.join(workspaceRoot, "conformetry.config.json"),
        project: PROJECT,
        workspaceRoot,
      });

      expect(instances[0]?.threshold).toBeUndefined();
    });

    it("skips groups whose tags the project does not carry", async () => {
      const instances = await service.findProjectInstances({
        configurationPath: path.join(workspaceRoot, "conformetry.config.json"),
        project: { ...PROJECT, tags: ["type:application"] },
        workspaceRoot,
      });

      expect(instances).toStrictEqual([]);
    });
  });
});
