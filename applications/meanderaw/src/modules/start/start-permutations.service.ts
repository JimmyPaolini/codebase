import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";

import {
  MOSAIC_TILE_MAXIMUM_COLUMNS,
  MOSAIC_TILE_MINIMUM_ROWS,
} from "../mosaic-motif/mosaic-motif.constants";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";

import { StartContactSheetService } from "./start-contact-sheet.service";
import {
  PERMUTATION_REPEAT_COUNT,
  PERMUTATIONS_SUBDIRECTORY,
  ROWS_SWEEP_MAXIMUM,
} from "./start.constants";

import type { PermutedMosaic } from "./start.types";

/**
 * Writes the `mosaic` half of the sweep: every distinct tile the family
 * admits, plus one contact sheet per row count to look through them by.
 *
 * Where the named-type half of the sweep samples a parameter space — a few
 * representative periods, a couple of shapes — this half enumerates one
 * exhaustively. Every arrangement of dots and one-unit dashes that leaves
 * no cell of a tile blank is generated, one per symmetry class, so nothing
 * in it repeats a re-phasing or a mirror of anything else. It stays bounded
 * by capping the tile's column span at {@link MOSAIC_TILE_MAXIMUM_COLUMNS},
 * since the count grows exponentially in that span and only mildly in
 * `rows`.
 */
@Injectable()
export class StartPermutationsService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicTileGenerationService)
    private readonly mosaicGenerationService: MosaicTileGenerationService,
    @Inject(MosaicSubFamilyService)
    private readonly mosaicSubFamilyService: MosaicSubFamilyService,
    @Inject(MosaicSymmetryService)
    private readonly mosaicSymmetryService: MosaicSymmetryService,
    @Inject(MosaicTilesService)
    private readonly mosaicTilesService: MosaicTilesService,
    @Inject(StartContactSheetService)
    private readonly startContactSheetService: StartContactSheetService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Enumerates and renders every mosaic at one row count, across every
   * column span up to the cap.
   *
   * A tile that belongs to a named sub-family carries that name after its
   * identifier, so the handful of tiles a reader already has a word for are
   * legible in the directory listing rather than hidden among the thousands
   * that have none. A tile belonging to none is named by its identifier
   * alone.
   */
  private sweepRow(rows: number): PermutedMosaic[] {
    const mosaics: PermutedMosaic[] = [];

    for (
      let columns = 1;
      columns <= MOSAIC_TILE_MAXIMUM_COLUMNS;
      columns += 1
    ) {
      for (const tile of this.mosaicTilesService.enumerate(rows, columns)) {
        const identifier = this.mosaicSymmetryService.canonicalIdentifier(tile);
        const subFamily = this.mosaicSubFamilyService.classify(tile);
        const name = subFamily ? `${identifier}-${subFamily}` : identifier;

        mosaics.push({
          columns,
          fileName: `mosaic-${rows}-rows-${columns}-columns-${name}.svg`,
          identifier,
          rows,
          svg: this.mosaicGenerationService.generate(
            tile,
            PERMUTATION_REPEAT_COUNT,
          ),
        });
      }
    }

    return mosaics;
  }

  // 🌎 Public Methods

  /** Every row count the mosaic sweep covers. */
  rowsSweep(): number[] {
    return Array.from(
      { length: ROWS_SWEEP_MAXIMUM - MOSAIC_TILE_MINIMUM_ROWS + 1 },
      (_value, index) => MOSAIC_TILE_MINIMUM_ROWS + index,
    );
  }

  /** Writes every mosaic and its per-row-count contact sheet, and reports how many were written. */
  async write(outputDirectory: string): Promise<number> {
    const directory = path.join(outputDirectory, PERMUTATIONS_SUBDIRECTORY);

    await mkdir(directory, { recursive: true });

    let total = 0;

    for (const rows of this.rowsSweep()) {
      const mosaics = this.sweepRow(rows);

      await Promise.all(
        mosaics.map(async (mosaic) =>
          writeFile(path.join(directory, mosaic.fileName), mosaic.svg),
        ),
      );
      await writeFile(
        path.join(directory, `index-${rows}-rows.html`),
        this.startContactSheetService.render(rows, mosaics),
      );
      total += mosaics.length;
    }

    return total;
  }
}
