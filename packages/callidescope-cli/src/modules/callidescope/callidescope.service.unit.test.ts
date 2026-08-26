import {
  BreadthService,
  CohesionService,
  ComponentsService,
  DocumentationService,
  EntriesService,
  GraphAssemblyService,
  GraphDepthService,
  GraphService,
  PathsService,
  SignaturesService,
} from "@callidescope/graph";
import { ProjectReportsService } from "@callidescope/output";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  FIXTURE_ROOT,
} from "../../../testing/programs";

import { CallidescopeService } from "./callidescope.service";

import type { FixtureServices } from "../../../testing/programs";
import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { DeepMocked } from "@golevelup/ts-vitest";

/** Analyzes in-memory files end to end, short of reading the disk. */
function analyze(args: {
  configuration?: ResolvedCallidescopeConfiguration;
  files: Record<string, string>;
}): CallGraphResult {
  const projectProgram = buildFixtureProgram(args.files);
  const fixture = buildFixtureServices({ projectProgram });
  const collection = collectFixtureCallables({
    projectProgram,
    services: fixture,
  });

  return buildSubject({ fixture }).analyze({
    callablesById: collection.byId,
    configuration: args.configuration ?? buildConfiguration(),
    fileCount: collection.fileCount,
    fileCountByProject: collection.fileCountByProject,
    projectCount: 1,
    projectNames: ["example"],
    workspaceRoot: FIXTURE_ROOT,
  });
}

/** Builds a resolved configuration with the defaults this suite assumes. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    directories: [],
    entryPoints: {
      decorators: ["Command", "Get"],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: true,
    },
    exclude: [],
    excludeFrom: [],
    ignoreCallees: [],
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 2,
      maximumDepth: 2,
      maximumImplementationCandidates: 8,
      minimumCallers: 2,
      spreadThreshold: 2,
    },
    output: {
      format: "markdown",
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
      projectReadmes: undefined,
    },
    workspaceStructure: {
      modulesDirectory: "modules",
      rootModuleSegment: "src",
    },
    ...overrides,
  };
}

/** Wires a `CallidescopeService` to fixture collaborators. */
function buildSubject(args: {
  fixture: FixtureServices;
  logger?: DeepMocked<LoggerService>;
}): CallidescopeService {
  return new CallidescopeService(
    args.fixture.callables,
    args.fixture.hierarchy,
    new CohesionService(),
    new EntriesService(createMock<LoggerService>()),
    args.fixture.external,
    new GraphAssemblyService(
      new BreadthService(),
      new ComponentsService(),
      new GraphDepthService(),
      args.fixture.edges,
      new GraphService(),
    ),
    args.fixture.programService,
    new ProjectReportsService(
      new PathsService(new DocumentationService(), new SignaturesService()),
      new SignaturesService(),
    ),
    args.fixture.workspace,
    args.logger ?? createMock<LoggerService>(),
  );
}

describe(CallidescopeService, () => {
  let service: CallidescopeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [
        CallidescopeService,
        GraphAssemblyService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(CallidescopeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("logs a summary when the analysis finishes", () => {
    const projectProgram = buildFixtureProgram({
      "packages/example/src/index.ts": "export function one(): void {}",
    });
    const fixture = buildFixtureServices({ projectProgram });
    const collection = collectFixtureCallables({
      projectProgram,
      services: fixture,
    });
    const logger = createMock<LoggerService>();

    buildSubject({ fixture, logger }).analyze({
      callablesById: collection.byId,
      configuration: buildConfiguration(),
      fileCount: collection.fileCount,
      fileCountByProject: collection.fileCountByProject,
      projectCount: 1,
      projectNames: ["example"],
      workspaceRoot: FIXTURE_ROOT,
    });

    expect(logger.info).toHaveBeenCalledWith(
      "🔭 Finished an analysis",
      undefined,
      {
        callableCount: 1,
        edgeCount: 0,
        entryPointCount: 1,
        maximumDepth: 1,
        misplacedCount: 0,
        spreadCount: 0,
      },
    );
  });

  it("reports a stack deeper than the configured limit", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(result.deepStacks).toHaveLength(1);
    expect(result.deepStacks[0]?.depth).toBe(3);
  });

  it("reports nothing when every stack is within the limit", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": "export function one(): void {}",
      },
    });

    expect(result.deepStacks).toStrictEqual([]);
  });

  it("names every frame of a reported stack", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(
      result.deepStacks[0]?.frames.map((frame) => frame.displayName),
    ).toStrictEqual(["one", "two", "three"]);
  });

  it("marks a stack running through an unfollowable call as a lower bound", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(callback: () => void): void { callback(); }
          function two(): void { three(() => {}); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(result.deepStacks[0]?.isLowerBound).toBe(true);
  });

  it("orders reported stacks deepest first", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function four(): void {}
          function three(): void { four(); }
          function two(): void { three(); }
          export function deep(): void { two(); }
          export function shallow(): void { three(); }
        `,
      },
    });

    const depths = result.deepStacks.map((finding) => finding.depth);

    expect(depths).toStrictEqual([...depths].toSorted((a, b) => b - a));
  });

  it("counts what it traced in the summary", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function helper(): void {}
          export function entry(): void { helper(); }
        `,
      },
    });

    expect(result.summary).toMatchObject({
      callableCount: 2,
      edgeCount: 1,
      fileCount: 1,
      projectCount: 1,
    });
  });

  it("counts the recursive cycles it found", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          export function ping(): void { pong(); }
          export function pong(): void { ping(); }
        `,
      },
    });

    expect(result.summary.cyclicComponentCount).toBe(1);
  });

  it("reports the deepest stack in the workspace", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          function three(): void {}
          function two(): void { three(); }
          export function one(): void { two(); }
        `,
      },
    });

    expect(result.summary.maximumDepth).toBe(3);
  });

  it("summarizes the depth range of a class's members", () => {
    const result = analyze({
      files: {
        "packages/example/src/index.ts": `
          export class Service {
            public shallow(): void {}
            public deep(): void { this.shallow(); }
          }
        `,
      },
    });

    expect(result.typeDepths[0]).toMatchObject({
      maximumDepth: 2,
      memberCount: 2,
      minimumDepth: 1,
    });
  });
});
