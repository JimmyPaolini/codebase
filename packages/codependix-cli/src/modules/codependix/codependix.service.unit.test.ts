import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { NeighborhoodService } from "@codependix/nx";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { AnchorNotFoundError } from "../anchors/anchors.errors";
import { AnchorsService } from "../anchors/anchors.service";

import { CodependixService } from "./codependix.service";

import type { Neighborhood } from "@codependix/nx";

const NEIGHBORHOOD: Neighborhood = {
  dependencies: ["logger"],
  dependents: [],
  edges: [{ implicit: false, source: "codependix-nx", target: "logger" }],
  projectName: "codependix-nx",
};

describe(CodependixService, () => {
  let service: CodependixService;
  let configurationService: ConfigurationService;
  let neighborhoodService: NeighborhoodService;
  let projectRoot: string;

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    neighborhoodService = createMock<NeighborhoodService>();

    const module = await Test.createTestingModule({
      providers: [
        AnchorsService,
        CodependixService,
        {
          provide: ConfigurationService,
          useValue: configurationService,
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: NeighborhoodService, useValue: neighborhoodService },
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
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

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

  it("reports a current JSON export as not stale in check mode", async () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: { path: "codependix-nx.json" },
      markdown: undefined,
      target: "json",
    });

    await service.runNxGraphs({ write: true }, projectRoot);
    const results = await service.runNxGraphs({ check: true }, projectRoot);

    expect(results[0]?.isCurrent).toBe(true);
  });

  it("writes a standalone markdown export", async () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: undefined,
      markdown: { anchor: undefined, path: "docs/dependency-graph.md" },
      target: "markdown",
    });

    await service.runNxGraphs({ write: true }, projectRoot);

    const written = await readFile(
      path.join(projectRoot, "docs/dependency-graph.md"),
      "utf8",
    );

    expect(written).toBe("```mermaid\ngraph LR\n```\n");
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

  it("checks an anchor destination without writing anything", async () => {
    const readmePath = path.join(projectRoot, "README.md");

    await writeFile(
      readmePath,
      [
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

    const results = await service.runNxGraphs({ check: true }, projectRoot);

    expect(results[0]).toStrictEqual({
      isCurrent: false,
      projectName: "codependix-nx",
      stalePaths: ["README.md"],
    });
    await expect(readFile(readmePath, "utf8")).resolves.toContain("stale");
  });

  it("reports a missing standalone markdown export as stale in check mode", async () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: undefined,
      markdown: { anchor: undefined, path: "docs/dependency-graph.md" },
      target: "markdown",
    });

    const results = await service.runNxGraphs({ check: true }, projectRoot);

    expect(results).toStrictEqual([
      {
        isCurrent: false,
        projectName: "codependix-nx",
        stalePaths: ["docs/dependency-graph.md"],
      },
    ]);
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

  it("writes both a JSON and a markdown export for target both", async () => {
    vi.mocked(configurationService.resolveForProject).mockReturnValue({
      json: { path: "codependix-nx.json" },
      markdown: { anchor: undefined, path: "dependency-graph.md" },
      target: "both",
    });

    await service.runNxGraphs({ write: true }, projectRoot);

    await expect(
      readFile(path.join(projectRoot, "codependix-nx.json"), "utf8"),
    ).resolves.toContain("codependix-nx");
    await expect(
      readFile(path.join(projectRoot, "dependency-graph.md"), "utf8"),
    ).resolves.toContain("mermaid");
  });
});
