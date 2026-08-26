import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/** The whole report, as `--json` renders it. */
export interface CodometerReport {
  documentation: ReportedDeclaration[];
  failures: ReportedFailure[];
  targets: ReportedTarget[];
}

/** What one run of the command line left behind. */
export interface CodometerRun {
  exitCode: number;
  standardError: string;
  standardOutput: string;
}

/** One documented declaration, breached or not. */
export interface ReportedDeclaration {
  breached: boolean;
  declaration: string;
  file: string;
  kind: string;
  limit: number;
  measured: number;
}

/** Whatever the run could not do. */
export interface ReportedFailure {
  kind: string;
  reason: string;
  subject: string;
}

/** One limit as the report writes it, whether or not it was breached. */
export interface ReportedLimit {
  breached: boolean;
  label: null | string;
  severity: string;
  value: number;
}

/** One measured metric, with every limit written against it. */
export interface ReportedMetric {
  limits: ReportedLimit[];
  name: string;
  path: string;
  unit: null | string;
  value: number;
}

/** One measured target and everything counted within it. */
export interface ReportedTarget {
  empty: boolean;
  files: number;
  metrics: ReportedMetric[];
  name: string;
}

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
): ReportedTarget => {
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
