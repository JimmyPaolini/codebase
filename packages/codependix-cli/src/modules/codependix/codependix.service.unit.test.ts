import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import {
  ImportGraphService,
  TypescriptProjectService,
} from "@codependix/imports";
import { ModuleGraphService, NestjsProjectService } from "@codependix/nestjs";
import { NeighborhoodService, WorkspaceGraphService } from "@codependix/nx";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AnchorsService } from "../anchors/anchors.service";
import { DeliveryService } from "../delivery/delivery.service";

import { CodependixService } from "./codependix.service";

import type { GraphRunOutcome } from "../delivery/delivery.types";
import type { GraphRunContext } from "./codependix.types";
import type {
  ImportGraph,
  TypescriptProjectProgram,
} from "@codependix/imports";
import type { NestjsModuleGraph } from "@codependix/nestjs";
import type { Neighborhood } from "@codependix/nx";

const NEIGHBORHOOD: Neighborhood = {
  dependencies: ["logger"],
  dependents: [],
  edges: [{ implicit: false, source: "codependix-nx", target: "logger" }],
  projectName: "codependix-nx",
};

const MODULE_GRAPH: NestjsModuleGraph = {
  ambientModuleNames: [],
  edges: [{ source: "MainModule", target: "LoggerModule" }],
  isolatedModuleNames: [],
  moduleNames: ["LoggerModule", "MainModule"],
  projectName: "codependix-cli",
};

const IMPORT_GRAPH: ImportGraph = {
  edges: [{ source: "src/index.ts", target: "src/helper.ts" }],
  fileNames: ["src/helper.ts", "src/index.ts"],
  isolatedFileNames: [],
  projectName: "codependix-imports",
};

describe(CodependixService, () => {
  let service: CodependixService;
  let configurationService: ConfigurationService;
  let importGraphService: ImportGraphService;
  let moduleGraphService: ModuleGraphService;
  let neighborhoodService: NeighborhoodService;
  let nestjsProjectService: NestjsProjectService;
  let typescriptProjectService: TypescriptProjectService;
  let workspaceGraphService: WorkspaceGraphService;
  let projectRoot: string;

  /** Builds a `GraphRunContext` a test can override selected fields of. */
  function buildContext(
    overrides: Partial<GraphRunContext> = {},
  ): GraphRunContext {
    return {
      configuration: {
        defaults: {},
        exclude: [],
        include: ["**"],
        projects: {},
        workspace: {},
      },
      graph: { dependencies: {}, nodes: {} },
      mode: "write",
      projects: [{ absoluteRoot: projectRoot, name: "codependix-nx" }],
      workingDirectory: projectRoot,
      ...overrides,
    };
  }

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    importGraphService = createMock<ImportGraphService>();
    moduleGraphService = createMock<ModuleGraphService>();
    neighborhoodService = createMock<NeighborhoodService>();
    nestjsProjectService = createMock<NestjsProjectService>();
    typescriptProjectService = createMock<TypescriptProjectService>();
    workspaceGraphService = createMock<WorkspaceGraphService>();

    const module = await Test.createTestingModule({
      providers: [
        AnchorsService,
        CodependixService,
        DeliveryService,
        {
          provide: ConfigurationService,
          useValue: configurationService,
        },
        { provide: ImportGraphService, useValue: importGraphService },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ModuleGraphService, useValue: moduleGraphService },
        { provide: NeighborhoodService, useValue: neighborhoodService },
        { provide: NestjsProjectService, useValue: nestjsProjectService },
        {
          provide: TypescriptProjectService,
          useValue: typescriptProjectService,
        },
        { provide: WorkspaceGraphService, useValue: workspaceGraphService },
      ],
    }).compile();

    service = await module.resolve(CodependixService);
  });

  beforeEach(async () => {
    projectRoot = await mkdtemp(path.join(tmpdir(), "codependix-service-"));

    vi.mocked(configurationService.loadConfiguration).mockResolvedValue({
      defaults: {},
      exclude: [],
      include: ["**"],
      projects: {},
      workspace: {},
    });
    vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
      json: undefined,
      markdown: undefined,
      target: "none",
    });
    vi.mocked(neighborhoodService.readProjectGraph).mockResolvedValue({
      dependencies: {},
      nodes: {},
    });
    vi.mocked(neighborhoodService.readProjects).mockReturnValue([
      { absoluteRoot: projectRoot, name: "codependix-nx" },
    ]);
    vi.mocked(neighborhoodService.buildNeighborhoods).mockReturnValue(
      new Map([["codependix-nx", NEIGHBORHOOD]]),
    );
    vi.mocked(neighborhoodService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
    vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockReturnValue({
      edges: [],
      projectNames: [],
    });
    vi.mocked(workspaceGraphService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: projectRoot,
        name: "codependix-cli",
        rootModuleFile: undefined,
      },
    ]);
    vi.mocked(nestjsProjectService.exploreProject).mockResolvedValue([]);
    vi.mocked(moduleGraphService.buildGraph).mockReturnValue(MODULE_GRAPH);
    vi.mocked(moduleGraphService.renderMermaid).mockReturnValue(
      "```mermaid\nflowchart LR\n```",
    );
    vi.mocked(typescriptProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: projectRoot,
        name: "codependix-imports",
        tsconfigPath: path.join(projectRoot, "tsconfig.json"),
      },
    ]);
    vi.mocked(typescriptProjectService.buildProgram).mockReturnValue(
      createMock<TypescriptProjectProgram>(),
    );
    vi.mocked(importGraphService.buildGraph).mockReturnValue(IMPORT_GRAPH);
    vi.mocked(importGraphService.renderMermaid).mockReturnValue(
      "```mermaid\ngraph LR\n```",
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("runNxGraphs", () => {
    it("skips a project whose resolved target is none", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const outcome = service.runNxGraphs(buildContext());

      expect(outcome).toStrictEqual({ failures: [], results: [] });
    });

    it("writes a project's JSON export", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-nx.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runNxGraphs(buildContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          { isCurrent: true, projectName: "codependix-nx", stalePaths: [] },
        ],
      });

      const written = JSON.parse(
        await readFile(path.join(projectRoot, "codependix-nx.json"), "utf8"),
      ) as unknown;

      expect(written).toStrictEqual({
        dependencies: ["logger"],
        dependents: [],
        edges: [{ implicit: false, source: "codependix-nx", target: "logger" }],
        projectName: "codependix-nx",
      });
    });

    it("reports a missing JSON export as stale in check mode", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-nx.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runNxGraphs(buildContext({ mode: "check" }));

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-nx",
            stalePaths: ["codependix-nx.json"],
          },
        ],
      });
    });

    it("splices a diagram into an existing anchor block", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# codependix-nx",
          '<!-- codependix:start name="nx" -->',
          "stale",
          '<!-- codependix:end name="nx" -->',
        ].join("\n"),
        "utf8",
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      });

      const outcome = service.runNxGraphs(buildContext());

      expect(outcome.results[0]?.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\ngraph LR\n```");
      expect(written).not.toContain("stale");
    });

    it("records a project's failure as opposed to raising, and still processes the rest", async () => {
      const otherProjectRoot = path.join(projectRoot, "other-project");

      await mkdir(otherProjectRoot, { recursive: true });
      await writeFile(path.join(projectRoot, "README.md"), "# empty", "utf8");
      vi.mocked(neighborhoodService.buildNeighborhoods).mockReturnValue(
        new Map([
          ["codependix-nx", NEIGHBORHOOD],
          ["other-project", { ...NEIGHBORHOOD, projectName: "other-project" }],
        ]),
      );
      vi.mocked(configurationService.resolveForProject).mockImplementation(
        ({ projectName }) =>
          projectName === "codependix-nx"
            ? {
                json: undefined,
                markdown: { anchor: "nx", path: "README.md" },
                target: "markdown",
              }
            : {
                json: { path: "other-project.json" },
                markdown: undefined,
                target: "json",
              },
      );

      const outcome = service.runNxGraphs(
        buildContext({
          projects: [
            { absoluteRoot: projectRoot, name: "codependix-nx" },
            { absoluteRoot: otherProjectRoot, name: "other-project" },
          ],
        }),
      );

      expect(outcome.failures).toStrictEqual([
        {
          error: expect.stringContaining('Anchor "nx" not found') as string,
          projectName: "codependix-nx",
        },
      ]);
      expect(outcome.results).toStrictEqual([
        { isCurrent: true, projectName: "other-project", stalePaths: [] },
      ]);

      const written = JSON.parse(
        await readFile(
          path.join(otherProjectRoot, "other-project.json"),
          "utf8",
        ),
      ) as unknown;

      expect(written).toMatchObject({ projectName: "other-project" });
    });

    describe("workspace graph", () => {
      beforeEach(() => {
        vi.mocked(configurationService.resolveForProject).mockReturnValue({
          json: undefined,
          markdown: undefined,
          target: "none",
        });
        vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockReturnValue({
          edges: [{ implicit: false, source: "lexico", target: "logger" }],
          projectNames: ["lexico", "logger"],
        });
      });

      it("leaves the workspace graph out of the results when its target is none", () => {
        const outcome = service.runNxGraphs(buildContext());

        expect(outcome).toStrictEqual({ failures: [], results: [] });
      });

      it("writes the workspace graph's JSON export at the workspace root", async () => {
        vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
          json: { path: "codependix-workspace-graph.json" },
          markdown: undefined,
          target: "json",
        });

        const outcome = service.runNxGraphs(buildContext());

        expect(outcome).toStrictEqual({
          failures: [],
          results: [
            { isCurrent: true, projectName: "workspace", stalePaths: [] },
          ],
        });

        const written = JSON.parse(
          await readFile(
            path.join(projectRoot, "codependix-workspace-graph.json"),
            "utf8",
          ),
        ) as unknown;

        expect(written).toStrictEqual({
          edges: [{ implicit: false, source: "lexico", target: "logger" }],
          projectNames: ["lexico", "logger"],
        });
      });

      it("records a failure building the workspace graph without losing the project results", () => {
        vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
          json: undefined,
          markdown: { anchor: "workspace", path: "README.md" },
          target: "markdown",
        });

        const outcome = service.runNxGraphs(buildContext());

        expect(outcome.results).toStrictEqual([]);
        expect(outcome.failures).toStrictEqual([
          { error: expect.any(String) as string, projectName: "workspace" },
        ]);
      });

      it("reports a missing workspace JSON export as stale in check mode", () => {
        vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
          json: { path: "codependix-workspace-graph.json" },
          markdown: undefined,
          target: "json",
        });

        const outcome = service.runNxGraphs(buildContext({ mode: "check" }));

        expect(outcome).toStrictEqual({
          failures: [],
          results: [
            {
              isCurrent: false,
              projectName: "workspace",
              stalePaths: ["codependix-workspace-graph.json"],
            },
          ],
        });
      });
    });
  });

  describe("runNestjsGraphs", () => {
    /** Builds a context whose one project is `codependix-cli`. */
    function buildNestjsContext(
      overrides: Partial<GraphRunContext> = {},
    ): GraphRunContext {
      return buildContext({
        projects: [{ absoluteRoot: projectRoot, name: "codependix-cli" }],
        ...overrides,
      });
    }

    it("skips a project whose resolved target is none", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const outcome = await service.runNestjsGraphs(buildNestjsContext());

      expect(outcome).toStrictEqual({ failures: [], results: [] });
    });

    it("explores only the discovered nestjs projects", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: undefined,
        target: "json",
      });

      await service.runNestjsGraphs(buildNestjsContext());

      expect(nestjsProjectService.exploreProject).toHaveBeenCalledWith({
        absoluteRoot: projectRoot,
        name: "codependix-cli",
        rootModuleFile: undefined,
      });
    });

    it("writes a project's JSON export", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = await service.runNestjsGraphs(buildNestjsContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          { isCurrent: true, projectName: "codependix-cli", stalePaths: [] },
        ],
      });

      const written = JSON.parse(
        await readFile(path.join(projectRoot, "codependix-cli.json"), "utf8"),
      ) as unknown;

      expect(written).toStrictEqual(MODULE_GRAPH);
    });

    it("reports a missing JSON export as stale in check mode", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = await service.runNestjsGraphs(
        buildNestjsContext({ mode: "check" }),
      );

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-cli",
            stalePaths: ["codependix-cli.json"],
          },
        ],
      });
    });

    it("splices a diagram into an existing anchor block", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# codependix-cli",
          '<!-- codependix:start name="nestjs" -->',
          "stale",
          '<!-- codependix:end name="nestjs" -->',
        ].join("\n"),
        "utf8",
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: { anchor: "nestjs", path: "README.md" },
        target: "markdown",
      });

      const outcome = await service.runNestjsGraphs(buildNestjsContext());

      expect(outcome.results[0]?.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\nflowchart LR\n```");
      expect(written).not.toContain("stale");
    });

    it("writes both a JSON and a markdown export for a both target", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: { anchor: undefined, path: "module-graph.md" },
        target: "both",
      });

      await service.runNestjsGraphs(buildNestjsContext());

      await expect(
        readFile(path.join(projectRoot, "codependix-cli.json"), "utf8"),
      ).resolves.toContain("codependix-cli");
      await expect(
        readFile(path.join(projectRoot, "module-graph.md"), "utf8"),
      ).resolves.toContain("mermaid");
    });

    it("records a project's failure without preventing other projects from being processed", async () => {
      const otherProjectRoot = path.join(projectRoot, "other-nestjs-project");

      await mkdir(otherProjectRoot, { recursive: true });
      vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
        {
          absoluteRoot: projectRoot,
          name: "codependix-cli",
          rootModuleFile: undefined,
        },
        {
          absoluteRoot: otherProjectRoot,
          name: "other-nestjs-project",
          rootModuleFile: undefined,
        },
      ]);
      vi.mocked(nestjsProjectService.exploreProject).mockImplementation(
        async (project) =>
          project.name === "codependix-cli"
            ? Promise.reject(new Error("failed to boot container"))
            : Promise.resolve([]),
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = await service.runNestjsGraphs(
        buildNestjsContext({
          projects: [
            { absoluteRoot: projectRoot, name: "codependix-cli" },
            { absoluteRoot: otherProjectRoot, name: "other-nestjs-project" },
          ],
        }),
      );

      expect(outcome.failures).toStrictEqual([
        {
          error: "failed to boot container",
          projectName: "codependix-cli",
        },
      ]);
      expect(outcome.results).toStrictEqual([
        {
          isCurrent: true,
          projectName: "other-nestjs-project",
          stalePaths: [],
        },
      ]);
    });
  });

  describe("runImportGraphs", () => {
    /** Builds a context whose one project is `codependix-imports`. */
    function buildImportsContext(
      overrides: Partial<GraphRunContext> = {},
    ): GraphRunContext {
      return buildContext({
        projects: [{ absoluteRoot: projectRoot, name: "codependix-imports" }],
        ...overrides,
      });
    }

    it("skips a project whose resolved target is none", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const outcome = service.runImportGraphs(buildImportsContext());

      expect(outcome).toStrictEqual({ failures: [], results: [] });
    });

    it("builds a program only for the discovered typescript projects", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      service.runImportGraphs(buildImportsContext());

      expect(typescriptProjectService.buildProgram).toHaveBeenCalledWith({
        absoluteRoot: projectRoot,
        name: "codependix-imports",
        tsconfigPath: path.join(projectRoot, "tsconfig.json"),
      });
    });

    it("writes a project's JSON export", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runImportGraphs(buildImportsContext());

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: true,
            projectName: "codependix-imports",
            stalePaths: [],
          },
        ],
      });

      const written = JSON.parse(
        await readFile(
          path.join(projectRoot, "codependix-imports.json"),
          "utf8",
        ),
      ) as unknown;

      expect(written).toStrictEqual(IMPORT_GRAPH);
    });

    it("reports a missing JSON export as stale in check mode", () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runImportGraphs(
        buildImportsContext({ mode: "check" }),
      );

      expect(outcome).toStrictEqual({
        failures: [],
        results: [
          {
            isCurrent: false,
            projectName: "codependix-imports",
            stalePaths: ["codependix-imports.json"],
          },
        ],
      });
    });

    it("splices a diagram into an existing anchor block", async () => {
      const readmePath = path.join(projectRoot, "README.md");

      await writeFile(
        readmePath,
        [
          "# codependix-imports",
          '<!-- codependix:start name="imports" -->',
          "stale",
          '<!-- codependix:end name="imports" -->',
        ].join("\n"),
        "utf8",
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: { anchor: "imports", path: "README.md" },
        target: "markdown",
      });

      const outcome = service.runImportGraphs(buildImportsContext());

      expect(outcome.results[0]?.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\ngraph LR\n```");
      expect(written).not.toContain("stale");
    });

    it("writes both a JSON and a markdown export for a both target", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: { anchor: undefined, path: "import-graph.md" },
        target: "both",
      });

      service.runImportGraphs(buildImportsContext());

      await expect(
        readFile(path.join(projectRoot, "codependix-imports.json"), "utf8"),
      ).resolves.toContain("codependix-imports");
      await expect(
        readFile(path.join(projectRoot, "import-graph.md"), "utf8"),
      ).resolves.toContain("mermaid");
    });

    it("records a project's failure without preventing other projects from being processed", async () => {
      const otherProjectRoot = path.join(projectRoot, "other-imports-project");

      await mkdir(otherProjectRoot, { recursive: true });
      vi.mocked(typescriptProjectService.discoverProjects).mockReturnValue([
        {
          absoluteRoot: projectRoot,
          name: "codependix-imports",
          tsconfigPath: path.join(projectRoot, "tsconfig.json"),
        },
        {
          absoluteRoot: otherProjectRoot,
          name: "other-imports-project",
          tsconfigPath: path.join(otherProjectRoot, "tsconfig.json"),
        },
      ]);
      vi.mocked(typescriptProjectService.buildProgram).mockImplementation(
        (project) => {
          if (project.name === "codependix-imports") {
            throw new Error("failed to build program");
          }

          return createMock<TypescriptProjectProgram>();
        },
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runImportGraphs(
        buildImportsContext({
          projects: [
            { absoluteRoot: projectRoot, name: "codependix-imports" },
            { absoluteRoot: otherProjectRoot, name: "other-imports-project" },
          ],
        }),
      );

      expect(outcome.failures).toStrictEqual([
        {
          error: "failed to build program",
          projectName: "codependix-imports",
        },
      ]);
      expect(outcome.results).toStrictEqual([
        {
          isCurrent: true,
          projectName: "other-imports-project",
          stalePaths: [],
        },
      ]);
    });

    it("records a non-Error rejection as its string form", () => {
      const nonErrorFailure: unknown = "boom";

      vi.mocked(typescriptProjectService.buildProgram).mockImplementation(
        () => {
          throw nonErrorFailure;
        },
      );
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-imports.json" },
        markdown: undefined,
        target: "json",
      });

      const outcome = service.runImportGraphs(buildImportsContext());

      expect(outcome.failures).toStrictEqual([
        { error: "boom", projectName: "codependix-imports" },
      ]);
    });
  });

  describe("run", () => {
    it("loads the configuration and reads the project graph exactly once", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      await service.run({ write: true }, projectRoot);

      expect(configurationService.loadConfiguration).toHaveBeenCalledTimes(1);
      expect(neighborhoodService.readProjectGraph).toHaveBeenCalledTimes(1);
    });

    it("aggregates the results and failures from all three passes", async () => {
      const nxOutcome: GraphRunOutcome = {
        failures: [{ error: "nx-boom", projectName: "a" }],
        results: [{ isCurrent: true, projectName: "b", stalePaths: [] }],
      };
      const nestjsOutcome: GraphRunOutcome = {
        failures: [],
        results: [{ isCurrent: false, projectName: "c", stalePaths: ["c"] }],
      };
      const importsOutcome: GraphRunOutcome = {
        failures: [{ error: "import-boom", projectName: "d" }],
        results: [],
      };

      vi.spyOn(service, "runNxGraphs").mockReturnValue(nxOutcome);
      vi.spyOn(service, "runNestjsGraphs").mockResolvedValue(nestjsOutcome);
      vi.spyOn(service, "runImportGraphs").mockReturnValue(importsOutcome);

      const outcome = await service.run({ write: true }, projectRoot);

      expect(outcome).toStrictEqual({
        failures: [
          ...nxOutcome.failures,
          ...nestjsOutcome.failures,
          ...importsOutcome.failures,
        ],
        results: [
          ...nxOutcome.results,
          ...nestjsOutcome.results,
          ...importsOutcome.results,
        ],
      });
    });

    it("still runs the nestjs and import passes when the nx pass reports a failure", async () => {
      vi.spyOn(service, "runNxGraphs").mockReturnValue({
        failures: [{ error: "boom", projectName: "a" }],
        results: [],
      });

      await service.run({ write: true }, projectRoot);

      expect(service.runNestjsGraphs).toHaveBeenCalledTimes(1);
      expect(service.runImportGraphs).toHaveBeenCalledTimes(1);
    });
  });
});
