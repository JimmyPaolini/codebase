import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoundaryGraphService } from "./boundary-graph.service";

import type { ProjectGraph } from "@nx/devkit";

const PROJECT_GRAPH: ProjectGraph = {
  dependencies: {},
  nodes: {
    "codependix-cli": {
      data: { root: "packages/codependix-cli", tags: ["type:package"] },
      name: "codependix-cli",
      type: "lib",
    },
    "codependix-nx": {
      data: { root: "packages/codependix-nx" },
      name: "codependix-nx",
      type: "lib",
    },
  },
};

describe(BoundaryGraphService, () => {
  let service: BoundaryGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoundaryGraphService],
    }).compile();

    service = await module.resolve(BoundaryGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("carries an Nx project's tags, root, and name", () => {
    const graph = service.buildNxGraph({
      graph: PROJECT_GRAPH,
      projects: [
        {
          absoluteRoot: "/workspace/packages/codependix-cli",
          name: "codependix-cli",
        },
      ],
      scope: "workspace",
      workingDirectory: "/workspace",
      workspaceGraph: {
        edges: [
          {
            implicit: false,
            source: "codependix-cli",
            target: "codependix-nx",
          },
        ],
        projectNames: ["codependix-cli"],
      },
    });

    expect(graph).toStrictEqual({
      edges: [
        { implicit: false, source: "codependix-cli", target: "codependix-nx" },
      ],
      level: "nx",
      nodes: [
        {
          id: "codependix-cli",
          path: "packages/codependix-cli",
          project: "codependix-cli",
          tags: ["type:package"],
        },
      ],
      scope: "workspace",
    });
  });

  it("leaves a project's path unset when no discovered project carries it", () => {
    const graph = service.buildNxGraph({
      graph: PROJECT_GRAPH,
      projects: [],
      scope: "workspace",
      workingDirectory: "/workspace",
      workspaceGraph: { edges: [], projectNames: ["codependix-nx"] },
    });

    expect(graph.nodes[0]).toStrictEqual({
      id: "codependix-nx",
      path: undefined,
      project: "codependix-nx",
      tags: undefined,
    });
  });

  it("gives a NestJS module a name and nothing else", () => {
    const graph = service.buildNestjsGraph({
      ambientModuleNames: [],
      edges: [{ source: "MapModule", target: "DeliveryModule" }],
      isolatedModuleNames: [],
      moduleNames: ["DeliveryModule", "MapModule"],
      projectName: "codependix-cli",
    });

    expect(graph).toStrictEqual({
      edges: [{ source: "MapModule", target: "DeliveryModule" }],
      level: "nestjs",
      nodes: [{ id: "DeliveryModule" }, { id: "MapModule" }],
      scope: "codependix-cli",
    });
  });

  it("gives a TypeScript file its path and its project", () => {
    const graph = service.buildTypescriptImportGraph({
      edges: [{ source: "src/a.ts", target: "src/b.ts" }],
      fileNames: ["src/a.ts", "src/b.ts"],
      isolatedFileNames: [],
      projectName: "codependix-cli",
    });

    expect(graph).toStrictEqual({
      edges: [{ source: "src/a.ts", target: "src/b.ts" }],
      level: "imports",
      nodes: [
        { id: "src/a.ts", path: "src/a.ts", project: "codependix-cli" },
        { id: "src/b.ts", path: "src/b.ts", project: "codependix-cli" },
      ],
      scope: "codependix-cli",
    });
  });

  it("gives a Python file the same shape at its own level", () => {
    const graph = service.buildPythonImportGraph({
      edges: [],
      fileNames: ["main.py"],
      isolatedFileNames: ["main.py"],
      projectName: "affirmations",
    });

    expect(graph.level).toBe("pythonImports");
    expect(graph.nodes).toStrictEqual([
      { id: "main.py", path: "main.py", project: "affirmations" },
    ]);
  });
});
