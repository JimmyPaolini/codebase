import { readFile, writeFile } from "node:fs/promises";

import { TABLE_PATH, USAGE_MESSAGE, WRITE_COMMAND } from "./constants";
import { addressCorpus, createCorpusServices } from "./corpus";
import { reconcileCollisions } from "./duplicates";
import { renderDocument } from "./table";

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
 * Addresses every committed drawing and either checks the committed table
 * against it or rewrites the table.
 *
 * Two failures, and they are not the same thing. A **duplicate** is two
 * drawings of one family sharing an address, which no rewrite can fix and
 * which fails both modes alike. A **stale** table is one a rewrite fixes, so
 * it fails only the check — and a table that is missing altogether is stale
 * rather than an error, because a `write` is exactly the repair.
 *
 * Returns the lines to print and the exit code to set rather than printing
 * and exiting itself, so a test drives the whole run. `drawings` and
 * `tablePath` are overridable for the same reason: the duplicate branch is
 * asserted against a constructed pair rather than against a corpus that would
 * have to be broken to reach it.
 */
export const run = async (
  args: readonly string[],
  overrides: {
    drawings?: readonly AddressedDrawing[];
    tablePath?: string;
  } = {},
): Promise<{ exitCode: number; lines: string[] }> => {
  const mode = selectMode(args);

  if (mode === undefined) return { exitCode: 1, lines: [USAGE_MESSAGE] };

  const tablePath = overrides.tablePath ?? TABLE_PATH;
  const drawings = overrides.drawings ?? (await sweepCorpus());
  const { miscounted, undeclared, vanished } = reconcileCollisions(drawings);

  if (miscounted.length + undeclared.length + vanished.length > 0) {
    return {
      exitCode: 1,
      lines: [
        "🗺️ The lattice addresses disagree with `EXPECTED_ADDRESS_COLLISIONS`:",
        ...undeclared.map((line) => `   undeclared collision — ${line}`),
        ...miscounted.map((line) => `   undeclared multiplicity — ${line}`),
        ...vanished.map(
          (line) => `   declared but no longer colliding — ${line}`,
        ),
        "💡 A drawing of one family sharing an address with another, beyond the count `EXPECTED_ADDRESS_COLLISIONS` declares, is duplicate art or an address too coarse to separate them. Resolve it, or declare the count with the reason.",
      ],
    };
  }

  const document = renderDocument(drawings);

  if ((await readTable(tablePath)) === document) {
    return {
      exitCode: 0,
      lines: [
        `🗺️ ${drawings.length} lattice addresses, and the committed table agrees.`,
      ],
    };
  }

  if (mode === "check") {
    return {
      exitCode: 1,
      lines: [
        "🗺️ The committed lattice address table is stale.",
        `💡 Run \`${WRITE_COMMAND}\`.`,
      ],
    };
  }

  await writeFile(tablePath, document, "utf8");

  return {
    exitCode: 0,
    lines: [
      `🗺️ Wrote ${drawings.length} lattice addresses into \`output/lattice-addresses.md\`.`,
    ],
  };
};

/** The table as committed, or nothing where there is no file to read — which a check reports as stale and a write repairs. */
const readTable = async (tablePath: string): Promise<string | undefined> => {
  try {
    return await readFile(tablePath, "utf8");
  } catch {
    return undefined;
  }
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
