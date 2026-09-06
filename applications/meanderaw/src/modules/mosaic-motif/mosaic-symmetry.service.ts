import { Inject, Injectable } from "@nestjs/common";

import { MosaicTileService } from "./mosaic-tile.service";

import type {
  MosaicDirections,
  MosaicPointRank,
  MosaicTile,
  MosaicTransform,
  MosaicTransformChoice,
} from "./mosaic-motif.types";

/**
 * The symmetries under which two `mosaic` tiles draw the same pattern, and
 * the identifier that names a tile independently of which of them produced
 * it. A tile repeats forever in both directions, so shifting its columns
 * only re-phases the same wallpaper; reversing its columns or flipping its
 * levels mirrors it. Enumerating every tile and keeping one representative
 * per symmetry class is what turns a combinatorial blow-up into a set small
 * enough to look through.
 *
 * The group has order `4 × columns` — `columns` translations, times a
 * horizontal mirror, times a level flip — and it acts on the tile's edges
 * rather than on its points, because an edge is where the tile's degrees of
 * freedom are. A translation moves an edge along its level; a mirror sends
 * the eastward edge leaving one point to the eastward edge *arriving* at
 * its reflection, which is why its column arithmetic differs by one from
 * the southward edge's; a flip turns the tile upside down, and a southward
 * edge lands one level higher than a horizontal one because it is indexed
 * by the upper of the two levels it joins.
 */
@Injectable()
export class MosaicSymmetryService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Where an edge's column lands under one group element. A horizontal
   * mirror reflects the lattice about a vertical line, so a southward edge
   * simply follows its own point while an eastward edge — which spans the
   * gap to the point on its right — lands on the gap to the reflection's
   * left, one column back.
   */
  private mapColumn(column: number, options: MosaicTransform): number {
    const { columns, isHorizontal, mirror, shift } = options;
    const reflected = mirror
      ? (isHorizontal ? -column - 1 : -column) + 2 * columns
      : column;

    return (reflected + shift) % columns;
  }

  /** Every tile the symmetry group maps `tile` to, itself included, with duplicates left in. */
  private orbit(tile: MosaicTile): MosaicTile[] {
    const variants: MosaicTile[] = [];

    for (let shift = 0; shift < tile.columns; shift += 1) {
      for (const mirror of [false, true]) {
        for (const flip of [false, true]) {
          variants.push(this.transform(tile, { flip, mirror, shift }));
        }
      }
    }

    return variants;
  }

  /**
   * Copies one direction's edges from `source` onto `target` under one group
   * element.
   *
   * A flip turns the tile upside down, and a southward edge lands one level
   * higher than an eastward one because it is indexed by the upper of the
   * two levels it joins.
   */
  private place(
    source: readonly (readonly boolean[])[],
    target: readonly boolean[][],
    options: MosaicTransform,
  ): void {
    const lastLevel = options.isHorizontal
      ? options.rows - 2
      : options.rows - 3;

    for (const [level, row] of source.entries()) {
      for (const [column, isSet] of row.entries()) {
        if (isSet) {
          this.mosaicTileService.mark(
            target,
            options.flip ? lastLevel - level : level,
            this.mapColumn(column, options),
          );
        }
      }
    }
  }

  /**
   * How a point is reached, ranked in the order the family's original
   * exact-cover search discovered covers in: a bare point first, then one
   * anchoring a southward edge, then one anchoring an eastward edge, then
   * one reached only by a neighbor's edge.
   *
   * That order is what picks a class's representative, so it is stated here
   * rather than left implicit in a traversal. Two tiles that draw the same
   * pattern differ only by a symmetry, and this is the tie-break that says
   * which of them the corpus draws.
   */
  private rank(directions: MosaicDirections): MosaicPointRank {
    if (directions.south) {
      return 1;
    }

    if (directions.east) {
      return 2;
    }

    return directions.north || directions.west ? 3 : 0;
  }

  /**
   * The key {@link canonicalTile} minimizes: every point's {@link rank} in
   * reading order, then the tile's own edges, so that two tiles which rank
   * alike are still ordered by something rather than by chance.
   */
  private signature(tile: MosaicTile): string {
    const ranks = tile.points
      .flatMap((row) => row.map((directions) => this.rank(directions)))
      .join("");

    return `${ranks}|${this.identify(tile)}`;
  }

  /** The tile one group element maps `tile` to. */
  private transform(
    tile: MosaicTile,
    options: MosaicTransformChoice,
  ): MosaicTile {
    const { columns, rows } = tile;
    const source = this.mosaicTileService.edges(tile);
    const { horizontal, vertical } = this.mosaicTileService.blankEdges(tile);

    this.place(source.horizontal, horizontal, {
      ...options,
      columns,
      isHorizontal: true,
      rows,
    });
    this.place(source.vertical, vertical, {
      ...options,
      columns,
      isHorizontal: false,
      rows,
    });

    return this.mosaicTileService.build(
      { columns, rows },
      { horizontal, vertical },
    );
  }

  // 🌎 Public Methods

  /**
   * The identifier every tile in a symmetry class shares: {@link identify}
   * of the one member {@link canonicalTile} picks. Two tiles draw the same
   * pattern exactly when their canonical identifiers match, so this doubles
   * as the deduplication key — and because it is the representative's own
   * bit string, a committed drawing's filename is a complete description of
   * the tile that drew it.
   */
  canonicalIdentifier(tile: MosaicTile): string {
    return this.identify(this.canonicalTile(tile));
  }

  /**
   * The one tile of a symmetry class the corpus draws. Every member draws
   * the same pattern up to a shift or a mirror, so which one is committed
   * is a choice rather than a fact, and {@link rank} is where that choice
   * is written down.
   */
  canonicalTile(tile: MosaicTile): MosaicTile {
    let best = tile;
    let smallest = this.signature(tile);

    for (const variant of this.orbit(tile)) {
      const signature = this.signature(variant);

      if (signature < smallest) {
        best = variant;
        smallest = signature;
      }
    }

    return best;
  }

  /**
   * Names a tile by its own edges: one character per edge, `1` where the
   * edge is drawn and `0` where it is not, every eastward edge in reading
   * order and then every southward one.
   *
   * The string is a complete description of the tile — the edges *are* its
   * degrees of freedom, so nothing about it is left unsaid — and it is safe
   * to use as a filename. It replaces the per-point letter the family used
   * to be named by, which could say a point anchored an eastward edge or a
   * southward one but had no letter for a point anchoring both.
   *
   * It does not name the *shape*: two tiles of different shapes can share a
   * bit string, and the sweep tells them apart by the directory it files
   * them under, which already carries the row count and the column span.
   */
  identify(tile: MosaicTile): string {
    const { horizontal, vertical } = this.mosaicTileService.edges(tile);

    return [...horizontal, ...vertical]
      .flatMap((row) => row.map((isSet) => (isSet ? "1" : "0")))
      .join("");
  }

  /**
   * Every distinct tile that draws the same pattern as `tile`, itself
   * included — its symmetry class, as tiles rather than as a name.
   *
   * The group has `4 * columns` elements but a class can be smaller than
   * that, because a tile symmetric under one of them is mapped to itself by
   * it. Summing these sizes over the enumeration is what recovers the
   * unfolded tile count from the folded one.
   */
  variants(tile: MosaicTile): MosaicTile[] {
    const distinct = new Map<string, MosaicTile>();

    for (const variant of this.orbit(tile)) {
      distinct.set(this.identify(variant), variant);
    }

    return [...distinct.values()];
  }
}
