import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildDiscoveredCallable,
  buildSourceLocation,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { ProjectReportsService } from "./project-reports.service";

import type { DiscoveredCallable } from "../callables/callables.types";
import type { BuildProjectReportsArguments } from "./project-reports.types";
import type { CallableId, ProjectReport } from "@callidescope/configuration";

/**
 * A two-project graph: `alpha` holds a chain of `depth` callables, `beta` one.
 *
 * The chain is what makes the stacks meaningful — a project whose callables
 * call nothing produces no stack at all, which is itself under test below.
 */
function buildArguments(depth: number): BuildProjectReportsArguments {
  const chain = Array.from({ length: depth }, (_, index) =>
    callable({ name: `alpha${String(index)}`, projectName: "alpha" }),
  );
  const [betaId, betaCallable] = callable({
    name: "beta0",
    projectName: "beta",
  });
  const chainIds = chain.map(([callableId]) => callableId);

  return {
    breadthMeasurement: { byCallable: new Map() },
    callablesById: new Map([...chain, [betaId, betaCallable]]),
    condensed: {
      componentIdByCallable: new Map(
        [...chainIds, betaId].map((callableId, index) => [callableId, index]),
      ),
      memberIdsByComponent: [...chainIds, betaId].map((callableId) => [
        callableId,
      ]),
      successorsByComponent: [
        ...chainIds.map((_, index) =>
          index === chainIds.length - 1
            ? new Set<number>()
            : new Set([index + 1]),
        ),
        new Set<number>(),
      ],
    },
    entryPoints: {
      entryPoints: [
        { callableId: chainIds[0] ?? "", kind: "decorated-method" },
        { callableId: betaId, kind: "exported-function" },
      ],
    },
    fileCountByProject: new Map([
      ["alpha", depth],
      ["beta", 1],
    ]),
    graph: {
      calleeIdsByCaller: new Map(),
      callerIdsByCallee: new Map(),
      edges: [],
      unresolvedCallerIds: new Set(),
      unresolvedCalls: [],
    },
    measurement: {
      byComponent: [
        ...chainIds.map((_, index) => ({
          deepestSuccessor:
            index === chainIds.length - 1 ? undefined : index + 1,
          depth: depth - index,
          moduleIds: new Set<string>(),
          reachesUnresolved: false,
        })),
        {
          deepestSuccessor: undefined,
          depth: 1,
          moduleIds: new Set<string>(),
          reachesUnresolved: false,
        },
      ],
    },
    misplacedCallables: [],
    moduleSpreads: [],
    projectNames: ["alpha", "beta"],
    typeDepths: [],
  };
}

/** A callable in a named project, at a file path derived from its name. */
function callable(args: {
  name: string;
  projectName: string;
}): [CallableId, DiscoveredCallable] {
  const location = buildSourceLocation({
    filePath: `packages/${args.projectName}/src/${args.name}.ts`,
  });

  return [
    `${location.filePath}#0`,
    buildDiscoveredCallable({
      displayName: args.name,
      id: `${location.filePath}#0`,
      location,
      moduleId: `${args.projectName}:modules/${args.name}`,
      projectName: args.projectName,
    }),
  ];
}

describe(ProjectReportsService, () => {
  let service: ProjectReportsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ProjectReportsService],
    }).compile();

    service = await module.resolve(ProjectReportsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reports one project per traced project, in the order they were traced", () => {
    expect(
      service.build(buildArguments(3)).map((report) => report.projectName),
    ).toStrictEqual(["alpha", "beta"]);
  });

  it("puts a stack in the project its entry point belongs to", () => {
    const [alpha] = service.build(buildArguments(3));

    expect(alpha?.stacks).toHaveLength(1);
    expect(alpha?.stacks[0]?.frames[0]?.displayName).toBe("alpha0");
  });

  it("drops an entry point that calls nothing, which is not a stack", () => {
    const beta = service.build(buildArguments(3))[1];

    expect(beta?.stacks).toStrictEqual([]);
  });

  it("counts only the callables a project owns", () => {
    const [alpha, beta] = service.build(buildArguments(3));

    expect(alpha?.summary.callableCount).toBe(3);
    expect(beta?.summary.callableCount).toBe(1);
  });

  it("reports the project's own file count rather than the run's", () => {
    expect(service.build(buildArguments(3))[0]?.summary.fileCount).toBe(3);
  });

  it("keeps only the type depths belonging to the project", () => {
    const reports = service.build({
      ...buildArguments(3),
      typeDepths: [
        {
          maximumDepth: 4,
          memberCount: 2,
          minimumDepth: 1,
          moduleId: "alpha:modules/alpha0",
          typeName: "Alpha",
        },
        {
          maximumDepth: 2,
          memberCount: 1,
          minimumDepth: 2,
          moduleId: "beta:modules/beta0",
          typeName: "Beta",
        },
      ],
    });

    expect(
      reports[0]?.typeDepths.map((summary) => summary.moduleId),
    ).toStrictEqual(["alpha:modules/alpha0"]);
  });

  // 📏 The depth gate

  it("fails only on the stacks past the limit", () => {
    const reports = service.build(buildArguments(3));

    expect(service.findDeepStacks({ limit: 2, reports })).toHaveLength(1);
    expect(service.findDeepStacks({ limit: 3, reports })).toStrictEqual([]);
  });

  it("stamps each finding with the limit it broke", () => {
    const reports = service.build(buildArguments(3));

    expect(service.findDeepStacks({ limit: 1, reports })[0]?.limit).toBe(1);
  });

  it("reports the deepest stack first", () => {
    const reports: ProjectReport[] = service.build(buildArguments(4));
    const shallow = service.build(buildArguments(2));

    const findings = service.findDeepStacks({
      limit: 1,
      reports: [...reports, ...shallow],
    });

    expect(findings.map((finding) => finding.depth)).toStrictEqual([4, 2]);
  });

  // 🌐 The breadth gate

  it("builds a callable's breadth report from its direct callees", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id, alpha2Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [
            alpha0Id ?? "",
            { breadth: 2, calleeIds: [alpha1Id ?? "", alpha2Id ?? ""] },
          ],
        ]),
      },
    });

    const [breadthReport] = reports[0]?.callableBreadths ?? [];

    expect(breadthReport).toStrictEqual({
      breadth: 2,
      callees: [
        { displayName: "alpha1", id: alpha1Id },
        { displayName: "alpha2", id: alpha2Id },
      ],
      displayName: "alpha0",
      id: alpha0Id,
      location: buildSourceLocation({
        filePath: "packages/alpha/src/alpha0.ts",
      }),
      signature: breadthReport?.signature,
    });
  });

  it("reads a breadth report's signature the same way a stack frame does", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
        ]),
      },
    });

    expect(reports[0]?.callableBreadths[0]?.signature).toBeDefined();
  });

  it("omits a callable with no direct callees from its breadth report", () => {
    const reports = service.build(buildArguments(3));

    expect(reports[1]?.callableBreadths).toStrictEqual([]);
  });

  it("skips a callee the run never collected", () => {
    const base = buildArguments(3);
    const [alpha0Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: ["nowhere.ts#0"] }],
        ]),
      },
    });

    expect(reports[0]?.callableBreadths[0]?.callees).toStrictEqual([]);
  });

  it("fails only on the callables past the breadth limit", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id, alpha2Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [
            alpha0Id ?? "",
            { breadth: 2, calleeIds: [alpha1Id ?? "", alpha2Id ?? ""] },
          ],
        ]),
      },
    });

    expect(service.findWideCallables({ limit: 1, reports })).toHaveLength(1);
    expect(service.findWideCallables({ limit: 2, reports })).toStrictEqual([]);
  });

  it("stamps each wide-callable finding with the limit it broke", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
        ]),
      },
    });

    expect(service.findWideCallables({ limit: 0, reports })[0]?.limit).toBe(0);
  });

  it("reports the widest callable first", () => {
    const base = buildArguments(3);
    const [alpha0Id, alpha1Id, alpha2Id] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      breadthMeasurement: {
        byCallable: new Map([
          [alpha0Id ?? "", { breadth: 1, calleeIds: [alpha1Id ?? ""] }],
          [
            alpha1Id ?? "",
            { breadth: 2, calleeIds: [alpha0Id ?? "", alpha2Id ?? ""] },
          ],
        ]),
      },
    });

    const findings = service.findWideCallables({ limit: 0, reports });

    expect(findings.map((finding) => finding.breadth)).toStrictEqual([2, 1]);
  });

  // 🕳 Gaps in what the graph knows

  it("skips an entry point whose callable was never collected", () => {
    const base = buildArguments(3);
    const reports = service.build({
      ...base,
      entryPoints: {
        entryPoints: [
          ...base.entryPoints.entryPoints,
          { callableId: "nowhere.ts#0", kind: "orphan-root" },
        ],
      },
    });

    expect(reports[0]?.stacks).toHaveLength(1);
  });

  it("skips a callable no component was measured for", () => {
    const base = buildArguments(3);
    const reports = service.build({
      ...base,
      condensed: { ...base.condensed, componentIdByCallable: new Map() },
    });

    expect(reports[0]?.stacks).toStrictEqual([]);
  });

  it("skips a component the depth pass never measured", () => {
    const base = buildArguments(3);
    const reports = service.build({
      ...base,
      measurement: { byComponent: [] },
    });

    expect(reports[0]?.stacks).toStrictEqual([]);
  });

  it("reports no files rather than failing when a project traced none", () => {
    const base = buildArguments(3);

    expect(
      service.build({ ...base, fileCountByProject: new Map() })[0]?.summary
        .fileCount,
    ).toBe(0);
  });

  // 📦 Findings scoped to their project

  it("keeps only the findings belonging to the project", () => {
    const base = buildArguments(3);
    const [alphaId] = [...base.callablesById.keys()];
    const reports = service.build({
      ...base,
      misplacedCallables: [
        {
          callerCount: 4,
          displayName: "alpha0",
          foreignCallerCount: 4,
          homeModuleId: "alpha:modules/alpha0",
          id: alphaId ?? "",
          location: buildSourceLocation(),
          suggestedModuleId: "beta:modules/beta0",
        },
      ],
      moduleSpreads: [
        {
          depth: 3,
          directModuleIds: ["alpha:modules/alpha0"],
          displayName: "alpha0",
          id: alphaId ?? "",
          location: buildSourceLocation(),
          statementCount: 8,
          transitiveSpread: 5,
        },
      ],
    });

    expect(reports[0]?.misplacedCallables).toHaveLength(1);
    expect(reports[0]?.moduleSpreads).toHaveLength(1);
    expect(reports[1]?.misplacedCallables).toStrictEqual([]);
    expect(reports[1]?.moduleSpreads).toStrictEqual([]);
  });
});
