import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  buildCallGraphResult,
  buildSourceLocation,
  buildStackFrame,
} from "../../../testing/mocks";
import { ANALYSIS_MODULES } from "../../../testing/modules";

import { MarkdownReportService } from "./markdown-report.service";

import type { CallStack, ProjectReport } from "@callidescope/configuration";

/** A project report carrying the given stacks and nothing else. */
function report(stacks: CallStack[]): ProjectReport {
  return {
    misplacedCallables: [],
    moduleSpreads: [],
    projectName: "example",
    stacks,
    summary: {
      callableCount: 4,
      cyclicComponentCount: 0,
      edgeCount: 3,
      entryPointCount: stacks.length,
      fileCount: 2,
      maximumDepth: 2,
      projectCount: 1,
      unresolvedCallCount: 0,
    },
    typeDepths: [],
  };
}

/** A stack of `depth` frames rooted at a named entry point. */
function stack(args: { depth?: number; entry: string }): CallStack {
  const depth = args.depth ?? 2;

  return {
    depth,
    entryPointKind: "decorated-method",
    frames: Array.from({ length: depth }, (_, index) =>
      buildStackFrame({
        displayName: index === 0 ? args.entry : `Frame${String(index)}`,
        location: buildSourceLocation({ filePath: `${args.entry}.ts` }),
      }),
    ),
    isLowerBound: false,
  };
}

describe(MarkdownReportService, () => {
  let service: MarkdownReportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [MarkdownReportService],
    }).compile();

    service = await module.resolve(MarkdownReportService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 📚 Stacks

  it("numbers each stack and labels it with its entry point and depth", () => {
    const rendered = service.renderStacks({
      previewCount: 3,
      stacks: [stack({ entry: "Resolver.read" })],
    });

    expect(rendered).toContain("**1. `Resolver.read`** — depth 2");
    expect(rendered).toContain("decorated-method");
  });

  it("marks an under-reported depth rather than stating it as fact", () => {
    const rendered = service.renderStacks({
      previewCount: 3,
      stacks: [{ ...stack({ entry: "Resolver.read" }), isLowerBound: true }],
    });

    expect(rendered).toContain("depth ≥ 2");
  });

  it("puts each stack tree in a fence so indentation survives", () => {
    expect(
      service.renderStacks({
        previewCount: 3,
        stacks: [stack({ entry: "Resolver.read" })],
      }),
    ).toContain("```text");
  });

  it("says plainly when there is nothing to show", () => {
    expect(service.renderStacks({ previewCount: 3, stacks: [] })).toBe("None.");
  });

  // 🪗 The disclosure

  it("shows every stack openly while they fit in the preview", () => {
    const rendered = service.renderStacks({
      previewCount: 3,
      stacks: [stack({ entry: "First" }), stack({ entry: "Second" })],
    });

    expect(rendered).not.toContain("<details>");
    expect(rendered).toContain("Second");
  });

  it("hides the stacks past the preview behind a disclosure", () => {
    const rendered = service.renderStacks({
      previewCount: 1,
      stacks: [
        stack({ entry: "First" }),
        stack({ entry: "Second" }),
        stack({ entry: "Third" }),
      ],
    });

    expect(rendered).toContain("<summary>2 more call stacks</summary>");
    expect(rendered).toContain("</details>");
  });

  it("still publishes the hidden stacks in full", () => {
    const rendered = service.renderStacks({
      previewCount: 1,
      stacks: [stack({ entry: "First" }), stack({ entry: "Second" })],
    });

    expect(rendered).toContain("**2. `Second`**");
  });

  // 📄 Sections and runs

  it("opens a project section with the configured heading", () => {
    expect(
      service.renderProjectSection({
        heading: "## 🔭 Callidescope",
        previewCount: 3,
        report: report([stack({ entry: "Resolver.read" })]),
      }),
    ).toContain("## 🔭 Callidescope");
  });

  it("names the project a section describes", () => {
    expect(
      service.renderProjectSection({
        heading: "## 🔭 Callidescope",
        previewCount: 3,
        report: report([]),
      }),
    ).toContain("`example`");
  });

  it("reports a project's counts, spreads, and misplaced callables", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      previewCount: 3,
      report: report([]),
    });

    expect(rendered).toContain("| Callables | 4 |");
    expect(rendered).toContain("### Module spread");
    expect(rendered).toContain("### Possibly misplaced");
  });

  it("heads a whole run and counts the stacks over the limit", () => {
    const rendered = service.renderRun({
      previewCount: 3,
      result: buildCallGraphResult({
        deepStacks: [{ ...stack({ entry: "Resolver.read" }), limit: 1 }],
      }),
    });

    expect(rendered).toContain("# 🔭 Callidescope");
    expect(rendered).toContain("## Call stacks over the limit (1)");
  });

  it("renders a run that found nothing without failing", () => {
    expect(
      service.renderRun({ previewCount: 3, result: buildCallGraphResult() }),
    ).toContain("None.");
  });

  // 📊 Finding tables

  it("gives a spread finding a row naming what it calls and where it lives", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      previewCount: 3,
      report: {
        ...report([]),
        moduleSpreads: [
          {
            depth: 5,
            directModuleIds: ["example:modules/first", "example:modules/other"],
            displayName: "Service.dispatch",
            id: "dispatch",
            location: buildSourceLocation({
              filePath: "dispatch.ts",
              line: 42,
            }),
            statementCount: 9,
            transitiveSpread: 6,
          },
        ],
      },
    });

    expect(rendered).toContain("| `Service.dispatch` | 6 |");
    expect(rendered).toContain("`example:modules/first`");
    expect(rendered).toContain("`dispatch.ts:42`");
  });

  it("gives a misplaced finding a row naming both modules and the split", () => {
    const rendered = service.renderProjectSection({
      heading: "## 🔭 Callidescope",
      previewCount: 3,
      report: {
        ...report([]),
        misplacedCallables: [
          {
            callerCount: 4,
            displayName: "normalizeExtension",
            foreignCallerCount: 4,
            homeModuleId: "example:modules/typescript",
            id: "normalize",
            location: buildSourceLocation(),
            suggestedModuleId: "example:modules/discovery",
          },
        ],
      },
    });

    expect(rendered).toContain("| `normalizeExtension` |");
    expect(rendered).toContain("`example:modules/typescript`");
    expect(rendered).toContain("`example:modules/discovery`");
    expect(rendered).toContain("| 4/4 |");
  });
});
