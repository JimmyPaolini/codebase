import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";
import { ComponentsService } from "../graph/components.service";
import { GraphDepthService } from "../graph/graph-depth.service";
import { GraphService } from "../graph/graph.service";

import { CohesionService } from "./cohesion.service";

import type { DiscoveredCallable } from "../callables/callables.types";
import type { AnalyzeCohesionArguments } from "./cohesion.types";
import type { CallableId, CallEdge } from "@callidescope/configuration";

/** One callable, described the way the cohesion findings read it. */
interface Fixture {
  readonly filePath?: string;
  readonly id: string;
  readonly moduleId: string;
  readonly projectName?: string;
}

/** Assembles everything the cohesion findings need from a description. */
function buildArguments(args: {
  allowSpreadFor?: string[];
  callables: Fixture[];
  limits?: Partial<AnalyzeCohesionArguments["limits"]>;
  pairs: [string, string][];
}): AnalyzeCohesionArguments {
  const callablesById = new Map<CallableId, DiscoveredCallable>(
    args.callables.map((fixture) => [
      fixture.id,
      buildDiscoveredCallable({
        displayName: fixture.id,
        id: fixture.id,
        location: buildSourceLocation({
          filePath: fixture.filePath ?? `${fixture.id}.ts`,
        }),
        moduleId: fixture.moduleId,
        projectName: fixture.projectName ?? "example",
      }),
    ]),
  );
  const graph = new GraphService().assemble({
    edges: args.pairs.map(([from, to]) => edge(from, to)),
    unresolvedCalls: [],
  });
  const condensed = new ComponentsService().condense({
    callableIds: callablesById.keys(),
    graph,
  });

  return {
    allowSpreadFor: args.allowSpreadFor ?? [],
    callablesById,
    condensed,
    graph,
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 2,
      maximumDepth: 6,
      maximumImplementationCandidates: 8,
      minimumCallers: 2,
      spreadThreshold: 2,
      ...args.limits,
    },
    measurement: new GraphDepthService().measure({
      condensed,
      graph,
      moduleIdByCallable: new Map(
        args.callables.map((fixture) => [fixture.id, fixture.moduleId]),
      ),
    }),
  };
}

/** Builds an edge between two identifiers. */
function edge(from: string, to: string): CallEdge {
  return {
    calleeId: to,
    callerId: from,
    callSite: { column: 1, filePath: "example.ts", line: 1 },
    candidateCount: 1,
    resolution: "direct",
  };
}

describe(CohesionService, () => {
  let service: CohesionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [CohesionService],
    }).compile();

    service = await module.resolve(CohesionService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subject = new CohesionService();

  // ⚠ Module spread

  it("reports a callable calling several unrelated modules directly", () => {
    const findings = subject.findModuleSpreads(
      buildArguments({
        callables: [
          { id: "dispatch", moduleId: "example:modules/a" },
          { id: "one", moduleId: "example:modules/b" },
          { id: "two", moduleId: "example:modules/c" },
        ],
        pairs: [
          ["dispatch", "one"],
          ["dispatch", "two"],
        ],
      }),
    );

    expect(findings.map((finding) => finding.displayName)).toStrictEqual([
      "dispatch",
    ]);
  });

  it("does not report a callable whose reach is deep but narrow", () => {
    // Transitive breadth alone would flag every entry point, which is why
    // direct breadth is required as well.
    const findings = subject.findModuleSpreads(
      buildArguments({
        callables: [
          { id: "entry", moduleId: "example:modules/a" },
          { id: "middle", moduleId: "example:modules/b" },
          { id: "leaf", moduleId: "example:modules/c" },
        ],
        pairs: [
          ["entry", "middle"],
          ["middle", "leaf"],
        ],
      }),
    );

    expect(findings).toStrictEqual([]);
  });

  it("ignores callees sitting in the callable's own module", () => {
    const findings = subject.findModuleSpreads(
      buildArguments({
        callables: [
          { id: "entry", moduleId: "example:modules/a" },
          { id: "sibling", moduleId: "example:modules/a" },
          { id: "other", moduleId: "example:modules/b" },
        ],
        pairs: [
          ["entry", "sibling"],
          ["entry", "other"],
        ],
      }),
    );

    expect(findings).toStrictEqual([]);
  });

  it("exempts a file matching an allowance glob", () => {
    const findings = subject.findModuleSpreads(
      buildArguments({
        allowSpreadFor: ["**/*.command.ts"],
        callables: [
          {
            filePath: "packages/example/src/a.command.ts",
            id: "dispatch",
            moduleId: "example:modules/a",
          },
          { id: "one", moduleId: "example:modules/b" },
          { id: "two", moduleId: "example:modules/c" },
        ],
        pairs: [
          ["dispatch", "one"],
          ["dispatch", "two"],
        ],
      }),
    );

    expect(findings).toStrictEqual([]);
  });

  it("orders spread findings widest first", () => {
    const findings = subject.findModuleSpreads(
      buildArguments({
        callables: [
          { id: "narrow", moduleId: "example:modules/a" },
          { id: "wide", moduleId: "example:modules/w" },
          { id: "one", moduleId: "example:modules/b" },
          { id: "two", moduleId: "example:modules/c" },
          { id: "three", moduleId: "example:modules/d" },
        ],
        pairs: [
          ["narrow", "one"],
          ["narrow", "two"],
          ["wide", "one"],
          ["wide", "two"],
          ["wide", "three"],
        ],
      }),
    );

    expect(findings[0]?.displayName).toBe("wide");
  });

  it("ignores a callee it has no description for", () => {
    const base = buildArguments({
      callables: [
        { id: "entry", moduleId: "example:modules/a" },
        { id: "one", moduleId: "example:modules/b" },
        { id: "two", moduleId: "example:modules/c" },
        { id: "three", moduleId: "example:modules/d" },
      ],
      pairs: [
        ["entry", "one"],
        ["entry", "two"],
        ["entry", "three"],
      ],
    });
    const trimmed = new Map(base.callablesById);

    trimmed.delete("three");

    expect(
      service
        .findModuleSpreads({ ...base, callablesById: trimmed })
        .flatMap((finding) => finding.directModuleIds),
    ).not.toContain("example:modules/d");
  });

  it("treats a callable outside the condensation as having no depth", () => {
    const base = buildArguments({
      callables: [
        { id: "entry", moduleId: "example:modules/a" },
        { id: "one", moduleId: "example:modules/b" },
        { id: "two", moduleId: "example:modules/c" },
      ],
      pairs: [
        ["entry", "one"],
        ["entry", "two"],
      ],
    });

    expect(
      subject.summarizeTypeDepths({
        ...base,
        condensed: {
          componentIdByCallable: new Map(),
          memberIdsByComponent: [],
          successorsByComponent: [],
        },
      })[0],
    ).toMatchObject({ maximumDepth: 0, minimumDepth: 0 });
  });

  // 📦 Placement

  it("reports a callable whose callers all sit in one other module", () => {
    const findings = subject.findMisplacedCallables(
      buildArguments({
        callables: [
          { id: "helper", moduleId: "example:modules/a" },
          { id: "callerOne", moduleId: "example:modules/b" },
          { id: "callerTwo", moduleId: "example:modules/b" },
        ],
        pairs: [
          ["callerOne", "helper"],
          ["callerTwo", "helper"],
        ],
      }),
    );

    expect(findings[0]).toMatchObject({
      displayName: "helper",
      homeModuleId: "example:modules/a",
      suggestedModuleId: "example:modules/b",
    });
  });

  it("does not report a callable already in its callers' module", () => {
    const findings = subject.findMisplacedCallables(
      buildArguments({
        callables: [
          { id: "helper", moduleId: "example:modules/b" },
          { id: "callerOne", moduleId: "example:modules/b" },
          { id: "callerTwo", moduleId: "example:modules/b" },
        ],
        pairs: [
          ["callerOne", "helper"],
          ["callerTwo", "helper"],
        ],
      }),
    );

    expect(findings).toStrictEqual([]);
  });

  it("does not report a callable with too few callers to judge", () => {
    const findings = subject.findMisplacedCallables(
      buildArguments({
        callables: [
          { id: "helper", moduleId: "example:modules/a" },
          { id: "caller", moduleId: "example:modules/b" },
        ],
        pairs: [["caller", "helper"]],
      }),
    );

    expect(findings).toStrictEqual([]);
  });

  it("does not report a callable whose callers are spread evenly", () => {
    const findings = subject.findMisplacedCallables(
      buildArguments({
        callables: [
          { id: "helper", moduleId: "example:modules/a" },
          { id: "callerOne", moduleId: "example:modules/b" },
          { id: "callerTwo", moduleId: "example:modules/c" },
        ],
        pairs: [
          ["callerOne", "helper"],
          ["callerTwo", "helper"],
        ],
      }),
    );

    expect(findings).toStrictEqual([]);
  });

  it("ignores callers in another project", () => {
    // A shared package exists to be called from elsewhere; reporting that as
    // misplacement would say a logger belongs inside whatever logs the most.
    const findings = subject.findMisplacedCallables(
      buildArguments({
        callables: [
          {
            id: "log",
            moduleId: "logger:modules/logger",
            projectName: "logger",
          },
          {
            id: "callerOne",
            moduleId: "consumer:modules/a",
            projectName: "consumer",
          },
          {
            id: "callerTwo",
            moduleId: "consumer:modules/a",
            projectName: "consumer",
          },
        ],
        pairs: [
          ["callerOne", "log"],
          ["callerTwo", "log"],
        ],
      }),
    );

    expect(findings).toStrictEqual([]);
  });

  it("orders placement findings by how many callers they have", () => {
    const findings = subject.findMisplacedCallables(
      buildArguments({
        callables: [
          { id: "few", moduleId: "example:modules/a" },
          { id: "many", moduleId: "example:modules/a" },
          { id: "one", moduleId: "example:modules/b" },
          { id: "two", moduleId: "example:modules/b" },
          { id: "three", moduleId: "example:modules/b" },
        ],
        pairs: [
          ["one", "few"],
          ["two", "few"],
          ["one", "many"],
          ["two", "many"],
          ["three", "many"],
        ],
      }),
    );

    expect(findings.map((finding) => finding.displayName)).toStrictEqual([
      "many",
      "few",
    ]);
  });

  // 📊 Type depth summary

  it("summarizes the depth range across a class's members", () => {
    const summaries = subject.summarizeTypeDepths(
      buildArguments({
        callables: [
          { id: "shallow", moduleId: "example:modules/a" },
          { id: "deep", moduleId: "example:modules/a" },
          { id: "leaf", moduleId: "example:modules/a" },
        ],
        pairs: [["deep", "leaf"]],
      }),
    );

    expect(summaries[0]).toMatchObject({
      maximumDepth: 2,
      memberCount: 3,
      minimumDepth: 1,
    });
  });

  it("leaves a bare function out of the class summary", () => {
    const base = buildArguments({
      callables: [{ id: "entry", moduleId: "example:modules/a" }],
      pairs: [],
    });
    const callable = base.callablesById.get("entry");

    if (callable === undefined) {
      throw new Error("Fixture callable missing");
    }

    expect(
      subject.summarizeTypeDepths({
        ...base,
        callablesById: new Map([
          [
            "entry",
            {
              ...callable,
              node: { ...callable.node, enclosingTypeName: undefined },
            },
          ],
        ]),
      }),
    ).toStrictEqual([]);
  });
});
