import { PythonService, TypescriptService } from "@codependix/imports";
import { ModuleGraphService, NestjsProjectService } from "@codependix/nestjs";
import { WorkspaceGraphService } from "@codependix/nx";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BoundariesService } from "../boundaries/boundaries.service";

import { BoundaryCheckService } from "./boundary-check.service";
import { BoundaryGraphService } from "./boundary-graph.service";

import type {
  BoundaryGraph,
  BoundaryViolation,
} from "../boundaries/boundaries.types";
import type { BoundaryCheckContext } from "./boundary-check.types";
import type {
  CodependixBoundaryRule,
  ResolvedCodependixBoundariesConfiguration,
} from "@codependix/configuration";

const RULE: CodependixBoundaryRule = {
  from: { id: ["a"] },
  kind: "forbid",
  name: "layers",
  to: { id: ["b"] },
};

const RULE_LIST: CodependixBoundaryRule[] = [RULE];

const VIOLATION: BoundaryViolation = {
  cycle: undefined,
  level: "nx",
  message: "layers: a must not depend on b.",
  rule: "layers",
  scope: "workspace",
  source: "a",
  target: "b",
};

describe(BoundaryCheckService, () => {
  let boundariesService: BoundariesService;
  let moduleGraphService: ModuleGraphService;
  let nestjsProjectService: NestjsProjectService;
  let pythonService: PythonService;
  let evaluatedGraphs: BoundaryGraph[];
  let evaluatedRules: (readonly CodependixBoundaryRule[])[];
  let reportedViolations: BoundaryViolation[];
  let service: BoundaryCheckService;
  let typescriptService: TypescriptService;
  let workspaceGraphService: WorkspaceGraphService;

  /** Builds a context whose configuration declares the given rules. */
  function buildContext(
    boundaries: Partial<ResolvedCodependixBoundariesConfiguration> = {},
  ): BoundaryCheckContext {
    return {
      configuration: {
        boundaries: {
          imports: [],
          nestjs: [],
          nx: [],
          pythonImports: [],
          ...boundaries,
        },
        defaults: {},
        exclude: [],
        include: ["**"],
        projects: {},
        workspace: {},
      },
      graph: { dependencies: {}, nodes: {} },
      projects: [{ absoluteRoot: "/workspace/packages/a", name: "a" }],
      workingDirectory: "/workspace",
    };
  }

  beforeAll(async () => {
    boundariesService = createMock<BoundariesService>();
    moduleGraphService = createMock<ModuleGraphService>();
    nestjsProjectService = createMock<NestjsProjectService>();
    pythonService = createMock<PythonService>();
    typescriptService = createMock<TypescriptService>();
    workspaceGraphService = createMock<WorkspaceGraphService>();

    const module = await Test.createTestingModule({
      providers: [
        BoundaryCheckService,
        BoundaryGraphService,
        { provide: BoundariesService, useValue: boundariesService },
        { provide: ModuleGraphService, useValue: moduleGraphService },
        { provide: NestjsProjectService, useValue: nestjsProjectService },
        { provide: PythonService, useValue: pythonService },
        { provide: TypescriptService, useValue: typescriptService },
        { provide: WorkspaceGraphService, useValue: workspaceGraphService },
      ],
    }).compile();

    service = await module.resolve(BoundaryCheckService);
  });

  beforeEach(() => {
    evaluatedGraphs = [];
    evaluatedRules = [];
    reportedViolations = [];
    // Recorded through the implementation rather than read back off
    // `mock.calls`, so every assertion below stays typed as a `BoundaryGraph`
    // rather than as whatever a call-tuple index happens to hold.
    vi.mocked(boundariesService.evaluate).mockImplementation((args) => {
      evaluatedGraphs.push(args.graph);
      evaluatedRules.push(args.rules);

      return reportedViolations;
    });
    vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockReturnValue({
      edges: [],
      projectNames: [],
    });
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([]);
    vi.mocked(pythonService.discoverProjects).mockReturnValue([]);
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([]);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("builds no graph at all when no rule is declared", async () => {
    const outcome = await service.run(buildContext());

    expect(outcome).toStrictEqual({ failures: [], violations: [] });
    expect(workspaceGraphService.buildWorkspaceGraph).not.toHaveBeenCalled();
    expect(nestjsProjectService.discoverProjects).not.toHaveBeenCalled();
    expect(typescriptService.discoverProjects).not.toHaveBeenCalled();
    expect(pythonService.discoverProjects).not.toHaveBeenCalled();
  });

  it("judges the Nx level and reports what it found", async () => {
    reportedViolations.push(VIOLATION);

    const outcome = await service.run(buildContext({ nx: RULE_LIST }));

    expect(outcome.violations).toStrictEqual([VIOLATION]);
    expect(evaluatedGraphs[0]?.level).toBe("nx");
    expect(evaluatedGraphs[0]?.scope).toBe("workspace");
    expect(evaluatedRules[0]).toBe(RULE_LIST);
  });

  it("records a failed workspace graph rather than raising", async () => {
    vi.mocked(workspaceGraphService.buildWorkspaceGraph).mockImplementation(
      () => {
        throw new Error("boom");
      },
    );

    const outcome = await service.run(buildContext({ nx: RULE_LIST }));

    expect(outcome.failures).toStrictEqual([
      { error: "boom", projectName: "workspace" },
    ]);
  });

  it("judges every NestJS project's module graph", async () => {
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        rootModuleFile: "src/main.ts",
      },
    ]);
    vi.mocked(moduleGraphService.buildGraph).mockReturnValue({
      ambientModuleNames: [],
      edges: [],
      isolatedModuleNames: [],
      moduleNames: ["AppModule"],
      projectName: "a",
    });

    await service.run(buildContext({ nestjs: RULE_LIST }));

    expect(evaluatedGraphs[0]?.level).toBe("nestjs");
    expect(evaluatedGraphs[0]?.scope).toBe("a");
  });

  it("records a container that would not boot and keeps going", async () => {
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        rootModuleFile: "src/main.ts",
      },
      {
        absoluteRoot: "/workspace/packages/b",
        name: "b",
        rootModuleFile: "src/main.ts",
      },
    ]);
    vi.mocked(nestjsProjectService.exploreProject).mockRejectedValueOnce(
      new Error("boom"),
    );
    vi.mocked(moduleGraphService.buildGraph).mockReturnValue({
      ambientModuleNames: [],
      edges: [],
      isolatedModuleNames: [],
      moduleNames: [],
      projectName: "b",
    });

    const outcome = await service.run(buildContext({ nestjs: RULE_LIST }));

    expect(outcome.failures).toStrictEqual([
      { error: "boom", projectName: "a" },
    ]);
    expect(evaluatedGraphs).toHaveLength(1);
  });

  it("records a non-Error rejection as its string form", async () => {
    // A rejection carrying a string rather than an `Error` is what a
    // third-party container can hand back, and the failure collector has to
    // name it rather than print "[object Object]".
    vi.mocked(nestjsProjectService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        rootModuleFile: "src/main.ts",
      },
    ]);
    vi.mocked(nestjsProjectService.exploreProject).mockRejectedValueOnce(
      "boom",
    );

    const outcome = await service.run(buildContext({ nestjs: RULE_LIST }));

    expect(outcome.failures).toStrictEqual([
      { error: "boom", projectName: "a" },
    ]);
  });

  it("judges every TypeScript project's file-level import graph", async () => {
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        tsconfigPath: "/workspace/packages/a/tsconfig.json",
      },
    ]);
    vi.mocked(typescriptService.buildGraph).mockReturnValue({
      edges: [],
      fileNames: ["src/index.ts"],
      isolatedFileNames: [],
      projectName: "a",
    });

    await service.run(buildContext({ imports: RULE_LIST }));

    expect(evaluatedGraphs[0]?.level).toBe("imports");
    expect(evaluatedGraphs[0]?.scope).toBe("a");
  });

  it("records a TypeScript project whose program would not build", async () => {
    vi.mocked(typescriptService.discoverProjects).mockReturnValue([
      {
        absoluteRoot: "/workspace/packages/a",
        name: "a",
        tsconfigPath: "/workspace/packages/a/tsconfig.json",
      },
    ]);
    vi.mocked(typescriptService.buildProgram).mockImplementation(() => {
      throw new Error("boom");
    });

    const outcome = await service.run(buildContext({ imports: RULE_LIST }));

    expect(outcome.failures).toStrictEqual([
      { error: "boom", projectName: "a" },
    ]);
  });

  it("judges every Python project's file-level import graph", async () => {
    vi.mocked(pythonService.discoverProjects).mockReturnValue([
      { absoluteRoot: "/workspace/applications/a", name: "a" },
    ]);
    vi.mocked(pythonService.buildGraph).mockReturnValue({
      edges: [],
      fileNames: ["main.py"],
      isolatedFileNames: ["main.py"],
      projectName: "a",
    });

    await service.run(buildContext({ pythonImports: RULE_LIST }));

    expect(evaluatedGraphs[0]?.level).toBe("pythonImports");
    expect(evaluatedGraphs[0]?.scope).toBe("a");
  });

  it("records a Python project that could not be parsed", async () => {
    vi.mocked(pythonService.discoverProjects).mockReturnValue([
      { absoluteRoot: "/workspace/applications/a", name: "a" },
    ]);
    vi.mocked(pythonService.buildGraph).mockImplementation(() => {
      throw new Error("boom");
    });

    const outcome = await service.run(
      buildContext({ pythonImports: RULE_LIST }),
    );

    expect(outcome.failures).toStrictEqual([
      { error: "boom", projectName: "a" },
    ]);
  });

  it("judges every level a rule was declared for, in one run", async () => {
    await service.run(
      buildContext({
        imports: [RULE],
        nestjs: [RULE],
        nx: [RULE],
        pythonImports: [RULE],
      }),
    );

    expect(workspaceGraphService.buildWorkspaceGraph).toHaveBeenCalledTimes(1);
    expect(nestjsProjectService.discoverProjects).toHaveBeenCalledTimes(1);
    expect(typescriptService.discoverProjects).toHaveBeenCalledTimes(1);
    expect(pythonService.discoverProjects).toHaveBeenCalledTimes(1);
  });
});
