/**
 * Reports bundle sizes for a pull request.
 *
 * Collects every `size-limit-report.json` the `bundlesize` target wrote,
 * renders the `🎒 Bundles` section, and writes it wherever asked — standard
 * output, a file, or the bottom of a pull request description.
 *
 * The report lives in the description rather than in a comment so that review
 * automation, which treats every new pull request comment as feedback to act
 * on, is not woken up by a bot posting build statistics on each push.
 *
 * The baseline is an artifact rather than a second build of `main`: sizing the
 * base branch used to cost a full extra checkout, install, and build on every
 * pull request.
 *
 * Usage:
 *   tsx scripts/report-bundle-sizes.ts [--baseline <dir>] [--baseline-url <url>]
 *     [--output <file>] [--pull-request <number>]
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { collectRows } from "./collect-bundle-sizes.js";
import { renderBundlesSection, spliceSection } from "./render-bundle-sizes.js";

// 🔧 Utilities

/**
 * Reads `--flag value` pairs out of argv, treating an empty value as absent so
 * an unset workflow output does not become an empty markdown link.
 */
function readOption(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value === undefined || value === "" ? undefined : value;
}

/** Runs a `gh` subcommand and returns its output. */
function runGitHub(args: readonly string[]): string {
  return execFileSync("gh", [...args], { encoding: "utf8" });
}

/**
 * Rewrites a pull request description around the section, leaving it alone when
 * nothing moved so an unaffected push does not churn the timeline.
 *
 * The description travels to `gh` through a file rather than an argument: it is
 * kilobytes of markdown, well past what a single argument should carry.
 */
function updateDescription(pullRequest: string, section: string): void {
  const current = runGitHub([
    "pr",
    "view",
    pullRequest,
    "--json",
    "body",
    "--jq",
    ".body",
  ]).trimEnd();
  const description = spliceSection(current, section);

  if (description === current) {
    console.log(`Bundles section on #${pullRequest} is already current.`);
    return;
  }

  const directory = mkdtempSync(path.join(tmpdir(), "bundle-sizes-"));
  const file = path.join(directory, "description.md");
  writeFileSync(file, `${description}\n`, "utf8");
  runGitHub(["pr", "edit", pullRequest, "--body-file", file]);
  console.log(`Wrote the Bundles section to #${pullRequest}.`);
}

// 🏁 Entrypoint

const section = renderBundlesSection(
  collectRows(readOption("--baseline")),
  readOption("--baseline-url"),
);
const outputFile = readOption("--output");
const pullRequest = readOption("--pull-request");

if (outputFile !== undefined) {
  writeFileSync(outputFile, `${section}\n`, "utf8");
}

if (pullRequest !== undefined) {
  updateDescription(pullRequest, section);
}

if (outputFile === undefined && pullRequest === undefined) {
  process.stdout.write(`${section}\n`);
}

const stepSummary = process.env["GITHUB_STEP_SUMMARY"];
if (stepSummary !== undefined && stepSummary !== "") {
  writeFileSync(stepSummary, `${section}\n`, { encoding: "utf8", flag: "a" });
}
