import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  type CodometerReport,
  corpusDirectory,
  exampleConfiguration,
  measure,
  readMetric,
  readMetricInstances,
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
  measure(["--config", exampleConfiguration(...segments)], corpusDirectory);

/** Runs one example configuration as a gate, and returns what it produced. */
const gateExample = (
  ...segments: readonly string[]
): ReturnType<typeof runCodometer> =>
  runCodometer(
    ["--config", exampleConfiguration(...segments), "--check", "limits"],
    corpusDirectory,
  );

describe("every example configuration this package ships", () => {
  describe("targets", () => {
    let targetsReport: CodometerReport;

    beforeAll(() => {
      targetsReport = measureExample("targets", "codometer.config.ts");
    });

    it("measures compiled output sitting beside the corpus", () => {
      const report = targetsReport;

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

        const report = measure(
          ["--config", exampleConfiguration("targets", "ignored.config.ts")],
          directory,
        );

        // Still 28: discovery reads the ignore file itself rather than
        // invoking git, so the two copied files are invisible to it.
        expect(readTarget(report, "codebase").files).toBe(28);
        // And visible to a declared target, which is the whole point.
        expect(readTarget(report, "Ignored Output").files).toBe(2);
      });
    });

    it("removes files with a negation and with exclude alike", () => {
      const report = targetsReport;

      expect(readTarget(report, "Compiled Without Vendor").files).toBe(1);
      // Fifteen TypeScript files, seven of them tests.
      expect(readTarget(report, "Sources").files).toBe(8);
    });

    it("starts a target's globs somewhere else with directory", () => {
      const report = targetsReport;

      // `directory: ".."` reaches up out of the measured corpus into the package.
      expect(readTarget(report, "Manifests").files).toBe(2);
    });

    it("holds the same files however the include array is ordered", () => {
      const ordered = targetsReport;
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
      const run = runCodometer(
        ["--config", exampleConfiguration("limits", "fail.config.ts")],
        corpusDirectory,
      );

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
      // nothing, because no `defaultInput` says which target it belongs to.
      expect(run.standardError).toContain(
        String.raw`Cannot bind the limit written against \"linesOfCode\": nothing measured answers to it.`,
      );
      expect(run.standardError).toContain(
        "Write the target's name in front of the metric path, or configure a default input.",
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

    it("reads an unprefixed path as the default input's", () => {
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
    let documentationReport: CodometerReport;

    beforeAll(() => {
      documentationReport = measureExample(
        "documentation",
        "codometer.config.ts",
      );
    });

    it("counts the declarations of each kind that breach their own budget", () => {
      const report = documentationReport;

      // Only the class and method counters find a breach — one instance each,
      // named by file, line, and measured length. A counter that holds is
      // still measured, just at zero.
      expect(
        readMetricInstances(report, "codebase", "custom.Class Comment Budget"),
      ).toStrictEqual([
        { file: "typescript/catalog.service.ts", line: 18, measured: 8 },
      ]);
      expect(
        readMetricInstances(report, "codebase", "custom.Method Comment Budget"),
      ).toStrictEqual([
        { file: "javascript/receipt.js", line: 12, measured: 7 },
      ]);
      expect(
        readMetric(report, "codebase", "custom.Interface Comment Budget"),
      ).toBe(0);
      expect(
        readMetric(report, "codebase", "custom.Property Comment Budget"),
      ).toBe(0);
    });

    it("is gated by the same flag every other limit is", () => {
      const run = gateExample("documentation", "codometer.config.ts");

      expect(run.exitCode).toBe(1);
    });

    it("measures a YAML comment block through the same channel", () => {
      const report = measureExample("documentation", "yaml-comments.config.ts");

      // One block, the note above `pipeline.yaml`'s anchor, carrying two
      // maxima. One line against a maximum of one holds; twelve words against
      // a maximum of five breaches — so the counter reports one breach, at
      // whichever measurement broke its budget, not one entry per maximum.
      expect(
        readMetricInstances(report, "codebase", "custom.YAML Comment Budget"),
      ).toStrictEqual([{ file: "yaml/pipeline.yaml", line: 2, measured: 12 }]);
    });

    it("measures every language, and honours a language override", () => {
      const report = measureExample("documentation", "comments.config.ts");
      const readInstances = (
        label: string,
      ): CodometerReport["targets"][number]["metrics"][number]["instances"] =>
        readMetricInstances(report, "codebase", `custom.${label}`);

      // Every non-JSDoc block in the corpus breaches its own language's
      // three-word budget, except shell's second block, which holds under the
      // eight-word override — so it is absent rather than listed as a breach.
      expect(readInstances("CSS Comment Budget")).toStrictEqual([
        { file: "css/theme.css", line: 1, measured: 12 },
      ]);
      expect(readInstances("HCL Comment Budget")).toStrictEqual([
        { file: "hcl/network.tf", line: 1, measured: 12 },
      ]);
      expect(readInstances("Python Comment Budget")).toStrictEqual([
        { file: "python/inventory.py", line: 7, measured: 10 },
      ]);
      // Line 2, not line 1: a `#!` shebang is never a comment. Only this
      // block breaches the loosened eight-word budget — the second block, at
      // line 8, measures six and holds.
      expect(readInstances("Shell Comment Budget")).toStrictEqual([
        { file: "shell/release.sh", line: 2, measured: 11 },
      ]);
      expect(readInstances("SQL Comment Budget")).toStrictEqual([
        { file: "sql/reporting.sql", line: 1, measured: 7 },
      ]);
      expect(readInstances("TOML Comment Budget")).toStrictEqual([
        { file: "toml/service.toml", line: 1, measured: 5 },
      ]);
      expect(readInstances("YAML Comment Budget")).toStrictEqual([
        { file: "yaml/pipeline.yaml", line: 2, measured: 12 },
      ]);
    });

    it("never measures a JSDoc comment through a plain-language channel", () => {
      // The corpus's TypeScript and JavaScript sources carry only JSDoc
      // comments, and a `comment` selector naming no `kind` skips exactly
      // those — `codometer.config.ts`'s `kind`-based counters measure them
      // instead. The TypeScript counter here finds nothing at all.
      const report = measureExample("documentation", "comments.config.ts");

      expect(
        readMetric(report, "codebase", "custom.TypeScript Comment Budget"),
      ).toBe(0);
    });

    it("gates a YAML comment breach the same way", () => {
      const run = gateExample("documentation", "yaml-comments.config.ts");

      expect(run.exitCode).toBe(1);
    });
  });

  describe("configuration discovery", () => {
    it("takes the first configuration found walking upward", () => {
      const nested = measure([], exampleConfiguration("discovery", "nested"));
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
      const parent = measure([], exampleConfiguration("discovery"));
      const counters = readTarget(parent, "codebase").metrics.filter((metric) =>
        metric.path.startsWith("custom."),
      );

      // The package's own configuration — conventions and all — is what
      // answers. Nothing here is a function of which folder was measured, so
      // its own "Corpus" input is resolved too, and reported as a failure
      // rather than gating anything: this bare run neither writes nor checks,
      // and a failure fails only a run that does one of those.
      expect(counters.map((metric) => metric.path)).toStrictEqual([
        "custom.Service Files",
        "custom.Unit Tests",
        "custom.Static Methods",
      ]);
      expect(readTarget(parent, "Corpus").empty).toBe(true);
      expect(parent.failures).toHaveLength(1);
    });
  });

  describe("the output and check matrix", () => {
    const runRow = (
      directory: string,
      ...flags: readonly string[]
    ): ReturnType<typeof runCodometer> =>
      runCodometer(
        [
          "--config",
          exampleConfiguration("write-check", "codometer.config.ts"),
          ...flags,
        ],
        directory,
      );

    it("writes only when asked, and gates only when asked", () => {
      withCorpusCopy((directory) => {
        const reportPath = path.join(directory, "codometer-report.json");

        expect(runRow(directory).exitCode).toBe(0);
        expect(fs.existsSync(reportPath)).toBe(false);

        expect(runRow(directory, "--check", "limits").exitCode).toBe(1);
        expect(fs.existsSync(reportPath)).toBe(false);

        expect(
          runRow(directory, "--output-json", "--output-markdown").exitCode,
        ).toBe(0);
        expect(fs.existsSync(reportPath)).toBe(true);
        expect(fs.existsSync(path.join(directory, "statistics.md"))).toBe(true);
      });
    });

    it("produces every report before it fails on a breach", () => {
      withCorpusCopy((directory) => {
        const run = runRow(
          directory,
          "--output-json",
          "--output-markdown",
          "--check",
          "limits",
        );

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
        runRow(directory, "--output-json", "--output-markdown");

        expect(runRow(directory, "--check", "reports").exitCode).toBe(0);
        expect(runRow(directory, "--check", "reports,limits").exitCode).toBe(1);
      });
    });

    it("refuses --output-json combined with --check reports", () => {
      withCorpusCopy((directory) => {
        const run = runRow(directory, "--output-json", "--check", "reports");

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

  describe("the output sinks", () => {
    it("carries the report on standard output and diagnostics on standard error", () => {
      const run = runCodometer(["--format", "json"], corpusDirectory);

      // The assertion is that this parses at all: a log line sharing the stream
      // would break every `codometer --format json > report.json` pipeline.
      expect(() => JSON.parse(run.standardOutput) as unknown).not.toThrow();
      expect(run.standardError).toContain("Finished the measurement run");
    });

    it("writes the badge block where --output-markdown named a path", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer(
          [
            "--config",
            exampleConfiguration("output", "codometer.config.ts"),
            "--output-markdown",
            "document.md",
          ],
          directory,
        );
        const written = fs.readFileSync(
          path.join(directory, "document.md"),
          "utf8",
        );

        expect(run.exitCode).toBe(0);
        expect(written).toContain("img.shields.io");
        // The markers come with it, into a file that did not exist: one sink
        // serves a bare statistics page and a README with prose alike.
        expect(written).toContain("<!-- CODE_STATISTICS_START -->");
        // And a named destination stands for all of them, so the configured
        // report is not written.
        expect(
          fs.existsSync(path.join(directory, "codometer-report.json")),
        ).toBe(false);
      });
    });

    it("carries a report through a shell pipeline that parses it", () => {
      // The `codometer --format json | …` pipeline the guide shows, for real
      // through a shell. Anything on standard output but the report — one log
      // line, one warning — breaks this outright.
      const piped = runPipeline(
        ["--format", "json"],
        "report.targets[0].files",
        corpusDirectory,
      );

      // The exit code first, so a pipeline that died under load reports which
      // half died instead of failing as a mismatched string.
      expect(piped.exitCode).toBe(0);
      expect(piped.standardOutput.trim()).toBe("28");
      // And the other half of the same promise: the diagnostics were not
      // missing, they were on the other stream the whole time.
      expect(piped.standardError).toContain("Finished the measurement run");
    });

    it("refuses a bare --output-json on a run whose configuration names none", () => {
      // A path always means a file — `--output-json <path>` writes there
      // outright, with no companion flag needed. Only the bare flag, asking
      // for wherever the configuration says to, can still be refused, and
      // only when that configuration names no "json" output to resolve one
      // from.
      const run = runCodometer(
        [
          "--config",
          exampleConfiguration("python", "uv.config.ts"),
          "--output-json",
        ],
        corpusDirectory,
      );

      expect(run.exitCode).toBe(1);
      expect(run.standardError).toContain(
        String.raw`--output-json needs a path, or a \"json\" entry in the configuration's \"outputs\" to resolve one from`,
      );
    });

    it("lets a named path write on its own, with no companion flag", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer(
          [
            "--config",
            exampleConfiguration("output", "codometer.config.ts"),
            "--output-json",
            "only-this.json",
          ],
          directory,
        );

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
        const configuration = exampleConfiguration(
          "output",
          "codometer.config.ts",
        );

        runCodometer(
          ["--config", configuration, "--output-markdown"],
          directory,
        );

        const first = fs.readFileSync(destination, "utf8");

        expect(first).toContain("<!-- CODE_STATISTICS_START -->");
        expect(first).toContain("<!-- CODE_STATISTICS_END -->");

        runCodometer(
          ["--config", configuration, "--output-markdown"],
          directory,
        );

        // Rewritten in place rather than appended a second time.
        const second = fs.readFileSync(destination, "utf8");

        expect(second.split("<!-- CODE_STATISTICS_START -->")).toHaveLength(2);
      });
    });

    it("splices between renamed markers", () => {
      withCorpusCopy((directory) => {
        runCodometer(
          [
            "--config",
            exampleConfiguration("output", "renamed-markers.config.ts"),
            "--output-markdown",
          ],
          directory,
        );

        const written = fs.readFileSync(
          path.join(directory, "statistics.md"),
          "utf8",
        );

        expect(written).toContain("<!-- SAMPLE_STATISTICS_START -->");
        expect(written).not.toContain("<!-- CODE_STATISTICS_START -->");
      });
    });

    it("splices a `write` function's own content between the markers", () => {
      withCorpusCopy((directory) => {
        runCodometer(
          [
            "--config",
            exampleConfiguration("output", "custom-render.config.ts"),
            "--output-markdown",
          ],
          directory,
        );

        const written = fs.readFileSync(
          path.join(directory, "statistics.md"),
          "utf8",
        );

        // The custom line, the built-in badges beneath it, and the built-in
        // splice around both — `write` built the content itself and handed it
        // to `anchors.syncAnchoredBlock`.
        expect(written).toContain("source files");
        expect(written).toContain("img.shields.io");
        expect(written).toContain("<!-- CODE_STATISTICS_START -->");
      });
    });

    it("lets a `write` function pick its own destination", () => {
      withCorpusCopy((directory) => {
        runCodometer(
          [
            "--config",
            exampleConfiguration("output", "custom-write.config.ts"),
            "--output-markdown",
          ],
          directory,
        );

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
          runCodometer(
            ["--config", configuration, "--output-json", "--output-markdown"],
            directory,
          );
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

    it("measures the same tree whether or not the report was asked for", () => {
      withCorpusCopy((directory) => {
        const configuration = exampleConfiguration(
          "output",
          "self-excluded.config.ts",
        );

        runCodometer(
          ["--config", configuration, "--output-json", "--output-markdown"],
          directory,
        );

        // Asking for the report on the console is `--format json`, which names
        // no destination and so cannot drop the configured pair. The two files
        // stay excluded and the count is the one the write run reported.
        const after = measure(["--config", configuration], directory);

        expect(readTarget(after, "codebase").files).toBe(28);
      });
    });

    it("says on the console what it left out", () => {
      withCorpusCopy((directory) => {
        const run = runCodometer(
          [
            "--config",
            exampleConfiguration("output", "self-excluded.config.ts"),
            "--output-json",
            "--output-markdown",
          ],
          directory,
        );

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

        runCodometer(["--config", configuration, "--output-json"], directory);

        expect(
          runCodometer(
            ["--config", configuration, "--check", "reports"],
            directory,
          ).exitCode,
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

        const stale = runCodometer(
          ["--config", configuration, "--check", "reports"],
          directory,
        );

        expect(stale.exitCode).toBe(1);
        expect(stale.standardError).toContain("Found stale reports");
      });
    });
  });
});
