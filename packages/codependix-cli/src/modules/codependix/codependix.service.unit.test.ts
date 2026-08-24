import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { ModuleGraphService, NestjsProjectService } from "@codependix/nestjs";
import { NeighborhoodService, WorkspaceGraphService } from "@codependix/nx";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AnchorNotFoundError } from "../anchors/anchors.errors";
import { AnchorsService } from "../anchors/anchors.service";
import { DeliveryService } from "../delivery/delivery.service";

import { CodependixService } from "./codependix.service";

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

describe(CodependixService, () => {
  let service: CodependixService;
  let configurationService: ConfigurationService;
  let moduleGraphService: ModuleGraphService;
  let neighborhoodService: NeighborhoodService;
  let nestjsProjectService: NestjsProjectService;
  let workspaceGraphService: WorkspaceGraphService;
  let projectRoot: string;

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    moduleGraphService = createMock<ModuleGraphService>();
    neighborhoodService = createMock<NeighborhoodService>();
    nestjsProjectService = createMock<NestjsProjectService>();
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
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ModuleGraphService, useValue: moduleGraphService },
        { provide: NeighborhoodService, useValue: neighborhoodService },
        { provide: NestjsProjectService, useValue: nestjsProjectService },
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
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("runNxGraphs", () => {
    it("skips a project whose resolved target is none", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const results = await service.runNxGraphs({ write: true }, projectRoot);

      expect(results).toStrictEqual([]);
    });

    it("writes a project's JSON export", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-nx.json" },
        markdown: undefined,
        target: "json",
      });

      const results = await service.runNxGraphs({ write: true }, projectRoot);

      expect(results).toStrictEqual([
        { isCurrent: true, projectName: "codependix-nx", stalePaths: [] },
      ]);

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

    it("reports a missing JSON export as stale in check mode", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-nx.json" },
        markdown: undefined,
        target: "json",
      });

      const results = await service.runNxGraphs({ check: true }, projectRoot);

      expect(results).toStrictEqual([
        {
          isCurrent: false,
          projectName: "codependix-nx",
          stalePaths: ["codependix-nx.json"],
        },
      ]);
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

      const results = await service.runNxGraphs({ write: true }, projectRoot);

      expect(results[0]?.isCurrent).toBe(true);

      const written = await readFile(readmePath, "utf8");

      expect(written).toContain("```mermaid\ngraph LR\n```");
      expect(written).not.toContain("stale");
    });

    it("throws when an anchor destination names a file with no such anchor", async () => {
      await writeFile(path.join(projectRoot, "README.md"), "# empty", "utf8");
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      });

      await expect(
        service.runNxGraphs({ write: true }, projectRoot),
      ).rejects.toBeInstanceOf(AnchorNotFoundError);
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

      it("leaves the workspace graph out of the results when its target is none", async () => {
        const results = await service.runNxGraphs({ write: true }, projectRoot);

        expect(results).toStrictEqual([]);
      });

      it("writes the workspace graph's JSON export at the workspace root", async () => {
        vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
          json: { path: "codependix-workspace-graph.json" },
          markdown: undefined,
          target: "json",
        });

        const results = await service.runNxGraphs({ write: true }, projectRoot);

        expect(results).toStrictEqual([
          { isCurrent: true, projectName: "workspace", stalePaths: [] },
        ]);

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

      it("splices the workspace diagram into the root README's anchor", async () => {
        const readmePath = path.join(projectRoot, "README.md");

        await writeFile(
          readmePath,
          [
            "# codebase",
            '<!-- codependix:start name="workspace" -->',
            "stale",
            '<!-- codependix:end name="workspace" -->',
          ].join("\n"),
          "utf8",
        );
        vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
          json: undefined,
          markdown: { anchor: "workspace", path: "README.md" },
          target: "markdown",
        });
        vi.mocked(workspaceGraphService.renderMermaid).mockReturnValue(
          "```mermaid\ngraph LR\n  lexico --> logger\n```",
        );

        const results = await service.runNxGraphs({ write: true }, projectRoot);

        expect(results[0]).toStrictEqual({
          isCurrent: true,
          projectName: "workspace",
          stalePaths: [],
        });

        const written = await readFile(readmePath, "utf8");

        expect(written).toContain("lexico --> logger");
        expect(written).not.toContain("stale");
      });

      it("reports a missing workspace JSON export as stale in check mode", async () => {
        vi.mocked(configurationService.resolveForWorkspace).mockReturnValue({
          json: { path: "codependix-workspace-graph.json" },
          markdown: undefined,
          target: "json",
        });

        const results = await service.runNxGraphs({ check: true }, projectRoot);

        expect(results).toStrictEqual([
          {
            isCurrent: false,
            projectName: "workspace",
            stalePaths: ["codependix-workspace-graph.json"],
          },
        ]);
      });
    });
  });

  describe("runNestjsGraphs", () => {
    it("skips a project whose resolved target is none", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: undefined,
        markdown: undefined,
        target: "none",
      });

      const results = await service.runNestjsGraphs(
        { write: true },
        projectRoot,
      );

      expect(results).toStrictEqual([]);
    });

    it("explores only the discovered nestjs projects", async () => {
      vi.mocked(configurationService.resolveForProject).mockReturnValue({
        json: { path: "codependix-cli.json" },
        markdown: undefined,
        target: "json",
      });

      await service.runNestjsGraphs({ write: true }, projectRoot);

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

      const results = await service.runNestjsGraphs(
        { write: true },
        projectRoot,
      );

      expect(results).toStrictEqual([
        { isCurrent: true, projectName: "codependix-cli", stalePaths: [] },
      ]);

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

      const results = await service.runNestjsGraphs(
        { check: true },
        projectRoot,
      );

      expect(results).toStrictEqual([
        {
          isCurrent: false,
          projectName: "codependix-cli",
          stalePaths: ["codependix-cli.json"],
        },
      ]);
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

      const results = await service.runNestjsGraphs(
        { write: true },
        projectRoot,
      );

      expect(results[0]?.isCurrent).toBe(true);

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

      await service.runNestjsGraphs({ write: true }, projectRoot);

      await expect(
        readFile(path.join(projectRoot, "codependix-cli.json"), "utf8"),
      ).resolves.toContain("codependix-cli");
      await expect(
        readFile(path.join(projectRoot, "module-graph.md"), "utf8"),
      ).resolves.toContain("mermaid");
    });
  });
});
