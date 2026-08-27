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

/** The package itself, which is the directory its own configuration gates. */
export const packageDirectory = path.resolve(
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

/** Everything this package ships to be run: one directory per example. */
export const examplesDirectory = path.join(packageDirectory, "examples");

/** The committed sample corpus, which the read-only examples measure. */
export const corpusDirectory = path.join(examplesDirectory, "corpus");

/** Path of one shipped example configuration, from its segments. */
export const exampleConfiguration = (...segments: readonly string[]): string =>
  path.join(examplesDirectory, ...segments);

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
 * Feeds a run's standard output to a second process, and reports what came out.
 *
 * The guides promise `codometer --json | …` produces a stream something can
 * parse. What makes that promise true is the **split**: the report goes to
 * standard output and every diagnostic goes to standard error, so a consumer
 * reading the one gets data and nothing else. This runs the command line, takes
 * the bytes it wrote to standard output and **only** those, and hands them
 * unaltered to a second process's standard input — which is what a shell pipe
 * does, minus the shell. A log line leaking into the data stream fails it, and
 * a report assembled in-process would not.
 *
 * There is deliberately no `sh -c` here. Every path involved — the interpreter,
 * the command line's entry point, the measured directory — is absolute and
 * derived from where this repository happens to be checked out, and handing
 * those to a shell means a checkout path containing a space or a quote changes
 * what the shell reads as a word. Spawning the two processes directly gives the
 * argument vectors to the operating system rather than to a parser.
 *
 * `readReport` is the body of the downstream stage: it is handed the parsed
 * report and returns what to print. It reaches that process as a **file**
 * rather than as `node -e "…"`, because a program spliced into a command string
 * has to survive both the formatter reflowing it and a shell re-reading its
 * quotes, and one of those eventually loses.
 *
 * The run is reported rather than thrown, the way `runCodometer` reports its
 * own. Two processes can die and there is only one exit code to say so, so a
 * bare throw would say "command failed" and nothing about which half or why.
 * Whichever half failed is the code returned, and both halves' diagnostics come
 * back together.
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
      // Written as text rather than through `console.log`. That formats a lone
      // non-string with Node's inspection, which colors its output whenever it
      // believes colors are wanted — and a spawned process inherits
      // `FORCE_COLOR` from the test runner, so the number 28 arrives wrapped in
      // escape codes under an Nx target and bare under a plain run. The test
      // then passes or fails on how it was invoked rather than on anything
      // codometer did. Converting to a string first is what removes the
      // question.
      String.raw`  process.stdout.write(String(${readReport}) + "\n");`,
      "});",
    ].join("\n"),
  );

  try {
    const upstream = runCodometer(args);
    // Only what the run wrote to standard output crosses over. Its standard
    // error is held back deliberately: that separation is the property under
    // test, and merging the streams here would test nothing.
    const result = spawnSync(process.execPath, [downstream], {
      cwd: workspaceDirectory,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "" },
      input: upstream.standardOutput,
      maxBuffer: 32 * 1024 * 1024,
    });

    return {
      exitCode:
        upstream.exitCode === 0 ? (result.status ?? 1) : upstream.exitCode,
      standardError: upstream.standardError + result.stderr,
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
