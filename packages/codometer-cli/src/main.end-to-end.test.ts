import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createFixtureTree, removeFixtureTree } from "../testing/fixture-tree";

import { environmentSchema } from "./constants";

import type { CodometerReport } from "./modules/report/report.types";

const COMMAND_PATH = path.resolve(import.meta.dirname, "main.ts");

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({});
    });
  });

  // Run as a real process rather than through the testing module, because the
  // thing under test is which file descriptor each byte came out of — and a
  // logger writing through a transport worker cannot be observed any other way.
  describe("the streams the command writes to", () => {
    let standardOutput: string;
    let standardError: string;
    let workingDirectory: string;

    beforeAll(() => {
      workingDirectory = createFixtureTree();

      writeFileSync(
        path.join(workingDirectory, "codometer.config.json"),
        JSON.stringify({ excludeFrom: [".codometerignore"] }),
      );

      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "@swc-node/register/esm-register",
          COMMAND_PATH,
          "codometer",
          "--directory",
          workingDirectory,
          "--config",
          path.join(workingDirectory, "codometer.config.json"),
          // The report goes to the console, and the badge block goes into a
          // file — so there is a written file to announce and nothing but the
          // report on standard output.
          "--json",
          "--readme",
          path.join(workingDirectory, "README.md"),
          "--write",
        ],
        {
          encoding: "utf8",
          env: { ...process.env, FORCE_COLOR: "0" },
          timeout: 120_000,
        },
      );

      standardError = result.stderr;
      standardOutput = result.stdout;
    }, 150_000);

    afterAll(() => {
      removeFixtureTree(workingDirectory);
    });

    // `codometer --json > report.json` has to produce a file something can
    // parse. A diagnostic sharing that stream is not a note beside the data,
    // it is a corruption of it.
    it("puts nothing but the report on standard output", () => {
      expect.hasAssertions();

      const report = JSON.parse(standardOutput) as CodometerReport;

      expect(report.targets[0]?.name).toBe("codebase");
      expect(report.targets[0]?.metrics.length).toBeGreaterThan(0);
    });

    it("still states plainly which files it left out, on standard error", () => {
      expect.hasAssertions();

      expect(standardError).toContain(
        "Excluded the files codometer writes from what it measures",
      );
      expect(standardError).toContain("README.md");
    });
  });
});
