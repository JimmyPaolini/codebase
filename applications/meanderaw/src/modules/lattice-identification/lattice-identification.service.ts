import { Inject, Injectable } from "@nestjs/common";

import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";

import type { LatticeGraph } from "../meander-lattice/meander-lattice.types";
import type {
  MosaicTile,
  MosaicTileShape,
} from "../mosaic-tile/mosaic-tile.types";

/**
 * Names a reading of the lattice: which repeat unit of a rendered document
 * holds which edges, and the hexadecimal string that spells them out.
 *
 * The lattice is the substrate every family is drawn on, so the encoding
 * belongs to it rather than to any one region of it — `mosaic` is the region
 * whose filenames happen to have needed a name first. Reading a unit back
 * out of a finished document and writing that unit down are the same act
 * seen from either end, which is why they sit together here.
 *
 * The folding is a `mosaic` concern and stays one: `MosaicSymmetryService`
 * owns the symmetry group and every tile-shaped operation over it, and
 * {@link canonicalIdentifier} is this service asking it which member of a
 * class to name before naming it. The dependency runs one way — a name
 * needs the group, and the group needs no name.
 */
@Injectable()
export class LatticeIdentificationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicSymmetryService)
    private readonly mosaicSymmetryService: MosaicSymmetryService,
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * The identifier every tile in a symmetry class shares: {@link identify}
   * of the one member `MosaicSymmetryService.canonicalTile` picks. Two tiles
   * draw the same pattern exactly when their canonical identifiers match, so
   * a committed drawing's filename is a complete description of the tile
   * that drew it.
   *
   * It is not the deduplication key the enumeration folds on. That key has
   * to be readable by `MosaicTilesService`, which sits upstream of this
   * service, and `MosaicSymmetryService.edgeKey` separates two classes of
   * one shape exactly as this does — so how a filename is spelled stays a
   * question this module answers alone.
   */
  canonicalIdentifier(tile: MosaicTile): string {
    return this.identify(this.mosaicSymmetryService.canonicalTile(tile));
  }

  /**
   * Names a tile by its own points: one hexadecimal character each, in
   * reading order, worth `8` for `north`, `4` for `south`, `2` for `east`
   * and `1` for `west`.
   *
   * So `0` is a dot, `3` a point on a horizontal run, `c` one on a vertical
   * run, `6` a corner turning south and east, `e` a T-junction, and `f` a
   * crossing. A reader can decode a filename point by point without a table,
   * which is the whole reason the identifier exists.
   *
   * It names a tile completely — the points determine every edge, since each
   * one owns its `east` and its `south` — so two tiles of one shape share a
   * string only when they are the same tile. It does *not* name the shape:
   * the directory a drawing is filed under carries the row count and the
   * column span, so two tiles of different shapes may share a string.
   *
   * The string is deliberately redundant. Four bits per point describes
   * `4 * columns * (rows - 1)` bits where the tile has only
   * `columns * (2 * rows - 3)` degrees of freedom, because every edge is
   * written twice — once at each end. That is the same redundancy
   * `MosaicTileService.assertWellFormed` checks, and paying it here buys a
   * filename whose characters are the tile's own points rather than a packed
   * edge list nobody can read.
   */
  identify(tile: MosaicTile): string {
    return tile.points
      .flatMap((row) =>
        row.map((point) =>
          (
            (point.north ? 8 : 0) +
            (point.south ? 4 : 0) +
            (point.east ? 2 : 0) +
            (point.west ? 1 : 0)
          ).toString(16),
        ),
      )
      .join("");
  }

  /**
   * The tile one repeat unit of a rendered document draws.
   *
   * A tile point `(level, column)` is the lattice point at column
   * `unit × columns + column` and row `level + 1` — the `+ 1` being the top
   * cap tick, which sits on grid level `0` and is not a tile point. An
   * eastward edge is the one-pitch step right from there, a southward edge
   * the step down.
   */
  readTile(
    graph: LatticeGraph,
    shape: MosaicTileShape,
    unit: number,
  ): MosaicTile {
    const start = unit * shape.columns;
    const edges = this.mosaicTileService.blankEdges(shape);

    for (const [level, row] of edges.horizontal.entries()) {
      for (const [column] of row.entries()) {
        if (graph.horizontalEdges.has(`${start + column},${level + 1}`)) {
          this.mosaicTileService.mark(edges.horizontal, level, column);
        }
      }
    }

    for (const [level, row] of edges.vertical.entries()) {
      for (const [column] of row.entries()) {
        if (graph.verticalEdges.has(`${start + column},${level + 1}`)) {
          this.mosaicTileService.mark(edges.vertical, level, column);
        }
      }
    }

    return this.mosaicTileService.build(shape, edges);
  }
}
