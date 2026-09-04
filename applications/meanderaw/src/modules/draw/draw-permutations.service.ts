import { Inject, Injectable } from "@nestjs/common";

import {
  MOSAIC_TILE_MAXIMUM_COLUMNS,
  MOSAIC_TILE_MINIMUM_ROWS,
} from "../mosaic-motif/mosaic-motif.constants";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { OutputPathService } from "../svg-rendering/output-path.service";

import {
  PERMUTATION_REPEAT_COUNT,
  PERMUTATIONS_SUBDIRECTORY,
  ROWS_SWEEP_MAXIMUM,
} from "./draw.constants";

import type { RenderedDocument } from "./draw.types";

/**
 * Renders the `mosaic` half of the sweep: every distinct tile the family
 * admits, filed under the row count and column span that produced it.
 *
 * Where the named-type half of the sweep samples a parameter space — a few
 * representative periods, a couple of shapes — this half enumerates one
 * exhaustively. Every arrangement of dots and one-unit dashes that leaves
 * no cell of a tile blank is generated, one per symmetry class, so nothing
 * in it repeats a re-phasing or a mirror of anything else. It stays bounded
 * by capping the tile's column span at {@link MOSAIC_TILE_MAXIMUM_COLUMNS},
 * since the count grows exponentially in that span and only mildly in
 * `rows`.
 *
 * Thousands of files is what makes the directories load-bearing rather than
 * decorative: nested under `<rows>-rows/permutations/<columns>-columns/`,
 * each one holds a few hundred tiles named by nothing but the identifier
 * that distinguishes them, and the attributes they share are read off the
 * path instead of repeated in every name.
 */
@Injectable()
export class DrawPermutationsService {
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
    @Inject(OutputPathService)
    private readonly outputPathService: OutputPathService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Enumerates and renders every mosaic at one row count, across every
   * column span up to the cap.
   *
   * A tile that belongs to a named sub-family carries that name after its
   * identifier, so the handful of tiles a reader already has a word for are
   * legible in the directory listing rather than hidden among the hundreds
   * that have none. A tile belonging to none is named by its identifier
   * alone.
   */
  render(rows: number): RenderedDocument[] {
    const mosaics: RenderedDocument[] = [];
    const familyDirectory = this.outputPathService.familyDirectory(
      "mosaic",
      rows,
    );

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
          directory: `${familyDirectory}/${PERMUTATIONS_SUBDIRECTORY}/${columns}-columns`,
          fileName: `${name}.svg`,
          svg: this.mosaicGenerationService.generate(
            tile,
            PERMUTATION_REPEAT_COUNT,
          ),
        });
      }
    }

    return mosaics;
  }

  /** Every row count the mosaic sweep covers. */
  rowsSweep(): number[] {
    return Array.from(
      { length: ROWS_SWEEP_MAXIMUM - MOSAIC_TILE_MINIMUM_ROWS + 1 },
      (_value, index) => MOSAIC_TILE_MINIMUM_ROWS + index,
    );
  }
}
