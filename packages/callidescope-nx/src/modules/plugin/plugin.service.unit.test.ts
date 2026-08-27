import { existsSync, readFileSync } from "node:fs";

import { CallidescopeService } from "@callidescope/cli";
import { ConfigurationService } from "@callidescope/configuration";
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
  let markdownReportService: ReturnType<
    typeof createMock<MarkdownReportService>
  >;
  let projectsService: ProjectsService;
  let service: PluginService;

  beforeAll(async () => {
    callidescopeService = createMock<CallidescopeService>();
    configurationService = createMock<ConfigurationService>();
    markdownReportService = createMock<MarkdownReportService>();
    projectsService = new ProjectsService();

    const module = await Test.createTestingModule({
      providers: [
        PluginService,
        { provide: CallidescopeService, useValue: callidescopeService },
        { provide: ConfigurationService, useValue: configurationService },
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
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("inferTargets", () => {
    it("infers all three targets onto a project holding a tsconfig", () => {
      expect.hasAssertions();

      const inferred = service.inferTargets({
        options: { traceTargetName: "callidescope-trace" },
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect([...inferred.keys()]).toStrictEqual(["packages/alpha"]);
      // The registration renamed one of them; the other two keep their
      // defaults, so a workspace only overrides what it needs to.
      expect(Object.keys(inferred.get("packages/alpha") ?? {})).toStrictEqual([
        "breadth",
        "depth",
        "callidescope-trace",
      ]);
    });

    it("points each target at its own executor, cached on the configuration", () => {
      expect.hasAssertions();

      const targets = service.inferTargets({
        options: {},
        projectConfigurationFiles: ["packages/alpha/project.json"],
        workspaceRoot: "/workspace",
      });

      expect(targets.get("packages/alpha")).toStrictEqual({
        breadth: {
          cache: true,
          executor: "@callidescope/nx:breadth",
          inputs: [
            "default",
            "^default",
            "{workspaceRoot}/callidescope.config.ts",
          ],
          options: {},
        },
        depth: {
          cache: true,
          executor: "@callidescope/nx:depth",
          inputs: [
            "default",
            "^default",
            "{workspaceRoot}/callidescope.config.ts",
          ],
          options: {},
        },
        trace: {
          cache: true,
          executor: "@callidescope/nx:trace",
          inputs: [
            "default",
            "^default",
            "{workspaceRoot}/callidescope.config.ts",
          ],
          options: {},
        },
      });
    });

    it("skips the workspace-root project", () => {
      expect.hasAssertions();

      // Its target would trace every other project under one uncacheable task.
      expect(
        service.inferTargets({
          options: {},
          projectConfigurationFiles: ["project.json"],
          workspaceRoot: "/workspace",
        }).size,
      ).toBe(0);
    });

    it("skips a project with no TypeScript program of its own", () => {
      expect.hasAssertions();

      vi.mocked(existsSync).mockReturnValue(false);

      expect(
        service.inferTargets({
          options: {},
          projectConfigurationFiles: ["applications/affirmations/project.json"],
          workspaceRoot: "/workspace",
        }).size,
      ).toBe(0);
    });

    it("ignores a matched file that is not a project description", () => {
      expect.hasAssertions();

      // The glob also matches the callidescope configuration, so that editing
      // it re-runs inference — but it describes no project.
      expect(
        service.inferTargets({
          options: {},
          projectConfigurationFiles: ["configuration/callidescope.config.ts"],
          workspaceRoot: "/workspace",
        }).size,
      ).toBe(0);
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
      configurationService.loadConfiguration.mockResolvedValue(
        createMock<ResolvedCallidescopeConfiguration>({
          output: { format: args.format ?? "markdown" },
        }),
      );
      callidescopeService.trace.mockReturnValue(
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

      expect(configurationService.loadConfiguration).toHaveBeenCalledWith({
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

      expect(configurationService.loadConfiguration).toHaveBeenCalledWith({
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

      expect(configurationService.loadConfiguration).toHaveBeenCalledWith({
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
});
