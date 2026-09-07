import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  InvalidRepeatCountError,
  InvalidRowsError,
  MAXIMUM_VALUE,
  MINIMUM_REPEAT_COUNT,
  STRUCTURAL_MINIMUM_ROWS,
} from "../meander-generation/meander-generation.constants";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { NEGATIVE_SOURCE_ROW_OFFSET } from "./negative-motif.constants";
import { NegativeMotifService } from "./negative-motif.service";

import type { MosaicTile } from "../mosaic-motif/mosaic-motif.types";

/**
 * Turns one source tile into a finished `negative` SVG document, the way
 * {@link MosaicTileGenerationService} does for a `mosaic` tile.
 *
 * It stays separate from {@link MeanderGenerationService}'s type dispatch
 * for the same reason that one does: the permutation half is parameterized
 * by a whole tile rather than by a type-and-modifier pair, and there are
 * hundreds of tiles rather than a fixed handful. What it shares with the
 * named half is the geometry itself — {@link NegativeMotifService.tilePath}
 * is the one that draws both, so an enumerated drawing and a named one are
 * the same drawing wherever they coincide rather than two implementations
 * that agree.
 *
 * The row count it validates is the **negative's**, one lower than the tile
 * it is handed, which is the whole of {@link NEGATIVE_SOURCE_ROW_OFFSET}.
 */
@Injectable()
export class NegativeTileGenerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(NegativeMotifService)
    private readonly negativeMotifService: NegativeMotifService,
    @Inject(SvgRenderingService)
    private readonly svgRenderingService: SvgRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Throws when the negative a tile implies falls outside the family's own bounds. */
  private validate(rows: number, repeatCount: number): void {
    const minimum = STRUCTURAL_MINIMUM_ROWS.negative;

    if (!Number.isInteger(rows) || rows < minimum || rows > MAXIMUM_VALUE) {
      throw new InvalidRowsError(rows, minimum, MAXIMUM_VALUE);
    }

    if (
      !Number.isInteger(repeatCount) ||
      repeatCount < MINIMUM_REPEAT_COUNT ||
      repeatCount > MAXIMUM_VALUE
    ) {
      throw new InvalidRepeatCountError(
        repeatCount,
        MINIMUM_REPEAT_COUNT,
        MAXIMUM_VALUE,
      );
    }
  }

  // 🌎 Public Methods

  /** Validates the negative's row count and the repeat count, then renders the finished SVG document. */
  generate(tile: MosaicTile, repeatCount: number): string {
    const rows = tile.rows - NEGATIVE_SOURCE_ROW_OFFSET;

    this.validate(rows, repeatCount);

    const geometry = this.gridGeometryService.compute(rows);
    const paths = Array.from({ length: repeatCount }, (_value, unitIndex) =>
      this.negativeMotifService.tilePath(geometry, tile, {
        isLastUnit: unitIndex === repeatCount - 1,
        unitIndex,
      }),
    );
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);

    return this.svgRenderingService.render({
      height: format(
        geometry.offset + geometry.height + geometry.strokeWidth / 2,
      ),
      paths,
      strokeWidth: format(geometry.strokeWidth),
      width: format(
        this.negativeMotifService.tileRightEdge(geometry, tile, repeatCount) +
          geometry.strokeWidth / 2,
      ),
    });
  }
}
