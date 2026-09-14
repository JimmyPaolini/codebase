import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { NestFactory } from "@nestjs/core";

import { MainModule } from "../../src/main.module";
import { DrawCombinationsService } from "../../src/modules/draw/draw-combinations.service";
import { LatticeIdentificationService } from "../../src/modules/lattice-identification/lattice-identification.service";
import { isMotifDrawnType } from "../../src/modules/meander-generation/meander-generation.utilities";
import { MotifPitchService } from "../../src/modules/meander-generation/motif-pitch.service";
import { OutputPathService } from "../../src/modules/svg-rendering/output-path.service";
import { FILENAME_ADDRESS_SUFFIX_PATTERN } from "../../src/modules/svg-rendering/svg-rendering.constants";

import { OUTPUT_DIRECTORY } from "./constants";

import type { LatticeUnit } from "../../src/modules/lattice-identification/lattice-identification.types";
import type { CollectedHardcodedMeander } from "./types";

// 🗂️ Reading the committed corpus

/**
 * Every committed drawing's path, relative to `output/` and POSIX-separated
 * whatever the platform separates with.
 *
 * Adapted from the retired `testing/address-table/corpus.ts` (see #815's
 * removal of the address table and its Nx target): each directory's entries
 * are sorted before they are descended into, so the order is the tree's own
 * rather than the filesystem's, and a run over the committed corpus is
 * reproducible from one machine to the next.
 */
export const readDrawingPaths = async (
  directory: string = OUTPUT_DIRECTORY,
  root: string = OUTPUT_DIRECTORY,
): Promise<string[]> => {
  const listing = await readdir(directory, { withFileTypes: true });
  const entries = listing.toSorted((left, right) =>
    left.name.localeCompare(right.name),
  );
  const drawings: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      drawings.push(...(await readDrawingPaths(entryPath, root)));
    } else if (entry.name.endsWith(".svg")) {
      drawings.push(path.relative(root, entryPath).split(path.sep).join("/"));
    }
  }

  return drawings;
};

// 📏 Recovering each named drawing's repeat unit

/**
 * The path a drawing would be filed under with no lattice address appended —
 * the key {@link namedUnits} files its units by, and what a committed path is
 * turned back into to ask that map about it.
 */
const unaddressed = (drawingPath: string): string =>
  drawingPath.replace(FILENAME_ADDRESS_SUFFIX_PATTERN, "");

/**
 * The repeat unit of every drawing the named-type half of the sweep writes —
 * `DrawCombinationsService.enumerate()`'s own space — keyed by the path it is
 * written to with no address appended.
 *
 * This is the boundary #818 draws between "Hardcoded" and "deferred to
 * #817's Enumerated pass": `mosaic` has no motif for `MotifPitchService` to
 * probe a pitch from and is filtered out by `isMotifDrawnType`, and neither
 * `mosaic`'s own tiles nor `negative`'s `permutations/` subtree ever appear
 * in this map, because neither is written by `DrawCombinationsService` — see
 * `DrawPermutationsService` and `DrawNegativePermutationsService`. Both
 * families already draw from an exhaustively enumerated unit space today,
 * which is exactly the shape #817 generalizes to every family; the nine
 * types this map does cover are drawn from per-family procedural motif
 * logic that a small, budgeted brute-force enumerator has no way to
 * rediscover, which is why their committed corpus has to be preserved as
 * hardcoded constants instead.
 */
export const namedUnits = (services: {
  combinations: DrawCombinationsService;
  outputPaths: OutputPathService;
  pitches: MotifPitchService;
}): Map<string, LatticeUnit> => {
  const units = new Map<string, LatticeUnit>();

  for (const parameters of services.combinations.enumerate()) {
    const { modifier, rows, type } = parameters;

    if (!isMotifDrawnType(type)) continue;

    const options = { rows, type, ...(modifier ? { modifier } : {}) };

    units.set(services.outputPaths.build(parameters), {
      pitch: services.pitches.columnPitch(options),
      span: services.pitches.columnSpan(options),
    });
  }

  return units;
};

// 🏷️ Collecting the named-type corpus

/**
 * Every committed drawing from the named-type half of the sweep, addressed
 * on the lattice — the corpus #818 converts into hardcoded Code constants.
 *
 * It reads the corpus rather than redrawing it, the same choice the retired
 * address table made: a drawing that stopped matching the parameters it was
 * generated from is addressed as the thing on disk rather than as the thing
 * the generator would produce today. A file whose unaddressed path is not in
 * {@link namedUnits} — every `mosaic` tile, and every `negative` drawing
 * under `permutations/` — is silently skipped rather than collected, since
 * neither is part of this ticket's Hardcoded corpus.
 */
export const collectNamedCorpus = async (services: {
  combinations: DrawCombinationsService;
  identification: LatticeIdentificationService;
  outputPaths: OutputPathService;
  pitches: MotifPitchService;
}): Promise<CollectedHardcodedMeander[]> => {
  const units = namedUnits(services);
  const drawings: CollectedHardcodedMeander[] = [];

  for (const drawingPath of await readDrawingPaths()) {
    const unit = units.get(unaddressed(drawingPath));

    if (unit === undefined) continue;

    const document = await readFile(
      path.join(OUTPUT_DIRECTORY, drawingPath),
      "utf8",
    );
    const address = services.identification.identifyDocument(document, unit);

    drawings.push({
      code: address.identifier,
      columns: address.span,
      family: drawingPath.split("/")[0] ?? "",
      path: drawingPath,
      rows: address.rows,
      ...(address.subFamily ? { subFamily: address.subFamily } : {}),
    });
  }

  return drawings;
};

// 🏗 Container

/**
 * The services the corpus collection reads, resolved from the application's
 * own container.
 *
 * Booting the real container rather than hand-wiring four services is what
 * makes the collection read what the command line reads: a provider
 * rewired in `MainModule` reaches it too, and a container that no longer
 * boots fails it rather than passing on a copy of the graph that used to be
 * right.
 */
export const createCorpusServices = async (): Promise<{
  close: () => Promise<void>;
  combinations: DrawCombinationsService;
  identification: LatticeIdentificationService;
  outputPaths: OutputPathService;
  pitches: MotifPitchService;
}> => {
  const context = await NestFactory.createApplicationContext(MainModule, {
    logger: false,
  });

  return {
    close: async (): Promise<void> => {
      await context.close();
    },
    combinations: context.get(DrawCombinationsService),
    identification: context.get(LatticeIdentificationService),
    outputPaths: context.get(OutputPathService),
    pitches: context.get(MotifPitchService),
  };
};
