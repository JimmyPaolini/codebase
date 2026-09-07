import { Inject, Injectable } from "@nestjs/common";

import {
  MOSAIC_TILE_MAXIMUM_ROWS,
  MOSAIC_TILE_MINIMUM_ROWS,
} from "../mosaic-motif/mosaic-motif.constants";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { OutputPathService } from "../svg-rendering/output-path.service";

import { PERMUTATION_REPEAT_COUNT } from "./draw.constants";

import type { RenderedDocument } from "./draw.types";

/**
 * Renders the `mosaic` half of the sweep: every distinct tile the family
 * admits, filed under the row count and column span that produced it.
 *
 * Where the named-type half of the sweep samples a parameter space — a few
 * representative periods, a couple of shapes — this half enumerates one
 * exhaustively. Every tile the family's own ceiling admits is generated, one
 * per symmetry class, so nothing in it repeats a re-phasing or a mirror of
 * anything else. It stays bounded by one edge budget, which the tile
 * service turns into a column span per row count — five at the shallowest
 * band and one at the deepest, since a tile's edge count grows in both
 * dimensions at once.
 *
 * Thousands of files is what makes the directories load-bearing rather than
 * decorative: nested under `<rows>-rows/<columns>-columns/`, each one holds
 * the tiles of one shape named by nothing but the identifier that
 * distinguishes them, and the attributes they share are read off the path
 * instead of repeated in every name.
 *
 * There is no `permutations/` level any more. It separated this half from a
 * named one, and the separation stopped meaning anything when every tile the
 * family draws became a member of one enumerated space — the named drawings
 * beside these directories are tiles too, at column spans the edge budget
 * refuses rather than at some other kind of thing. `negative` keeps its own
 * `permutations/` level, because there the two halves really are different:
 * its named half draws ten sources by rule, and its enumerated half inverts
 * `mosaic` tiles.
 */
@Injectable()
export class DrawPermutationsService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicTileGenerationService)
    private readonly mosaicGenerationService: MosaicTileGenerationService,
    @Inject(MosaicNamingService)
    private readonly mosaicNamingService: MosaicNamingService,
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
   * A tile whose structure earns a name carries that name after its bit
   * string, so the handful of tiles a reader already has a word for are
   * legible in the directory listing rather than hidden among the hundreds
   * that have none. A tile earning none is named by its bit string alone,
   * which describes it exactly.
   */
  render(rows: number): RenderedDocument[] {
    const mosaics: RenderedDocument[] = [];
    const familyDirectory = this.outputPathService.familyDirectory(
      "mosaic",
      rows,
    );

    for (
      let columns = 1;
      columns <= this.mosaicTilesService.maximumColumns(rows);
      columns += 1
    ) {
      for (const tile of this.mosaicTilesService.enumerate(rows, columns)) {
        const identifier = this.mosaicSymmetryService.canonicalIdentifier(tile);
        const earned = this.mosaicNamingService.name(tile);
        const name = earned ? `${identifier}-${earned}` : identifier;

        mosaics.push({
          directory: `${familyDirectory}/${columns}-columns`,
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
      { length: MOSAIC_TILE_MAXIMUM_ROWS - MOSAIC_TILE_MINIMUM_ROWS + 1 },
      (_value, index) => MOSAIC_TILE_MINIMUM_ROWS + index,
    );
  }
}
