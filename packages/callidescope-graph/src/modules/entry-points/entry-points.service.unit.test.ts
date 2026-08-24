import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  FIXTURE_ROOT,
} from "../../../testing/programs";
import { GraphService } from "../graph/graph.service";

import { EntryPointsService } from "./entry-points.service";

import type { CallGraph } from "../graph/graph.types";
import type { EntryPointKind } from "@callidescope/configuration";
import type { LoggerService } from "@codebase/logger";
import type { DeepMocked } from "@golevelup/ts-vitest";

/** An empty call graph, for tests that never reach an edge. */
const EMPTY_GRAPH: CallGraph = {
  calleeIdsByCaller: new Map(),
  callerIdsByCallee: new Map(),
  edges: [],
  unresolvedCallerIds: new Set(),
  unresolvedCalls: [],
};

/** Resolves the entry points of an in-memory workspace. */
function resolveEntryPoints(args: {
  files: Record<string, string>;
  includeExportedFunctions?: boolean;
  includeOrphans?: boolean;
}): { kind: EntryPointKind; name: string }[] {
  const projectProgram = buildFixtureProgram(args.files);
  const services = buildFixtureServices({ projectProgram });
  const collection = collectFixtureCallables({ projectProgram, services });
  const graph = new GraphService().assemble(
    services.edges.build({
      callablesById: collection.byId,
      ignoreCallees: [],
      includeConstructorEdges: true,
      workspaceRoot: FIXTURE_ROOT,
    }),
  );

  return new EntryPointsService(createMock<LoggerService>())
    .resolve({
      callablesById: collection.byId,
      decorators: new Set(["Command", "Get", "Option"]),
      graph,
      includeExportedFunctions: args.includeExportedFunctions ?? true,
      includeOrphans: args.includeOrphans ?? true,
    })
    .entryPoints.map((entryPoint) => ({
      kind: entryPoint.kind,
      name:
        collection.byId.get(entryPoint.callableId)?.node.displayName ??
        "unknown",
    }));
}

describe(EntryPointsService, () => {
  let service: EntryPointsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [EntryPointsService],
    }).compile();

    service = await module.resolve(EntryPointsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("logs how many entry points it resolved, orphans included", () => {
    const logger = createMock<LoggerService>();
    const projectProgram = buildFixtureProgram({
      "packages/example/src/index.ts": "export function publicApi(): void {}",
    });
    const services = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({ projectProgram, services });
    const graph = new GraphService().assemble(
      services.edges.build({
        callablesById: collection.byId,
        ignoreCallees: [],
        includeConstructorEdges: true,
        workspaceRoot: FIXTURE_ROOT,
      }),
    );

    new EntryPointsService(logger).resolve({
      callablesById: collection.byId,
      decorators: new Set(),
      graph,
      includeExportedFunctions: true,
      includeOrphans: true,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Resolved entry points",
      undefined,
      { total: 1 },
    );
  });

  it("logs how many entry points it resolved, orphans excluded", () => {
    const logger: DeepMocked<LoggerService> = createMock<LoggerService>();

    new EntryPointsService(logger).resolve({
      callablesById: new Map(),
      decorators: new Set(),
      graph: EMPTY_GRAPH,
      includeExportedFunctions: false,
      includeOrphans: false,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Resolved entry points",
      undefined,
      { total: 0 },
    );
  });

  it("roots a method carrying a configured decorator", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          function Get(): MethodDecorator { return () => undefined; }
          export class Resolver {
            @Get()
            public read(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "decorated-method",
      name: "Resolver.read",
    });
  });

  it("roots the run method of a decorated command class", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.command.ts": `
          function Command(): ClassDecorator { return () => undefined; }
          @Command()
          export class ExampleCommand {
            public run(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "decorated-method",
      name: "ExampleCommand.run",
    });
  });

  it("roots a lifecycle hook nothing in the repository calls", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          export class Service {
            public onModuleInit(): void {}
          }
        `,
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "lifecycle",
      name: "Service.onModuleInit",
    });
  });

  it("roots a bootstrap function in a project's main file", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/main.ts": "export function main(): void {}",
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "module-bootstrap",
      name: "main",
    });
  });

  it("roots a function exported from a package barrel", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/index.ts": "export function publicApi(): void {}",
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "exported-function",
      name: "publicApi",
    });
  });

  it("does not root barrel exports when they are turned off", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/index.ts": "export function publicApi(): void {}",
      },
      includeExportedFunctions: false,
      includeOrphans: false,
    });

    expect(entryPoints).toStrictEqual([]);
  });

  it("promotes a callable nothing calls to an orphan root", () => {
    // The safety net: a rule this list is missing shows up here rather than
    // silently removing a whole subtree from every measurement.
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Service { public unused(): void {} }",
      },
    });

    expect(entryPoints).toContainEqual({
      kind: "orphan-root",
      name: "Service.unused",
    });
  });

  it("does not promote orphans when they are turned off", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts":
          "export class Service { public unused(): void {} }",
      },
      includeOrphans: false,
    });

    expect(entryPoints).toStrictEqual([]);
  });

  it("does not promote a callable that already has a caller", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/main.ts": `
          function helper(): void {}
          export function main(): void { helper(); }
        `,
      },
    });

    expect(
      entryPoints.filter((entry) => entry.name === "helper"),
    ).toStrictEqual([]);
  });

  it("roots each callable only once", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/index.ts": "export function publicApi(): void {}",
      },
    });

    expect(
      entryPoints.filter((entry) => entry.name === "publicApi"),
    ).toHaveLength(1);
  });

  it("roots a method decorated without a call", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          declare const Get: MethodDecorator;
          export class Resolver {
            @Get
            public read(): void {}
          }
        `,
      },
      includeOrphans: false,
    });

    expect(entryPoints).toContainEqual({
      kind: "decorated-method",
      name: "Resolver.read",
    });
  });

  it("ignores a decorator that is not written as a plain name", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          declare const decorators: { Get: MethodDecorator };
          export class Resolver {
            @decorators.Get
            public read(): void {}
          }
        `,
      },
      includeOrphans: false,
    });

    expect(entryPoints).toStrictEqual([]);
  });

  it("ignores a decorator that was not configured", () => {
    const entryPoints = resolveEntryPoints({
      files: {
        "packages/example/src/modules/a/a.service.ts": `
          function Memoize(): MethodDecorator { return () => undefined; }
          export class Service {
            @Memoize()
            public read(): void {}
          }
        `,
      },
      includeOrphans: false,
    });

    expect(entryPoints).toStrictEqual([]);
  });
});
