import {
  FileImportsWorkspaceGraphService,
  PythonService,
  TypescriptService,
} from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsModulesWorkspaceGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { WorkspaceGraphService } from "@codependix/nx-projects";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PathQueryService } from "./path-query.service";

import type { GraphRunContext } from "@codependix/boundaries";
import type { TypescriptProjectProgram } from "@codependix/file-imports";

describe(PathQueryService, () => {
  let service: PathQueryService;
  let workspaceGraphService: WorkspaceGraphService;
  let typescriptService: TypescriptService;
  let pythonService: PythonService;
  let moduleGraphService: ModuleGraphService;
  let nestjsProjectService: NestjsProjectService;
  let fileImportsWorkspaceGraphService: FileImportsWorkspaceGraphService;
  let nestjsModulesWorkspaceGraphService: NestjsModulesWorkspaceGraphService;

  function buildContext(
    overrides: Partial<GraphRunContext> = {},
  ): GraphRunContext {
    return {
      configuration: {
        boundaries: {
          fileImports: { python: [], typescript: [] },
          nestjsModules: [],
          nxProjects: [],
        },
        exclude: [],
        include: ["**"],
        projectGraph: undefined,
        selection: { projects: [], tags: [] },
        workspace: {},
      },
      enabledGraphTypes: new Set([
        "fileImports",
        "nestjsModules",
        "nxProjects",
      ]),
      graph: { dependencies: {}, nodes: {} },
      mode: "check",
      projectConfigurations: new Map(),
      projects: [
        { absoluteRoot: "/root/package-a", name: "package-a", tags: [] },
      ],
      selectedProjects: [
        { absoluteRoot: "/root/package-a", name: "package-a", tags: [] },
      ],
      workingDirectory: "/root",
      ...overrides,
    };
  }

  beforeAll(async () => {
    workspaceGraphService = createMock<WorkspaceGraphService>();
    typescriptService = createMock<TypescriptService>();
    pythonService = createMock<PythonService>();
    moduleGraphService = createMock<ModuleGraphService>();
    nestjsProjectService = createMock<NestjsProjectService>();
    fileImportsWorkspaceGraphService = new FileImportsWorkspaceGraphService();
    nestjsModulesWorkspaceGraphService =
      new NestjsModulesWorkspaceGraphService();

    const module = await Test.createTestingModule({
      providers: [
        PathQueryService,
        { provide: WorkspaceGraphService, useValue: workspaceGraphService },
        { provide: TypescriptService, useValue: typescriptService },
        { provide: PythonService, useValue: pythonService },
        { provide: ModuleGraphService, useValue: moduleGraphService },
        { provide: NestjsProjectService, useValue: nestjsProjectService },
        {
          provide: FileImportsWorkspaceGraphService,
          useValue: fileImportsWorkspaceGraphService,
        },
        {
          provide: NestjsModulesWorkspaceGraphService,
          useValue: nestjsModulesWorkspaceGraphService,
        },
      ],
    }).compile();

    service = await module.resolve(PathQueryService);
  });

  beforeEach(() => {
    typescriptService.discoverProjects = () => [
      {
        absoluteRoot: "/root/package-a",
        name: "package-a",
        tsconfigPath: "/root/package-a/tsconfig.json",
      },
    ];
    typescriptService.buildProgram = () =>
      createMock<TypescriptProjectProgram>();
    typescriptService.buildGraph = () => ({
      edges: [
        { source: "a.ts", target: "b.ts" },
        { source: "b.ts", target: "c.ts" },
      ],
      fileNames: ["a.ts", "b.ts", "c.ts"],
      isolatedFileNames: [],
      projectName: "package-a",
    });
    pythonService.discoverProjects = () => [];
    pythonService.buildGraph = () => ({
      edges: [],
      fileNames: [],
      isolatedFileNames: [],
      projectName: "py",
    });
    workspaceGraphService.buildWorkspaceGraph = () => ({
      edges: [
        { implicit: false, source: "package-a", target: "package-b" },
        { implicit: false, source: "package-b", target: "package-c" },
      ],
      projectNames: ["package-a", "package-b", "package-c"],
    });
    nestjsProjectService.discoverProjects = () => [
      {
        absoluteRoot: "/root/package-a",
        name: "package-a",
        rootModuleFile: undefined,
      },
    ];
    nestjsProjectService.exploreProject = vi.fn().mockResolvedValue([]);
    moduleGraphService.buildGraph = () => ({
      ambientModuleNames: [],
      edges: [{ source: "AppModule", target: "CoreModule" }],
      isolatedModuleNames: [],
      moduleNames: ["AppModule", "CoreModule"],
      projectName: "package-a",
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds a direct and indirect path between Nx projects", async () => {
    const context = buildContext();
    const result = await service.query({
      context,
      from: "package-a",
      to: "package-c",
    });

    expect(result.nxProjects).toStrictEqual({
      from: "package-a",
      path: ["package-a", "package-b", "package-c"],
      to: "package-c",
    });
  });

  it("returns null path when no path connects two Nx projects", async () => {
    const context = buildContext();
    const result = await service.query({
      context,
      from: "package-c",
      to: "package-a",
    });

    expect(result.nxProjects).toStrictEqual({
      from: "package-c",
      path: null,
      to: "package-a",
    });
  });

  it("finds a path between TypeScript file imports", async () => {
    const context = buildContext({
      enabledGraphTypes: new Set(["fileImports"]),
    });
    const result = await service.query({
      context,
      from: "package-a/a.ts",
      to: "package-a/c.ts",
    });

    expect(result.fileImports).toStrictEqual({
      from: "package-a/a.ts",
      path: ["package-a/a.ts", "package-a/b.ts", "package-a/c.ts"],
      to: "package-a/c.ts",
    });
  });

  it("finds a path between NestJS modules", async () => {
    const context = buildContext({
      enabledGraphTypes: new Set(["nestjsModules"]),
    });
    const result = await service.query({
      context,
      from: "package-a/AppModule",
      to: "package-a/CoreModule",
    });

    expect(result.nestjsModules).toStrictEqual({
      from: "package-a/AppModule",
      path: ["package-a/AppModule", "package-a/CoreModule"],
      to: "package-a/CoreModule",
    });
  });

  it("handles identical source and target", () => {
    const path = service.findShortestPath({
      edges: [{ source: "a", target: "b" }],
      from: "a",
      nodes: ["a", "b"],
      to: "a",
    });

    expect(path).toStrictEqual(["a"]);
  });

  it("returns null when source or target is unknown", () => {
    const path = service.findShortestPath({
      edges: [{ source: "a", target: "b" }],
      from: "unknown-from",
      nodes: ["a", "b"],
      to: "b",
    });

    expect(path).toBeNull();
  });

  it("handles python file imports", async () => {
    pythonService.discoverProjects = () => [
      {
        absoluteRoot: "/root/python-package",
        name: "python-package",
      },
    ];
    pythonService.buildGraph = () => ({
      edges: [{ source: "main.py", target: "helper.py" }],
      fileNames: ["main.py", "helper.py"],
      isolatedFileNames: [],
      projectName: "python-package",
    });

    const context = buildContext({
      enabledGraphTypes: new Set(["fileImports"]),
    });
    const result = await service.query({
      context,
      from: "python-package/main.py",
      to: "python-package/helper.py",
    });

    expect(result.fileImports).toStrictEqual({
      from: "python-package/main.py",
      path: ["python-package/main.py", "python-package/helper.py"],
      to: "python-package/helper.py",
    });
  });
});
