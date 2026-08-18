import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildCallGraphResult,
  buildSourceLocation,
  buildStackFrame,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { ReportService } from "./report.service";

import type { CallGraphResult, StackFrame } from "@callidescope/configuration";

/** Builds a stack frame for a printed call stack. */
function frame(displayName: string, isCycle = false): StackFrame {
  return buildStackFrame({
    displayName,
    isCycle,
    location: buildSourceLocation({ filePath: `${displayName}.ts`, line: 12 }),
  });
}

/** Builds a result holding one deep stack. */
function resultWithStack(
  overrides: Partial<CallGraphResult["deepStacks"][0]> = {},
): CallGraphResult {
  return buildCallGraphResult({
    deepStacks: [
      {
        depth: 3,
        entryPointKind: "decorated-method",
        frames: [
          frame("Resolver.read"),
          frame("Service.load"),
          frame("Repository.find"),
        ],
        isLowerBound: false,
        limit: 2,
        ...overrides,
      },
    ],
  });
}

describe(ReportService, () => {
  let service: ReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [ReportService],
    }).compile();

    service = await module.resolve(ReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  const subject = new ReportService();

  it("names the limit and the projects in the header", () => {
    const header = subject.renderHeader({
      limit: 6,
      projectNames: ["alpha", "beta"],
    });

    expect(header).toContain("Maximum allowed depth: 6");
    expect(header).toContain("Projects (2): alpha, beta");
  });

  it("says so plainly when nothing exceeded the limit", () => {
    expect(subject.renderStacks(buildCallGraphResult())).toContain(
      "No call stack exceeded",
    );
  });

  it("prints every frame of a reported stack", () => {
    const rendered = subject.renderStacks(resultWithStack());

    expect(rendered).toContain("Resolver.read()");
    expect(rendered).toContain("Service.load()");
    expect(rendered).toContain("Repository.find()");
  });

  it("indents each frame below the one that called it", () => {
    const rendered = subject.renderStacks(resultWithStack());

    expect(rendered).toContain("  └─> Service.load()");
    expect(rendered).toContain("    └─> Repository.find()");
  });

  it("prints the file and line of every frame", () => {
    expect(subject.renderStacks(resultWithStack())).toContain(
      "[Resolver.read.ts:12]",
    );
  });

  it("marks a depth it could only bound from below", () => {
    expect(
      subject.renderStacks(resultWithStack({ isLowerBound: true })),
    ).toContain("DEPTH ≥ 3");
  });

  it("prints an exact depth without the bound marker", () => {
    expect(subject.renderStacks(resultWithStack())).toContain("DEPTH 3 >");
  });

  it("marks the frames belonging to a cycle", () => {
    const rendered = subject.renderStacks(
      resultWithStack({
        frames: [frame("Resolver.read"), frame("Service.recurse", true)],
      }),
    );

    expect(rendered).toContain("Service.recurse() (cycle)");
  });

  // ✍️ Signatures and documentation

  it("prints a frame's signature where the empty parentheses were", () => {
    const rendered = service.renderStacks(
      resultWithStack({
        frames: [
          buildStackFrame({
            displayName: "Service.load",
            signature: {
              parameters: [],
              returnType: "Promise<void>",
              text: "(value: string): Promise<void>",
            },
          }),
        ],
      }),
    );

    expect(rendered).toContain("Service.load(value: string): Promise<void>");
  });

  it("collapses a signature too long to print, keeping the return type", () => {
    // Which twelve services a constructor takes is noise mid-stack; what it
    // hands back is not.
    const rendered = service.renderStacks(
      resultWithStack({
        frames: [
          buildStackFrame({
            displayName: "Service.constructor",
            signature: {
              parameters: [],
              returnType: "Service",
              text: `(${"dependency: SomeVeryLongServiceName, ".repeat(6)}): Service`,
            },
          }),
        ],
      }),
    );

    expect(rendered).toContain("Service.constructor(…): Service");
  });

  it("prints a frame's documentation under it", () => {
    const rendered = service.renderStacks(
      resultWithStack({
        frames: [
          buildStackFrame({
            displayName: "Service.load",
            documentation: {
              isDeprecated: false,
              summary: "Loads the thing from the repository.",
              tags: [],
            },
          }),
        ],
      }),
    );

    expect(rendered).toContain("↳ Loads the thing from the repository.");
  });

  it("marks a deprecated frame", () => {
    const rendered = service.renderStacks(
      resultWithStack({
        frames: [
          buildStackFrame({
            displayName: "Service.old",
            documentation: {
              isDeprecated: true,
              summary: "",
              tags: ["deprecated"],
            },
          }),
        ],
      }),
    );

    expect(rendered).toContain("⚠ deprecated");
  });

  it("adds no documentation line for an undocumented frame", () => {
    expect(service.renderStacks(resultWithStack())).not.toContain("↳");
  });

  it("prints empty parentheses when there is no signature", () => {
    expect(service.renderStacks(resultWithStack())).toContain(
      "Resolver.read()",
    );
  });

  it("says how many stacks it left out when there are many", () => {
    const rendered = subject.renderStacks(
      buildCallGraphResult({
        deepStacks: Array.from({ length: 25 }, () => ({
          depth: 7,
          entryPointKind: "orphan-root" as const,
          frames: [frame("Entry")],
          isLowerBound: false,
          limit: 6,
        })),
      }),
    );

    expect(rendered).toContain("and 5 more");
  });

  it("renders nothing for cohesion when there is nothing to say", () => {
    expect(subject.renderCohesion(buildCallGraphResult())).toBe("");
  });

  it("names the modules a spread finding reaches", () => {
    const rendered = subject.renderCohesion(
      buildCallGraphResult({
        moduleSpreads: [
          {
            depth: 4,
            directModuleIds: ["example:modules/a", "example:modules/b"],
            displayName: "Service.dispatch",
            id: "a#0",
            location: buildSourceLocation({ filePath: "a.ts", line: 5 }),
            statementCount: 3,
            transitiveSpread: 9,
          },
        ],
      }),
    );

    expect(rendered).toContain("Service.dispatch");
    expect(rendered).toContain("example:modules/a, example:modules/b");
    expect(rendered).toContain("transitive spread 9");
  });

  it("says where a misplaced callable's callers actually live", () => {
    const rendered = subject.renderCohesion(
      buildCallGraphResult({
        misplacedCallables: [
          {
            callerCount: 4,
            displayName: "normalize",
            foreignCallerCount: 4,
            homeModuleId: "example:modules/a",
            id: "a#0",
            location: buildSourceLocation({ filePath: "a.ts", line: 7 }),
            suggestedModuleId: "example:modules/b",
          },
        ],
      }),
    );

    expect(rendered).toContain("4 of 4 callers are in example:modules/b");
  });

  it("reports every count in the summary", () => {
    const rendered = subject.renderSummary(
      buildCallGraphResult({
        summary: {
          callableCount: 10,
          cyclicComponentCount: 1,
          edgeCount: 20,
          entryPointCount: 3,
          fileCount: 5,
          maximumDepth: 7,
          projectCount: 2,
          unresolvedCallCount: 4,
        },
      }),
    );

    expect(rendered).toContain("10 in 5 files across 2 projects");
    expect(rendered).toContain("Deepest stack:         7");
    // Surfaced rather than hidden: it is what makes a reported depth a floor.
    expect(rendered).toContain("Unfollowable calls:    4");
  });
});
