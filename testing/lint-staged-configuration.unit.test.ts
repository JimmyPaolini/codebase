/**
 * Guards the shape of the arguments the pre-commit hook hands to Nx.
 *
 * The staged file list is the one input to `configuration/lint-staged.config.ts`
 * with no upper bound, and the commands are assembled as strings, so nothing
 * else in the repository would catch a change that folds that list back into a
 * single argument.
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import lintStagedConfig from "../configuration/lint-staged.config";

/**
 * Longest argument the analysis command may carry.
 *
 * Node 26 is killed by the operating system on any single argument past 1011
 * bytes, before it runs a line of the script it was given. Nothing prints, and
 * lint-staged reports the empty result as "Task failed to spawn: undefined".
 * Staying well under that leaves room for a deep path without inviting the
 * failure back; one flag per path never approaches it either way.
 */
const MAXIMUM_ARGUMENT_LENGTH = 512;

/** Splits built commands the way lint-staged splits them, on whitespace. */
function getArguments(commands: string[]): string[] {
  return commands.flatMap((command) => command.split(" "));
}

/** A staged set large enough that one joined argument would be fatal. */
function getStagedFiles(count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) =>
      `packages/conformetry-generation/src/modules/generation/generation-${String(index)}.service.ts`,
  );
}

describe("lint-staged configuration", () => {
  const handlers: Record<string, (files: string[]) => string[]> =
    lintStagedConfig;
  const analyzeStagedFiles = lintStagedConfig["*"];

  it("gives every staged-file pattern at least one command to run", () => {
    for (const [pattern, getCommands] of Object.entries(handlers)) {
      expect(getCommands(getStagedFiles(1)), pattern).not.toHaveLength(0);
    }
  });

  it("keeps every argument short enough to survive being spawned", () => {
    const commands = analyzeStagedFiles(getStagedFiles(200));

    const lengths = getArguments(commands).map((argument) => argument.length);

    expect(Math.max(...lengths)).toBeLessThanOrEqual(MAXIMUM_ARGUMENT_LENGTH);
  });

  it("passes each staged path to Nx as its own workspace-relative flag", () => {
    const files = getStagedFiles(3);

    const flags = getArguments(analyzeStagedFiles(files)).filter((argument) =>
      argument.startsWith("--files="),
    );

    expect(flags).toStrictEqual(
      files.map((file) => `--files=${path.relative(process.cwd(), file)}`),
    );
  });

  it("still runs the whole-workspace conformetry check", () => {
    const commands = analyzeStagedFiles(getStagedFiles(1));

    expect(commands).toContain(
      "pnpm exec nx run codebase:conformetry-validate --outputStyle=static",
    );
  });
});
