import { readFile, writeFile } from "node:fs/promises";

import { README_PATH, USAGE_MESSAGE, WRITE_COMMAND } from "./constants";
import { addressCorpus, createCorpusServices } from "./corpus";
import { extractBlock, spliceBlock } from "./document";
import { reconcileCollisions } from "./duplicates";
import { renderBlock } from "./table";

import type { AddressedDrawing, AddressTableRunMode } from "./types";

// 🏃 Running

/**
 * Reads exactly one run mode from the command line.
 *
 * Two modes and no default, the shape the examples packages already use:
 * silently defaulting to a write nobody asked for would rewrite the committed
 * table on a check run, which is the one thing the pairing exists to prevent.
 */
export const selectMode = (
  args: readonly string[],
): AddressTableRunMode | undefined => {
  const check = args.includes("--check");
  const write = args.includes("--write");

  if (check === write) return undefined;

  return check ? "check" : "write";
};

/**
 * Addresses every committed drawing and either checks the README's block
 * against it or rewrites the block.
 *
 * Two failures, and they are not the same thing. A **duplicate** is two
 * drawings of one family sharing an address, which no rewrite can fix and
 * which fails both modes alike. A **stale** block is one a rewrite fixes, so
 * it fails only the check.
 *
 * Returns the lines to print and the exit code to set rather than printing
 * and exiting itself, so a test drives the whole run. `drawings` and
 * `readmePath` are overridable for the same reason: the duplicate branch is
 * asserted against a constructed pair rather than against a corpus that would
 * have to be broken to reach it.
 */
export const run = async (
  args: readonly string[],
  overrides: {
    drawings?: readonly AddressedDrawing[];
    readmePath?: string;
  } = {},
): Promise<{ exitCode: number; lines: string[] }> => {
  const mode = selectMode(args);

  if (mode === undefined) return { exitCode: 1, lines: [USAGE_MESSAGE] };

  const readmePath = overrides.readmePath ?? README_PATH;
  const drawings = overrides.drawings ?? (await sweepCorpus());
  const { undeclared, vanished } = reconcileCollisions(drawings);

  if (undeclared.length > 0 || vanished.length > 0) {
    return {
      exitCode: 1,
      lines: [
        "🗺️ The lattice addresses disagree with `EXPECTED_ADDRESS_COLLISIONS`:",
        ...undeclared.map((line) => `   undeclared collision — ${line}`),
        ...vanished.map(
          (line) => `   declared but no longer colliding — ${line}`,
        ),
        "💡 Two drawings of one family sharing an address is duplicate art or an address too coarse to separate them. Resolve it, or declare it with the reason.",
      ],
    };
  }

  const block = renderBlock(drawings);
  const readme = await readFile(readmePath, "utf8");

  if (extractBlock(readme) === block) {
    return {
      exitCode: 0,
      lines: [
        `🗺️ ${drawings.length} lattice addresses, and the README agrees.`,
      ],
    };
  }

  if (mode === "check") {
    return {
      exitCode: 1,
      lines: [
        "🗺️ The README's lattice address table is stale.",
        `💡 Run \`${WRITE_COMMAND}\`.`,
      ],
    };
  }

  await writeFile(readmePath, spliceBlock(readme, block), "utf8");

  return {
    exitCode: 0,
    lines: [`🗺️ Wrote ${drawings.length} lattice addresses into the README.`],
  };
};

/** Boots the application's container, addresses the corpus, and closes it again. */
const sweepCorpus = async (): Promise<AddressedDrawing[]> => {
  const services = await createCorpusServices();

  try {
    return await addressCorpus(services);
  } finally {
    await services.close();
  }
};
