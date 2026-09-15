import { describe, expect, it } from "vitest";

import type {
  AnchorCheckResult,
  CodependixRunMode,
  GraphRunOutcome,
  MarkdownSectionArguments,
  ProjectRunFailure,
  ProjectRunResult,
  RunMode,
  RunModeSelection,
} from "./index.js";

describe("codependix-core index", () => {
  it("states the run and result vocabulary", () => {
    const mode: CodependixRunMode = "write";
    const runMode: RunMode = {
      checksBoundaries: true,
      checksReports: false,
      writes: true,
    };
    const selection: RunModeSelection = { errors: [], mode: runMode };
    const failure: ProjectRunFailure = {
      error: "boom",
      projectName: "codependix-core",
    };
    const result: ProjectRunResult = {
      isCurrent: true,
      projectName: "codependix-core",
      stalePaths: [],
    };
    const outcome: GraphRunOutcome = {
      failures: [failure],
      results: [result],
    };
    const anchor: AnchorCheckResult = {
      currentContent: "graph LR",
      freshContent: "graph LR",
      isCurrent: true,
    };
    const section: MarkdownSectionArguments = {
      introLine: "Dependency graphs exported by codependix.",
      subheading: undefined,
    };

    expect(mode).toBe("write");
    expect(selection.mode.writes).toBe(true);
    expect(outcome.failures).toHaveLength(1);
    expect(outcome.results[0]?.isCurrent).toBe(true);
    expect(anchor.isCurrent).toBe(true);
    expect(section.subheading).toBeUndefined();
  });
});
