import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CodometerReport,
  ReportMetric,
  ReportTarget,
} from "@codometer/cli";

/**
 * Drives the real codometer command line over the sample corpus.
 *
 * Every number, badge, and refusal a guide in this package quotes is produced
 * by running the documented command through here, so a guide that drifts from
 * the tool fails a test rather than misleading a reader. The command line is
 * the seam on purpose: it is the interface the guides describe, and testing
 * anything beneath it would let the guides and the tool disagree while the
 * tests stayed green.
 */

// 🧭 Locations

const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const workspaceDirectory = path.resolve(packageDirectory, "..", "..");

/**
 * Entry point of the codometer command line, resolved through the package.
 *
 * Resolved rather than written out as a path so the dependency is a real one:
 * `nx affected` connects this package to `@codometer/cli`, and a change to the
 * tool re-runs the tests that assert what the guides say about it.
 */
const commandLineEntry = path.resolve(
  createRequire(import.meta.url).resolve("@codometer/cli/package.json"),
  "..",
  "src",
  "main.ts",
);

/** The committed sample corpus, which the read-only examples measure. */
export const corpusDirectory = path.join(packageDirectory, "corpus");

/** Path of one shipped example configuration, from its segments. */
export const exampleConfiguration = (...segments: readonly string[]): string =>
  path.join(packageDirectory, "examples", ...segments);

// 🏷️ Report shapes

/**
 * The report shape, re-exported from the tool that produces it.
 *
 * Tests read it from here rather than from `@codometer/cli` directly, so the
 * harness stays the one seam this package tests through — and so the day the
 * tool's report type changes, it changes here.
 */
export type { CodometerReport } from "@codometer/cli";

/** What one run of the command line left behind. */
export interface CodometerRun {
  exitCode: number;
  standardError: string;
  standardOutput: string;
}

/**
 * One documented declaration, breached or not.
 *
 * Derived from the report rather than imported on its own, because the report
 * type is what `@codometer/cli` exports and this is the shape it holds.
 */
export type ReportedDeclaration = CodometerReport["documentation"][number];

// 🏃 Running

/**
 * Runs the command line with the given arguments and returns what it produced.
 *
 * `NODE_OPTIONS` is emptied because the test runner sets its own, and they
 * reach a spawned Node that neither needs nor understands them.
 */
export const runCodometer = (args: readonly string[]): CodometerRun => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "@swc-node/register/esm-register",
      commandLineEntry,
      "codometer",
      ...args,
    ],
    {
      cwd: workspaceDirectory,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "" },
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  return {
    exitCode: result.status ?? 1,
    standardError: result.stderr,
    standardOutput: result.stdout,
  };
};

/**
 * Runs the command line inside a real shell pipeline and returns what came out
 * the far end.
 *
 * The guides promise `codometer --json | …` produces a stream something can
 * parse, and that promise is only worth making if a pipeline is what tested it
 * — a report assembled in-process would pass even with a log line sharing the
 * stream. The downstream stage is Node rather than `jq` so the test depends on
 * nothing the test runner does not already require.
 *
 * `readReport` is the body of that downstream stage: it is handed the parsed
 * report and returns what to print. It reaches the shell as a **file** rather
 * than as `node -e "…"`, because a program spliced into a command string has to
 * survive both the formatter reflowing it and the shell re-reading its quotes,
 * and one of those eventually loses.
 *
 * The run is reported rather than thrown, the way `runCodometer` reports its
 * own. A pipeline has two processes that can die and only one exit code to say
 * so, so a bare throw here says "command failed" and nothing about which half
 * or why — which is exactly the failure a test running under a loaded machine
 * is most likely to hit, and exactly the one worth being able to read.
 */
export const runPipeline = (
  args: readonly string[],
  readReport: string,
): CodometerRun => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codometer-pipe-"));
  const downstream = path.join(directory, "downstream.mjs");

  // Says outright that the upstream stage produced nothing, rather than
  // failing as an unexplained `JSON.parse` on an empty string.
  fs.writeFileSync(
    downstream,
    [
      'let text = "";',
      'process.stdin.on("data", (chunk) => { text += chunk; });',
      'process.stdin.on("end", () => {',
      "  if (text.trim() === '') {",
      '    console.error("the upstream stage wrote nothing to standard output");',
      "    process.exit(1);",
      "  }",
      "  const report = JSON.parse(text);",
      `  console.log(${readReport});`,
      "});",
    ].join("\n"),
  );

  try {
    const result = spawnSync(
      "sh",
      [
        "-c",
        [
          JSON.stringify(process.execPath),
          "--import @swc-node/register/esm-register",
          JSON.stringify(commandLineEntry),
          "codometer",
          ...args.map((argument) => JSON.stringify(argument)),
          "|",
          JSON.stringify(process.execPath),
          JSON.stringify(downstream),
        ].join(" "),
      ],
      {
        cwd: workspaceDirectory,
        encoding: "utf8",
        env: { ...process.env, NODE_OPTIONS: "" },
        maxBuffer: 32 * 1024 * 1024,
      },
    );

    return {
      exitCode: result.status ?? 1,
      standardError: result.stderr,
      standardOutput: result.stdout,
    };
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
};

/**
 * Runs the command line asking for the report, and parses what came back.
 *
 * Parsing rather than merely reading is the assertion that matters here:
 * standard output carries the result and every diagnostic goes to standard
 * error, so a log line leaking into the data stream fails this outright.
 */
export const measure = (args: readonly string[]): CodometerReport => {
  const run = runCodometer([...args, "--json"]);

  return JSON.parse(run.standardOutput) as CodometerReport;
};

/** Reads one measured target from a report by name. */
export const readTarget = (
  report: CodometerReport,
  name: string,
): ReportTarget => {
  const target = report.targets.find((candidate) => candidate.name === name);

  if (target === undefined) {
    throw new Error(`No target called "${name}" in the report.`);
  }

  return target;
};

/** Reads one metric's value from a target by its path within that target. */
export const readMetric = (
  report: CodometerReport,
  targetName: string,
  metricPath: string,
): number => {
  const metric = readTarget(report, targetName).metrics.find(
    (candidate) => candidate.path === metricPath,
  );

  if (metric === undefined) {
    throw new Error(`No metric "${metricPath}" on target "${targetName}".`);
  }

  return metric.value;
};

/** Reads every limit declared on one metric, in the order they were written. */
export const readMetricLimits = (
  report: CodometerReport,
  targetName: string,
  metricPath: string,
): ReportMetric["limits"] => {
  const metric = readTarget(report, targetName).metrics.find(
    (candidate) => candidate.path === metricPath,
  );

  if (metric === undefined) {
    throw new Error(`No metric "${metricPath}" on target "${targetName}".`);
  }

  return metric.limits;
};

/** Reads every custom counter from the codebase target, keyed by label. */
export const readCounters = (
  report: CodometerReport,
): Record<string, number> => {
  const counters: Record<string, number> = {};

  for (const metric of readTarget(report, "codebase").metrics) {
    if (metric.path.startsWith("custom.")) {
      counters[metric.path.slice("custom.".length)] = metric.value;
    }
  }

  return counters;
};

// 📋 Scratch copies

/**
 * Runs a body against a throwaway copy of the corpus.
 *
 * Every example that writes needs somewhere to write to, and the committed
 * corpus is not it: a test that spliced a badge block into a sample file would
 * change the counts every other test asserts.
 */
export const withCorpusCopy = <Result>(
  body: (directory: string) => Result,
): Result => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "codometer-corpus-"));

  try {
    fs.cpSync(corpusDirectory, directory, { recursive: true });

    return body(directory);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
};
