import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { InvalidRepeatCountError } from "../meander-generation/invalid-repeat-count.errors";
import { InvalidRowsError } from "../meander-generation/invalid-rows.errors";
import {
  MAXIMUM_VALUE,
  MINIMUM_REPEAT_COUNT,
} from "../meander-generation/meander-generation.constants";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { MOSAIC_TILE_MINIMUM_ROWS } from "./mosaic-motif.constants";
import { MosaicTileMotifService } from "./mosaic-tile-motif.service";

import type { MosaicTile } from "./mosaic-motif.types";

/**
 * Turns one `mosaic` tile into a finished SVG document, the way
 * {@link MeanderGenerationService} does for the named types. It stays
 * separate rather than joining that service's type dispatch because a
 * mosaic is parameterized by a whole tile rather than by a type-and-modifier
 * pair, and there are thousands of tiles rather than a fixed handful.
 */
@Injectable()
export class MosaicTileGenerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(MosaicTileMotifService)
    private readonly mosaicMotifService: MosaicTileMotifService,
    @Inject(SvgRenderingService)
    private readonly svgRenderingService: SvgRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Validates the tile's row count and the repeat count, then renders the finished SVG document. */
  generate(tile: MosaicTile, repeatCount: number): string {
    if (
      !Number.isInteger(tile.rows) ||
      tile.rows < MOSAIC_TILE_MINIMUM_ROWS ||
      tile.rows > MAXIMUM_VALUE
    ) {
      throw new InvalidRowsError(
        tile.rows,
        MOSAIC_TILE_MINIMUM_ROWS,
        MAXIMUM_VALUE,
      );
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

    const geometry = this.gridGeometryService.compute(tile.rows);
    const unitPaths = Array.from({ length: repeatCount }, (_value, unitIndex) =>
      this.mosaicMotifService.path(geometry, tile, {
        isLastUnit: unitIndex === repeatCount - 1,
        unitIndex,
      }),
    );
    const overhang = this.mosaicMotifService.leadingOverhang(geometry, tile);
    const paths = overhang ? [overhang, ...unitPaths] : unitPaths;
    const rightEdge = this.mosaicMotifService.rightEdge(
      geometry,
      tile,
      repeatCount,
    );
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);

    return this.svgRenderingService.render({
      height: format(
        geometry.offset + geometry.height + geometry.strokeWidth / 2,
      ),
      paths,
      strokeWidth: format(geometry.strokeWidth),
      width: format(rightEdge + geometry.strokeWidth / 2),
    });
  }
}
