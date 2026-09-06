import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  DEFAULT_SPREAD_THRESHOLD,
  ProjectConfigurationError,
  ProjectConfigurationFieldNotPermittedError,
} from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";
import { ProjectConfigurationService } from "./project-configuration.service";

import type { ProjectLimitsLookup } from "./configuration.types";

/**
 * Resolves a written-out workspace's limits through the whole path a run
 * takes: load the workspace file, load whatever the projects declared, resolve.
 */
async function resolveWrittenLimits(args: {
  configurationService: ConfigurationService;
  projects: readonly string[];
  service: ProjectConfigurationService;
  workspaceRoot: string;
}): Promise<ProjectLimitsLookup> {
  const workspaceConfigurationPath = path.join(
    args.workspaceRoot,
    "callidescope.config.json",
  );
  const workspace = await args.configurationService.loadConfigurationFile({
    configurationPath: workspaceConfigurationPath,
  });
  const projectConfigurations = await args.service.loadProjectConfigurations({
    projects: args.projects,
    workspaceConfigurationPath,
    workspaceRoot: args.workspaceRoot,
  });

  return args.service.resolveLimits({
    projectConfigurations,
    projects: args.projects,
    workspaceConfiguration: workspace.configuration,
    workspaceConfigurationPath,
  });
}

/**
 * Writes a fresh workspace holding one configuration file per named project.
 *
 * The contents are written verbatim, so staging a malformed file is as easy as
 * staging a well-formed one.
 */
async function writeWorkspace(
  projects: Record<string, string>,
): Promise<string> {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "callidescope-workspace-"),
  );

  for (const [project, contents] of Object.entries(projects)) {
    const projectRoot = path.join(workspaceRoot, project);

    await mkdir(projectRoot, { recursive: true });
    await writeFile(
      path.join(projectRoot, "callidescope.config.json"),
      contents,
      "utf8",
    );
  }

  return workspaceRoot;
}

describe(ProjectConfigurationService, () => {
  let configurationService: ConfigurationService;
  let service: ProjectConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationService, ProjectConfigurationService],
    }).compile();

    configurationService = await module.resolve(ConfigurationService);
    service = await module.resolve(ProjectConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🗂️ Discovery

  it("resolves the configuration sitting at a project root", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 3 } }),
    });

    const loaded = await service.loadProjectConfigurations({
      projects: ["packages/gated"],
      workspaceRoot,
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.project).toBe("packages/gated");
    expect(loaded[0]?.path).toBe(
      path.join(workspaceRoot, "packages", "gated", "callidescope.config.json"),
    );
    expect(loaded[0]?.configuration.limits.maximumDepth).toBe(3);
  });

  it("leaves a project holding no configuration file out of the result", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 3 } }),
    });
    await mkdir(path.join(workspaceRoot, "packages", "plain"), {
      recursive: true,
    });

    const loaded = await service.loadProjectConfigurations({
      projects: ["packages/gated", "packages/plain"],
      workspaceRoot,
    });

    expect(loaded.map((entry) => entry.project)).toStrictEqual([
      "packages/gated",
    ]);
  });

  it("never walks upward out of a project root", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": JSON.stringify({ limits: { maximumDepth: 17 } }),
    });
    await mkdir(path.join(workspaceRoot, "packages", "plain"), {
      recursive: true,
    });

    const loaded = await service.loadProjectConfigurations({
      projects: ["packages/plain"],
      workspaceRoot,
    });

    expect(loaded).toStrictEqual([]);
  });

  // 🧬 Inheritance

  it("merges nothing into a project configuration", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 3 } }),
    });

    const [loaded] = await service.loadProjectConfigurations({
      projects: ["packages/gated"],
      workspaceConfigurationPath: path.join(
        workspaceRoot,
        "callidescope.config.json",
      ),
      workspaceRoot,
    });

    // A field the project never wrote is absent from what it authored, and
    // resolves to the tool's own default rather than to anything a workspace
    // file said. Inheritance happens one limit at a time, later, in
    // `resolveLimits` — never by the project file spreading anything.
    expect(loaded?.authored.limits?.maximumDepth).toBe(3);
    expect(loaded?.authored.excludeFrom).toBeUndefined();
    expect(loaded?.configuration.limits.spreadThreshold).toBe(
      DEFAULT_SPREAD_THRESHOLD,
    );
  });

  it("keeps every limit a project declared for itself", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/gated": JSON.stringify({
        limits: { maximumBreadth: 9, maximumDepth: 3 },
      }),
    });

    const [loaded] = await service.loadProjectConfigurations({
      projects: ["packages/gated"],
      workspaceRoot,
    });

    expect(loaded?.configuration.limits.maximumBreadth).toBe(9);
  });

  // 🎭 One File, One Role

  it("skips the file already loaded as the run's own configuration", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": JSON.stringify({
        output: { json: { path: "report.json" } },
      }),
    });

    // Round-tripped through the loader rather than rebuilt by hand: the rule is
    // an equality against the path a run really loaded, and a test constructing
    // both sides the same way cannot fail for the reason the rule can.
    const { path: workspaceConfigurationPath } =
      await configurationService.loadConfigurationFile({
        configurationPath: path.join(
          workspaceRoot,
          "packages",
          "examples",
          "callidescope.config.json",
        ),
      });

    const loaded = await service.loadProjectConfigurations({
      projects: ["packages/examples"],
      workspaceConfigurationPath,
      workspaceRoot,
    });

    expect(loaded).toStrictEqual([]);
  });

  it("skips the run's own configuration named relative to the workspace root", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": JSON.stringify({
        output: { json: { path: "report.json" } },
      }),
    });

    // A command line names its configuration relative to the workspace root, so
    // the skip has to resolve it against that root — the same root every project
    // path here is resolved against, and not the process cwd.
    const loaded = await service.loadProjectConfigurations({
      projects: ["packages/examples"],
      workspaceConfigurationPath: path.join(
        "packages",
        "examples",
        "callidescope.config.json",
      ),
      workspaceRoot,
    });

    expect(loaded).toStrictEqual([]);
  });

  it("still resolves every other project's file alongside the skipped one", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": JSON.stringify({
        output: { json: { path: "report.json" } },
      }),
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 3 } }),
    });

    const loaded = await service.loadProjectConfigurations({
      projects: ["packages/examples", "packages/gated"],
      workspaceConfigurationPath: path.join(
        workspaceRoot,
        "packages",
        "examples",
        "callidescope.config.json",
      ),
      workspaceRoot,
    });

    expect(loaded.map((entry) => entry.project)).toStrictEqual([
      "packages/gated",
    ]);
  });

  // 🚨 Refusals

  it("names the project when its configuration cannot be read", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/broken": "{ not json",
    });

    await expect(
      service.loadProjectConfigurations({
        projects: ["packages/broken"],
        workspaceRoot,
      }),
    ).rejects.toThrow(ProjectConfigurationError);
  });

  it("names the project when its configuration threw something that is not an error", async () => {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), "callidescope-workspace-"),
    );
    const projectRoot = path.join(workspaceRoot, "packages", "broken");
    await mkdir(projectRoot, { recursive: true });
    await writeFile(
      path.join(projectRoot, "callidescope.config.js"),
      'throw "no configuration here";\n',
      "utf8",
    );

    await expect(
      service.loadProjectConfigurations({
        projects: ["packages/broken"],
        workspaceRoot,
      }),
    ).rejects.toThrow("It could not be read");
  });

  it("names the project and the file when a configuration is refused", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/broken": JSON.stringify({ limits: { maximumDepth: 0 } }),
    });
    const configurationPath = path.join(
      workspaceRoot,
      "packages",
      "broken",
      "callidescope.config.json",
    );

    await expect(
      service.loadProjectConfigurations({
        projects: ["packages/broken"],
        workspaceRoot,
      }),
    ).rejects.toThrow(`packages/broken at ${configurationPath}`);
  });

  // 🔒 Permitted Fields

  it.each([
    ["directories", { directories: ["packages/other"] }],
    ["output", { output: { json: { path: "report.json" } } }],
    [
      "workspaceStructure",
      { workspaceStructure: { rootModuleSegment: "app" } },
    ],
    ["excludeFrom", { excludeFrom: [".callidescopeignore"] }],
    ["ignoreCallees", { ignoreCallees: ["Logger.log"] }],
    ["allowSpreadFor", { allowSpreadFor: ["**/*.command.ts"] }],
    ["limits.spreadThreshold", { limits: { spreadThreshold: 2 } }],
    ["limits.directSpreadThreshold", { limits: { directSpreadThreshold: 2 } }],
    ["limits.callerMajorityRatio", { limits: { callerMajorityRatio: 0.5 } }],
    ["limits.minimumCallers", { limits: { minimumCallers: 3 } }],
    [
      "limits.maximumImplementationCandidates",
      { limits: { maximumImplementationCandidates: 4 } },
    ],
  ])(
    "refuses a project configuration that sets %s",
    async (_field, configuration) => {
      const workspaceRoot = await writeWorkspace({
        "packages/broken": JSON.stringify(configuration),
      });

      await expect(
        service.loadProjectConfigurations({
          projects: ["packages/broken"],
          workspaceRoot,
        }),
      ).rejects.toThrow(ProjectConfigurationFieldNotPermittedError);
    },
  );

  it("names the project, the field, and the fields a project may set", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/broken": JSON.stringify({
        output: { json: { path: "report.json" } },
      }),
    });

    await expect(
      service.loadProjectConfigurations({
        projects: ["packages/broken"],
        workspaceRoot,
      }),
    ).rejects.toThrow(
      "packages/broken sets output, which only the workspace configuration " +
        "may set. A project configuration may set entryPoints, " +
        "limits.maximumDepth, limits.maximumBreadth, and exclude.",
    );
  });

  it.each([
    ["entryPoints", { entryPoints: { includeTests: true } }],
    [
      "entryPoints.addresses",
      {
        entryPoints: {
          addresses: ["packages/allowed/src/index.ts#publicApi"],
        },
      },
    ],
    ["limits.maximumDepth", { limits: { maximumDepth: 5 } }],
    ["limits.maximumBreadth", { limits: { maximumBreadth: 10 } }],
    ["exclude", { exclude: ["**/*.spec.ts"] }],
  ])(
    "accepts a project configuration that sets %s",
    async (_field, configuration) => {
      const workspaceRoot = await writeWorkspace({
        "packages/allowed": JSON.stringify(configuration),
      });

      const loaded = await service.loadProjectConfigurations({
        projects: ["packages/allowed"],
        workspaceRoot,
      });

      expect(loaded).toHaveLength(1);
    },
  );

  it("resolves the addresses a project declared as its own entry points", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/allowed": JSON.stringify({
        entryPoints: {
          addresses: ["packages/allowed/src/index.ts#publicApi"],
        },
      }),
    });

    const [loaded] = await service.loadProjectConfigurations({
      projects: ["packages/allowed"],
      workspaceRoot,
    });

    expect(loaded?.configuration.entryPoints.addresses).toStrictEqual([
      "packages/allowed/src/index.ts#publicApi",
    ]);
  });

  it("never refuses the run's own workspace configuration for the fields it legitimately sets", async () => {
    const workspaceRoot = await writeWorkspace({
      "packages/examples": JSON.stringify({
        limits: { maximumImplementationCandidates: 4 },
        output: { json: { path: "report.json" } },
        workspaceStructure: { rootModuleSegment: "app" },
      }),
    });

    const { path: workspaceConfigurationPath } =
      await configurationService.loadConfigurationFile({
        configurationPath: path.join(
          workspaceRoot,
          "packages",
          "examples",
          "callidescope.config.json",
        ),
      });

    const loaded = await service.loadProjectConfigurations({
      projects: ["packages/examples"],
      workspaceConfigurationPath,
      workspaceRoot,
    });

    expect(loaded).toStrictEqual([]);
  });

  // 📏 Limits resolved per project

  it("hands a project declaring no limits the workspace's, marked inherited", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": JSON.stringify({ limits: { maximumDepth: 17 } }),
      "packages/plain": JSON.stringify({ exclude: ["**/generated/**"] }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/plain"],
      service,
      workspaceRoot,
    });

    expect(limits.byProject.get("packages/plain")?.maximumDepth).toStrictEqual({
      origin: "inherited",
      path: path.join(workspaceRoot, "callidescope.config.json"),
      value: 17,
    });
  });

  it("names the project's own file as the source of a limit it declared", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": JSON.stringify({ limits: { maximumDepth: 17 } }),
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 4 } }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/gated"],
      service,
      workspaceRoot,
    });

    expect(limits.byProject.get("packages/gated")?.maximumDepth).toStrictEqual({
      origin: "declared",
      path: path.join(
        workspaceRoot,
        "packages",
        "gated",
        "callidescope.config.json",
      ),
      value: 4,
    });
  });

  it("keeps a limit higher than the workspace's rather than clamping it", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": JSON.stringify({ limits: { maximumDepth: 6 } }),
      "packages/deep": JSON.stringify({ limits: { maximumDepth: 12 } }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/deep"],
      service,
      workspaceRoot,
    });

    expect(limits.byProject.get("packages/deep")?.maximumDepth.value).toBe(12);
  });

  it("inherits the limit a project left alone while keeping the one it set", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": JSON.stringify({
        limits: { maximumBreadth: 9, maximumDepth: 17 },
      }),
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 4 } }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/gated"],
      service,
      workspaceRoot,
    });

    expect(
      limits.byProject.get("packages/gated")?.maximumBreadth,
    ).toStrictEqual({
      origin: "inherited",
      path: path.join(workspaceRoot, "callidescope.config.json"),
      value: 9,
    });
  });

  it("leaves breadth unset when neither the project nor the workspace set it", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": JSON.stringify({ limits: { maximumDepth: 17 } }),
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 4 } }),
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/gated"],
      service,
      workspaceRoot,
    });

    expect(
      limits.byProject.get("packages/gated")?.maximumBreadth,
    ).toBeUndefined();
  });

  it("names every project the run reached, whether or not it declared a limit", async () => {
    const workspaceRoot = await writeWorkspace({
      ".": JSON.stringify({ limits: { maximumDepth: 17 } }),
      "packages/gated": JSON.stringify({ limits: { maximumDepth: 4 } }),
    });
    await mkdir(path.join(workspaceRoot, "packages", "plain"), {
      recursive: true,
    });

    const limits = await resolveWrittenLimits({
      configurationService,
      projects: ["packages/gated", "packages/plain"],
      service,
      workspaceRoot,
    });

    expect([...limits.byProject.keys()]).toStrictEqual([
      "packages/gated",
      "packages/plain",
    ]);
    expect(limits.workspace.maximumDepth.value).toBe(17);
  });
});
