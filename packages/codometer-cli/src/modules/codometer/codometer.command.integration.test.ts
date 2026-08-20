import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { createFixtureTree } from "../../../testing/fixture-tree";
import { MainModule } from "../../main.module";

import { CodometerCommand } from "./codometer.command";

import type { CodeStatisticsResult } from "@codometer/configuration";

const REPORT_FILE_NAME = "codometer-report.json";

describe("codometer command over a fixture directory", () => {
  let statistics: CodeStatisticsResult;

  beforeAll(async () => {
    const workingDirectory = createFixtureTree();

    // The fixture is not a git repository and never becomes one. Discovery
    // that shelled out to `git ls-files` could not measure it at all.
    writeFileSync(
      path.join(workingDirectory, "codometer.config.json"),
      JSON.stringify({
        excludeFrom: [".codometerignore"],
        output: { json: { path: REPORT_FILE_NAME } },
      }),
    );

    const module = await Test.createTestingModule({
      imports: [MainModule],
    }).compile();
    const command = module.get(CodometerCommand, { strict: false });

    await command.run([], { directory: workingDirectory });

    statistics = JSON.parse(
      readFileSync(path.join(workingDirectory, REPORT_FILE_NAME), "utf8"),
    ) as CodeStatisticsResult;
  }, 60_000);

  it("measures the files discovery kept", () => {
    expect.hasAssertions();

    // Four TypeScript files survive: nested/deep/deeper.ts, the one under the
    // `redistribute` directory a `dist` glob must not claim, and the two under
    // src. `nested/generated/thing.ts`, `build/output.js`, `vendor/vendored.ts`
    // and `node_modules/library/index.ts` are all gone.
    expect(statistics.typescript.files).toBe(4);
    expect(statistics.javascript.files).toBe(1);
    expect(statistics.javascript.testFiles).toBe(1);
    expect(statistics.sourceFiles).toBe(5);
  });

  it("applies the configured ignore file and the nested gitignore files", () => {
    expect.hasAssertions();

    // `AGENTS.md` and `nested/keep.md`. `README.md` is claimed by the
    // configured ignore file, `nested/drop.md` by the nested gitignore file,
    // and `CLAUDE.md` is a symlink to `AGENTS.md` rather than a document.
    expect(statistics.markdown.files).toBe(2);
    // The fixture's own `codometer.config.json` and `src/data.json`; the
    // notebook is measured as a notebook rather than as JSON.
    expect(statistics.json.files).toBe(2);
    expect(statistics.jupyter.files).toBe(1);
  });

  it("measures every other language it discovered", () => {
    expect.hasAssertions();

    expect(statistics.css.files).toBe(1);
    expect(statistics.hcl.files).toBe(1);
    expect(statistics.shell.files).toBe(1);
    expect(statistics.sql.files).toBe(1);
    expect(statistics.toml.files).toBe(1);
    expect(statistics.yaml.files).toBe(1);
  });
});
