import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { NestFactory } from "@nestjs/core";

import { MainModule } from "../../src/main.module";
import { DrawCombinationsService } from "../../src/modules/draw/draw-combinations.service";
import { LatticeIdentificationService } from "../../src/modules/lattice-identification/lattice-identification.service";
import { TILE_DRAWN_TYPES } from "../../src/modules/meander-generation/meander-generation.constants";
import { MotifPitchService } from "../../src/modules/meander-generation/motif-pitch.service";
import { OutputPathService } from "../../src/modules/svg-rendering/output-path.service";

import { OUTPUT_DIRECTORY, REPEAT_COUNT_SUFFIX_PATTERN } from "./constants";

import type { LatticeUnit } from "../../src/modules/lattice-identification/lattice-identification.types";
import type {
  MeanderType,
  MotifDrawnType,
} from "../../src/modules/meander-generation/meander-generation.types";
import type { AddressedDrawing } from "./types";

// 🗂️ Reading the committed corpus

/**
 * Every committed drawing's path, relative to `output/` and POSIX-separated
 * whatever the platform separates with.
 *
 * The corpus is a tree rather than a flat directory — each drawing is filed
 * under the family, row count, and column span that produced it — so this
 * walks it. Each directory's entries are sorted before they are descended
 * into, so the order is the tree's own rather than the filesystem's.
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

// 📏 Recovering each drawing's repeat unit

/** Narrows a family to one that draws a motif, so its pitch can be asked for. */
const isMotifDrawn = (type: MeanderType): type is MotifDrawnType =>
  !TILE_DRAWN_TYPES.includes(type);

/**
 * The repeat unit of every drawing the named half of the sweep writes, keyed
 * by the path it is written to.
 *
 * Both widths come from the family that drew it rather than from the file:
 * `DrawCombinationsService` enumerates the same parameters `DrawCommand`
 * draws from, `OutputPathService` says where each lands, and
 * `MotifPitchService` derives the pitch and the true repeat's span from the
 * motif's own right edge. Nothing here renders a drawing — the parameters are
 * enough to say how wide one unit is, and the ink is read off disk.
 */
export const namedUnits = (services: {
  combinations: DrawCombinationsService;
  outputPaths: OutputPathService;
  pitches: MotifPitchService;
}): Map<string, LatticeUnit> => {
  const units = new Map<string, LatticeUnit>();

  for (const parameters of services.combinations.enumerate()) {
    const { modifier, rows, type } = parameters;

    if (!isMotifDrawn(type)) continue;

    const options = { rows, type, ...(modifier ? { modifier } : {}) };

    units.set(services.outputPaths.build(parameters), {
      pitch: services.pitches.columnPitch(options),
      span: services.pitches.columnSpan(options),
    });
  }

  return units;
};

/**
 * The repeat unit of a drawing from one of the two enumerated halves, read
 * off the directory it is filed under.
 *
 * A tile-drawn document repeats at the span of the tile that drew it, and
 * that span is already the directory's own name — `mosaic/3-rows/2-columns/`
 * and `negative/3-rows/permutations/1-columns/` alike. So the path says it,
 * and nothing has to enumerate a unit space to find out.
 */
export const enumeratedUnit = (
  drawingPath: string,
): LatticeUnit | undefined => {
  const columns = /\/(\d+)-columns\//u.exec(drawingPath)?.[1];

  if (columns === undefined) return undefined;

  const span = Number(columns);

  return { pitch: span, span };
};

// 🏷️ Addressing the corpus

/** The name a drawing is filed under within its family and row count, with the repeat count it was drawn at dropped. */
const variantOf = (drawingPath: string): string =>
  path.posix
    .basename(drawingPath, ".svg")
    .replace(REPEAT_COUNT_SUFFIX_PATTERN, "");

/**
 * Every committed drawing, addressed.
 *
 * It reads the corpus rather than redrawing it, which is what keeps a check
 * over ten thousand documents inside a couple of seconds — and is also the
 * stronger claim: a drawing that stopped matching the parameters it was
 * generated from is addressed as the thing on disk rather than as the thing
 * the generator would produce today.
 */
export const addressCorpus = async (services: {
  combinations: DrawCombinationsService;
  identification: LatticeIdentificationService;
  outputPaths: OutputPathService;
  pitches: MotifPitchService;
}): Promise<AddressedDrawing[]> => {
  const units = namedUnits(services);
  const drawings: AddressedDrawing[] = [];

  for (const drawingPath of await readDrawingPaths()) {
    const unit = units.get(drawingPath) ?? enumeratedUnit(drawingPath);

    if (unit === undefined) {
      throw new Error(
        `no repeat unit for ${drawingPath}: it is neither enumerated by the named sweep nor filed under a column span`,
      );
    }

    const document = await readFile(
      path.join(OUTPUT_DIRECTORY, drawingPath),
      "utf8",
    );
    const address = services.identification.identifyDocument(document, unit);

    drawings.push({
      ...address,
      family: drawingPath.split("/")[0] ?? "",
      path: drawingPath,
      variant: variantOf(drawingPath),
    });
  }

  return drawings;
};

// 🏗 Container

/**
 * The services the sweep reads, resolved from the application's own
 * container.
 *
 * Booting the real container rather than hand-wiring four services is what
 * makes the check read what the command line reads: a provider rewired in
 * `MainModule` reaches this sweep, and a container that no longer boots fails
 * it rather than passing on a copy of the graph that used to be right.
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
