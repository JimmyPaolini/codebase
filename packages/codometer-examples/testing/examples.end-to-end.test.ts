import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  type CodometerReport,
  corpusDirectory,
  exampleConfiguration,
  measure,
  readMetric,
  readMetricLimits,
  readTarget,
  runCodometer,
  runPipeline,
  withCorpusCopy,
} from "./codometer.js";

/**
 * Every example configuration this package ships, run the way its guide says.
 *
 * The refusals matter most. They are where codometer is opinionated and where
 * a reader gets stuck, so each one is reproduced here with the exit code and
 * the sentence the tool actually prints — a message that changes wording is a
 * guide that has drifted, and this is what notices.
 */

/** Runs one example configuration over the committed corpus. */
const measureExample = (...segments: readonly string[]): CodometerReport =>
  measure([
    "--directory",
    corpusDirectory,
    "--config",
    exampleConfiguration(...segments),
  ]);

/** Runs one example configuration as a gate, and returns what it produced. */
const gateExample = (
  ...segments: readonly string[]
): ReturnType<typeof runCodometer> =>
  runCodometer([
    "--directory",
    corpusDirectory,
    "--config",
    exampleConfiguration(...segments),
    "--check",
    "limits",
  ]);

describe("every example configuration this package ships", () => {
  describe("targets", () => {
    it("measures compiled output sitting beside the corpus", () => {
      const report = measureExample("targets", "codometer.config.ts");

      // The codebase target measures one directory and the compiled samples
      // are not in it; a target's globs reach out to them.
      expect(readTarget(report, "codebase").files).toBe(28);
      expect(readTarget(report, "Compiled").files).toBe(2);
    });

    it("reaches the files the codebase target's ignore rules hide", () => {
      withCorpusCopy((directory) => {
        // `corpus/.gitignore` names `generated/`. Fill it, exactly as the
        // example's own instructions say to.
        fs.cpSync(
          path.join(corpusDirectory, "..", "compiled"),
          path.join(directory, "generated"),
          { recursive: true },
        );

        const report = measure([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("targets", "ignored.config.ts"),
        ]);

        // Still 28: discovery reads the ignore file itself rather than
        // invoking git, so the two copied files are invisible to it.
        expect(readTarget(report, "codebase").files).toBe(28);
        // And visible to a declared target, which is the whole point.
        expect(readTarget(report, "Ignored Output").files).toBe(2);
      });
    });

    it("removes files with a negation and with exclude alike", () => {
      const report = measureExample("targets", "codometer.config.ts");

      expect(readTarget(report, "Compiled Without Vendor").files).toBe(1);
      // Fifteen TypeScript files, seven of them tests.
      expect(readTarget(report, "Sources").files).toBe(8);
    });

    it("starts a target's globs somewhere else with directory", () => {
      const report = measureExample("targets", "codometer.config.ts");

      // `directory: ".."` reaches up out of the measured corpus into the package.
      expect(readTarget(report, "Manifests").files).toBe(2);
    });

    it("holds the same files however the include array is ordered", () => {
      const ordered = measureExample("targets", "codometer.config.ts");
      const reordered = measureExample("targets", "reordered.config.ts");
      const describeTargets = (
        report: CodometerReport,
      ): Record<string, number> =>
        Object.fromEntries(
          report.targets.map((target) => [target.name, target.files]),
        );

      // Negations form one set applied to the whole target rather than being read
      // in order, so writing the `!` first cannot change what the target holds.
      expect(describeTargets(reordered)).toStrictEqual(
        describeTargets(ordered),
      );
    });
  });

  describe("compression", () => {
    it("compresses each file on its own, and gzip beats nothing", () => {
      const readSize = (configuration: string): number =>
        readMetric(
          measureExample("compression", configuration),
          "Compiled",
          "size",
        );
      const uncompressed = readSize("none.config.ts");
      const gzip = readSize("gzip.config.ts");
      const brotli = readSize("brotli.config.ts");

      expect(gzip).toBeLessThan(uncompressed);
      expect(brotli).toBeLessThan(gzip);
      // Two files summed, not one archive of both: the sum of the parts is what a
      // browser pays, file by file over the wire.
      expect(uncompressed).toBeGreaterThan(1000);
    });
  });

  describe("limits", () => {
    it("prints a warning breach without changing the exit code", () => {
      const run = gateExample("limits", "warn.config.ts");

      expect(run.exitCode).toBe(0);
      expect(run.standardError).toContain("Breached a warning limit");
    });

    it("fails on a breach at the default severity, reporting both limits", () => {
      const run = gateExample("limits", "fail.config.ts");

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain("Breached a failing limit");
      expect(run.standardError).toContain("Breached a warning limit");
    });

    it("reports a breach without failing when nothing asked for a gate", () => {
      const run = runCodometer([
        "--directory",
        corpusDirectory,
        "--config",
        exampleConfiguration("limits", "fail.config.ts"),
      ]);

      // A breach is a finding; only `--check limits` turns a finding into a gate.
      expect(run.exitCode).toBe(0);
      expect(run.standardError).toContain("Breached a failing limit");
    });

    it("refuses an ambiguous path, naming both readings", () => {
      const run = gateExample("limits", "ambiguous.config.ts");

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain(
        String.raw`it could be the \"markdown\" target's \"files\" metric`,
      );
    });

    it("refuses an unprefixed path even where only one target was measured", () => {
      const run = gateExample("limits", "unprefixed.config.ts");

      expect(run.exitCode).toBe(1);
      // The exact sentence both guides quote. `linesOfCode` is real, spelled
      // correctly, and on the only target measured — and still binds to
      // nothing, because no `defaultTarget` says which target it belongs to.
      expect(run.standardError).toContain(
        String.raw`Cannot bind the limit written against \"linesOfCode\": nothing measured answers to it.`,
      );
      expect(run.standardError).toContain(
        "Write the target's name in front of the metric path, or configure a default target.",
      );
    });

    it("refuses a path naming nothing, and one naming an analysis never run", () => {
      const run = gateExample("limits", "unbound.config.ts");

      expect(run.exitCode).toBe(1);
      // Both failures are collected and reported together rather than one run at
      // a time.
      expect(run.standardError).toContain("nowhere.at.all");
      expect(run.standardError).toContain("Compiled.typescript.files");
    });

    it("reads an unprefixed path as the default target's", () => {
      const run = gateExample("limits", "default-target.config.ts");
      const report = measureExample("limits", "default-target.config.ts");

      expect(run.exitCode).toBe(0);
      expect(report.failures).toStrictEqual([]);
      // `typescript.interfaces` bound to the codebase's six, not to the target
      // also called `typescript`.
      expect(readMetric(report, "codebase", "typescript.interfaces")).toBe(6);
    });

    it("reads a decimal unit, and refuses one it cannot read", () => {
      const report = measureExample("limits", "units.config.ts");
      const limits = readMetricLimits(report, "Corpus", "size");
      const refused = gateExample("limits", "unreadable-unit.config.ts");

      // "8 KB" is 8000 bytes and "1 MB" is 1000000 — decimal, not binary.
      expect(limits.map((limit) => limit.value)).toStrictEqual([
        8000, 1_000_000,
      ]);
      expect(refused.exitCode).toBe(1);
      expect(refused.standardError).toContain(
        String.raw`so \"8 K\" is not a size`,
      );
    });

    it("fails an empty target if and only if a limit is written against it", () => {
      const limited = gateExample("limits", "empty-target-limited.config.ts");
      const unlimited = gateExample(
        "limits",
        "empty-target-unlimited.config.ts",
      );
      const report = measureExample(
        "limits",
        "empty-target-unlimited.config.ts",
      );

      expect(limited.exitCode).toBe(1);
      expect(limited.standardError).toContain("matched no files");
      expect(unlimited.exitCode).toBe(0);
      // Said outright rather than left to be inferred from a size of zero.
      expect(readTarget(report, "Never Built").empty).toBe(true);
    });
  });

  describe("documentation limits", () => {
    it("measures every documented declaration, breached or not", () => {
      const report = measureExample("documentation", "codometer.config.ts");
      const breached = report.documentation.filter((entry) => entry.breached);

      expect(report.documentation).toHaveLength(26);
      expect(
        breached.map((entry) => entry.declaration).toSorted(),
      ).toStrictEqual(["CatalogService", "blank"]);
    });

    it("never measures a declaration carrying no doc comment", () => {
      const report = measureExample("documentation", "codometer.config.ts");
      const declarations = report.documentation.map(
        (entry) => entry.declaration,
      );

      // A module-level constant is not a documented declaration, whatever comment
      // sits above it.
      expect(declarations).not.toContain("priceLine");
      expect(declarations).not.toContain("DEFAULT_CURRENCY");
    });

    it("is gated by the same flag every other limit is", () => {
      const run = gateExample("documentation", "codometer.config.ts");

      expect(run.exitCode).toBe(1);
    });
  });

  describe("configuration discovery", () => {
    it("takes the first configuration found walking upward", () => {
      const nested = measure([
        "--directory",
        exampleConfiguration("discovery", "nested"),
      ]);
      const counters = readTarget(nested, "codebase").metrics.filter((metric) =>
        metric.path.startsWith("custom."),
      );

      // Only the nested file's counter. Nothing from the package's configuration
      // above it, and nothing from the workspace root's above that.
      expect(counters.map((metric) => metric.path)).toStrictEqual([
        "custom.Configurations",
      ]);
    });

    it("continues upward from a folder carrying no configuration", () => {
      const parent = measure([
        "--directory",
        exampleConfiguration("discovery"),
      ]);
      const counters = readTarget(parent, "codebase").metrics.filter((metric) =>
        metric.path.startsWith("custom."),
      );

      expect(counters.map((metric) => metric.path)).toStrictEqual([
        "custom.Service Files",
        "custom.Unit Tests",
        "custom.Static Methods",
      ]);
    });
  });

  describe("the write and check matrix", () => {
    const runRow = (
      directory: string,
      ...flags: readonly string[]
    ): ReturnType<typeof runCodometer> =>
      runCodometer([
        "--directory",
        directory,
        "--config",
        exampleConfiguration("write-check", "codometer.config.ts"),
        ...flags,
      ]);

    it("writes only when asked, and gates only when asked", () => {
      withCorpusCopy((directory) => {
        const reportPath = path.join(directory, "codometer-report.json");

        expect(runRow(directory).exitCode).toBe(0);
        expect(fs.existsSync(reportPath)).toBe(false);

        expect(runRow(directory, "--check", "limits").exitCode).toBe(1);
        expect(fs.existsSync(reportPath)).toBe(false);

        expect(runRow(directory, "--write").exitCode).toBe(0);
        expect(fs.existsSync(reportPath)).toBe(true);
        expect(fs.existsSync(path.join(directory, "statistics.md"))).toBe(true);
      });
    });

    it("produces every report before it fails on a breach", () => {
      withCorpusCopy((directory) => {
        const run = runRow(directory, "--write", "--check", "limits");

        expect(run.exitCode).toBe(1);
        // The report is on disk even though the gate tripped: a pull request that
        // failed the gate is exactly the one that needs the numbers.
        expect(
          fs.existsSync(path.join(directory, "codometer-report.json")),
        ).toBe(true);
      });
    });

    it("compares a written report rather than rewriting it", () => {
      withCorpusCopy((directory) => {
        runRow(directory, "--write");

        expect(runRow(directory, "--check", "reports").exitCode).toBe(0);
        expect(runRow(directory, "--check", "reports,limits").exitCode).toBe(1);
      });
    });

    it("refuses --write --check reports", () => {
      withCorpusCopy((directory) => {
        const run = runRow(directory, "--write", "--check", "reports");

        expect(run.exitCode).toBe(1);
        expect(run.standardError).toContain(
          "a report cannot be stale in the run that just wrote it",
        );
      });
    });

    it("refuses a --check value it does not know", () => {
      const run = runRow(corpusDirectory, "--check", "everything");

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain("--check does not accept");
    });
  });

  describe("the three sinks", () => {
    it("carries the report on standard output and diagnostics on standard error", () => {
      const run = runCodometer(["--directory", corpusDirectory, "--json"]);

      // The assertion is that this parses at all: a log line sharing the stream
      // would break every `codometer --json > report.json` pipeline downstream.
      expect(() => JSON.parse(run.standardOutput) as unknown).not.toThrow();
      expect(run.standardError).toContain("Finished the codometer run");
    });

    it("writes the badges as a whole document with -m", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "codometer.config.ts"),
          "--markdown",
          "document.md",
          "--write",
        ]);
        const written = fs.readFileSync(
          path.join(directory, "document.md"),
          "utf8",
        );

        expect(run.exitCode).toBe(0);
        expect(written).toContain("img.shields.io");
        // A whole document rather than a spliced block: no markers around it.
        expect(written).not.toContain("<!-- CODE_STATISTICS_START -->");
        // And a named destination stands for all of them, so the configured
        // report and splice are not written.
        expect(
          fs.existsSync(path.join(directory, "codometer-report.json")),
        ).toBe(false);
      });
    });

    it("carries a report through a shell pipeline that parses it", () => {
      // The `codometer --json | …` pipeline the guide shows, run for real
      // through a shell. Anything on standard output but the report — one log
      // line, one warning — breaks this outright.
      const piped = runPipeline(
        ["--directory", corpusDirectory, "--json"],
        "report.targets[0].files",
      );

      expect(piped.trim()).toBe("28");
    });

    it("refuses --json <path> on a run that neither writes nor compares", () => {
      const run = runCodometer([
        "--directory",
        corpusDirectory,
        "--json",
        "report.json",
      ]);

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain("needs --write or --check reports");
    });

    it("lets a named destination stand for all of them", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "codometer.config.ts"),
          "--json",
          "only-this.json",
          "--write",
        ]);

        expect(run.exitCode).toBe(0);
        expect(fs.existsSync(path.join(directory, "only-this.json"))).toBe(
          true,
        );
        // The configured markdown destination is not written: naming one sink on
        // the command line replaces the configured set rather than adding to it.
        expect(fs.existsSync(path.join(directory, "statistics.md"))).toBe(
          false,
        );
      });
    });

    it("appends the block when the markers are absent and creates the file", () => {
      withCorpusCopy((directory) => {
        const destination = path.join(directory, "statistics.md");

        runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "codometer.config.ts"),
          "--write",
        ]);

        const first = fs.readFileSync(destination, "utf8");

        expect(first).toContain("<!-- CODE_STATISTICS_START -->");
        expect(first).toContain("<!-- CODE_STATISTICS_END -->");

        runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "codometer.config.ts"),
          "--write",
        ]);

        // Rewritten in place rather than appended a second time.
        const second = fs.readFileSync(destination, "utf8");

        expect(second.split("<!-- CODE_STATISTICS_START -->")).toHaveLength(2);
      });
    });

    it("splices between renamed markers", () => {
      withCorpusCopy((directory) => {
        runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "renamed-markers.config.ts"),
          "--write",
        ]);

        const written = fs.readFileSync(
          path.join(directory, "statistics.md"),
          "utf8",
        );

        expect(written).toContain("<!-- SAMPLE_STATISTICS_START -->");
        expect(written).not.toContain("<!-- CODE_STATISTICS_START -->");
      });
    });

    it("keeps the built-in writer when only render is supplied", () => {
      withCorpusCopy((directory) => {
        runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "custom-render.config.ts"),
          "--write",
        ]);

        const written = fs.readFileSync(
          path.join(directory, "statistics.md"),
          "utf8",
        );

        // The custom line, the built-in badges beneath it, and the built-in
        // splice around both.
        expect(written).toContain("source files");
        expect(written).toContain("img.shields.io");
        expect(written).toContain("<!-- CODE_STATISTICS_START -->");
      });
    });

    it("keeps the built-in renderer when only write is supplied", () => {
      withCorpusCopy((directory) => {
        runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "custom-write.config.ts"),
          "--write",
        ]);

        // The corpus holds Python, so the writer chose the other file.
        expect(fs.existsSync(path.join(directory, "polyglot.md"))).toBe(true);
        expect(fs.existsSync(path.join(directory, "statistics.md"))).toBe(
          false,
        );
        expect(
          fs.readFileSync(path.join(directory, "polyglot.md"), "utf8"),
        ).toContain("img.shields.io");
      });
    });
  });

  describe("what codometer writes, it does not measure", () => {
    it("leaves its own destinations out of the tree it measured", () => {
      withCorpusCopy((directory) => {
        const configuration = exampleConfiguration(
          "output",
          "self-excluded.config.ts",
        );
        const write = (): void => {
          runCodometer([
            "--directory",
            directory,
            "--config",
            configuration,
            "--write",
          ]);
        };

        // Twice: the first run creates the two destinations, the second measures
        // a tree that already holds them.
        write();
        write();

        const after = JSON.parse(
          fs.readFileSync(
            path.join(directory, "codometer-report.json"),
            "utf8",
          ),
        ) as CodometerReport;

        // Two files were written into the measured directory, and the counts are
        // exactly what they were before either existed.
        expect(readTarget(after, "codebase").files).toBe(28);
        expect(readMetric(after, "codebase", "markdown.files")).toBe(1);
        expect(readMetric(after, "codebase", "json.files")).toBe(1);
      });
    });

    it("excludes the destinations this run has, not the ones it might have had", () => {
      withCorpusCopy((directory) => {
        const configuration = exampleConfiguration(
          "output",
          "self-excluded.config.ts",
        );

        runCodometer([
          "--directory",
          directory,
          "--config",
          configuration,
          "--write",
        ]);

        // A destination named on the command line stands for all of them, so
        // `--json` replaces the configured pair with the console. This run was
        // never going to write those two files, so it measures them like any
        // other — 28 plus the report and the document now sitting there.
        const after = measure([
          "--directory",
          directory,
          "--config",
          configuration,
        ]);

        expect(readTarget(after, "codebase").files).toBe(30);
      });
    });

    it("says on the console what it left out", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer([
          "--directory",
          directory,
          "--config",
          exampleConfiguration("output", "self-excluded.config.ts"),
          "--write",
        ]);

        expect(run.standardError).toContain("statistics.md");
      });
    });
  });

  describe("false staleness", () => {
    it("reports a report as stale when only a compressed size differs", () => {
      withCorpusCopy((directory) => {
        const configuration = exampleConfiguration(
          "staleness",
          "codometer.config.ts",
        );
        const reportPath = path.join(directory, "codometer-report.json");

        runCodometer([
          "--directory",
          directory,
          "--config",
          configuration,
          "--write",
        ]);

        expect(
          runCodometer([
            "--directory",
            directory,
            "--config",
            configuration,
            "--check",
            "reports",
          ]).exitCode,
        ).toBe(0);

        // Stand in for a Node release whose bundled zlib compresses differently.
        // Nothing in the measured tree changes.
        const written = JSON.parse(
          fs.readFileSync(reportPath, "utf8"),
        ) as CodometerReport;

        for (const target of written.targets) {
          for (const metric of target.metrics) {
            if (metric.path === "size") {
              metric.value += 1;
            }
          }
        }

        fs.writeFileSync(reportPath, JSON.stringify(written, null, 2));

        const stale = runCodometer([
          "--directory",
          directory,
          "--config",
          configuration,
          "--check",
          "reports",
        ]);

        expect(stale.exitCode).toBe(1);
        expect(stale.standardError).toContain("Found stale reports");
      });
    });
  });
});
