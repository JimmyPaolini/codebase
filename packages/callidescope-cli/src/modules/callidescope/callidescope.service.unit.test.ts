import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import {
  buildFixtureProgram,
  buildFixtureServices,
  collectFixtureCallables,
  FIXTURE_ROOT,
} from "../../../testing/programs";
import { CohesionService } from "../cohesion/cohesion.service";
import { DocumentationService } from "../documentation/documentation.service";
import { EntryPointsService } from "../entry-points/entry-points.service";
import { ComponentsService } from "../graph/components.service";
import { DepthService } from "../graph/depth.service";
import { GraphService } from "../graph/graph.service";
import { PathsService } from "../graph/paths.service";
import { SignaturesService } from "../signatures/signatures.service";

import { CallidescopeService } from "./callidescope.service";

import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

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
  const subject = new CallidescopeService(
    fixture.callables,
    new CohesionService(),
    new ComponentsService(),
    fixture.hierarchy,
    new DepthService(),
    fixture.edges,
    new EntryPointsService(),
    fixture.external,
    new GraphService(),
    new PathsService(new DocumentationService(), new SignaturesService()),
    fixture.programService,
    fixture.workspace,
  );

  return subject.analyze({
    callablesById: collection.byId,
    configuration: args.configuration ?? buildConfiguration(),
    fileCount: collection.fileCount,
    projectCount: 1,
    workspaceRoot: FIXTURE_ROOT,
  });
}

/** Builds a resolved configuration with the defaults this suite assumes. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    entryPoints: {
      decorators: ["Command", "Get"],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: true,
    },
    exclude: [],
    excludeFrom: [],
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 2,
      maximumDepth: 2,
      maximumImplementationFanOut: 8,
      minimumCallers: 2,
      spreadThreshold: 2,
    },
    output: { json: undefined, markdown: undefined },
    projects: [],
    ...overrides,
  };
}

describe(CallidescopeService, () => {
  let service: CallidescopeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [CallidescopeService],
    }).compile();

    service = await module.resolve(CallidescopeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
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
