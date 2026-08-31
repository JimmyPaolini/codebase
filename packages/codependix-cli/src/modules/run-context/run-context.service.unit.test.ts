import { ConfigurationService } from "@codependix/configuration";
import { NeighborhoodService } from "@codependix/nx";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { RunContextService } from "./run-context.service";

import type { NxProject } from "@codependix/nx";

/** The projects the mocked workspace reports, tagged for selection. */
const PROJECTS: NxProject[] = [
  {
    absoluteRoot: "/workspace/packages/widgets",
    name: "widgets",
    tags: ["framework:nestjs"],
  },
  {
    absoluteRoot: "/workspace/tools/reporting",
    name: "reporting",
    tags: ["language:python"],
  },
];

describe(RunContextService, () => {
  let configurationService: ConfigurationService;
  let neighborhoodService: NeighborhoodService;
  let service: RunContextService;

  beforeAll(async () => {
    configurationService = createMock<ConfigurationService>();
    neighborhoodService = createMock<NeighborhoodService>();

    const module = await Test.createTestingModule({
      providers: [
        RunContextService,
        { provide: ConfigurationService, useValue: configurationService },
        { provide: NeighborhoodService, useValue: neighborhoodService },
      ],
    }).compile();

    service = await module.resolve(RunContextService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(neighborhoodService.readProjectGraph).mockResolvedValue({
      dependencies: {},
      nodes: {},
    });
    vi.mocked(neighborhoodService.readProjects).mockReturnValue(PROJECTS);
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue({
      boundaries: { imports: [], nestjs: [], nx: [], pythonImports: [] },
      defaults: {},
      exclude: [],
      include: ["**"],
      projectGraph: undefined,
      projects: {},
      selection: { projects: [], tags: [] },
      workspace: {},
    });
    vi.mocked(configurationService.isProjectSelected).mockReturnValue(true);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("loads the configuration and reads the project graph exactly once", async () => {
    await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(configurationService.loadConfiguration).toHaveBeenCalledTimes(1);
    expect(neighborhoodService.readProjectGraph).toHaveBeenCalledTimes(1);
  });

  it("carries the run mode it was given", async () => {
    const context = await service.build({
      mode: "check",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(context.mode).toBe("check");
  });

  it("hands the command line's selection to the configuration loader", async () => {
    await service.build({
      mode: "write",
      options: { projects: "widgets", tags: "framework:nestjs" },
      workingDirectory: "/workspace",
    });

    expect(configurationService.loadConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        selection: { projects: "widgets", tags: "framework:nestjs" },
      }),
    );
  });

  it("reads the working directory's own graph when none is supplied", async () => {
    await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(neighborhoodService.readProjectGraph).toHaveBeenCalledWith(
      undefined,
    );
  });

  // A supplied graph is what lets a run graph a workspace it is not standing
  // in. Its path resolves against the same root every export path does.
  it("resolves a supplied graph's path against the workspace root", async () => {
    vi.mocked(configurationService.loadConfiguration).mockResolvedValue({
      boundaries: { imports: [], nestjs: [], nx: [], pythonImports: [] },
      defaults: {},
      exclude: [],
      include: ["**"],
      projectGraph: "artifacts/graph.json",
      projects: {},
      selection: { projects: [], tags: [] },
      workspace: {},
    });

    await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(neighborhoodService.readProjectGraph).toHaveBeenCalledWith(
      "/workspace/artifacts/graph.json",
    );
  });

  // What keeps the Workspace Graph whole and the boundary gate judging every
  // project unless a run asked for something narrower.
  it("selects every project when nothing narrows the run", async () => {
    const context = await service.build({
      mode: "write",
      options: {},
      workingDirectory: "/workspace",
    });

    expect(context.selectedProjects).toStrictEqual(PROJECTS);
  });

  it("narrows the selected projects to what the selection matched", async () => {
    vi.mocked(configurationService.isProjectSelected).mockImplementation(
      (args) => args.projectName === "widgets",
    );

    const context = await service.build({
      mode: "write",
      options: { projects: "widgets" },
      workingDirectory: "/workspace",
    });

    expect(context.projects).toStrictEqual(PROJECTS);
    expect(
      context.selectedProjects.map((project) => project.name),
    ).toStrictEqual(["widgets"]);
  });

  it("matches a project's root against the selection as a workspace-relative path", async () => {
    await service.build({
      mode: "write",
      options: { projects: "tools/*" },
      workingDirectory: "/workspace",
    });

    expect(configurationService.isProjectSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: "reporting",
        projectRoot: "tools/reporting",
        projectTags: ["language:python"],
      }),
    );
  });
});
