import { describe, expect, it } from "vitest";

import {
  buildCallGraphResult,
  buildSourceLocation,
  buildStackFrame,
} from "../../../testing/mocks";

import { renderTables } from "./output-markdown.utilities";

import type { CallGraphResult, StackFrame } from "@callidescope/configuration";

/** Builds a result holding one of each finding. */
function buildPopulatedResult(): CallGraphResult {
  return buildCallGraphResult({
    deepStacks: [
      {
        depth: 8,
        entryPointKind: "decorated-method",
        frames: [frame("Resolver.read"), frame("Repository.find")],
        isLowerBound: false,
        limit: 6,
      },
    ],
    misplacedCallables: [
      {
        callerCount: 4,
        displayName: "normalize",
        foreignCallerCount: 4,
        homeModuleId: "example:modules/a",
        id: "a#0",
        location: buildSourceLocation({ filePath: "a.ts", line: 3 }),
        suggestedModuleId: "example:modules/b",
      },
    ],
    moduleSpreads: [
      {
        depth: 5,
        directModuleIds: ["example:modules/a", "example:modules/b"],
        displayName: "Service.dispatch",
        id: "b#0",
        location: buildSourceLocation({ filePath: "b.ts", line: 4 }),
        statementCount: 2,
        transitiveSpread: 11,
      },
    ],
    summary: {
      callableCount: 12,
      cyclicComponentCount: 1,
      edgeCount: 30,
      entryPointCount: 4,
      fileCount: 6,
      maximumDepth: 8,
      projectCount: 2,
      unresolvedCallCount: 3,
    },
  });
}

/** Builds a stack frame for a rendered table. */
function frame(displayName: string): StackFrame {
  return buildStackFrame({
    displayName,
    location: buildSourceLocation({ filePath: `${displayName}.ts`, line: 12 }),
  });
}

describe(renderTables, () => {
  it("renders every summary measure", () => {
    const rendered = renderTables(buildPopulatedResult());

    expect(rendered).toContain("| Callables | 12 |");
    expect(rendered).toContain("| Deepest stack | 8 |");
    expect(rendered).toContain("| Unfollowable calls | 3 |");
  });

  it("renders a row for each deep stack", () => {
    const rendered = renderTables(buildPopulatedResult());

    expect(rendered).toContain("| Resolver.read | 8 | Repository.find |");
  });

  it("marks a depth it could only bound from below", () => {
    const result = buildPopulatedResult();
    const rendered = renderTables({
      ...result,
      deepStacks: result.deepStacks.map((finding) => ({
        ...finding,
        isLowerBound: true,
      })),
    });

    expect(rendered).toContain("≥ 8");
  });

  it("renders a row for each spread finding", () => {
    expect(renderTables(buildPopulatedResult())).toContain(
      "| Service.dispatch | 11 | 2 |",
    );
  });

  it("renders a row for each misplaced callable", () => {
    expect(renderTables(buildPopulatedResult())).toContain(
      "| normalize | `example:modules/a` | `example:modules/b` | 4/4 |",
    );
  });

  it("says so rather than rendering an empty table", () => {
    const rendered = renderTables(buildCallGraphResult());

    expect(rendered).toContain("### Deep call stacks\n\nNone.");
    expect(rendered).toContain("### Module spread\n\nNone.");
    expect(rendered).toContain("### Possibly misplaced\n\nNone.");
  });

  it("caps how many rows one table shows", () => {
    // A block spliced into a tracked file is read by people, and a hundred
    // rows of one finding is a report nobody opens twice.
    const result = buildCallGraphResult({
      deepStacks: Array.from({ length: 30 }, () => ({
        depth: 7,
        entryPointKind: "orphan-root" as const,
        frames: [frame("Entry")],
        isLowerBound: false,
        limit: 6,
      })),
    });

    const rows = renderTables(result)
      .split("\n")
      .filter((line) => line.startsWith("| Entry |"));

    expect(rows).toHaveLength(20);
  });

  it("renders a stack with no frames without failing", () => {
    const rendered = renderTables(
      buildCallGraphResult({
        deepStacks: [
          {
            depth: 7,
            entryPointKind: "orphan-root",
            frames: [],
            isLowerBound: false,
            limit: 6,
          },
        ],
      }),
    );

    expect(rendered).toContain("unknown");
  });
});
