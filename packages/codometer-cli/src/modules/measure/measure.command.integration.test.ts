import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createFixtureTree,
  removeFixtureTree,
} from "../../../testing/fixture-tree";
import { MainModule } from "../../main.module";

import { MeasureCommand } from "./measure.command";

import type { CodometerReport } from "../report/report.types";

const REPORT_FILE_NAME = "codometer-report.json";

describe("measure command over a fixture directory", () => {
  let metrics: Map<string, number>;
  let firstReport: string;
  let secondReport: string;
  let firstReadme: string;
  let secondReadme: string;
  let workingDirectory: string;

  beforeAll(async () => {
    workingDirectory = createFixtureTree();

    // The fixture is not a git repository and never becomes one. Discovery
    // that shelled out to `git ls-files` could not measure it at all.
    writeFileSync(
      path.join(workingDirectory, "codometer.config.json"),
      JSON.stringify({
        excludeFrom: [".codometerignore"],
        output: {
          json: { path: REPORT_FILE_NAME },
          markdown: { path: "README.md" },
        },
      }),
    );

    const module = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();
    const command = module.get(MeasureCommand, { strict: false });
    const readmePath = path.join(workingDirectory, "README.md");
    const reportPath = path.join(workingDirectory, REPORT_FILE_NAME);

    await command.run([], { directory: workingDirectory, write: true });

    firstReport = readFileSync(reportPath, "utf8");
    firstReadme = readFileSync(readmePath, "utf8");

    // Everything the first run wrote is now on disk. A tool that measured its
    // own output would count the badges it just wrote and produce a different
    // document the second time round.
    await command.run([], { directory: workingDirectory, write: true });

    secondReport = readFileSync(reportPath, "utf8");
    secondReadme = readFileSync(readmePath, "utf8");

    const report = JSON.parse(firstReport) as CodometerReport;
    const codebase = report.targets.find(
      (target) => target.name === "codebase",
    );

    metrics = new Map(
      codebase?.metrics.map((metric) => [metric.path, metric.value]),
    );
  }, 60_000);

  afterAll(() => {
    removeFixtureTree(workingDirectory);
  });

  it("measures the files discovery kept", () => {
    expect.hasAssertions();

    // Four TypeScript files survive: nested/deep/deeper.ts, the one under the
    // `redistribute` directory a `dist` glob must not claim, and the two under
    // src. `nested/generated/thing.ts`, `build/output.js`, `vendor/vendored.ts`
    // and `node_modules/library/index.ts` are all gone.
    expect(metrics.get("typescript.files")).toBe(4);
    expect(metrics.get("javascript.files")).toBe(1);
    expect(metrics.get("javascript.testFiles")).toBe(1);
    expect(metrics.get("sourceFiles")).toBe(5);
  });

  it("applies the configured ignore file and the nested gitignore files", () => {
    expect.hasAssertions();

    // `AGENTS.md` and `nested/keep.md`. `README.md` is the file the badge block
    // is spliced into, so codometer leaves it out without being told;
    // `nested/drop.md` is claimed by the nested gitignore file, and `CLAUDE.md`
    // is a symlink to `AGENTS.md` rather than a document.
    expect(metrics.get("markdown.files")).toBe(2);
    // The fixture's own `codometer.config.json` and `src/data.json`. The report
    // codometer writes beside them is its own output and is never measured, and
    // the notebook is measured as a notebook rather than as JSON.
    expect(metrics.get("json.files")).toBe(2);
    expect(metrics.get("jupyter.files")).toBe(1);
  });

  it("measures every other language it discovered", () => {
    expect.hasAssertions();

    expect(metrics.get("css.files")).toBe(1);
    expect(metrics.get("hcl.files")).toBe(1);
    expect(metrics.get("shell.files")).toBe(1);
    expect(metrics.get("sql.files")).toBe(1);
    expect(metrics.get("toml.files")).toBe(1);
    expect(metrics.get("yaml.files")).toBe(1);
  });

  it("names every metric by the target it was measured on", () => {
    const report = JSON.parse(firstReport) as CodometerReport;
    const codebase = report.targets.find(
      (target) => target.name === "codebase",
    );

    expect(codebase?.empty).toBe(false);
    expect(
      codebase?.metrics.find((metric) => metric.path === "typescript.files"),
    ).toStrictEqual({
      limits: [],
      name: "codebase.typescript.files",
      path: "typescript.files",
      unit: null,
      value: 4,
    });
  });

  // The property the auto-exclusion exists for. Badges are images with links,
  // so a spliced block changes the markdown counters, which changes the
  // badges: measuring its own output makes every written report stale the
  // moment it lands.
  it("produces byte-identical output on two consecutive runs", () => {
    expect.hasAssertions();

    expect(secondReadme).toBe(firstReadme);
    expect(secondReport).toBe(firstReport);
  });

  it("spliced the badge block into the file it was pointed at", () => {
    expect(firstReadme).toContain("<!-- CODE_STATISTICS_START -->");
    expect(firstReadme).toContain("![Lines of Code]");
    expect(firstReadme).not.toContain("\nold\n");
  });
});
