import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { RenderLimitsService } from "./render-limits.service";

import type { ProjectLimitRow } from "./limits.types";

/** The workspace's own depth row, as the service resolves it. */
const WORKSPACE_DEPTH_ROW: ProjectLimitRow = {
  limit: "maximumDepth",
  origin: "declared",
  path: "configuration/callidescope.config.ts",
  project: undefined,
  value: 17,
};

/** A breadth row nothing anywhere declares, which is every project's today. */
const UNDECLARED_BREADTH_ROW: ProjectLimitRow = {
  limit: "maximumBreadth",
  origin: undefined,
  path: undefined,
  project: "packages/logger",
  value: undefined,
};

describe(RenderLimitsService, () => {
  let service: RenderLimitsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [RenderLimitsService],
    }).compile();

    service = await module.resolve(RenderLimitsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("prints the heading and the column headers above the table", () => {
    const document = service.render([WORKSPACE_DEPTH_ROW]);

    expect(document.split("\n").slice(0, 2)).toStrictEqual([
      "# 🔭 Callidescope Limits",
      "",
    ]);
    expect(document).toContain(
      "| Project | Limit | Value | Origin | Declared in |",
    );
    expect(document).toContain("| --- | --- | --- | --- | --- |");
  });

  it("names the workspace row rather than leaving its project blank", () => {
    expect(service.render([WORKSPACE_DEPTH_ROW])).toContain(
      "| workspace | `maximumDepth` | 17 | declared | `configuration/callidescope.config.ts` |",
    );
  });

  it("names the project a row belongs to, and how it came by the number", () => {
    const document = service.render([
      {
        limit: "maximumDepth",
        origin: "inherited",
        path: "configuration/callidescope.config.ts",
        project: "packages/logger",
        value: 17,
      },
    ]);

    expect(document).toContain(
      "| packages/logger | `maximumDepth` | 17 | inherited | `configuration/callidescope.config.ts` |",
    );
  });

  it("names the project rooted at the workspace root rather than leaving it blank", () => {
    const document = service.render([
      { ...WORKSPACE_DEPTH_ROW, origin: "inherited", project: "" },
    ]);

    expect(document).toContain(
      "| . | `maximumDepth` | 17 | inherited | `configuration/callidescope.config.ts` |",
    );
  });

  it("says a limit nothing declares is none rather than inventing a number", () => {
    expect(service.render([UNDECLARED_BREADTH_ROW])).toContain(
      "| packages/logger | `maximumBreadth` | none | — | — |",
    );
  });

  it("keeps the rows in the order it was handed them", () => {
    const document = service.render([
      WORKSPACE_DEPTH_ROW,
      UNDECLARED_BREADTH_ROW,
    ]);

    expect(
      document
        .split("\n")
        .slice(-2)
        .map((line) => line.split(" | ")[0]),
    ).toStrictEqual(["| workspace", "| packages/logger"]);
  });

  it("says what the two origins mean", () => {
    expect(service.render([WORKSPACE_DEPTH_ROW])).toContain(
      "`declared` is the project's own; `inherited` is the workspace default it falls back to.",
    );
  });
});
