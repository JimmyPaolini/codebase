import { existsSync, readFileSync } from "node:fs";

import { CallidescopeService } from "@callidescope/cli";
import { ConfigurationService } from "@callidescope/configuration";
import { FileFilterService } from "@callidescope/graph";
import { MarkdownReportService } from "@callidescope/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { OptionsService } from "../options/options.service";
import { ProjectsService } from "../projects/projects.service";

import { PluginService } from "./plugin.service";

import type { ResolvedTraceScope } from "./plugin.types";
import type { TraceOutcome } from "@callidescope/cli";
import type {
  CallGraphResult,
  CallidescopeOutputFormat,
  DeepStackFinding,
  ResolvedCallidescopeConfiguration,
  SourceLocation,
  WideCallableFinding,
} from "@callidescope/configuration";
import type { ProjectGraph } from "@nx/devkit";

vi.mock("node:fs", () => ({
  existsSync: vi.fn<() => boolean>(() => true),
  readFileSync: vi.fn<() => string>(() => "{}"),
}));

/** A graph of two projects, one depending on the other. */
const GRAPH: ProjectGraph = {
  dependencies: {
    alpha: [{ source: "alpha", target: "beta", type: "static" }],
    beta: [],
  },
  nodes: {
    alpha: { data: { root: "packages/alpha" }, name: "alpha", type: "lib" },
    beta: { data: { root: "packages/beta" }, name: "beta", type: "lib" },
  },
};

describe(PluginService, () => {
  let callidescopeService: ReturnType<typeof createMock<CallidescopeService>>;
  let configurationService: ReturnType<typeof createMock<ConfigurationService>>;
  let fileFilterService: ReturnType<typeof createMock<FileFilterService>>;
  let markdownReportService: ReturnType<
    typeof createMock<MarkdownReportService>
  >;
  let projectsService: ProjectsService;
  let service: PluginService;

  beforeAll(async () => {
    callidescopeService = createMock<CallidescopeService>();
    configurationService = createMock<ConfigurationService>();
    fileFilterService = createMock<FileFilterService>();
    markdownReportService = createMock<MarkdownReportService>();
    projectsService = new ProjectsService();

    const module = await Test.createTestingModule({
      providers: [
        PluginService,
        { provide: CallidescopeService, useValue: callidescopeService },
        { provide: ConfigurationService, useValue: configurationService },
        { provide: FileFilterService, useValue: fileFilterService },
        { provide: MarkdownReportService, useValue: markdownReportService },
        OptionsService,
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = await module.resolve(PluginService);
  });

  beforeEach(() => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("{}");
    vi.spyOn(projectsService, "readProjectGraph").mockResolvedValue(GRAPH);
    configurationService.loadConfigurationFile.mockResolvedValue({
      authored: {},
      configuration: createMock<ResolvedCallidescopeConfiguration>({
        exclude: [],
        excludeFrom: [],
      }),
      path: undefined,
    });
    fileFilterService.buildFileFilter.mockReturnValue({
      isExcluded: (): boolean => false,
    });
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("inferTargets", () => {
    /** The three targets every covered project carries, plus the gate. */
    const INPUTS = [
      "default",
      "^default",
      "{workspaceRoot}/callidescope.config.ts",
    ];

    it("infers all four targets onto a project holding a tsconfig", async () => {
      expect.hasAssertions();

      const inferred = await service.inferTargets({
        options: { traceTargetName: "callidescope-trace" },
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect([...inferred.keys()]).toStrictEqual(["packages/alpha"]);
      // The registration renamed one of them; the other three keep their
      // defaults, so a workspace only overrides what it needs to.
      expect(Object.keys(inferred.get("packages/alpha") ?? {})).toStrictEqual([
        "breadth",
        "depth",
        "callidescope-trace",
        "gate",
      ]);
    });

    it("names the gate target from the registration", async () => {
      expect.hasAssertions();

      const inferred = await service.inferTargets({
        options: { gateTargetName: "callidescope-gate" },
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect(Object.keys(inferred.get("packages/alpha") ?? {})).toStrictEqual([
        "breadth",
        "depth",
        "trace",
        "callidescope-gate",
      ]);
    });

    it("points each target at its own executor, cached on the configuration", async () => {
      expect.hasAssertions();

      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect(targets.get("packages/alpha")).toStrictEqual({
        breadth: {
          cache: true,
          executor: "@callidescope/nx:breadth",
          inputs: INPUTS,
          options: {},
        },
        depth: {
          cache: true,
          executor: "@callidescope/nx:depth",
          inputs: INPUTS,
          options: {},
        },
        gate: {
          cache: true,
          executor: "@callidescope/nx:gate",
          // The project's own limits join the workspace's, and they join as a
          // `{projectRoot}` glob: a workspace-wide one would invalidate every
          // project's gate whenever any project changed a limit.
          inputs: [...INPUTS, "{projectRoot}/callidescope.config.*"],
          options: {},
        },
        trace: {
          cache: true,
          executor: "@callidescope/nx:trace",
          inputs: INPUTS,
          options: {},
        },
      });
    });

    it("gates a project that configures nothing of its own", async () => {
      expect.hasAssertions();

      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/beta/project.json"],
        workspaceRoot: "/workspace",
      });

      // Nothing is read from beside the project to decide this: the input
      // glob matches no file, so the target is there and the limits it
      // enforces are the ones the workspace declared.
      expect(targets.get("packages/beta")?.["gate"]).toBeDefined();
    });

    it("gives a project the configuration excludes no gate target", async () => {
      expect.hasAssertions();

      // Its own code is never traced, so a gate there would judge the
      // project's dependencies and report green for code it never read.
      fileFilterService.buildFileFilter.mockReturnValue({
        isExcluded: (candidatePath: string): boolean =>
          candidatePath === "packages/callidescope-examples/tsconfig.json",
      });

      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: [
          "packages/callidescope-examples/project.json",
          "packages/alpha/project.json",
        ],
        workspaceRoot: "/workspace",
      });

      expect(
        Object.keys(targets.get("packages/callidescope-examples") ?? {}),
      ).toStrictEqual(["breadth", "depth", "trace"]);
      // The exclusion is one project's, never the run's.
      expect(targets.get("packages/alpha")?.["gate"]).toBeDefined();
    });

    it("excludes nothing when the configuration cannot be loaded", async () => {
      expect.hasAssertions();

      configurationService.loadConfigurationFile.mockRejectedValue(
        new Error("Cannot find module"),
      );

      // Inference runs while Nx builds the project graph, where a throw stops
      // every command in the workspace rather than one task.
      const targets = await service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect(targets.get("packages/alpha")?.["gate"]).toBeDefined();
    });

    it("reads the workspace configuration once rather than once per project", async () => {
      expect.hasAssertions();

      await service.inferTargets({
        options: {},
        projectConfigurationFiles: [
          "packages/alpha/project.json",
          "packages/beta/project.json",
        ],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledTimes(
        1,
      );
    });

    it("skips the workspace-root project", async () => {
      expect.hasAssertions();

      // Its target would trace every other project under one uncacheable task.
      await expect(
        service
          .inferTargets({
            options: {},
            projectConfigurationFiles: ["project.json"],
            workspaceRoot: "/workspace",
          })
          .then((targets) => targets.size),
      ).resolves.toBe(0);
    });

    it("skips a project with no TypeScript program of its own", async () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(false);

      await expect(
        service
          .inferTargets({
            options: {},
            projectConfigurationFiles: [
              "applications/affirmations/project.json",
            ],
            workspaceRoot: "/workspace",
          })
          .then((targets) => targets.size),
      ).resolves.toBe(0);
    });

    it("ignores a matched file that is not a project description", async () => {
      expect.hasAssertions();

      // The glob also matches the callidescope configuration, so that editing
      // it re-runs inference — but it describes no project.
      await expect(
        service
          .inferTargets({
            options: {},
            projectConfigurationFiles: ["configuration/callidescope.config.ts"],
            workspaceRoot: "/workspace",
          })
          .then((targets) => targets.size),
      ).resolves.toBe(0);
    });
  });

  describe("describeRefusedScope", () => {
    /** A scope with nothing refused, overridden per case. */
    function buildScope(
      overrides: Partial<ResolvedTraceScope> = {},
    ): ResolvedTraceScope {
      return {
        directories: [],
        knownNames: ["alpha", "beta"],
        knownTags: ["type:package"],
        projectNames: [],
        unknownNames: [],
        unmatchedTags: [],
        ...overrides,
      };
    }

    it("names an unknown project beside the names the workspace has", () => {
      expect.hasAssertions();

      expect(
        service.describeRefusedScope(buildScope({ unknownNames: ["absent"] })),
      ).toBe("Unknown Nx projects: absent. Known: alpha, beta.");
    });

    it("names an unmatched tag beside the tags the workspace carries", () => {
      expect.hasAssertions();

      expect(
        service.describeRefusedScope(
          buildScope({ unmatchedTags: ["typ:package"] }),
        ),
      ).toBe("Unmatched Nx tags: typ:package. Known: type:package.");
    });

    it("names both kinds of mistake at once", () => {
      expect.hasAssertions();

      // Two typos is two things to fix, not two runs.
      expect(
        service.describeRefusedScope(
          buildScope({
            unknownNames: ["absent"],
            unmatchedTags: ["typ:package"],
          }),
        ),
      ).toBe(
        "Unknown Nx projects: absent. Known: alpha, beta. Unmatched Nx tags: typ:package. Known: type:package.",
      );
    });
  });

  describe("resolveTraceScope", () => {
    it("widens the selection along the Nx dependency graph", async () => {
      expect.hasAssertions();

      await expect(
        service.resolveTraceScope({
          projectNames: ["alpha"],
          tags: [],
          withDependencies: true,
        }),
      ).resolves.toMatchObject({
        directories: ["packages/alpha", "packages/beta"],
        projectNames: ["alpha", "beta"],
      });
    });

    it("leaves the selection alone when asked not to widen it", async () => {
      expect.hasAssertions();

      await expect(
        service.resolveTraceScope({
          projectNames: ["alpha"],
          tags: [],
          withDependencies: false,
        }),
      ).resolves.toMatchObject({
        directories: ["packages/alpha"],
        projectNames: ["alpha"],
      });
    });

    it("reports a name the workspace does not have", async () => {
      expect.hasAssertions();

      await expect(
        service.resolveTraceScope({
          projectNames: ["absent"],
          tags: ["absent:tag"],
          withDependencies: true,
        }),
      ).resolves.toMatchObject({
        knownNames: ["alpha", "beta"],
        unknownNames: ["absent"],
        unmatchedTags: ["absent:tag"],
      });
    });
  });

  describe("runTrace", () => {
    /**
     * Stubs one trace, typed rather than cast.
     *
     * `createMock` builds a value of the real type from the fields under
     * test, so nothing here needs an `as unknown as` — which would take these
     * stubs out of type coverage and stop the compiler noticing when the
     * shapes they stand in for change.
     */
    function stubTrace(
      args: {
        deepStacks?: DeepStackFinding[];
        format?: CallidescopeOutputFormat;
        wideCallables?: WideCallableFinding[];
      } = {},
    ): void {
      configurationService.loadConfigurationFile.mockResolvedValue({
        authored: {},
        configuration: createMock<ResolvedCallidescopeConfiguration>({
          output: { format: args.format ?? "markdown" },
        }),
        path: undefined,
      });
      callidescopeService.trace.mockResolvedValue(
        createMock<TraceOutcome>({
          result: createMock<CallGraphResult>({
            deepStacks: args.deepStacks ?? [],
            wideCallables: args.wideCallables ?? [],
          }),
        }),
      );
      markdownReportService.renderRun.mockReturnValue("# Report");
    }

    it("traces the directories it was given and renders the report", async () => {
      expect.hasAssertions();

      stubTrace();

      await expect(
        service.runTrace({
          directories: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toStrictEqual({ ok: true, report: "# Report" });
      expect(callidescopeService.trace).toHaveBeenCalledWith(
        expect.objectContaining({
          directories: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      );
    });

    it("resolves the configuration path from the registration when given none", async () => {
      expect.hasAssertions();

      stubTrace();

      await service.runTrace({
        directories: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "callidescope.config.ts",
        searchDirectory: "/workspace",
      });
    });

    it("falls back to a conventional path when nx.json cannot be read", async () => {
      expect.hasAssertions();

      stubTrace();
      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      // An unreadable nx.json is what a workspace with no registration looks
      // like, so it resolves the same way rather than failing the task.
      await service.runTrace({
        directories: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "callidescope.config.ts",
        searchDirectory: "/workspace",
      });
    });

    it("prefers a configuration path it was handed", async () => {
      expect.hasAssertions();

      stubTrace();

      await service.runTrace({
        configurationPath: "elsewhere.ts",
        directories: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "elsewhere.ts",
        searchDirectory: "/workspace",
      });
    });

    it("draws the stacks rather than printing them for the mermaid format", async () => {
      expect.hasAssertions();

      stubTrace({ format: "mermaid" });

      await service.runTrace({
        directories: ["packages/alpha"],
        format: "mermaid",
        workspaceRoot: "/workspace",
      });

      expect(markdownReportService.renderRun).toHaveBeenCalledWith(
        expect.objectContaining({ rendering: "diagram" }),
      );
    });

    it.each([
      [
        "a stack ran too deep",
        { deepStacks: [createMock<DeepStackFinding>()] },
      ],
      [
        "a callable called too much",
        { wideCallables: [createMock<WideCallableFinding>()] },
      ],
    ])("fails when %s", async (_description, findings) => {
      expect.hasAssertions();

      stubTrace(findings);

      await expect(
        service.runTrace({
          directories: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: false });
    });
  });

  describe("runGate", () => {
    /** Stubs one gated trace, typed rather than cast. */
    function stubGate(
      args: {
        deepStacks?: DeepStackFinding[];
        wideCallables?: WideCallableFinding[];
      } = {},
    ): void {
      callidescopeService.trace.mockResolvedValue(
        createMock<TraceOutcome>({
          result: createMock<CallGraphResult>({
            deepStacks: args.deepStacks ?? [],
            wideCallables: args.wideCallables ?? [],
          }),
        }),
      );
      markdownReportService.renderStacks.mockReturnValue("None.");
    }

    it("passes a workspace with nothing over a limit", async () => {
      expect.hasAssertions();

      stubGate();

      await expect(
        service.runGate({
          directories: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: true });
    });

    it("fails on a stack that ran deeper than the project allows", async () => {
      expect.hasAssertions();

      stubGate({ deepStacks: [createMock<DeepStackFinding>()] });

      await expect(
        service.runGate({
          directories: ["packages/alpha"],
          workspaceRoot: "/workspace",
        }),
      ).resolves.toMatchObject({ ok: false });
    });

    it("fails on a callable wider than the limit its project declared", async () => {
      expect.hasAssertions();

      // Breadth needs no mode of its own: no limit resolves to `Infinity`, so
      // a project that declared none produces no finding to fail on, and a
      // gate can never be refused for wanting to check it.
      stubGate({
        wideCallables: [
          createMock<WideCallableFinding>({
            breadth: 12,
            displayName: "AlphaService.orchestrate",
            limit: 8,
            location: createMock<SourceLocation>({
              filePath: "packages/alpha/src/alpha.service.ts",
            }),
          }),
        ],
      });

      const result = await service.runGate({
        directories: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(result.ok).toBe(false);
      expect(result.report).toContain(
        "`AlphaService.orchestrate` — 12 direct callees, limit 8 (packages/alpha/src/alpha.service.ts)",
      );
    });

    it("reports only the findings, never the whole run", async () => {
      expect.hasAssertions();

      stubGate();

      const result = await service.runGate({
        directories: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(result.report).toBe(
        [
          "## Call stacks over the depth limit (0)",
          "",
          "None.",
          "",
          "## Callables over the breadth limit (0)",
          "",
          "None.",
        ].join("\n"),
      );
      expect(markdownReportService.renderRun).not.toHaveBeenCalled();
    });

    it("prefers a configuration path it was handed", async () => {
      expect.hasAssertions();

      stubGate();

      await service.runGate({
        configurationPath: "elsewhere.ts",
        directories: ["packages/alpha"],
        workspaceRoot: "/workspace",
      });

      expect(configurationService.loadConfigurationFile).toHaveBeenCalledWith({
        configurationPath: "elsewhere.ts",
        searchDirectory: "/workspace",
      });
    });
  });
});
